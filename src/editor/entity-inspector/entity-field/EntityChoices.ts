import type { EntityId, Level } from '../../../core/level/index.ts';
import { labelName } from '../../../core/level/index.ts';

import { MIXED } from '../model/MIXED.ts';

// What an entity field shows: nothing picked, different picks, a target that was deleted, or its name.
export type EntityFieldShown =
    | { readonly kind: 'none'; readonly text: 'None' }
    | { readonly kind: 'mixed'; readonly text: 'Mixed' }
    | { readonly kind: 'missing'; readonly text: 'missing entity' }
    | { readonly kind: 'entity'; readonly text: string; readonly entityId: EntityId };

// The entities an entity field can point at: every one but the field's own entities, the World and the
// camera. The entity picker, the level view's pick and a dropped Entities panel row all go through it.
export class EntityChoices {
    // Why an entity can't be the field's value, or undefined when it can.
    static refusal(level: Level, ownIds: readonly EntityId[], entityId: EntityId) {
        if (entityId === level.world.id) return "The World can't be picked";
        if (entityId === level.camera.id) return "The camera can't be picked";
        if (ownIds.includes(entityId)) return "An entity can't point at itself";

        return undefined;
    }

    static shown(level: Level, value: unknown): EntityFieldShown {
        if (value === MIXED) return { kind: 'mixed', text: 'Mixed' };
        if (typeof value !== 'number') return { kind: 'none', text: 'None' };

        const target = level.findEntity(value);
        if (target === undefined) return { kind: 'missing', text: 'missing entity' };

        return { kind: 'entity', text: labelName(target), entityId: target.id };
    }
}
