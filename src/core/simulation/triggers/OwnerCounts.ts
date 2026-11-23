import type { EntityId } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';

// An owner whose count for one other entity went from 0 to more, or back to 0, in a step.
export type CountChange = {
    readonly owner: Entity;
    readonly other: EntityId;
};

export type CountChanges = {
    readonly started: readonly CountChange[];
    readonly stopped: readonly CountChange[];
};

// How many surfaces of each other entity touch or hit each owner, so an entity built from several shapes
// counts once. A step's changes are found by comparing each count before and after all of the step's
// events, so a surface rebuilt in the step (its old end and new begin together) changes nothing.
export class OwnerCounts {
    private readonly counts = new Map<Entity, Map<EntityId, number>>();
    private countsBefore = new Map<Entity, Map<EntityId, number>>();

    add(owner: Entity, other: EntityId) {
        this.change(owner, other, 1);
    }

    // An end with no begin counted (a part of the owner, or a count forgotten) changes nothing.
    remove(owner: Entity, other: EntityId) {
        const current = this.countOf(owner, other);
        if (current === 0) return;

        this.change(owner, other, -1);
    }

    // The changes since the last call, ordered by the owner's place, then by the other entity's id.
    takeChanges(placeOf: (owner: Entity) => number): CountChanges {
        const started: CountChange[] = [];
        const stopped: CountChange[] = [];

        for (const [owner, before] of this.countsBefore) {
            for (const [other, countBefore] of before) {
                const countAfter = this.countOf(owner, other);

                if (countBefore === 0 && countAfter > 0) {
                    started.push({ owner, other });
                }
                if (countBefore > 0 && countAfter === 0) {
                    stopped.push({ owner, other });
                }
            }
        }
        this.countsBefore = new Map();

        const byPlace = (a: CountChange, b: CountChange) => {
            const placeA = placeOf(a.owner);
            const placeB = placeOf(b.owner);
            if (placeA !== placeB) return placeA - placeB;

            return a.other - b.other;
        };
        started.sort(byPlace);
        stopped.sort(byPlace);

        return { started, stopped };
    }

    // Removed owners lose their counts; what they touched or hit ends with them and fires nothing.
    forget(removed: ReadonlySet<Entity>) {
        for (const entity of removed) {
            this.counts.delete(entity);
            this.countsBefore.delete(entity);
        }
    }

    private change(owner: Entity, other: EntityId, by: 1 | -1) {
        const current = this.countOf(owner, other);
        this.rememberBefore(owner, other, current);

        const ownerCounts = this.counts.get(owner) ?? new Map<EntityId, number>();
        this.counts.set(owner, ownerCounts);

        const after = current + by;
        if (after === 0) {
            ownerCounts.delete(other);
        } else {
            ownerCounts.set(other, after);
        }
    }

    private rememberBefore(owner: Entity, other: EntityId, current: number) {
        const before = this.countsBefore.get(owner) ?? new Map<EntityId, number>();
        this.countsBefore.set(owner, before);

        if (!before.has(other)) {
            before.set(other, current);
        }
    }

    private countOf(owner: Entity, other: EntityId) {
        return this.counts.get(owner)?.get(other) ?? 0;
    }
}
