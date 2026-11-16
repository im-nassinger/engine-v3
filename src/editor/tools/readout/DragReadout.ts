import type { Point } from '../../../core/geometry/index.ts';

// The small box near the mouse during a drag: the distance moved, the new size or the angle. at is the
// mouse in level positions; the overlay draws the box 16 screen px below and right of it.
export type DragReadout = {
    readonly text: string;
    readonly at: Point;
};
