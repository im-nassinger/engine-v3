import type { Bounds, Point } from '../../core/geometry/index.ts';
import type { ViewState } from '../view/index.ts';

// For snapMove, `point` is the snapped offset; for snapPoint, the snapped point. Each axis says whether
// it moved to a snap target, so v3's guides know what to draw.
export type SnapResult = {
    readonly point: Point;
    readonly snappedX: boolean;
    readonly snappedY: boolean;
};

export type SnapOptions = {
    // Ctrl held during a drag turns snapping off until released.
    readonly ctrlHeld: boolean;
};

// Where a drag's edges and centre, or a single point, jump to. v1 has the grid; v3 adds entities.
export type Snapper = {
    snapMove(movingBounds: Bounds, offset: Point, view: ViewState, options: SnapOptions): SnapResult;
    snapPoint(point: Point, view: ViewState, options: SnapOptions): SnapResult;
};
