import type { Entity, Level } from '../../../core/level/index.ts';

// The entities sorted as their rows are in the Entities panel, top row first.
export function inPanelOrder(level: Level, entities: readonly Entity[]) {
    const wanted = new Set(entities);
    const sorted: Entity[] = [];

    for (const entity of level.entitiesInPanelOrder()) {
        if (wanted.has(entity)) {
            sorted.push(entity);
        }
    }

    return sorted;
}
