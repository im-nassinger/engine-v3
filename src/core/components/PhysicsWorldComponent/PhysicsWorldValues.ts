import type { Point } from '../../geometry/index.ts';

// Gravity is one vector in m/s², so zero gravity is 0, 0 and keeps no direction. Pixels per metre is the
// one scale between the level's pixels and the physics' metres.
export type PhysicsWorldValues = {
    gravity: Point;
    walls: boolean;
    pixelsPerMetre: number;
};
