import type { EntityId } from '../../fields/index.ts';
import type { Point } from '../../geometry/index.ts';

// One piece of a surface in its body's space, in pixels. A polygon is convex with 3 to 8 points, in
// either order. A line is one of LineChains' chains, which the world adds as two-sided segments.
export type SurfacePiece =
    | { readonly kind: 'circle'; readonly center: Point; readonly radius: number }
    | { readonly kind: 'polygon'; readonly points: readonly Point[] }
    | { readonly kind: 'line'; readonly points: readonly Point[] };

// One entity's surface on a body: its collision pieces, moved into the body's space, and the
// SurfaceComponent's values. The entity is the surface's own, so contacts (v2) can name it.
export type SurfaceDefinition = {
    readonly entity: EntityId;
    readonly pieces: readonly SurfacePiece[];
    readonly density: number;
    readonly friction: number;
    readonly restitution: number;
    readonly sensor: boolean;
};
