import type { ComponentRegistry } from '../../../core/components/index.ts';
import type { Level } from '../../../core/level/index.ts';
import { isPlainObject } from '../../../core/fields/index.ts';
import type { EntityId } from '../../../core/fields/index.ts';

import type { EntityFragment } from '../codec/ClipboardText.ts';

// The open level a paste goes into: an OpenLevel is one.
export type PasteTarget = {
    readonly level: Level;
    readonly sourceToken: string;
};

type RawRecord = Readonly<Record<string, unknown>>;

function isEntityId(raw: unknown): raw is EntityId {
    return typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 1;
}

// The entity a raw entity field points at: { "entity": 12 }. Undefined for null or anything damaged.
function linkedId(raw: unknown): EntityId | undefined {
    if (!isPlainObject(raw)) return undefined;

    const id = raw['entity'];
    const hasOnlyEntity = Object.keys(raw).length === 1;

    return hasOnlyEntity && isEntityId(id) ? id : undefined;
}

// Gives every pasted entity a new id from the level and rewires the entity fields. A field pointing inside
// the pasted set points at the new copy. One pointing outside it keeps its id when the paste comes from the
// same opening of the level, even when that entity was deleted, since ids are never reused in a session;
// from another opening it gets a fresh id no entity has, so it reads as a missing entity.
//
// The data is still untrusted: anything not shaped as an entity is copied as it is, for LevelReader to refuse.
export class IdRemapping {
    private readonly registry: ComponentRegistry;

    constructor(registry: ComponentRegistry) {
        this.registry = registry;
    }

    // The fragment's entities with new ids, ready for LevelReader. The fragment is left as it was. The new
    // ids are used up even when the paste is refused.
    remap(fragment: EntityFragment, target: PasteTarget): readonly unknown[] {
        const newIds = new Map<EntityId, EntityId>();
        for (const root of fragment.entities) {
            this.giveNewIds(root, newIds, target.level);
        }

        const isSameOpening = fragment.sourceToken === target.sourceToken;
        const outsideIds = new Map<EntityId, EntityId>();
        const linkTo = (id: EntityId) => {
            const inside = newIds.get(id);
            if (inside !== undefined) return inside;
            if (isSameOpening) return id;

            const missing = outsideIds.get(id) ?? target.level.allocateId();
            outsideIds.set(id, missing);

            return missing;
        };

        return fragment.entities.map((root) => this.rewired(root, newIds, linkTo));
    }

    // Parents first, so the ids count up in panel order. An id seen twice keeps its first new id, and the
    // reader refuses the second entity.
    private giveNewIds(raw: unknown, newIds: Map<EntityId, EntityId>, level: Level) {
        if (!isPlainObject(raw)) return;

        const id = raw['id'];
        if (isEntityId(id) && !newIds.has(id)) {
            newIds.set(id, level.allocateId());
        }

        const children = raw['children'];
        if (!Array.isArray(children)) return;

        for (const child of children) {
            this.giveNewIds(child, newIds, level);
        }
    }

    private rewired(
        raw: unknown,
        newIds: ReadonlyMap<EntityId, EntityId>,
        linkTo: (id: EntityId) => EntityId,
    ): unknown {
        if (!isPlainObject(raw)) return raw;

        const copy: Record<string, unknown> = { ...raw };

        const id = raw['id'];
        if (isEntityId(id)) {
            copy['id'] = newIds.get(id) ?? id;
        }

        const components = raw['components'];
        if (isPlainObject(components)) {
            copy['components'] = this.rewiredComponents(components, linkTo);
        }

        const children = raw['children'];
        if (Array.isArray(children)) {
            copy['children'] = children.map((child: unknown) => this.rewired(child, newIds, linkTo));
        }

        return copy;
    }

    private rewiredComponents(components: RawRecord, linkTo: (id: EntityId) => EntityId) {
        const copy: Record<string, unknown> = {};

        for (const [typeName, values] of Object.entries(components)) {
            copy[typeName] = this.rewiredValues(typeName, values, linkTo);
        }

        return copy;
    }

    private rewiredValues(typeName: string, values: unknown, linkTo: (id: EntityId) => EntityId) {
        const componentClass = this.registry.find(typeName);
        if (componentClass === undefined || !isPlainObject(values)) return values;

        const { schema } = componentClass;
        const copy: Record<string, unknown> = { ...values };

        for (const field of schema.fields) {
            if (field.type.kind !== 'entity') continue;

            const fileKey = schema.fileKeyOf(field);
            const id = linkedId(values[fileKey]);
            if (id === undefined) continue;

            copy[fileKey] = { entity: linkTo(id) };
        }

        return copy;
    }
}
