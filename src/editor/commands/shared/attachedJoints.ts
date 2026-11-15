import { JointComponent } from '../../../core/components/index.ts';
import type { Entity, EntityId, Level } from '../../../core/level/index.ts';

// The joints outside the removed entities with an end inside them, which go too: deleting an entity deletes
// the joints attached to it. Removing a joint removes what is inside it too, which can be the end of yet
// another joint, so this repeats until nothing more is found.
export function attachedJoints(level: Level, removedRoots: readonly Entity[]) {
    const removedIds = new Set<EntityId>();
    for (const root of removedRoots) {
        addSubtreeIds(root, removedIds);
    }

    const joints: Entity[] = [];
    let foundMore = true;

    while (foundMore) {
        foundMore = false;

        for (const entity of level.entitiesInPanelOrder()) {
            const isAlreadyRemoved = removedIds.has(entity.id);
            if (isAlreadyRemoved) continue;
            if (!hasEndIn(entity, removedIds)) continue;

            joints.push(entity);
            addSubtreeIds(entity, removedIds);
            foundMore = true;
        }
    }

    return joints;
}

function hasEndIn(entity: Entity, ids: ReadonlySet<EntityId>) {
    const joint = entity.getComponent(JointComponent);
    if (joint === undefined) return false;

    const endA = joint.get('a');
    const endB = joint.get('b');
    const isEndARemoved = endA !== null && ids.has(endA);
    const isEndBRemoved = endB !== null && ids.has(endB);

    return isEndARemoved || isEndBRemoved;
}

function addSubtreeIds(root: Entity, ids: Set<EntityId>) {
    ids.add(root.id);

    for (const child of root.children) {
        addSubtreeIds(child, ids);
    }
}
