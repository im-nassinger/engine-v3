import type { ComponentTypeName } from '../../../core/components/index.ts';
import type { Entity, EntityId } from '../../../core/level/index.ts';
import type { EditorMessage, EditorMessages } from '../../messages/index.ts';

import type { CardNote } from '../model/CardNote.ts';

type Gathering = {
    readonly message: EditorMessage;
    readonly entityIds: EntityId[];
};

// The messages about one component of the shown entities, the same text on the same field counted once.
export function cardNotes(entities: readonly Entity[], typeName: ComponentTypeName, messages: EditorMessages) {
    const gathered = new Map<string, Gathering>();

    for (const entity of entities) {
        for (const message of messages.forEntity(entity.id)) {
            if (message.componentType !== typeName) continue;

            const key = `${message.fieldKey ?? ''}\n${message.itemId ?? ''}\n${message.text}`;
            const gathering = gathered.get(key) ?? { message, entityIds: [] };
            gathering.entityIds.push(entity.id);
            gathered.set(key, gathering);
        }
    }

    return [...gathered.values()].map(toNote);
}

function toNote({ message, entityIds }: Gathering): CardNote {
    return {
        kind: message.kind,
        text: message.text,
        fieldKey: message.fieldKey,
        itemId: message.itemId,
        fix: message.fix,
        entityIds,
    };
}
