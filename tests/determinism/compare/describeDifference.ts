import type { LevelData } from '../../../src/core/level-data/index.ts';

import type { Difference } from './firstDifference.ts';

// "tick 37, first at body 5 (Crate 1.3)", so a failure points at the cause.
export function describeDifference(levelData: LevelData, difference: Difference | undefined) {
    if (difference === undefined) return undefined;

    const { tick, entityId } = difference;
    if (entityId === undefined) return `tick ${tick}, in no body`;

    return `tick ${tick}, first at body ${entityId} (${entityName(levelData, entityId) ?? 'no name'})`;
}

// The name a level file gives an entity.
function entityName(levelData: LevelData, entityId: number) {
    const found = findEntity(levelData.world, entityId);
    const name = found?.components['NameComponent']?.['name'];

    return typeof name === 'string' ? name : undefined;
}

function findEntity(entity: LevelData['world'], entityId: number): LevelData['world'] | undefined {
    if (entity.id === entityId) return entity;

    for (const child of entity.children) {
        const found = findEntity(child, entityId);
        if (found !== undefined) return found;
    }

    return undefined;
}
