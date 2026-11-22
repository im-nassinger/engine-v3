import type { Entity } from '../../../core/level/index.ts';

// True when the entity or any of its parents is hidden by its eye, so an overlay draws nothing for it.
export function isHiddenWithParents(entity: Entity) {
    let current: Entity | undefined = entity;

    while (current !== undefined) {
        if (current.isHidden) return true;
        current = current.parent;
    }

    return false;
}
