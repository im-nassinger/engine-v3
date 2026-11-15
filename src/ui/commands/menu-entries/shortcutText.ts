import type { EditorCommand } from '../../../editor/commands/index.ts';
import { KeyChord } from '../../../editor/shortcuts/index.ts';
import type { KeyboardPlatform } from '../../../editor/shortcuts/index.ts';

// A command's first shortcut as menus and tooltips show it, spelled for this computer: 'Cmd+Z' on a Mac.
export function shortcutText(command: EditorCommand, platform: KeyboardPlatform) {
    const firstShortcut = command.shortcuts[0];
    if (firstShortcut === undefined) return undefined;

    const chord = KeyChord.parse(firstShortcut);

    return chord.text(platform);
}
