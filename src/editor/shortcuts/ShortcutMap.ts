import type { CommandId, CommandRegistry, ShortcutScope } from '../commands/index.ts';

import { KeyChord } from './KeyChord.ts';
import type { KeyPress } from './KeyPress.ts';

export type Shortcut = {
    readonly chord: KeyChord;
    readonly commandId: CommandId;
    readonly scope: ShortcutScope;
};

// Every registered command's chords with where they work. Built once from the registry, which is
// complete before the editor takes its first key.
export class ShortcutMap {
    private readonly shortcuts: readonly Shortcut[];

    private constructor(shortcuts: readonly Shortcut[]) {
        this.shortcuts = shortcuts;
    }

    // Throws when two commands share a chord in one scope, since one press can't run both.
    static fromRegistry(registry: CommandRegistry) {
        const shortcuts: Shortcut[] = [];

        for (const command of registry.all) {
            const commandScope = command.shortcutScope ?? 'editor';

            for (const chordText of command.shortcuts) {
                const chord = KeyChord.parse(chordText);
                const scope = command.shortcutScopes?.[chordText] ?? commandScope;
                const shortcut = { chord, commandId: command.id, scope };

                throwIfTaken(shortcuts, shortcut, chordText);
                shortcuts.push(shortcut);
            }
        }

        return new ShortcutMap(shortcuts);
    }

    get all() {
        return this.shortcuts;
    }

    // Every shortcut the press matches, the ones naming their key before the typed characters, so a
    // scope's first is the one meant: Shift+0 on a German keyboard is 100%, not the '=' it types.
    matching(press: KeyPress) {
        const matching = this.shortcuts.filter((shortcut) => shortcut.chord.matches(press));
        const namingTheirKey = matching.filter((shortcut) => !shortcut.chord.isTypedCharacter);
        const byCharacter = matching.filter((shortcut) => shortcut.chord.isTypedCharacter);

        return [...namingTheirKey, ...byCharacter];
    }

    // The first shortcut of a command, for its menu entry.
    firstFor(commandId: CommandId) {
        return this.shortcuts.find((shortcut) => shortcut.commandId === commandId);
    }
}

function throwIfTaken(shortcuts: readonly Shortcut[], added: Shortcut, chordText: string) {
    for (const existing of shortcuts) {
        const sameScope = existing.scope === added.scope;
        const sameKeys = existing.chord.sameKeysAs(added.chord);

        if (sameScope && sameKeys) {
            throw new Error(`${existing.commandId} and ${added.commandId} both use ${chordText} in one scope.`);
        }
    }
}
