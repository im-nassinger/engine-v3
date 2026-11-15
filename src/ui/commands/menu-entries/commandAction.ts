import type { CommandRunner, EditorCommand } from '../../../editor/commands/index.ts';
import type { KeyboardPlatform } from '../../../editor/shortcuts/index.ts';
import type { MenuAction } from '../../shared/index.ts';

import { shortcutText } from './shortcutText.ts';

// One command as a menu entry: its first shortcut at the right, a tick for a switch, and a disabled
// entry's reason in its tooltip. Choosing it runs the command through the runner.
export function commandAction(command: EditorCommand, runner: CommandRunner, platform: KeyboardPlatform) {
    const action: MenuAction = {
        kind: 'action',
        id: command.id,
        label: command.label,
        onChoose: () => runner.run(command),
    };

    const shortcut = shortcutText(command, platform);
    if (shortcut !== undefined) {
        action.shortcut = shortcut;
    }

    if (command.checked) {
        action.checked = command.checked();
    }

    const availability = command.availability();
    if (!availability.enabled) {
        action.disabledReason = availability.reason;
    }

    return action;
}
