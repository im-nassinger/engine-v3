import type { Entity } from '../entities/index.ts';

// Values worked out per entity from the entity and its parents, kept until marked stale.
// A value is only ever stored after its parent's, so an entity without a value has no
// descendant with one, and marking a subtree stops there.
export class PerEntityValues<Value> {
    private readonly valuesByEntity = new Map<Entity, Value>();

    find(entity: Entity) {
        return this.valuesByEntity.get(entity);
    }

    store(entity: Entity, value: Value) {
        this.valuesByEntity.set(entity, value);
    }

    markSubtree(entity: Entity) {
        const hadValue = this.valuesByEntity.delete(entity);
        if (!hadValue) return;

        for (const child of entity.children) {
            this.markSubtree(child);
        }
    }

    // For a removed entity, which has no children left by the time it is removed.
    forget(entity: Entity) {
        this.valuesByEntity.delete(entity);
    }

    get size() {
        return this.valuesByEntity.size;
    }
}
