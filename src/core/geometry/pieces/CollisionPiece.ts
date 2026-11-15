import type { Point } from '../Point.ts';

// One convex part of a shape, as handed to the physics engine and drawn by the physics view, in the
// shape's own space. A circle is centred on the origin. A polygon has 3 to 8 points and a positive
// shoelace area, which is clockwise on screen with y down, the order Box2D wants.
export type CollisionPiece =
    | { readonly kind: 'circle'; readonly radius: number }
    | { readonly kind: 'polygon'; readonly points: readonly Point[] };
