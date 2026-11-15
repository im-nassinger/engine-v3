import type { Entity } from '../../../core/level/index.ts';

// How many levels of children sit below the entity: 0 for an entity without children.
export function heightBelow(entity: Entity): number {
    let height = 0;

    for (const child of entity.children) {
        const childHeight = 1 + heightBelow(child);
        height = Math.max(height, childHeight);
    }

    return height;
}
