import type { Unsubscribe } from '../../../../core/events/index.ts';
import type { Matrix2D, PathPoint, Point, ShapeGeometry } from '../../../../core/geometry/index.ts';

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

// A path being drawn with the pen, all in level positions, each handle measured from its point. points
// ends with the point being placed, if one is. next is where a click adds the next point, or the first
// point when closing is set. placing is the index of the point whose handles show: the one being placed,
// or the first during the closing drag. closing is set when a press now, or the press or drag in progress,
// closes the path. ends are the two ends of the open path the pen was picked with, before a press on one
// continues it.
export type ShownPenPreview = {
    readonly points: readonly PathPoint[];
    readonly next: Point | undefined;
    readonly placing: number | undefined;
    readonly closing: boolean;
    readonly ends: readonly ShownPenEnd[];
};

// An end of a kept open path, ringed; its ring fills while it is under the mouse.
export type ShownPenEnd = {
    readonly place: Point;
    readonly underMouse: boolean;
};

// A Pencil stroke being dragged, in level positions, exactly as dragged. closing is set when a release now
// closes the path.
export type ShownPencilStroke = {
    readonly points: readonly Point[];
    readonly closing: boolean;
};

// What the drawing preview overlay reads: the Shape tool's, the pen's or the Pencil's preview, when it is
// the active tool. The composition root builds it from the tools.
export type DrawingSource = {
    readonly shape: ShownShapePreview | undefined;
    readonly polygon: ShownPolygonPreview | undefined;
    readonly pen: ShownPenPreview | undefined;
    readonly pencil: ShownPencilStroke | undefined;
    // Any of the above changed.
    subscribe(listener: () => void): Unsubscribe;
};
