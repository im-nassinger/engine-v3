import type { Point } from './Point.ts';

export type ShapeKind = 'rectangle' | 'circle' | 'polygon' | 'line';

// Sizes and points are in the shape's own space, before its TransformComponent. A rectangle or a circle
// is centred on the origin. One value holds the kind and what that kind needs, so a rectangle can never
// hold points. There is no ellipse: an ellipse is a circle its TransformComponent scales unevenly.
export type ShapeGeometry =
    | { readonly kind: 'rectangle'; readonly width: number; readonly height: number }
    | { readonly kind: 'circle'; readonly radius: number }
    | { readonly kind: 'polygon'; readonly points: readonly Point[] }
    | { readonly kind: 'line'; readonly points: readonly Point[] };
