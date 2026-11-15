import type { MenuName } from '../../../editor/commands/index.ts';
import type { MenuEntry } from '../../shared/index.ts';
import type { EditorCommands } from '../context/EditorCommands.ts';

import { commandSections } from './commandSections.ts';

const MENU_ORDER: readonly MenuName[] = ['File', 'Edit', 'Arrange', 'View', 'Play', 'Tools', 'Help'];

// The main menu is the full list of commands: every registered command, in its submenu. A submenu no
// command has reached yet isn't shown.
export function mainMenuEntries({ registry, runner, platform }: EditorCommands) {
    const entries: MenuEntry[] = [];

    for (const menuName of MENU_ORDER) {
        const commands = registry.menu(menuName);
        if (commands.length === 0) continue;

        const items = commandSections(commands, runner, platform);
        entries.push({ kind: 'submenu', id: menuName, label: menuName, entries: items });
    }

    return entries;
}
