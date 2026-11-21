import { VersionCounter } from '../../../core/events/index.ts';
import type { Matrix2D, Point } from '../../../core/geometry/index.ts';
import { V1_LEVEL_LIMITS } from '../../../core/level-data/index.ts';
import { createShape } from '../../commands/index.ts';
import type { ShapeDrawing } from '../../commands/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';
import type { DragReadout } from '../readout/DragReadout.ts';
import { diameterReadout, sizeReadout } from '../readout/readoutText.ts';
import { sizingModifiers } from '../sizing/sizingModifiers.ts';
import type { LevelPointerInput, Modifiers, Tool, ToolContext, ToolKey } from '../Tool.ts';

import { atLeastOnePixel, draggedBox, placedDrawing } from './boxDrawing.ts';
import type { BoxKind, BoxSize } from './boxDrawing.ts';
import { angleLocked, pointsDrawing, samePoint, turnedPoints } from './polygonDrawing.ts';
import { previewStepOf, steppedBoxSize, steppedPoints } from './previewSize.ts';
import type { PreviewStep } from './previewSize.ts';
import { previewTurnOf } from './previewTurn.ts';

// The kinds menu's three kinds. A line is a polygon finished open.
export type ShapeToolKind = BoxKind | 'polygon';

// What the tool draws over the level: the shape a click or the drag in progress would make, in the current
// group's own space, and the matrix from that space to level positions.
export type ShapePreview = {
    readonly drawing: ShapeDrawing;
    readonly toLevel: Matrix2D;
};

// A polygon or line being drawn point by point, in the current group's own space, and the matrix from
// that space to level positions. next is where a click adds the next point, or the first point when a
// click there closes the polygon. Before the first click there are no points, only next.
export type PolygonPreview = {
    readonly points: readonly Point[];
    readonly next: Point | undefined;
    readonly closing: boolean;
    readonly toLevel: Matrix2D;
};

// The requirement's "a press that moves less than 4 px is a click", in screen pixels.
export const DRAW_START_PX = 4;

// A click this close to the first point's middle closes the polygon: the 12 px ring with a little room.
export const CLOSE_PX = 8;

const MAX_POINTS = V1_LEVEL_LIMITS.maxShapePoints;
const TOO_MANY_POINTS = `A polygon holds at most ${MAX_POINTS.toLocaleString('en-US')} points`;

const LOCKED = 'This group is locked';

// 100 x 100 px at first, a circle 50 px in radius.
const FIRST_SIZE: BoxSize = { width: 100, height: 100 };

