import type { EntityId } from '../../fields/index.ts';
import type { PathGeometry, Point } from '../../geometry/index.ts';

// Numbers per moved body in TickReport.poses: entity id, x, y, angle and the snap flag.
export const POSE_STRIDE = 5;

// A Rope or Spring's read-only path after its bodies moved, in the joint's own space.
export type JointPath = {
    readonly entity: EntityId;
    readonly path: PathGeometry;
};

// What the worker sends the page after a batch of ticks. Everything in it is plain data.
export type TickReport = {
    readonly lastTick: number;
    // Per body that moved during the batch, its latest pose in pixels and degrees, then 1 when the page
    // must draw it there without sliding from its last pose. In the order the bodies first moved.
    readonly poses: Float64Array;
    // Each entity removed with everything inside it, in the order removed: fully outside an open edge of
    // the level bounds, or past the hard limit.
    readonly removed: readonly EntityId[];
    // Those of removed that went past the hard limit, for the status bar's warning.
    readonly removedPastHardLimit: readonly EntityId[];
    // The latest path of each Rope and Spring whose path changed during the batch, in the order they first
    // changed. A path follows from its bodies' poses, so it is sent only to be drawn.
    readonly paths: readonly JointPath[];
    readonly camera: Point;
};
