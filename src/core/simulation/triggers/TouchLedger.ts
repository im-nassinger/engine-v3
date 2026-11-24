import type { EntityId } from '../../fields/index.ts';
import type { Entity, Level } from '../../level/index.ts';
import type { ContactEvent, SensorEvent } from '../../physics/index.ts';

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

// How many shapes of each touching entity touch each trigger owner, from both kinds of report a physics
// step gives: a sensor overlapping a solid shape (a pass-through entity) and two solid shapes touching. Both
// are touching, so an entity built from several shapes touches once, and sliding from one shape to the next
// fires nothing. Each report counts both ways: the owners of a shape are its own entity and every group
// above it, when they hear touches, and the entity touching them is the other shape's body entity, or that
// shape's own entity when it is on the ground, since naming the World would say nothing (standing yes,
// 2026-11-22). Two sensors never touch, and neither do an owner and a part of itself. Counts are compared
// before and after all of a step's reports (OwnerCounts).
export class TouchLedger {
    private readonly level: Level;
    private readonly index: TriggerIndex;
    private readonly counts = new OwnerCounts();
    // Each shape's owners, read at its first report: its ends may come after it is removed.
    private readonly ownersByShape = new Map<EntityId, readonly Entity[]>();
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

    readStep(sensorEvents: readonly SensorEvent[], contactEvents: readonly ContactEvent[]) {
        for (const event of sensorEvents) {
            if (event.visitorIsSensor) continue;

            const visitorToucher = this.toucherOf(event.visitor, event.visitorBody);
            const sensorToucher = this.toucherOf(event.sensor, event.sensorBody);
            this.countSide(event.kind, event.sensor, visitorToucher);
            this.countSide(event.kind, event.visitor, sensorToucher);
        }

        for (const event of contactEvents) {
            const toucherOfA = this.toucherOf(event.surfaceB, event.bodyB);
            const toucherOfB = this.toucherOf(event.surfaceA, event.bodyA);
            this.countSide(event.kind, event.surfaceA, toucherOfA);
            this.countSide(event.kind, event.surfaceB, toucherOfB);
        }

        const changes = this.counts.takeChanges((owner) => this.index.touchPlaceOf(owner));
        this.lastChanges = { touched: changes.started, untouched: changes.stopped };
    }

    forget(removed: ReadonlySet<Entity>) {
        this.counts.forget(removed);
    }

    private countSide(kind: 'begin' | 'end', shape: EntityId, toucher: EntityId) {
        for (const owner of this.ownersOf(shape)) {
            if (kind === 'end') {
                this.counts.remove(owner, toucher);
                continue;
            }
            if (isPartOf(this.level, owner, toucher)) continue;

            this.counts.add(owner, toucher);
        }
    }

    private toucherOf(shape: EntityId, body: EntityId) {
        const onGround = body === this.level.world.id;

        return onGround ? shape : body;
    }

    private ownersOf(shape: EntityId) {
        const known = this.ownersByShape.get(shape);
        if (known !== undefined) return known;

        const owners: Entity[] = [];
        let entity = this.level.findEntity(shape);

        for (; entity !== undefined; entity = entity.parent) {
            if (this.index.hearsTouch(entity)) {
                owners.push(entity);
            }
        }

        this.ownersByShape.set(shape, owners);

        return owners;
    }
}
