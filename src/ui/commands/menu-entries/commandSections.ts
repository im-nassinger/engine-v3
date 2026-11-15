import type { CommandRunner, MenuCommand } from '../../../editor/commands/index.ts';
import type { KeyboardPlatform } from '../../../editor/shortcuts/index.ts';
import type { MenuItem } from '../../shared/index.ts';

import { commandAction } from './commandAction.ts';

// Commands already in menu order, with a line wherever the section changes.
export function commandSections(commands: readonly MenuCommand[], runner: CommandRunner, platform: KeyboardPlatform) {
    const items: MenuItem[] = [];
    let previousSection: number | undefined;

    for (const command of commands) {
        const section = command.menu.section;
        const startsNewSection = previousSection !== undefined && section !== previousSection;

        if (startsNewSection) {
            items.push({ kind: 'separator', id: `${command.menu.menu}-before-${section}` });
        }

        const action = commandAction(command, runner, platform);
        items.push(action);
        previousSection = section;
    }

    return items;
}
