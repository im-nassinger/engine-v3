import { BodyComponent } from '../../components/index.ts';
import type { Entity } from '../../level/index.ts';

// The body an entity's shapes merge into in play: the nearest entity above with a BodyComponent, groups
// without one skipped, unless the entity's own Merge is unticked. A body above that merges too is followed
// to the one it merges into, since only that one is built. undefined when nothing above has a body, or the
// entity is a body of its own.
export function mergesInto(entity: Entity): Entity | undefined {
    if (!mergesUp(entity)) return undefined;

    const nearest = nearestBodyAbove(entity);
    if (nearest === undefined) return undefined;

    return mergesInto(nearest) ?? nearest;
}

// False only for an entity with a BodyComponent whose Merge is unticked.
export function mergesUp(entity: Entity) {
    const body = entity.getComponent(BodyComponent);

    return body === undefined || body.get('merge');
}

function nearestBodyAbove(entity: Entity) {
    let ancestor = entity.parent;
    while (ancestor !== undefined && !ancestor.hasComponent(BodyComponent)) {
        ancestor = ancestor.parent;
    }

    return ancestor;
}
