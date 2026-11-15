import { describe, expect, test } from 'vitest';

import { Level } from '../../core/level/index.ts';
import { CommandRegistry, createCommandRegistry } from '../commands/index.ts';
import type { EditorCommand, ShortcutScope } from '../commands/index.ts';
import { EditorSession } from '../session/index.ts';
import { ManualFrames, ManualTimer } from '../time/testing/index.ts';

import { BROWSER_KEYS, CTRL_ALT_ALLOWED } from './browserKeys.ts';
import { KeyChord } from './KeyChord.ts';
import { KeyPress } from './KeyPress.ts';
import { ShortcutMap } from './ShortcutMap.ts';
import { US_KEYS } from './testing/recordedKeys.ts';

function editorShortcutMap() {
    const timer = new ManualTimer();
    const level = Level.createNew();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    const registry = createCommandRegistry(session);

    return ShortcutMap.fromRegistry(registry);
}

function commandWith(id: string, shortcuts: readonly string[], shortcutScope?: ShortcutScope): EditorCommand {
    return {
        id,
        label: id,
        menu: { menu: 'Edit', section: 1, order: 10 },
        shortcuts,
        shortcutScope,
        availability: () => ({ enabled: true }),
        run: () => ({ kind: 'done' }),
    };
}

function registryOf(commands: readonly EditorCommand[]) {
    const registry = new CommandRegistry();

    for (const command of commands) {
        registry.register(command);
    }

    return registry;
}

describe("the editor's shortcut map", () => {
    test('builds from every registered command without two commands sharing a chord in one scope', () => {
        const map = editorShortcutMap();

        expect(map.all.length).toBeGreaterThan(0);
    });

    test('uses none of the keys the requirements leave to the browser', () => {
        const map = editorShortcutMap();
        const browserChords = BROWSER_KEYS.map((text) => KeyChord.parse(text));

        for (const shortcut of map.all) {
            const takenFromBrowser = browserChords.some((browserChord) => browserChord.sameKeysAs(shortcut.chord));
            expect(takenFromBrowser, shortcut.chord.text('other')).toBe(false);
        }
    });

    test('uses Ctrl+Alt only for the two keys the requirement allows', () => {
        const map = editorShortcutMap();
        const allowedChords = CTRL_ALT_ALLOWED.map((text) => KeyChord.parse(text));

        for (const shortcut of map.all) {
            const usesCtrlAlt = shortcut.chord.ctrl && shortcut.chord.alt;
            if (!usesCtrlAlt) continue;

            const isAllowed = allowedChords.some((allowed) => allowed.sameKeysAs(shortcut.chord));
            expect(isAllowed, shortcut.chord.text('other')).toBe(true);
        }
    });

    test('finds Undo from Ctrl+Z and gives each command its first shortcut', () => {
        const map = editorShortcutMap();
        const press = KeyPress.fromKeyboard(US_KEYS.ctrlZ, 'other');
        if (press === undefined) throw new Error('Ctrl+Z is a key press.');

        const matching = map.matching(press);
        const redoShortcut = map.firstFor('edit.redo');

        expect(matching.map((shortcut) => shortcut.commandId)).toEqual(['edit.undo']);
        expect(matching[0]?.scope).toBe('editor');
        expect(redoShortcut?.chord.text('other')).toBe('Ctrl+Shift+Z');
    });
});

describe('ShortcutMap.fromRegistry', () => {
    test('refuses two commands with the same chord in one scope', () => {
        const registry = registryOf([commandWith('first', ['Ctrl+G']), commandWith('second', ['Ctrl+G'])]);

        const build = () => ShortcutMap.fromRegistry(registry);

        expect(build).toThrow('first and second both use Ctrl+G');
    });

    test('allows one chord in two scopes', () => {
        const registry = registryOf([
            commandWith('inEditor', ['Enter']),
            commandWith('inLevelView', ['Enter'], 'levelView'),
        ]);

        const map = ShortcutMap.fromRegistry(registry);

        expect(map.all.map((shortcut) => shortcut.scope)).toEqual(['editor', 'levelView']);
    });
});
