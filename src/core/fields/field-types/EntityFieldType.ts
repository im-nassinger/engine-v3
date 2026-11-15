import type { EntityId } from '../EntityId.ts';
import type { FieldType } from '../FieldType.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, hasExactlyKeys, isPlainObject, refuse } from '../rawChecks.ts';

// Stored as { "entity": 12 }, not a bare number, so a later "follow by tag" can store { "tag": "player" }
// beside it without changing saved levels.
export class EntityFieldType implements FieldType<EntityId | null> {
    readonly kind = 'entity';

    parse(raw: unknown): ParseOutcome<EntityId | null> {
        if (raw === null) return accept(null);
        if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });
        if (!hasExactlyKeys(raw, ['entity'])) return refuse({ reason: 'wrongType' });

        const id = raw['entity'];
        const isValidId = typeof id === 'number' && Number.isSafeInteger(id) && id >= 1;
        if (!isValidId) return refuse({ reason: 'badEntityId' });

        return accept(id);
    }

    serialize(value: EntityId | null) {
        if (value === null) return null;

        return { entity: value };
    }

    normalize(value: EntityId | null) {
        return value;
    }

    clone(value: EntityId | null) {
        return value;
    }

    equals(first: EntityId | null, second: EntityId | null) {
        return first === second;
    }
}
