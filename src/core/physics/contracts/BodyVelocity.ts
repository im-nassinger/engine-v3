import type { Point } from '../../geometry/index.ts';

// How fast a body moves, in px/s, and spins, in degrees per second, clockwise on screen.
export type BodyVelocity = {
    readonly linear: Point;
    readonly spin: number;
};