const MODIFIER_CODES = new Set(['ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'ControlLeft', 'ControlRight']);

// The level positions and the current group's own space, both ways.
type GroupSpace = {
    readonly toLevel: Matrix2D;
    readonly toGroup: Matrix2D;
};

// A left press, until it is released (a click) or moves 4 screen px (a drag).
type Press = {
    readonly kind: BoxKind;
    readonly screenPosition: Point;
    // Snapped, in the current group's own space.
    readonly start: Point;
    readonly space: GroupSpace;
    dragging: boolean;
};

// The points placed so far, kept in the space the first point was placed in.
type PolygonInProgress = {
    readonly points: readonly Point[];
    readonly space: GroupSpace;
};

// What finishing does next: the controller selects the shape and returns to Select, or the tool only
// keeps the shape, for Esc and for deactivate, which the controller calls while it switches tools.
type FinishWay = 'return' | 'keep';

// Draws the four kinds a ShapeComponent holds. A rectangle or a circle: a click places the remembered size
// centred on the mouse, a drag sets a new size. A polygon: each click a point, closed by clicking the first
// point, finished open as a line by Enter, a double-click, Esc or another tool. Finishing runs createShape,
// one step, and the controller selects the shape and returns to Select unless the tool is locked.
export class ShapeTool implements Tool {
    readonly id = 'shape';
    readonly preview = new VersionCounter();
    // Moves when the kind changes, for the kinds menu.
    readonly options = new VersionCounter();
    private chosenKind: ShapeToolKind = 'rectangle';
    // Remembered for the session, each kind its own.
    private readonly sizes: Record<BoxKind, BoxSize> = { rectangle: FIRST_SIZE, circle: FIRST_SIZE };
    // How far Z and X turned the preview, in degrees clockwise in the current group's own space. Picking
    // the tool starts it straight again; a locked tool keeps it from one shape to the next.
    private turn = 0;
    private context: ToolContext | undefined;
    private press: Press | undefined;
    // The last mouse position heard, so Shift, Alt and Ctrl redraw the drag without a move.
    private lastInput: LevelPointerInput | undefined;
    private shown: ShapePreview | undefined;
    private shownReadout: DragReadout | undefined;
    private polygon: PolygonInProgress | undefined;
    // A left press for a polygon's point, until it is released.
    private polygonPress: LevelPointerInput | undefined;
    private shownPolygon: PolygonPreview | undefined;

    get kind() {
        return this.chosenKind;
    }

    // The faded shape over the level, for the overlay.
    get drawing() {
        return this.shown;
    }

    // The size of the drag in progress, for the overlay.
    get readout() {
        return this.shownReadout;
    }

    // The polygon or line being drawn, for the overlay.
    get polygonDrawing() {
        return this.shownPolygon;
    }

    // The kinds menu. A drag or a polygon in progress keeps its kind.
    chooseKind(kind: ShapeToolKind) {
        if (kind === this.chosenKind) return;

        this.chosenKind = kind;
        this.options.increment();
        if (this.press === undefined) {
            this.showHover();
        }
    }

    activate(context: ToolContext) {
        this.context = context;
        this.turn = 0;
        context.openLevel.selection.clear();
    }

    // A drag in progress makes nothing, as with Esc: nothing is placed until the release. A polygon in
    // progress is finished open and kept.
    deactivate() {
        this.press = undefined;
        this.polygonPress = undefined;
        this.finishPolygon(false, 'keep');
        this.lastInput = undefined;
        this.clearPreview();
    }

    pointerDown(input: LevelPointerInput) {
        const context = this.context;
        if (context === undefined || input.button !== 'left') return;
        if (this.press !== undefined || this.polygonPress !== undefined) return;

        const kind = this.chosenKind;
        if (this.polygon === undefined && this.refusesNewShape(context)) return;

        if (kind === 'polygon' || this.polygon !== undefined) {
            this.polygonPress = input;
            this.lastInput = input;
            return;
        }

        const space = this.groupSpace();
        if (space === undefined) return;

        const start = space.toGroup.apply(this.snapped(input.levelPosition, sizingModifiers(input.modifiers)));
        this.press = { kind, screenPosition: input.screenPosition, start, space, dragging: false };
        this.lastInput = input;
        this.show({
            shape: { drawing: placedDrawing(kind, this.sizes[kind], start, this.turn), toLevel: space.toLevel },
        });
    }

    pointerMove(input: LevelPointerInput) {
        this.lastInput = input;
        const press = this.press;
        if (press === undefined) {
            this.showHover(input.modifiers);
            return;
        }

        if (!press.dragging && !hasMovedFarEnough(press, input)) return;

        press.dragging = true;
        this.drag(press, input, input.modifiers);
    }

    pointerUp(input: LevelPointerInput) {
        if (input.button !== 'left') return;

        const polygonPress = this.polygonPress;
        if (polygonPress !== undefined) {
            this.polygonPress = undefined;
            this.polygonClick(polygonPress);
            return;
        }

        const press = this.press;
        if (press === undefined) return;

        this.press = undefined;
        this.lastInput = input;
        const drawing = press.dragging
            ? this.release(press, input)
            : placedDrawing(press.kind, this.sizes[press.kind], press.start, this.turn);
        this.clearPreview();
        this.make(drawing, 'return');
    }

    // Shift, Alt and Ctrl change a drag or the polygon's next point at once, without waiting for the mouse
    // to move. Z and X turn the preview, and W, A, S and D size it. While a polygon is drawn, Enter finishes it as a line and Backspace
    // removes the last point.
    keyDown(key: ToolKey) {
        this.redrawFor(key);

        const degrees = previewTurnOf(key);
        if (degrees !== undefined) {
            this.turnBy(degrees);
            return true;
        }

        const gridSize = this.context?.openLevel.level.editorData.gridSize;
        const step = gridSize === undefined ? undefined : previewStepOf(key, gridSize);
        if (step !== undefined) {
            this.sizeBy(step);
            return true;
        }

        if (this.polygon === undefined) return false;

        if (key.code === 'Enter' || key.code === 'NumpadEnter') {
            this.finishPolygon(false, 'return');
            return true;
        }

        if (key.code === 'Backspace') {
            this.removeLastPoint();
            return true;
        }

        return false;
    }

    keyUp(key: ToolKey) {
        this.redrawFor(key);
    }

    // Ctrl+Z removes the polygon's last point and makes no step. A box drag holds the mouse, so Ctrl+Z
    // does nothing then, as it does during the Select tool's drags.
    undoDrawingStep() {
        if (this.press !== undefined) return true;
        if (this.polygon === undefined) return false;

        this.removeLastPoint();

        return true;
    }

    // Esc during a drag ends it with nothing made, and during a press for a polygon's point drops that
    // point. Esc during a polygon finishes it open and keeps it: no key throws work away.
    cancel() {
        if (this.press !== undefined) {
            this.press = undefined;
            this.showHover();
            return true;
        }

        if (this.polygonPress !== undefined) {
            this.polygonPress = undefined;
            return true;
        }

        if (this.polygon === undefined) return false;

        this.finishPolygon(false, 'keep');

        return true;
    }

    // The second click of a double-click adds no point and finishes the drawing open. A click on the
    // first point closes it from 3 points on, and is ignored before that.
    private polygonClick(input: LevelPointerInput) {
        this.lastInput = input;
        const polygon = this.polygon;
        if (polygon === undefined) {
            this.startPolygon(input);
            return;
        }

        if (input.clickCount >= 2) {
            this.finishPolygon(false, 'return');
            return;
        }

        if (this.isNearFirst(polygon, input.levelPosition)) {
            if (polygon.points.length >= 3) {
                this.finishPolygon(true, 'return');
            }
            return;
        }

        if (polygon.points.length >= MAX_POINTS) {
            this.context?.status.show(TOO_MANY_POINTS);
            return;
        }

        const point = this.nextPoint(polygon, input.levelPosition, input.modifiers);
        const last = polygon.points.at(-1);
        // A second click in the same place would make a segment of no length.
        if (last !== undefined && samePoint(last, point)) return;

        this.polygon = { points: [...polygon.points, point], space: polygon.space };
        this.showHover();
    }

    private startPolygon(input: LevelPointerInput) {
        const space = this.groupSpace();
        if (space === undefined) return;

        const first = space.toGroup.apply(this.snapped(input.levelPosition, input.modifiers));
        this.polygon = { points: [first], space };
        this.showHover();
    }

    // A closed polygon needs 3 points and a line 2; with fewer, nothing is made.
    private finishPolygon(closed: boolean, way: FinishWay) {
        const polygon = this.polygon;
        if (polygon === undefined) return;

        this.polygon = undefined;
        this.showHover();
        const fewest = closed ? 3 : 2;
        if (polygon.points.length < fewest) return;

        this.make(pointsDrawing(polygon.points, closed, this.turn), way);
    }

    // Removing the only point ends the drawing with nothing made.
    private removeLastPoint() {
        const polygon = this.polygon;
        if (polygon === undefined) return;

        const points = polygon.points.slice(0, -1);
        this.polygon = points.length === 0 ? undefined : { points, space: polygon.space };
        this.showHover();
    }

    // Measured on screen, so the ring is as easy to hit at any zoom.
    private isNearFirst(polygon: PolygonInProgress, levelPosition: Point) {
        const first = polygon.points[0];
        const context = this.context;
        if (first === undefined || context === undefined) return false;

        const firstInLevel = polygon.space.toLevel.apply(first);
        const distance = Math.hypot(levelPosition.x - firstInLevel.x, levelPosition.y - firstInLevel.y);

        return distance * context.view.zoom <= CLOSE_PX;
    }

    // Snapped as a point, or with Shift at a multiple of 15° from the last point, unsnapped.
    private nextPoint(polygon: PolygonInProgress, levelPosition: Point, modifiers: Modifiers) {
        const last = polygon.points.at(-1);
        if (modifiers.shift && last !== undefined) {
            return angleLocked(last, polygon.space.toGroup.apply(levelPosition));
        }

        return polygon.space.toGroup.apply(this.snapped(levelPosition, modifiers));
    }

    // A read-only level, or a locked current group, takes no new shape, so no drawing starts.
    private refusesNewShape(context: ToolContext) {
        const reason = lockedReason(context);
        if (reason === undefined) return false;

        context.status.show(reason);

        return true;
    }

    private drag(press: Press, input: LevelPointerInput, modifiers: Modifiers) {
        const kind = press.kind;
        const box = this.boxOf(press, input, modifiers);
        const drawing = placedDrawing(kind, box.size, box.centre, this.turn);
        const text =
            kind === 'circle'
                ? diameterReadout(box.size.width)
                : sizeReadout({ x: box.size.width, y: box.size.height });
        this.show({ shape: { drawing, toLevel: press.space.toLevel }, readout: { text, at: input.levelPosition } });
    }

    private release(press: Press, input: LevelPointerInput) {
        const box = this.boxOf(press, input, input.modifiers);
        const size = atLeastOnePixel(box.size);
        this.sizes[press.kind] = size;

        return placedDrawing(press.kind, size, box.centre, this.turn);
    }

    // Ctrl+Shift draws from the centre, as Alt does, with snapping on.
    private boxOf(press: Press, input: LevelPointerInput, held: Modifiers) {
        const modifiers = sizingModifiers(held);
        const corner = press.space.toGroup.apply(this.snapped(input.levelPosition, modifiers));

        const { shift, alt } = modifiers;

        return draggedBox({ kind: press.kind, start: press.start, corner, shift, alt, rotation: this.turn });
    }

    // Z or X: the preview turns around its centre, clockwise on screen when the degrees are positive, so in
    // a mirrored group the turn is stored the other way. A polygon's placed points turn with it.
    private turnBy(degrees: number) {
        const space = this.press?.space ?? this.polygon?.space ?? this.groupSpace();
        const direction = space !== undefined && space.toLevel.determinant() < 0 ? -1 : 1;
        const turn = degrees * direction;
        const polygon = this.polygon;
        if (polygon !== undefined) {
            this.polygon = { points: turnedPoints(polygon.points, this.turn, turn), space: polygon.space };
        }
        this.turn += turn;
        this.redrawPreview();
    }

    // W, A, S or D: the size a click places grows or shrinks along the preview's own axes, centred on the
    // mouse, and is remembered as a drag's size is. A polygon's placed points spread from their middle. During
    // a drag the mouse sets the size, so the keys do nothing then.
    private sizeBy(step: PreviewStep) {
        if (this.press?.dragging === true) return;

        const polygon = this.polygon;
        if (polygon !== undefined) {
            const points = steppedPoints(polygon.points, this.turn, step);
            if (points === undefined) return;

            this.polygon = { points, space: polygon.space };
            this.showHover();
            return;
        }

        const kind = this.press?.kind ?? this.chosenKind;
        if (kind === 'polygon') return;

        const size = steppedBoxSize(kind, this.sizes[kind], step);
        if (size === undefined) return;

        this.sizes[kind] = size;
        this.redrawPreview();
    }

    private redrawPreview() {
        const press = this.press;
        const input = this.lastInput;
        if (press === undefined) {
            this.showHover();
            return;
        }

        if (press.dragging && input !== undefined) {
            this.drag(press, input, input.modifiers);
            return;
        }

        const drawing = placedDrawing(press.kind, this.sizes[press.kind], press.start, this.turn);
        this.show({ shape: { drawing, toLevel: press.space.toLevel } });
    }

    // createShape selects the new shape; 'return' also hands it to the controller.
    private make(drawing: ShapeDrawing, way: FinishWay) {
        const context = this.context;
        if (context === undefined) return;

        const outcome = createShape(context.openLevel, context.reader, drawing);
        if (outcome.kind === 'refused') {
            context.status.show(outcome.reason);
            return;
        }

        if (way === 'return') {
            context.finished([outcome.id]);
        }
    }

    private redrawFor(key: ToolKey) {
        const input = this.lastInput;
        if (!MODIFIER_CODES.has(key.code) || input === undefined) return;

        const modifiers = { shift: key.shift, alt: key.alt, ctrl: key.ctrl };
        const press = this.press;
        if (press === undefined) {
            this.showHover(modifiers);
            return;
        }

        if (press.dragging) {
            this.drag(press, input, modifiers);
        }
    }

    // The faded shape a click would place, centred on the snapped mouse, or the polygon so far and where
    // the next click adds a point.
    private showHover(modifiers?: Modifiers) {
        const input = this.lastInput;
        const kind = this.chosenKind;
        const held = modifiers ?? input?.modifiers;
        if (input === undefined || held === undefined) {
            this.show({ polygon: this.polygonPreview(undefined, undefined) });
            return;
        }

        if (kind === 'polygon' || this.polygon !== undefined) {
            this.show({ polygon: this.polygonPreview(input.levelPosition, held) });
            return;
        }

        const space = this.groupSpace();
        if (space === undefined) {
            this.clearPreview();
            return;
        }

        const centre = space.toGroup.apply(this.snapped(input.levelPosition, sizingModifiers(held)));
        this.show({
            shape: { drawing: placedDrawing(kind, this.sizes[kind], centre, this.turn), toLevel: space.toLevel },
        });
    }

    private polygonPreview(levelPosition: Point | undefined, modifiers: Modifiers | undefined) {
        const polygon = this.polygon;
        if (polygon === undefined) {
            const space = this.groupSpace();
            if (levelPosition === undefined || modifiers === undefined || space === undefined) return undefined;
            if (this.chosenKind !== 'polygon') return undefined;

            const next = space.toGroup.apply(this.snapped(levelPosition, modifiers));

            return { points: [], next, closing: false, toLevel: space.toLevel };
        }

        const toLevel = polygon.space.toLevel;
        if (levelPosition === undefined || modifiers === undefined) {
            return { points: polygon.points, next: undefined, closing: false, toLevel };
        }

        const closing = polygon.points.length >= 3 && this.isNearFirst(polygon, levelPosition);
        const next = closing ? polygon.points[0] : this.nextPoint(polygon, levelPosition, modifiers);

        return { points: polygon.points, next, closing, toLevel };
    }

    private snapped(levelPosition: Point, modifiers: Modifiers) {
        const context = this.context;
        if (context === undefined) return levelPosition;

        return context.snapper.snapPoint(levelPosition, context.view, { ctrlHeld: modifiers.ctrl }).point;
    }

    // Read at each press and move, since going into a group or moving it changes it. A group scaled to 0
    // has no inverse, and nothing is drawn in it.
    private groupSpace(): GroupSpace | undefined {
        const context = this.context;
        if (context === undefined) return undefined;

        const { caches, currentGroup } = context.openLevel;
        const toLevel = caches.worldMatrices.matrixOf(currentGroup.group);
        const toGroup = toLevel.invert();
        if (toGroup === undefined) return undefined;

        return { toLevel, toGroup };
    }

    private clearPreview() {
        this.show({});
    }

    // What isn't given is no longer drawn.
    private show(next: Shown) {
        const nothingBefore =
            this.shown === undefined && this.shownReadout === undefined && this.shownPolygon === undefined;
        const nothingNow = next.shape === undefined && next.readout === undefined && next.polygon === undefined;
        if (nothingBefore && nothingNow) return;

        this.shown = next.shape;
        this.shownReadout = next.readout;
        this.shownPolygon = next.polygon;
        this.preview.increment();
    }
}

type Shown = {
    readonly shape?: ShapePreview | undefined;
    readonly readout?: DragReadout | undefined;
    readonly polygon?: PolygonPreview | undefined;
};

function hasMovedFarEnough(press: Press, input: LevelPointerInput) {
    const dx = input.screenPosition.x - press.screenPosition.x;
    const dy = input.screenPosition.y - press.screenPosition.y;

    return Math.hypot(dx, dy) >= DRAW_START_PX;
}

function lockedReason(context: ToolContext) {
    const { currentGroup, caches, editor } = context.openLevel;
    if (editor.isReadOnly) return READ_ONLY_REASON;
    if (caches.hidden.isLocked(currentGroup.group)) return LOCKED;

    return undefined;
}
