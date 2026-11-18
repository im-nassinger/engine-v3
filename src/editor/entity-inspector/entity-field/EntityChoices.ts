import type { Entity, EntityId, Level } from '../../../core/level/index.ts';
import { labelName } from '../../../core/level/index.ts';

import { MIXED } from '../model/MIXED.ts';

const MAX_CHOICES = 50;

// What an entity field shows: nothing picked, different picks, a target that was deleted, or its name.
export type EntityFieldShown =
    | { readonly kind: 'none'; readonly text: 'None' }
    | { readonly kind: 'mixed'; readonly text: 'Mixed' }
    | { readonly kind: 'missing'; readonly text: 'missing entity' }
    | { readonly kind: 'entity'; readonly text: string; readonly entityId: EntityId };

// The entities an entity field can point at: every one but the field's own entities, the World and the
// camera. The dropdown and a dropped Entities panel row both go through it.
export class EntityChoices {
    // In panel order, those whose name holds the search, up to the first 50.
    static matching(level: Level, ownIds: readonly EntityId[], search: string) {
        const wanted = search.trim().toLowerCase();
        const choices: Entity[] = [];

        for (const entity of level.entitiesInPanelOrder()) {
            if (choices.length === MAX_CHOICES) break;
            if (EntityChoices.refusal(level, ownIds, entity.id) !== undefined) continue;

            const name = labelName(entity).toLowerCase();
            if (!name.includes(wanted)) continue;

            choices.push(entity);
        }

        return choices;
    }

    // Why a dropped row can't be the field's value, or undefined when it can.
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
