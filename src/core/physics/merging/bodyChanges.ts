import { BodyComponent, SurfaceComponent } from '../../components/index.ts';
import type { Entity } from '../../level/index.ts';
import { mergesInto } from './mergesInto.ts';
import type { ParentOf } from './mergesInto.ts';

// One entity about to go into another parent. None of the moved entities is inside another one.
export type PlannedMove = {
    readonly entity: Entity;
    readonly newParent: Entity;
};

// How many of the moved entities, and of the entities inside them, would belong to another body in play
// once the moves are made: the level isn't changed. Only an entity with a BodyComponent or a
// SurfaceComponent counts, since a plain group has nothing to move with a body.
export function countBodyChanges(moves: readonly PlannedMove[]) {
    const newParents = new Map(moves.map((move) => [move.entity, move.newParent]));
    const parentAfter: ParentOf = (entity) => newParents.get(entity) ?? entity.parent;
    let count = 0;

    for (const move of moves) {
        for (const entity of withEverythingInside(move.entity)) {
            if (!takesPartInPhysics(entity)) continue;
            if (bodyOf(entity) === bodyOf(entity, parentAfter)) continue;

            count += 1;
        }
    }

    return count;
}

// The body the entity moves with in play: the one it merges into, else its own; undefined for a surface
// with no body on it or above it, which is Static.
function bodyOf(entity: Entity, parentOf?: ParentOf) {
    const mergedInto = mergesInto(entity, parentOf);
    if (mergedInto !== undefined) return mergedInto;

    return entity.hasComponent(BodyComponent) ? entity : undefined;
}

function takesPartInPhysics(entity: Entity) {
    return entity.hasComponent(BodyComponent) || entity.hasComponent(SurfaceComponent);
}

function* withEverythingInside(entity: Entity): Generator<Entity> {
    yield entity;

    for (const child of entity.children) {
        yield* withEverythingInside(child);
    }
}
