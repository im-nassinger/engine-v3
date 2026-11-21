import type { PathPoint, Point } from '../../../../core/geometry/index.ts';
import type { LevelPointerInput, Modifiers, ToolContext, ToolKey } from '../../Tool.ts';
import type { GroupSpace, PathInProgress } from '../penPoints.ts';

// What a pen state is given by the PenTool.
export type PenStateHost = {
    readonly context: ToolContext;
    // The points placed so far, or undefined before the first.
    readonly path: PathInProgress | undefined;
    goTo(state: PenState): void;
    goIdle(): void;
    // Adds the point at the end, starting the drawing in the space given when there is none.
    addPoint(point: PathPoint, space: GroupSpace): void;
    // Closes the path with its first point as given and finishes the drawing.
    close(first: PathPoint): void;
    // Esc or another tool during a drag: the point being placed is dropped, and the drawing finished open
    // with the points placed before it.
    finishKeeping(): void;
    // Enter, a double-click or a right-click: the drawing finished open, and the tool returns to Select.
    finishOpen(): void;
    redraw(): void;
    // The space the next point goes in: the drawing's, or the current group's for the first point.
    // undefined in a group scaled to 0, which has no inverse.
    spaceForPress(): GroupSpace | undefined;
    // Where a click would add the next point, in that space: snapped, or with Shift at a multiple of 15°
    // from the last point.
    nextPlace(levelPosition: Point, modifiers: Modifiers, space: GroupSpace): Point;
    // Within 8 screen px of the first point.
    isNearFirst(levelPosition: Point): boolean;
    // A read-only level or a locked group takes no new path; the status says why.
    refusesNewPath(): boolean;
};

// A left press on the level view.
export type PenPress = {
    readonly input: LevelPointerInput;
    // Where the point goes, in the drawing's space: snapped, or at 15° with Shift.
    readonly place: Point;
    readonly space: GroupSpace;
    // The first point, as placed, when the press closes the path on it.
    readonly closing: PathPoint | undefined;
};

// What the state in progress adds to the preview: the point being placed, or the first point being
// reshaped by the closing drag.
export type PenPlacing =
    { readonly kind: 'adding'; readonly point: PathPoint } | { readonly kind: 'closing'; readonly first: PathPoint };

// One of the pen's states (the State pattern). Only one is active at a time.
export type PenState = {
    // Whether the left button is down: a press or a handle drag.
    readonly isPressed: boolean;
    pointerDown(input: LevelPointerInput): void;
    pointerMove(input: LevelPointerInput): void;
    pointerUp(input: LevelPointerInput): void;
    // True when the state used the key.
    keyDown(key: ToolKey): boolean;
    keyUp(key: ToolKey): void;
    // Shift, Alt or Ctrl changed with the mouse still, at the mouse's last level position.
    modifiersChanged(levelPosition: Point, modifiers: Modifiers): void;
    // Esc.
    cancel(): void;
    readonly placing: PenPlacing | undefined;
};
