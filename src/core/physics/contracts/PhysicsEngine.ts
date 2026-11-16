import type { Point } from '../../geometry/index.ts';

import type { PhysicsWorld } from './PhysicsWorld.ts';

// What a new physics world starts with. Gravity is in m/s², like the World's Gravity field.
export type WorldSettings = {
    readonly gravity: Point;
};

// The physics library, loaded once and then making one world per run.
export type PhysicsEngine = {
    load(): Promise<void>;
    createWorld(settings: WorldSettings): PhysicsWorld;
};
