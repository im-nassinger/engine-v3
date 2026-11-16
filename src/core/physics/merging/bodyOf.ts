import { BodyComponent } from '../../components/index.ts';
import type { Entity } from '../../level/index.ts';
import { mergesInto } from './mergesInto.ts';
import type { ParentOf } from './mergesInto.ts';

// The body the entity moves with in play: the one it merges into, else its own. undefined for an entity
// with no body on it or above it.
export function bodyOf(entity: Entity, parentOf?: ParentOf) {
    const mergedInto = mergesInto(entity, parentOf);
    if (mergedInto !== undefined) return mergedInto;

    return entity.hasComponent(BodyComponent) ? entity : undefined;
}
