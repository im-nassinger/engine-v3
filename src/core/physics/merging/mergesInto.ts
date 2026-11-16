import { BodyComponent } from '../../components/index.ts';
import type { Entity } from '../../level/index.ts';

// Where an entity sits: its parent in the level, or the parent a planned move would give it.
export type ParentOf = (entity: Entity) => Entity | undefined;

const parentInLevel: ParentOf = (entity) => entity.parent;

// The body an entity's shapes merge into in play: the nearest entity above with a BodyComponent, groups
// without one skipped, unless the entity's own Merge is unticked. A body above that merges too is followed
// to the one it merges into, since only that one is built. undefined when nothing above has a body, or the
// entity is a body of its own.
export function mergesInto(entity: Entity, parentOf: ParentOf = parentInLevel): Entity | undefined {
    if (!mergesUp(entity)) return undefined;

    const nearest = nearestBodyAbove(entity, parentOf);
    if (nearest === undefined) return undefined;

    return mergesInto(nearest, parentOf) ?? nearest;
}

// False only for an entity with a BodyComponent whose Merge is unticked.
export function mergesUp(entity: Entity) {
    const body = entity.getComponent(BodyComponent);

    return body === undefined || body.get('merge');
}

function nearestBodyAbove(entity: Entity, parentOf: ParentOf) {
    let ancestor = parentOf(entity);
    while (ancestor !== undefined && !ancestor.hasComponent(BodyComponent)) {
        ancestor = parentOf(ancestor);
    }

    return ancestor;
}
