import type { EntityLinkMapper, FieldType } from '../FieldType.ts';
import type { JsonValue } from '../JsonValue.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { copyTrigger, jsonEquals } from '../trigger/copyTrigger.ts';
import { mapTriggerEntities } from '../trigger/mapTriggerEntities.ts';
import { normalizeTrigger } from '../trigger/normalizeTrigger.ts';
import { parseTrigger } from '../trigger/parseTrigger.ts';
import type { Trigger } from '../trigger/Trigger.ts';

// One trigger of a TriggerComponent, saved in the same shape as its type (every key is one word). An unset
// part is saved as null and read back as null. The list it is in keeps the ids unique (ListFieldType's itemId).
export class TriggerFieldType implements FieldType<Trigger> {
    readonly kind = 'trigger';

    parse(raw: unknown): ParseOutcome<Trigger> {
        return parseTrigger(raw);
    }

    serialize(value: Trigger) {
        const copy = copyTrigger(value);

        // A trigger is JSON data: its one optional key, a value's axis, is left out by the copy when unset.
        return copy as unknown as JsonValue;
    }

    normalize(value: Trigger) {
        return normalizeTrigger(value);
    }

    clone(value: Trigger) {
        return copyTrigger(value);
    }

    equals(first: Trigger, second: Trigger) {
        return jsonEquals(first, second);
    }

    mapEntities(raw: unknown, linkTo: EntityLinkMapper) {
        return mapTriggerEntities(raw, linkTo);
    }
}
