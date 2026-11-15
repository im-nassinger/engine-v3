import type { Bounds, Point } from '../../../core/geometry/index.ts';

// What counts as hitting one entity, in level positions, already sized for the zoom it was built for.
export type HitArea = {
    touchesPoint(point: Point): boolean;
    touchesBox(box: Bounds): boolean;
};
