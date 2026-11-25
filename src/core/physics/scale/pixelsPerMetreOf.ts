import { DEFAULT_PIXELS_PER_METRE, PhysicsWorldComponent } from '../../components/index.ts';
import type { Entity } from '../../level/index.ts';

// The Pixels per metre of the level an entity is in: its World's, the root of the tree. The default when
// the World has no PhysicsWorldComponent, which only a hand-made test level lacks.
export function pixelsPerMetreOf(entity: Entity) {
    let world = entity;
    while (world.parent !== undefined) {
        world = world.parent;
    }

    return world.getComponent(PhysicsWorldComponent)?.get('pixelsPerMetre') ?? DEFAULT_PIXELS_PER_METRE;
}
