import type { Unsubscribe } from '../../../../core/events/index.ts';
import type { Matrix2D, Point } from '../../../../core/geometry/index.ts';

// A handle or a stop of a gradient, in level positions, with its #RRGGBBAA colour.
export type ShownGradientDot = {
    readonly position: Point;
    readonly colour: string;
};

// A radial gradient's edge: an ellipse around the centre in the entity's own space, with its radii along
// the box's own x and y, and the matrix from that space to level positions.
export type ShownGradientEdge = {
    readonly centre: Point;
    readonly radiusX: number;
    readonly radiusY: number;
    readonly toLevel: Matrix2D;
};

// The one selected entity's gradient handles: the start or centre, the end or radius dot, the stops between
// them, and for a radial gradient its edge.
export type ShownGradient = {
    readonly from: ShownGradientDot;
    readonly to: ShownGradientDot;
    readonly stops: readonly ShownGradientDot[];
    readonly edge: ShownGradientEdge | undefined;
};

// What the gradient handle overlay reads: the Select tool's gradient handles, when they show. The
// composition root builds it from the selection, the caches and the card folds.
export type GradientSource = {
    readonly gradient: ShownGradient | undefined;
    subscribe(listener: () => void): Unsubscribe;
};
