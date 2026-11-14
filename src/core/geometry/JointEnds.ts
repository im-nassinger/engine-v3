import type { Point } from './Point.ts';

// Where a joint's two ends sit, in the joint's own space. A Hinge uses only A.
export type JointEnds = {
    readonly a: Point;
    readonly b: Point;
};
