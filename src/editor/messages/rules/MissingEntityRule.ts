import type { AnyComponent } from '../../../core/components/index.ts';
import type { Entity, EntityId, Level } from '../../../core/level/index.ts';

import type { EditorMessage } from '../model/EditorMessage.ts';
import type { EditorMessageRule } from '../model/EditorMessageRule.ts';

type EntityReference = {
    readonly component: AnyComponent;
    readonly key: string;
    readonly id: EntityId;
};

// `missing entity` on a field that links to an entity that is gone: a joint's B, the camera's Follow, or a
// trigger's target, after its entity was deleted. One message per link, so a field naming two gone entities
// has two. Undo brings the entity back, and the message goes with it.
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
                itemId: undefined,
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
            const { type } = field;
            if (type.mapEntities === undefined) continue;

            // The field type finds its own links in the saved value; each one is kept as it is.
            const saved = type.serialize(component.readValue(field.key));
            type.mapEntities(saved, (id) => {
                references.push({ component, key: field.key, id });
                return id;
            });
        }
    }

    return references;
}
