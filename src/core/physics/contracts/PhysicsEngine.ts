import type { EntityId } from '../../fields/index.ts';
import type { Point } from '../../geometry/index.ts';

import type { PhysicsWorld } from './PhysicsWorld.ts';

// What a new physics world starts with. Gravity is in m/s², like the World's Gravity field. The surfaces
// whose shapes send contact events are known when the run starts, since Box2D reports every contact it is
// asked for and a contact keeps the switch it began with; none when left out.
export type WorldSettings = {
    readonly gravity: Point;
    readonly contactEventSurfaces?: ReadonlySet<EntityId>;
};

// The physics library, loaded once and then making one world per run.
export type PhysicsEngine = {
    load(): Promise<void>;
    createWorld(settings: WorldSettings): PhysicsWorld;
};
