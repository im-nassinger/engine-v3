import type { MenuName } from '../../../editor/commands/index.ts';
import type { MenuEntry } from '../../shared/index.ts';
import type { EditorCommands } from '../context/EditorCommands.ts';

import { commandAction } from './commandAction.ts';
import { commandSections } from './commandSections.ts';

const SUBMENU_ORDER: readonly MenuName[] = ['File', 'Edit', 'Arrange', 'View', 'Help'];

// Help is apart from the editing submenus, as in the mockup.
const LINE_BEFORE: readonly MenuName[] = ['Help'];

// The main menu, which ☰ opens: Play as a plain entry first, a line, then one submenu per menu name, with
// a line before Help. Every command with a menu place is in it, so it is the full list of commands. A
// submenu no command has reached isn't shown.
export function mainMenuEntries({ registry, runner, platform }: EditorCommands) {
    const entries: MenuEntry[] = [];

    for (const command of registry.menu('Play')) {
        entries.push(commandAction(command, runner, platform));
    }
    const playCount = entries.length;

    for (const menuName of SUBMENU_ORDER) {
        const commands = registry.menu(menuName);
        if (commands.length === 0) continue;

        const needsLine = entries.length > 0 && (entries.length === playCount || LINE_BEFORE.includes(menuName));
        if (needsLine) {
            entries.push({ kind: 'separator', id: `before-${menuName}` });
        }

        const items = commandSections(commands, runner, platform);
        entries.push({ kind: 'submenu', id: menuName, label: menuName, entries: items });
    }

    return entries;
}
