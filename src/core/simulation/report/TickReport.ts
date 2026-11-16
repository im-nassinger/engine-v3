import type { EntityId } from '../../fields/index.ts';
import type { Point } from '../../geometry/index.ts';

// Numbers per moved body in TickReport.poses: entity id, x, y, angle and the snap flag.
export const POSE_STRIDE = 5;

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
    readonly camera: Point;
};
