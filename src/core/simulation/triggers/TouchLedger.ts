import type { EntityId } from '../../fields/index.ts';
import type { Entity, Level } from '../../level/index.ts';
import type { SensorEvent } from '../../physics/index.ts';

import { isPartOf } from './isPartOf.ts';
import { OwnerCounts } from './OwnerCounts.ts';
import type { CountChange } from './OwnerCounts.ts';
import type { TriggerIndex } from './TriggerIndex.ts';

// An owner that started or stopped being touched by one entity in the last step.
export type TouchChange = CountChange;

export type TouchChanges = {
    readonly touched: readonly TouchChange[];
    readonly untouched: readonly TouchChange[];
};

const NO_CHANGES: TouchChanges = { touched: [], untouched: [] };

// How many surfaces of each touching entity overlap each trigger owner, from the physics step's sensor
// events, so an entity built from several shapes touches once and sliding from one shape to the next fires
// nothing. The owners of a sensor are its own entity and every group above it, when they hear touches; the
// touching entity is the visitor's body entity. Two sensors never touch, and neither do an owner and a part
// of itself. Counts are compared before and after all of a step's events (OwnerCounts).
export class TouchLedger {
    private readonly level: Level;
    private readonly index: TriggerIndex;
    private readonly counts = new OwnerCounts();
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
        for (const event of events) {
            if (event.visitorIsSensor) continue;

            for (const owner of this.ownersOf(event.sensor)) {
                this.count(owner, event);
            }
        }

        const changes = this.counts.takeChanges((owner) => this.index.touchPlaceOf(owner));
        this.lastChanges = { touched: changes.started, untouched: changes.stopped };
    }

    forget(removed: ReadonlySet<Entity>) {
        this.counts.forget(removed);
    }

    private count(owner: Entity, event: SensorEvent) {
        if (event.kind === 'end') {
            this.counts.remove(owner, event.visitorBody);
            return;
        }
        if (isPartOf(this.level, owner, event.visitorBody)) return;

        this.counts.add(owner, event.visitorBody);
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
}
