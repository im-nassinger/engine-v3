import type { Unsubscribe } from '../../../../core/events/index.ts';
import type { Matrix2D, Point, ShapeGeometry } from '../../../../core/geometry/index.ts';

// A rectangle or circle a click or the drag in progress would make: its geometry around its own origin,
// where that origin goes in the current group's own space, turned by rotation degrees clockwise, and the
// matrix from that space to level positions.
export type ShownShapePreview = {
    readonly drawing: { readonly geometry: ShapeGeometry; readonly position: Point; readonly rotation: number };
    readonly toLevel: Matrix2D;
};

// A polygon or line being drawn point by point, in the current group's own space. next is where a click
// adds the next point, or the first point when closing is set. Before the first click there are no points.
export type ShownPolygonPreview = {
    readonly points: readonly Point[];
    readonly next: Point | undefined;
    readonly closing: boolean;
    readonly toLevel: Matrix2D;
};

// What the drawing preview overlay reads: the Shape tool's preview, when it is the active tool. The
// composition root builds it from the tools.
export type DrawingSource = {
    readonly shape: ShownShapePreview | undefined;
    readonly polygon: ShownPolygonPreview | undefined;
    // Either of the above changed.
    subscribe(listener: () => void): Unsubscribe;
};
