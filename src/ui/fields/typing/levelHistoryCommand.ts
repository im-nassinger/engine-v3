import type { KeyboardEvent } from 'react';
import type { CommandRegistry } from '../../../editor/commands/index.ts';
import { KeyChord, KeyPress } from '../../../editor/shortcuts/index.ts';
import type { KeyboardInputData, KeyboardPlatform } from '../../../editor/shortcuts/index.ts';

const HISTORY_COMMAND_IDS = ['edit.undo', 'edit.redo'];

// Undo or Redo when the press is one of their shortcuts, read the way the ShortcutDispatcher reads it.
// Those shortcuts don't work while typing, so a field that matches its committed value runs them itself.
export function levelHistoryCommand(
    event: KeyboardEvent<HTMLInputElement>,
    registry: CommandRegistry,
    platform: KeyboardPlatform,
) {
    const input: KeyboardInputData = {
        code: event.code,
        key: event.key,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        altGraph: event.getModifierState('AltGraph'),
        repeat: event.repeat,
    };
    const press = KeyPress.fromKeyboard(input, platform);
    if (press === undefined) return undefined;

    for (const commandId of HISTORY_COMMAND_IDS) {
        const command = registry.find(commandId);
        if (command === undefined) continue;

        const chords = command.shortcuts.map((shortcut) => KeyChord.parse(shortcut));
        const isPressed = chords.some((chord) => chord.matches(press));
        if (isPressed) return command;
    }

    return undefined;
}
