import { VersionCounter } from '../../../core/events/index.ts';
import { fitCurves } from '../../../core/geometry/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import { V1_LEVEL_LIMITS } from '../../../core/level-data/index.ts';
import { createPath } from '../../commands/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';
import { DRAW_START_PX } from '../shape/ShapeTool.ts';
import type { LevelPointerInput, Tool, ToolContext } from '../Tool.ts';

import {
    CLOSE_PX,
    SKIP_PX,
    SMOOTHNESS_TOLERANCE_PX,
    averageStretch,
    distance,
    withoutClosingTail,
} from './pencilStroke.ts';
import type { GroupSpace, PencilSmoothness } from './pencilStroke.ts';

// Shown in the message pill when the Pencil is picked, as the pen's hint is.
export const PENCIL_HINT = 'Drag to draw. End near the start to close.';

export const SMOOTHED_TEXT = 'Smoothed to stay within 2,000 points';

const LOCKED = 'This group is locked';
const MAX_POINTS = V1_LEVEL_LIMITS.maxPathPoints;

// What the Pencil draws over the level while a stroke is dragged: the points in level positions, exactly
// as dragged, and whether a release now would close the path.
export type PencilStrokePreview = {
    readonly points: readonly Point[];
    readonly closing: boolean;
};

// A stroke in progress. The level positions are for the preview and the closing test, the group's own
// for the fit; both keep the same points.
type Stroke = {
    readonly space: GroupSpace;
    readonly levelPoints: Point[];
    readonly groupPoints: Point[];
    readonly pressScreen: Point;
    // Set once the drag moved 4 px; until then a release makes nothing.
    dragging: boolean;
    // Set once the drag went beyond the closing ring, so a short scribble near its start stays open.
    leftStart: boolean;
};

// What finishing does next: the controller selects the path and returns to Select (or stays, locked), or
// the tool only makes it, for deactivate, which the controller calls while it switches tools.
type FinishWay = 'return' | 'keep';

// Freehand drawing: a drag collects points, and the release fits them into a few curves with fitCurves,
// at the chosen smoothness's tolerance on screen. A release near the press closes the path. Finishing runs
// createPath, the pen's edit, one step. The smoothness is kept for the session.
export class PencilTool implements Tool {
    readonly id = 'pencil';
    readonly preview = new VersionCounter();
    // Moves when the smoothness changes, for the kinds menu.
    readonly options = new VersionCounter();
    private toolContext: ToolContext | undefined;
    private chosenSmoothness: PencilSmoothness = 'medium';
    private stroke: Stroke | undefined;
    private shown: PencilStrokePreview | undefined;

    get smoothness() {
        return this.chosenSmoothness;
    }

    // The stroke being dragged, for the overlay.
    get pencilStroke() {
        return this.shown;
    }

    // The kinds menu. A stroke in progress is fitted at the smoothness chosen when it is released.
    chooseSmoothness(smoothness: PencilSmoothness) {
        if (smoothness === this.chosenSmoothness) return;

        this.chosenSmoothness = smoothness;
        this.options.increment();
    }

    activate(context: ToolContext) {
        this.toolContext = context;
        context.openLevel.selection.clear();
        context.status.show(PENCIL_HINT);
    }

    // Picking another tool or Play during a drag keeps the stroke.
    deactivate() {
        this.finish('keep');
        this.toolContext = undefined;
    }

    pointerDown(input: LevelPointerInput) {
        const context = this.toolContext;
        if (context === undefined || input.button !== 'left' || this.stroke !== undefined) return;
        if (this.refusesNewPath(context)) return;

        const space = groupSpaceOf(context);
        if (space === undefined) return;

        const level = input.levelPosition;
        this.stroke = {
            space,
            levelPoints: [level],
            groupPoints: [space.toGroup.apply(level)],
            pressScreen: input.screenPosition,
            dragging: false,
            leftStart: false,
        };
    }

    pointerMove(input: LevelPointerInput) {
        const stroke = this.stroke;
        if (stroke === undefined) return;

        if (!stroke.dragging) {
            if (distance(stroke.pressScreen, input.screenPosition) < DRAW_START_PX) return;

            stroke.dragging = true;
        }

        this.addPoint(stroke, input.levelPosition);
        this.redraw();
    }

