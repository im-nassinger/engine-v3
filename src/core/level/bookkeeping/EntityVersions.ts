import { VersionCounter } from '../../events/index.ts';
import type { Unsubscribe } from '../../events/index.ts';
import type { EntityId } from '../../fields/index.ts';

// One counter per entity, so a change to one entity wakes only that entity's row and card.
// Counters are kept after an entity is removed: ids are never reused, and an entity restored by undo
// must not show a version a listener has already seen.
export class EntityVersions {
    private readonly countersById = new Map<EntityId, VersionCounter>();

    version(id: EntityId) {
        const counter = this.countersById.get(id);
        if (counter === undefined) return 0;

        return counter.version;
    }

    increment(id: EntityId) {
        const counter = this.counterFor(id);
        counter.increment();
    }

    subscribe(id: EntityId, listener: () => void): Unsubscribe {
        const counter = this.counterFor(id);

        return counter.subscribe(listener);
    }

    private counterFor(id: EntityId) {
        let counter = this.countersById.get(id);

        if (counter === undefined) {
            counter = new VersionCounter();
            this.countersById.set(id, counter);
        }

        return counter;
    }
}
