import type { EntityId, When } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';

// One trigger hearing one event: the entity holding it (`this`), the trigger by its id, its When, and the
// entity that caused the event (`other`), null for an event that has none. A waiting run resumed also
// names the action it goes on from, and doesn't ask its checks again.
export type TriggerFiring = {
    readonly owner: Entity;
    readonly triggerId: number;
    readonly when: When;
    readonly other: EntityId | null;
    readonly resumesAt?: number;
};
