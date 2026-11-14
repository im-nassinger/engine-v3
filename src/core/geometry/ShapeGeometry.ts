import type { Point } from './Point.ts';

export type ShapeKind = 'rectangle' | 'ellipse' | 'polygon' | 'line';

// Sizes and points are in the shape's own space, before its TransformComponent. A rectangle or an
// ellipse is centred on the origin. One value holds the kind and what that kind needs, so a rectangle
// can never hold points.
export type ShapeGeometry =
    | { readonly kind: 'rectangle'; readonly width: number; readonly height: number }
    | { readonly kind: 'ellipse'; readonly width: number; readonly height: number }
    | { readonly kind: 'polygon'; readonly points: readonly Point[] }
    | { readonly kind: 'line'; readonly points: readonly Point[] };
