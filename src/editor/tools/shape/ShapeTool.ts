import { VersionCounter } from '../../../core/events/index.ts';
import type { Matrix2D, Point } from '../../../core/geometry/index.ts';
import { createShape } from '../../commands/index.ts';
import type { ShapeDrawing } from '../../commands/index.ts';
import type { DragReadout } from '../readout/DragReadout.ts';
import { diameterReadout, sizeReadout } from '../readout/readoutText.ts';
import type { LevelPointerInput, Modifiers, Tool, ToolContext, ToolKey } from '../Tool.ts';

import { atLeastOnePixel, draggedBox, placedDrawing } from './boxDrawing.ts';
import type { BoxKind, BoxSize } from './boxDrawing.ts';

// The options strip's three kinds. A line is a polygon finished open.
export type ShapeToolKind = BoxKind | 'polygon';

// What the tool draws over the level: the shape a click or the drag in progress would make, in the current
// group's own space, and the matrix from that space to level positions.
export type ShapePreview = {
    readonly drawing: ShapeDrawing;
    readonly toLevel: Matrix2D;
};

// The requirement's "a press that moves less than 4 px is a click", in screen pixels.
export const DRAW_START_PX = 4;

const LOCKED = 'This group is locked';

const BOX_HINT = 'Click to place, drag to size. Shift keeps proportions, Alt draws from the centre.';
const POLYGON_HINT = 'Click to add points. Click the first point to close it, Enter to finish as a line.';

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

// Draws the four kinds a ShapeComponent holds. This step builds the rectangle and the circle: a click places
// the remembered size centred on the mouse, a drag sets a new size. Finishing runs createShape, one step,
// and the controller selects the shape and returns to Select unless the tool is locked.
export class ShapeTool implements Tool {
    readonly id = 'shape';
    readonly preview = new VersionCounter();
    // Moves when the kind changes, for the options strip and the hint.
    readonly options = new VersionCounter();
    private chosenKind: ShapeToolKind = 'rectangle';
    // Remembered for the session, each kind its own.
    private readonly sizes: Record<BoxKind, BoxSize> = { rectangle: FIRST_SIZE, circle: FIRST_SIZE };
    private context: ToolContext | undefined;
    private press: Press | undefined;
    // The last mouse position heard, so Shift, Alt and Ctrl redraw the drag without a move.
    private lastInput: LevelPointerInput | undefined;
    private shown: ShapePreview | undefined;
    private shownReadout: DragReadout | undefined;

    get hint() {
        return this.chosenKind === 'polygon' ? POLYGON_HINT : BOX_HINT;
    }

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

    // The options strip. A drag in progress keeps its kind.
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
        context.openLevel.selection.clear();
    }

    // A drag in progress makes nothing, as with Esc: nothing is placed until the release.
    deactivate() {
        this.press = undefined;
        this.lastInput = undefined;
        this.show(undefined, undefined);
    }

    pointerDown(input: LevelPointerInput) {
        const context = this.context;
        if (context === undefined || input.button !== 'left') return;
        if (this.press !== undefined) return;

        const kind = this.chosenKind;
        if (kind === 'polygon') return;

        const { currentGroup, caches } = context.openLevel;
        if (caches.hidden.isLocked(currentGroup.group)) {
            context.status.show(LOCKED);
            return;
        }

        const space = this.groupSpace();
        if (space === undefined) return;

        const start = space.toGroup.apply(this.snapped(input.levelPosition, input.modifiers));
        this.press = { kind, screenPosition: input.screenPosition, start, space, dragging: false };
        this.lastInput = input;
        this.show({ drawing: placedDrawing(kind, this.sizes[kind], start), toLevel: space.toLevel }, undefined);
    }

    pointerMove(input: LevelPointerInput) {
        this.lastInput = input;
        const press = this.press;
        if (press === undefined) {
            this.showHover();
            return;
        }

        if (!press.dragging && !hasMovedFarEnough(press, input)) return;

        press.dragging = true;
        this.drag(press, input, input.modifiers);
    }

    pointerUp(input: LevelPointerInput) {
        const press = this.press;
        if (press === undefined || input.button !== 'left') return;

        this.press = undefined;
        this.lastInput = input;
        const drawing = press.dragging
            ? this.release(press, input)
            : placedDrawing(press.kind, this.sizes[press.kind], press.start);
        this.show(undefined, undefined);
        this.finish(drawing);
    }

    // Shift, Alt and Ctrl change a drag at once, without waiting for the mouse to move. No key is used.
    keyDown(key: ToolKey) {
        this.redrawFor(key);

        return false;
    }

    keyUp(key: ToolKey) {
        this.redrawFor(key);
    }

    // Esc during a drag ends it with nothing made.
    cancel() {
        if (this.press === undefined) return false;

        this.press = undefined;
        this.showHover();

        return true;
    }

    private drag(press: Press, input: LevelPointerInput, modifiers: Modifiers) {
        const kind = press.kind;
        const box = this.boxOf(press, input, modifiers);
        const drawing = placedDrawing(kind, box.size, box.centre);
        const text =
            kind === 'circle'
                ? diameterReadout(box.size.width)
                : sizeReadout({ x: box.size.width, y: box.size.height });
        this.show({ drawing, toLevel: press.space.toLevel }, { text, at: input.levelPosition });
    }

    private release(press: Press, input: LevelPointerInput) {
        const box = this.boxOf(press, input, input.modifiers);
        const size = atLeastOnePixel(box.size);
        this.sizes[press.kind] = size;

        return placedDrawing(press.kind, size, box.centre);
    }

    private boxOf(press: Press, input: LevelPointerInput, modifiers: Modifiers) {
        const corner = press.space.toGroup.apply(this.snapped(input.levelPosition, modifiers));

        return draggedBox({ kind: press.kind, start: press.start, corner, shift: modifiers.shift, alt: modifiers.alt });
    }

    private finish(drawing: ShapeDrawing) {
        const context = this.context;
        if (context === undefined) return;

        const outcome = createShape(context.openLevel, context.reader, drawing);
        if (outcome.kind === 'refused') {
            context.status.show(outcome.reason);
            return;
        }

        context.finished([outcome.id]);
    }

    private redrawFor(key: ToolKey) {
        const press = this.press;
        const input = this.lastInput;
        if (!MODIFIER_CODES.has(key.code) || press === undefined || input === undefined || !press.dragging) return;

        this.drag(press, input, { shift: key.shift, alt: key.alt, ctrl: key.ctrl });
    }

    // The faded shape a click would place, centred on the snapped mouse.
    private showHover() {
        const input = this.lastInput;
        const kind = this.chosenKind;
        const space = this.groupSpace();
        if (input === undefined || kind === 'polygon' || space === undefined) {
            this.show(undefined, undefined);
            return;
        }

        const centre = space.toGroup.apply(this.snapped(input.levelPosition, input.modifiers));
        this.show({ drawing: placedDrawing(kind, this.sizes[kind], centre), toLevel: space.toLevel }, undefined);
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

    private show(drawing: ShapePreview | undefined, readout: DragReadout | undefined) {
        const unchanged =
            drawing === undefined &&
            this.shown === undefined &&
            readout === undefined &&
            this.shownReadout === undefined;
        if (unchanged) return;

        this.shown = drawing;
        this.shownReadout = readout;
        this.preview.increment();
    }
}

function hasMovedFarEnough(press: Press, input: LevelPointerInput) {
    const dx = input.screenPosition.x - press.screenPosition.x;
    const dy = input.screenPosition.y - press.screenPosition.y;

    return Math.hypot(dx, dy) >= DRAW_START_PX;
}
