import type { Entity } from '../../level/index.ts';

// A map from one trigger, named by its entity and its id, to what the run keeps about it.
export class TriggerKeys<Value> {
    private readonly byOwner = new Map<Entity, Map<number, Value>>();

    get(owner: Entity, triggerId: number) {
        return this.byOwner.get(owner)?.get(triggerId);
    }

    set(owner: Entity, triggerId: number, value: Value) {
        const ownValues = this.byOwner.get(owner) ?? new Map<number, Value>();
        this.byOwner.set(owner, ownValues);
        ownValues.set(triggerId, value);
    }

    delete(owner: Entity, triggerId: number) {
        this.byOwner.get(owner)?.delete(triggerId);
    }

    forget(removed: ReadonlySet<Entity>) {
        for (const entity of removed) {
            this.byOwner.delete(entity);
        }
    }
}
