import type { EntityId } from '../../fields/index.ts';
import type { Entity, Level } from '../../level/index.ts';
import type { ContactEvent } from '../../physics/index.ts';

import { isPartOf } from './isPartOf.ts';
import { OwnerCounts } from './OwnerCounts.ts';
import type { CountChange } from './OwnerCounts.ts';
import type { TriggerIndex } from './TriggerIndex.ts';

// An owner that started hitting one entity in the last step.
export type Hit = CountChange;

// How many surfaces of each hitting entity touch each hit entity, from the physics step's contact events,
// counted as TouchLedger counts touches, so an entity built from several shapes hits once and hits again only
// after the two have stopped touching. Each event counts both ways. The owners of a surface are its own
// entity and every group above it, when they hear collisions; the hitting entity is the other surface's body
// entity, or the surface's own entity when it is on the ground (standing yes, 2026-11-22). Parts of one
// owner hitting each other are filtered out.
export class ContactLedger {
    private readonly level: Level;
    private readonly index: TriggerIndex;
    private readonly counts = new OwnerCounts();
    // Each surface's owners, read at its first event: its ends may come after it is removed.
    private readonly ownersBySurface = new Map<EntityId, readonly Entity[]>();
    private lastHits: readonly Hit[] = [];

    constructor(level: Level, index: TriggerIndex) {
        this.level = level;
        this.index = index;
    }

    // The last step's hits, ordered by their owner's place in Entities viewer order, then by the hitting
    // entity's id.
    get hits() {
        return this.lastHits;
    }

    readStep(events: readonly ContactEvent[]) {
        for (const event of events) {
            const hitterOfA = this.hitterOf(event.surfaceB, event.bodyB);
            const hitterOfB = this.hitterOf(event.surfaceA, event.bodyA);

            this.countSide(event.kind, event.surfaceA, hitterOfA);
            this.countSide(event.kind, event.surfaceB, hitterOfB);
        }

        const changes = this.counts.takeChanges((owner) => this.index.collisionPlaceOf(owner));
        this.lastHits = changes.started;
    }

    forget(removed: ReadonlySet<Entity>) {
        this.counts.forget(removed);
    }

    private countSide(kind: ContactEvent['kind'], surface: EntityId, hitter: EntityId) {
        for (const owner of this.ownersOf(surface)) {
            if (kind === 'end') {
                this.counts.remove(owner, hitter);
                continue;
            }
            if (isPartOf(this.level, owner, hitter)) continue;

            this.counts.add(owner, hitter);
        }
    }

    // A shape on the ground is hit as itself: the World is everything, so naming it would say nothing.
    private hitterOf(surface: EntityId, body: EntityId) {
        const onGround = body === this.level.world.id;

        return onGround ? surface : body;
    }

    private ownersOf(surface: EntityId) {
        const known = this.ownersBySurface.get(surface);
        if (known !== undefined) return known;

        const owners: Entity[] = [];
        let entity = this.level.findEntity(surface);

        for (; entity !== undefined; entity = entity.parent) {
            if (this.index.hearsCollision(entity)) {
                owners.push(entity);
            }
        }

        this.ownersBySurface.set(surface, owners);

        return owners;
    }
}
