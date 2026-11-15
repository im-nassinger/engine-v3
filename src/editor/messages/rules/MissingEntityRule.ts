import type { AnyComponent } from '../../../core/components/index.ts';
import type { Entity, EntityId, Level } from '../../../core/level/index.ts';

import type { EditorMessage } from '../model/EditorMessage.ts';
import type { EditorMessageRule } from '../model/EditorMessageRule.ts';

type EntityReference = {
    readonly component: AnyComponent;
    readonly key: string;
    readonly id: EntityId;
};

// `missing entity` on an entity field whose entity is gone: a joint's B, or the camera's Follow, after its
// entity was deleted. Undo brings the entity back, and the message goes with it.
export class MissingEntityRule implements EditorMessageRule {
    check(entity: Entity, level: Level): readonly EditorMessage[] {
        const messages: EditorMessage[] = [];

        for (const reference of entityReferences(entity)) {
            const isMissing = level.findEntity(reference.id) === undefined;
            if (!isMissing) continue;

            messages.push({
                kind: 'warning',
                entityId: entity.id,
                componentType: reference.component.schema.typeName,
                fieldKey: reference.key,
                text: 'missing entity',
                fix: undefined,
            });
        }

        return messages;
    }

    readsEntities(entity: Entity) {
        return entityReferences(entity).map((reference) => reference.id);
    }
}

function entityReferences(entity: Entity) {
    const references: EntityReference[] = [];

    for (const component of entity.components) {
        for (const field of component.schema.fields) {
            if (field.type.kind !== 'entity') continue;

            const id = component.readValue(field.key) as EntityId | null;
            if (id === null) continue;

            references.push({ component, key: field.key, id });
        }
    }

    return references;
}
