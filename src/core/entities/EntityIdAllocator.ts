import type { EntityId } from '../fields/index.ts';

// Only counts up, so an id is never handed out twice in a session, even after its entity is removed.
export class EntityIdAllocator {
    private highestSeen = 0;

    get highest() {
        return this.highestSeen;
    }

    next(): EntityId {
        this.highestSeen += 1;

        return this.highestSeen;
    }

    // For an id that comes from outside: loading a level, or restoring an entity on undo.
    reserve(id: EntityId) {
        if (id <= this.highestSeen) return;

        this.highestSeen = id;
    }
}
