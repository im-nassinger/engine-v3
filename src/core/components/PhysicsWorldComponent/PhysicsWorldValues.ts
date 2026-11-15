import type { Point } from '../../geometry/index.ts';

// Gravity is one vector in m/s², so zero gravity is 0, 0 and keeps no direction.
export type PhysicsWorldValues = {
    gravity: Point;
    walls: boolean;
};
