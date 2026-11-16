import type { Entity, Level } from '../../../core/level/index.ts';

// What a copy of these entities writes: each one that is neither the World nor the camera and isn't inside
// another of them, since its parent brings it. In Entities panel order, top row first.
export function copiedRoots(level: Level, entities: readonly Entity[]) {
    const candidates = entities.filter((entity) => entity !== level.world && entity !== level.camera);
    const wanted = new Set(candidates);
    const roots: Entity[] = [];

    for (const entity of level.entitiesInPanelOrder()) {
        if (!wanted.has(entity)) continue;

        const isInsideAnother = candidates.some((other) => other.isAncestorOf(entity));
        if (!isInsideAnother) {
            roots.push(entity);
        }
    }

    return roots;
}
