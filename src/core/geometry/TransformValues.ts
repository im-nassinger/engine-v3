import type { Point } from './Point.ts';

// The four values of a TransformComponent, measured from the parent. Angles are in degrees,
// clockwise on screen, and skew is strictly between -90 and 90.
export type TransformValues = {
    readonly position: Point;
    readonly rotation: number;
    readonly scale: Point;
    readonly skew: number;
};
