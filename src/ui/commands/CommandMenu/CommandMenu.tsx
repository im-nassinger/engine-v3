import type { ReactNode } from 'react';
import { useEditorSession } from '../../EditorContext.tsx';
import { Menu, useOpenMenu } from '../../shared/index.ts';
import type { MenuAlign, MenuEntry, MenuSide } from '../../shared/index.ts';
import { useCommandStates } from '../context/useCommandStates.ts';
import { useCommands } from '../context/CommandsContext.ts';
import type { EditorCommands } from '../context/EditorCommands.ts';

export type CommandMenuProps = {
    // Builds the entries from the commands, each time the menu draws.
    entriesOf: (commands: EditorCommands) => MenuEntry[];
    align?: MenuAlign;
    side?: MenuSide;
    header?: ReactNode;
};

// A menu of commands, opened by a MenuButton. It exists only while open, so only an open menu follows
// the editor's state, and panning with every menu closed redraws nothing.
export function CommandMenu({ entriesOf, align, side, header }: CommandMenuProps) {
    // The entries call each command's availability() and checked(), whose answers change while the
    // command object stays the same, so the React Compiler must not keep an old answer.
    'use no memo';

    const session = useEditorSession();
    const commands = useCommands();
    const { close, anchor } = useOpenMenu();
    useCommandStates(session);

    const entries = entriesOf(commands);

    return <Menu entries={entries} onClose={close} anchor={anchor} align={align} side={side} header={header} />;
}
