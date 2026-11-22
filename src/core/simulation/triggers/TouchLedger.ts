import type { EntityId } from '../../fields/index.ts';
import type { Entity, Level } from '../../level/index.ts';
import type { SensorEvent } from '../../physics/index.ts';

import type { TriggerIndex } from './TriggerIndex.ts';

// An owner that started or stopped being touched by one entity in the last step.
export type TouchChange = {
    readonly owner: Entity;
    readonly other: EntityId;
};

export type TouchChanges = {
    readonly touched: readonly TouchChange[];
    readonly untouched: readonly TouchChange[];
};

const NO_CHANGES: TouchChanges = { touched: [], untouched: [] };

// How many surfaces of each touching entity overlap each trigger owner, from the physics step's sensor
// events, so an entity built from several shapes touches once and sliding from one shape to the next fires
// nothing. The owners of a sensor are its own entity and every group above it, when they hear touches; the
// touching entity is the visitor's body entity. Two sensors never touch, and neither do an owner and a part
// of itself. Counts are compared before and after all of a step's events, so a surface rebuilt in the step
// (its old end and new begin together) changes nothing.
export class TouchLedger {
    private readonly level: Level;
    private readonly index: TriggerIndex;
    private readonly counts = new Map<Entity, Map<EntityId, number>>();
    // Each sensor's owners, read at its first event: its ends may come after it is removed.
    private readonly ownersBySensor = new Map<EntityId, readonly Entity[]>();
    private lastChanges = NO_CHANGES;

    constructor(level: Level, index: TriggerIndex) {
        this.level = level;
        this.index = index;
    }

    // The last step's changes, touches ordered by their owner's place in Entities viewer order, then by
    // the touching entity's id.
    get changes() {
        return this.lastChanges;
    }

    readStep(events: readonly SensorEvent[]) {
        const countsBefore = new Map<Entity, Map<EntityId, number>>();

        for (const event of events) {
            if (event.visitorIsSensor) continue;

            for (const owner of this.ownersOf(event.sensor)) {
                this.count(owner, event, countsBefore);
            }
        }

        this.lastChanges = this.compare(countsBefore);
    }

    // Removed owners lose their counts; their touches end with them and fire nothing.
    forget(removed: ReadonlySet<Entity>) {
        for (const entity of removed) {
            this.counts.delete(entity);
        }
    }

    private count(owner: Entity, event: SensorEvent, countsBefore: Map<Entity, Map<EntityId, number>>) {
        const ownerCounts = this.countsOf(owner);
        const current = ownerCounts.get(event.visitorBody) ?? 0;

        if (event.kind === 'begin' && this.isPartOf(owner, event.visitorBody)) return;
        // An end with no begin counted: a part of the owner, or a touch forgotten.
        if (event.kind === 'end' && current === 0) return;

        const before = countsBefore.get(owner) ?? new Map<EntityId, number>();
        countsBefore.set(owner, before);
        if (!before.has(event.visitorBody)) {
            before.set(event.visitorBody, current);
        }

        const change = event.kind === 'begin' ? 1 : -1;
        const after = current + change;

        if (after === 0) {
            ownerCounts.delete(event.visitorBody);
        } else {
            ownerCounts.set(event.visitorBody, after);
        }
    }

    private compare(countsBefore: Map<Entity, Map<EntityId, number>>): TouchChanges {
        const touched: TouchChange[] = [];
        const untouched: TouchChange[] = [];

        for (const [owner, before] of countsBefore) {
            const ownerCounts = this.countsOf(owner);

            for (const [other, countBefore] of before) {
                const countAfter = ownerCounts.get(other) ?? 0;

                const startedTouching = countBefore === 0 && countAfter > 0;
                const stoppedTouching = countBefore > 0 && countAfter === 0;

                if (startedTouching) {
                    touched.push({ owner, other });
                }
                if (stoppedTouching) {
                    untouched.push({ owner, other });
                }
            }
        }

        touched.sort((a, b) => this.compareTouches(a, b));
        untouched.sort((a, b) => this.compareTouches(a, b));

        return { touched, untouched };
    }

    private compareTouches(a: TouchChange, b: TouchChange) {
        const placeA = this.index.touchPlaceOf(a.owner);
        const placeB = this.index.touchPlaceOf(b.owner);
        if (placeA !== placeB) return placeA - placeB;

        return a.other - b.other;
    }

    private countsOf(owner: Entity) {
        const existing = this.counts.get(owner);
        if (existing !== undefined) return existing;

        const created = new Map<EntityId, number>();
        this.counts.set(owner, created);

        return created;
    }

    private ownersOf(sensor: EntityId) {
        const known = this.ownersBySensor.get(sensor);
        if (known !== undefined) return known;

        const owners: Entity[] = [];
        let entity = this.level.findEntity(sensor);

        for (; entity !== undefined; entity = entity.parent) {
            if (this.index.hearsTouch(entity)) {
                owners.push(entity);
            }
        }

        this.ownersBySensor.set(sensor, owners);

        return owners;
    }

    // The touching entity is the owner, inside it, or holds it: a part of itself. The World holds
    // everything, but as a toucher it is the ground, the shapes with no body of their own.
    private isPartOf(owner: Entity, touching: EntityId) {
        const touchingEntity = this.level.findEntity(touching);
        if (touchingEntity === undefined) return false;

        const isGround = touchingEntity === this.level.world;
        const isSame = touchingEntity === owner;
        const isInside = owner.isAncestorOf(touchingEntity);
        const holdsOwner = !isGround && touchingEntity.isAncestorOf(owner);

        return isSame || isInside || holdsOwner;
    }
}
