import { labelName } from '../../../../../core/level/index.ts';
import type { EditorMessage } from '../../../../../editor/messages/index.ts';
import type { OpenLevel } from '../../../../../editor/session/index.ts';
import { useVersion } from '../../../../hooks/index.ts';
import { Menu, useOpenMenu } from '../../../../shared/index.ts';
import type { MenuEntry } from '../../../../shared/index.ts';

export type MessagesMenuProps = {
    openLevel: OpenLevel;
};

// Every editor message, each named after its entity. Picking one selects that entity, which the
// Entities panel then reveals; a message about the whole level selects nothing.
export function MessagesMenu({ openLevel }: MessagesMenuProps) {
    // The labels read names straight from the level, so the React Compiler must not keep old ones.
    'use no memo';

    const { close, anchor } = useOpenMenu();
    useVersion(openLevel.messages.version);
    useVersion(openLevel.level.signals.levelVersion);

    const messages = openLevel.messages.all();
    const entries = messages.map((message, index) => entryOf(openLevel, message, index));

    return <Menu entries={entries} onClose={close} anchor={anchor} align="end" side="above" />;
}

function entryOf(openLevel: OpenLevel, message: EditorMessage, index: number): MenuEntry {
    const entityId = message.entityId;
    const entity = entityId === undefined ? undefined : openLevel.level.findEntity(entityId);

    let label = message.text;
    if (entity !== undefined) {
        label = `${labelName(entity)}: ${message.text}`;
    }

    const choose = () => {
        if (entity === undefined) return;

        openLevel.selection.replace([entity.id]);
    };

    return { kind: 'action', id: `message:${index}`, label, onChoose: choose };
}
