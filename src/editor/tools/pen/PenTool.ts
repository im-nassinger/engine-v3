import { VersionCounter } from '../../../core/events/index.ts';
import type { PathGeometry, PathPoint, Point } from '../../../core/geometry/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import { createPath, extendPath } from '../../commands/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';
import { angleLocked } from '../shape/polygonDrawing.ts';
import type { LevelPointerInput, Modifiers, Tool, ToolContext, ToolKey } from '../Tool.ts';

import { inStoredOrder, keptIdOf, keptPathOf, reversedPoints } from './penContinuing.ts';
import type { ContinuedPath, KeptPath } from './penContinuing.ts';
import { pointToLevel, withOpenEnds } from './penPoints.ts';
import type { GroupSpace, PathInProgress } from './penPoints.ts';
import { PenIdleState } from './states/PenIdleState.ts';
import type { PenState, PenStateHost } from './states/PenState.ts';

// A press this close to the first point's middle closes the path: the 12 px ring with a little room.
export const CLOSE_PX = 8;

const LOCKED = 'This group is locked';

// Shown in the message pill when the pen is picked, since no tool has a lasting hint.
export const PEN_HINT = 'Click for a corner, drag for a curve. Click the first point to close. Enter finishes.';

const MODIFIER_CODES = new Set(['ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'ControlLeft', 'ControlRight']);

// What the pen draws over the level, all in level positions, each handle measured from its point. points
// holds the point being placed at its end, or the first point as the closing drag reshapes it. next is
// where a click adds the next point, or the first point when a press there would close the path; it is
// undefined during a press or a drag, and before the mouse is over the level. placing is the index of the
// point whose handles show: the one being placed, or the first during the closing drag. ends are the
// two ends of the open path the pen was picked with, ringed until a press on one continues it.
export type PenDrawing = {
    readonly points: readonly PathPoint[];
    readonly next: Point | undefined;
    readonly placing: number | undefined;
    readonly closing: boolean;
    readonly ends: readonly PenEnd[];
};

// An end of a kept open path; a press on the one under the mouse continues the path from it.
export type PenEnd = {
    readonly place: Point;
    readonly underMouse: boolean;
};

// What finishing does next: the controller selects the path and returns to Select, or the tool only keeps
// it, for Esc and for deactivate, which the controller calls while it switches tools.
type FinishWay = 'return' | 'keep';

// Where a click would add the next point, and whether a press there would close the path.
type NextPlace = {
    readonly next: Point | undefined;
    readonly closing: boolean;
};

// The Bézier pen: a click places a sharp point, a drag a smooth one with mirrored handles; a press on the
// first point closes the path. Finishing runs createPath, one step, and the controller selects the path and
// returns to Select unless the tool is locked. The drawing stays in the tool until then, in the current
// group's own space. Picked with one open path selected, the pen keeps it and rings its ends: a press on
// either continues it, and finishing runs extendPath, one step.
export class PenTool implements Tool {
    readonly id = 'pen';
    readonly preview = new VersionCounter();
    private toolContext: ToolContext | undefined;
    private drawing: PathInProgress | undefined;
    // The open path the pen was picked with, until a press elsewhere starts a new path.
    private kept: EntityId | undefined;
    // Set while the drawing continues the kept path.
    private continued: ContinuedPath | undefined;
    private state: PenState;
    // The last mouse position heard, so Shift, Alt and Ctrl redraw without a move.
    private lastInput: LevelPointerInput | undefined;
    private shown: PenDrawing | undefined;
    private readonly host: PenStateHost;

    constructor() {
        this.host = this.buildHost();
        this.state = new PenIdleState(this.host);
    }

    // The path being drawn, for the overlay.
    get penDrawing() {
        return this.shown;
    }

    activate(context: ToolContext) {
        this.toolContext = context;
        this.kept = keptIdOf(context.openLevel);
        if (this.kept === undefined) {
            context.openLevel.selection.clear();
        }
        context.status.show(PEN_HINT);
        this.goIdle();
    }

    // A drag in progress drops the point being placed; the drawing is finished open and kept.
    deactivate() {
        this.finish('keep');
        this.kept = undefined;
        this.lastInput = undefined;
        this.show(undefined);
    }

    pointerDown(input: LevelPointerInput) {
        if (this.toolContext === undefined) return;

        this.lastInput = input;
        this.state.pointerDown(input);
    }

    pointerMove(input: LevelPointerInput) {
        this.lastInput = input;
        this.state.pointerMove(input);
    }

    pointerUp(input: LevelPointerInput) {
        this.lastInput = input;
        this.state.pointerUp(input);
    }

    // Shift, Alt and Ctrl redraw at once. Space is the drag's while the button is down. Enter finishes the
    // drawing open, and Backspace removes the last point.
    keyDown(key: ToolKey) {
        this.modifiersFrom(key);
        if (this.state.keyDown(key)) return true;
        if (this.state.isPressed || this.drawing === undefined) return false;

        if (key.code === 'Enter' || key.code === 'NumpadEnter') {
            this.finish('return');
            return true;
        }

        if (key.code === 'Backspace') {
            this.removeLastPoint();
            return true;
        }

        return false;
    }

    keyUp(key: ToolKey) {
        this.state.keyUp(key);
        this.modifiersFrom(key);
    }

    // Ctrl+Z removes the last point and makes no step. A drag holds the mouse, so Ctrl+Z does nothing then.
    undoDrawingStep() {
        if (this.state.isPressed) return true;
        if (this.drawing === undefined) return false;

        this.removeLastPoint();

        return true;
    }

    // Esc during a drag drops the point being placed, and Esc during a drawing finishes it open: no key
    // throws placed points away.
    cancel() {
        if (this.state.isPressed) {
            this.state.cancel();
            return true;
        }

        if (this.drawing === undefined) return false;

        this.finish('keep');

        return true;
    }

    private buildHost(): PenStateHost {
        // Read when used, so the states see the drawing as it is now.
        const context = () => this.requireContext();
        const path = () => this.drawing;

        return {
            get context() {
                return context();
            },
            get path() {
                return path();
            },
            goTo: (state) => {
                this.state = state;
                this.redraw();
            },
            goIdle: () => {
                this.goIdle();
            },
            addPoint: (point, space) => {
                const drawing = this.drawing;
                this.drawing = { points: [...(drawing?.points ?? []), point], space: drawing?.space ?? space };
            },
            close: (first) => {
                this.close(first);
            },
            finishKeeping: () => {
                this.finish('keep');
            },
            finishOpen: () => {
                this.finish('return');
            },
            redraw: () => {
                this.redraw();
            },
            spaceForPress: () => this.drawing?.space ?? this.groupSpace(),
            nextPlace: (levelPosition, modifiers, space) => this.nextPlace(levelPosition, modifiers, space),
            isNearFirst: (levelPosition) => this.isNearFirst(levelPosition),
            refusesNewPath: () => this.refusesNewPath(),
            continueFrom: (levelPosition) => this.continueFrom(levelPosition),
        };
    }

    private requireContext() {
        const context = this.toolContext;
        if (context === undefined) throw new Error('The pen is not active.');

        return context;
    }

    private goIdle() {
        this.state = new PenIdleState(this.host);
        this.redraw();
    }

    private close(first: PathPoint) {
        const drawing = this.drawing;
        if (drawing === undefined) return;

        const continued = this.continued;
        this.drawing = undefined;
        this.continued = undefined;
        this.goIdle();
        this.make({ closed: true, points: [first, ...drawing.points.slice(1)] }, 'return', continued);
    }

    // An open path needs 2 points; with fewer, nothing is made.
    private finish(way: FinishWay) {
        const drawing = this.drawing;
        const continued = this.continued;
        this.drawing = undefined;
        this.continued = undefined;
        this.goIdle();
        if (drawing === undefined || drawing.points.length < 2) return;

        this.make({ closed: false, points: withOpenEnds(drawing.points) }, way, continued);
    }

    // Removing the only point ends the drawing with nothing made. A continued path's own points stay.
    private removeLastPoint() {
        const drawing = this.drawing;
        if (drawing === undefined) return;

        const ownCount = this.continued?.ownCount ?? 0;
        if (drawing.points.length <= ownCount) return;

        const points = drawing.points.slice(0, -1);
        this.drawing = points.length === 0 ? undefined : { points, space: drawing.space };
        this.redraw();
    }

    // createPath selects the new path; 'return' also hands it to the controller.
    private make(path: PathGeometry, way: FinishWay, continued: ContinuedPath | undefined) {
        if (continued !== undefined) {
            this.extend(path, way, continued);
            return;
        }

        const context = this.requireContext();
        const outcome = createPath(context.openLevel, context.reader, path);
        if (outcome.kind === 'refused') {
            context.status.show(outcome.reason);
            return;
        }

        if (way === 'return') {
            context.finished([outcome.id]);
        }
    }

    // The path stays selected. Kept open, after Esc, its ends are ringed again.
    private extend(path: PathGeometry, way: FinishWay, continued: ContinuedPath) {
        const context = this.requireContext();
        const { entity } = continued;
        const stored = inStoredOrder(path, continued);
        const outcome = extendPath(context.openLevel, entity, stored);
        if (outcome.kind === 'refused') {
            context.status.show(outcome.reason);
            return;
        }

        if (way === 'return') {
            context.finished([entity.id]);
            return;
        }

        this.kept = keptIdOf(context.openLevel);
        this.redraw();
    }

    // A press within 8 screen px of a kept path's end starts drawing from it, the nearer end when both
    // are; the press adds no point. A press elsewhere lets the path go and starts a new one.
    private continueFrom(levelPosition: Point) {
        const kept = this.keptPath();
        this.kept = undefined;
        if (kept === undefined) return false;

        const end = this.endUnder(kept, levelPosition);
        if (end === undefined) return false;

        const points = kept.path.points;
        const reversed = end === 'first';
        let drawnPoints = points;
        if (reversed) {
            drawnPoints = reversedPoints(points);
        }
        this.drawing = { points: drawnPoints, space: kept.space };
        this.continued = { entity: kept.entity, ownCount: points.length, reversed };
        this.redraw();

        return true;
    }

    private keptPath(): KeptPath | undefined {
        const kept = this.kept;
        if (kept === undefined || this.toolContext === undefined) return undefined;

        return keptPathOf(this.toolContext.openLevel, kept);
    }

    private endUnder(kept: KeptPath, levelPosition: Point) {
        const first = kept.path.points[0];
        const last = kept.path.points.at(-1);
        if (first === undefined || last === undefined) return undefined;

        const toFirst = this.screenDistance(kept.space.toLevel.apply(first), levelPosition);
        const toLast = this.screenDistance(kept.space.toLevel.apply(last), levelPosition);
        if (Math.min(toFirst, toLast) > CLOSE_PX) return undefined;
        if (toLast <= toFirst) return 'last';

        return 'first';
    }

    private screenDistance(from: Point, to: Point) {
        const distance = Math.hypot(to.x - from.x, to.y - from.y);

        return distance * this.requireContext().view.zoom;
    }

    // Snapped as a point, or with Shift at a multiple of 15° from the last point, unsnapped.
    private nextPlace(levelPosition: Point, modifiers: Modifiers, space: GroupSpace) {
        const last = this.drawing?.points.at(-1);
        if (modifiers.shift && last !== undefined) return angleLocked(last, space.toGroup.apply(levelPosition));

        const context = this.requireContext();
        const snapped = context.snapper.snapPoint(levelPosition, context.view, { ctrlHeld: modifiers.ctrl }).point;

        return space.toGroup.apply(snapped);
    }

    // Measured on screen, so the ring is as easy to hit at any zoom.
    private isNearFirst(levelPosition: Point) {
        const drawing = this.drawing;
        const first = drawing?.points[0];
        if (drawing === undefined || first === undefined) return false;

        const firstInLevel = drawing.space.toLevel.apply(first);

        return this.screenDistance(firstInLevel, levelPosition) <= CLOSE_PX;
    }

    private refusesNewPath() {
        const context = this.requireContext();
        const reason = lockedReason(context);
        if (reason === undefined) return false;

        context.status.show(reason);

        return true;
    }

    // Read at each new drawing, since going into a group or moving it changes it. A group scaled to 0 has
    // no inverse, and nothing is drawn in it.
    private groupSpace(): GroupSpace | undefined {
        const { caches, currentGroup } = this.requireContext().openLevel;
        const toLevel = caches.worldMatrices.matrixOf(currentGroup.group);
        const toGroup = toLevel.invert();
        if (toGroup === undefined) return undefined;

        return { toLevel, toGroup };
    }

    private modifiersFrom(key: ToolKey) {
        const input = this.lastInput;
        if (!MODIFIER_CODES.has(key.code) || input === undefined) return;

        const modifiers = { shift: key.shift, alt: key.alt, ctrl: key.ctrl };
        this.lastInput = { ...input, modifiers };
        this.state.modifiersChanged(input.levelPosition, modifiers);
    }

    private redraw() {
        this.show(this.drawingNow());
    }

    private drawingNow(): PenDrawing | undefined {
        if (this.toolContext === undefined) return undefined;

        const drawing = this.drawing;
        const placing = this.state.placing;
        const placed = drawing?.points ?? [];
        const space = drawing?.space ?? this.groupSpace();
        if (space === undefined) return undefined;

        const toLevel = (points: readonly PathPoint[]) => points.map((point) => pointToLevel(point, space.toLevel));
        if (placing?.kind === 'adding') {
            return {
                points: toLevel([...placed, placing.point]),
                next: undefined,
                placing: placed.length,
                closing: false,
                ends: [],
            };
        }
        if (placing?.kind === 'closing') {
            const points = toLevel([placing.first, ...placed.slice(1)]);

            return { points, next: undefined, placing: 0, closing: true, ends: [] };
        }
        if (this.state.isPressed) {
            return { points: toLevel(placed), next: undefined, placing: undefined, closing: true, ends: [] };
        }

        const ends = this.keptEnds();
        const isOverEnd = ends.some((end) => end.underMouse);
        let next: NextPlace = { next: undefined, closing: false };
        if (!isOverEnd) {
            next = this.nextOf(space);
        }

        return { points: toLevel(placed), ...next, placing: undefined, ends };
    }

    // The kept path's two ends in level positions, before a drawing starts.
    private keptEnds(): readonly PenEnd[] {
        if (this.drawing !== undefined) return [];

        const kept = this.keptPath();
        const first = kept?.path.points[0];
        const last = kept?.path.points.at(-1);
        if (kept === undefined || first === undefined || last === undefined) return [];

        const mouse = this.lastInput?.levelPosition;
        let under: 'first' | 'last' | undefined;
        if (mouse !== undefined) {
            under = this.endUnder(kept, mouse);
        }

        return [
            { place: kept.space.toLevel.apply(first), underMouse: under === 'first' },
            { place: kept.space.toLevel.apply(last), underMouse: under === 'last' },
        ];
    }

    // Where a click would go now, or the first point when a press there would close the path.
    private nextOf(space: GroupSpace): NextPlace {
        const input = this.lastInput;
        const drawing = this.drawing;
        if (input === undefined) return { next: undefined, closing: false };

        const first = drawing?.points[0];
        const closing = drawing !== undefined && drawing.points.length >= 3 && this.isNearFirst(input.levelPosition);
        if (closing && first !== undefined) return { next: space.toLevel.apply(first), closing };

        const next = space.toLevel.apply(this.nextPlace(input.levelPosition, input.modifiers, space));

        return { next, closing: false };
    }

    private show(next: PenDrawing | undefined) {
        if (this.shown === undefined && next === undefined) return;

        this.shown = next;
        this.preview.increment();
    }
}

function lockedReason(context: ToolContext) {
    const { currentGroup, caches, editor } = context.openLevel;
    if (editor.isReadOnly) return READ_ONLY_REASON;
    if (caches.hidden.isLocked(currentGroup.group)) return LOCKED;

    return undefined;
}
