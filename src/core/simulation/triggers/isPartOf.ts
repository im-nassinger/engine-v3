import type { EntityId } from '../../fields/index.ts';
import type { Entity, Level } from '../../level/index.ts';

// Whether the other entity is the owner, inside it, or holds it: a part of itself, which never touches or
// hits it. The World holds everything, but as the other entity it is the ground, the shapes with no body of
// their own.
export function isPartOf(level: Level, owner: Entity, other: EntityId) {
    const otherEntity = level.findEntity(other);
    if (otherEntity === undefined) return false;

    const isGround = otherEntity === level.world;
    const isSame = otherEntity === owner;
    const isInside = owner.isAncestorOf(otherEntity);
    const holdsOwner = !isGround && otherEntity.isAncestorOf(owner);

    return isSame || isInside || holdsOwner;
}