    pointerUp(input: LevelPointerInput) {
        if (input.button !== 'left' || this.stroke === undefined) return;

        this.addPoint(this.stroke, input.levelPosition);
        this.finish('return');
    }

    keyDown() {
        return false;
    }

    keyUp() {
        // The Pencil has no keys of its own.
    }

    // A stroke holds the mouse, so Ctrl+Z does nothing during it.
    undoDrawingStep() {
        return this.stroke !== undefined;
    }

    // Esc during a drag drops the stroke: nothing is placed before the release.
    cancel() {
        if (this.stroke === undefined) return false;

        this.stroke = undefined;
        this.redraw();

        return true;
    }

    private addPoint(stroke: Stroke, levelPosition: Point) {
        const last = stroke.levelPoints.at(-1);
        if (last !== undefined && this.screenDistance(last, levelPosition) < SKIP_PX) return;

        stroke.levelPoints.push(levelPosition);
        stroke.groupPoints.push(stroke.space.toGroup.apply(levelPosition));
        const start = stroke.levelPoints[0];
        if (start !== undefined && this.screenDistance(start, levelPosition) > CLOSE_PX) {
            stroke.leftStart = true;
        }
    }

    private finish(way: FinishWay) {
        const stroke = this.stroke;
        this.stroke = undefined;
        this.redraw();
        const context = this.toolContext;
        if (stroke === undefined || context === undefined || !stroke.dragging) return;

        const closed = this.isClosing(stroke);
        const zoom = context.view.zoom * averageStretch(stroke.space.toLevel);
        const closeDistance = CLOSE_PX / zoom;
        const start = stroke.groupPoints[0];
        let points: readonly Point[] = stroke.groupPoints;
        if (closed && start !== undefined) {
            points = withoutClosingTail(stroke.groupPoints, start, closeDistance);
        }
        if (!hasTwoPlaces(points)) return;

        const tolerance = SMOOTHNESS_TOLERANCE_PX[this.chosenSmoothness] / zoom;
        const fit = fitCurves(points, { closed, tolerance, maxPoints: MAX_POINTS });
        const outcome = createPath(context.openLevel, context.reader, fit.path);
        if (outcome.kind === 'refused') {
            context.status.show(outcome.reason);
            return;
        }

        if (fit.toleranceRaised) {
            context.status.show(SMOOTHED_TEXT);
        }
        if (way === 'return') {
            context.finished([outcome.id]);
        }
    }

    private isClosing(stroke: Stroke) {
        const start = stroke.levelPoints[0];
        const last = stroke.levelPoints.at(-1);
        if (!stroke.leftStart || start === undefined || last === undefined) return false;

        return this.screenDistance(start, last) <= CLOSE_PX;
    }

    private screenDistance(from: Point, to: Point) {
        return distance(from, to) * (this.toolContext?.view.zoom ?? 1);
    }

    private refusesNewPath(context: ToolContext) {
        const reason = lockedReason(context);
        if (reason === undefined) return false;

        context.status.show(reason);

        return true;
    }

    private redraw() {
        const stroke = this.stroke;
        let next: PencilStrokePreview | undefined;
        if (stroke?.dragging === true) {
            next = { points: [...stroke.levelPoints], closing: this.isClosing(stroke) };
        }

        if (this.shown === undefined && next === undefined) return;

        this.shown = next;
        this.preview.increment();
    }
}

// fitCurves needs two different places.
function hasTwoPlaces(points: readonly Point[]) {
    const [first] = points;

    return first !== undefined && points.some((point) => point.x !== first.x || point.y !== first.y);
}

// Read at each stroke, since going into a group or moving it changes it. A group scaled to 0 has no
// inverse, and nothing is drawn in it.
function groupSpaceOf(context: ToolContext): GroupSpace | undefined {
    const { caches, currentGroup } = context.openLevel;
    const toLevel = caches.worldMatrices.matrixOf(currentGroup.group);
    const toGroup = toLevel.invert();
    if (toGroup === undefined) return undefined;

    return { toLevel, toGroup };
}

function lockedReason(context: ToolContext) {
    const { currentGroup, caches, editor } = context.openLevel;
    if (editor.isReadOnly) return READ_ONLY_REASON;
    if (caches.hidden.isLocked(currentGroup.group)) return LOCKED;

    return undefined;
}
