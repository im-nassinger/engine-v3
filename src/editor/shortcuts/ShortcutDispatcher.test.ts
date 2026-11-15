import { describe, expect, test } from 'vitest';

import { Level } from '../../core/level/index.ts';
import { CommandRegistry, CommandRunner, createCommandRegistry } from '../commands/index.ts';
import type { Availability, EditorCommand, ShortcutScope } from '../commands/index.ts';
import { EditorSession } from '../session/index.ts';
import { StatusText } from '../status/index.ts';
import { ManualTimer } from '../time/testing/index.ts';

import type { KeyboardInputData } from './KeyboardInputData.ts';
import { ShortcutDispatcher } from './ShortcutDispatcher.ts';
import { GERMAN_KEYS, MAC_KEYS, US_KEYS, recordedKey } from './testing/recordedKeys.ts';

type FakeOptions = {
    readonly scope?: ShortcutScope;
    readonly repeatsWhileHeld?: boolean;
    readonly availability?: Availability;
};

// A command with the test's keys and scope, counting how often it ran.
function fakeCommand(id: string, shortcuts: readonly string[], options: FakeOptions = {}) {
    const availability = options.availability ?? { enabled: true };
    const command = {
        id,
        label: id,
        menu: { menu: 'Edit', section: 1, order: 10 },
        shortcuts,
        shortcutScope: options.scope,
        repeatsWhileHeld: options.repeatsWhileHeld,
        runCount: 0,
        availability: () => availability,
        run() {
            command.runCount += 1;
            return { kind: 'done' } as const;
        },
    } satisfies EditorCommand & { runCount: number };

    return command;
}

function buildDispatcher(commands: readonly EditorCommand[], platform: 'mac' | 'other' = 'other') {
    const registry = new CommandRegistry();

    for (const command of commands) {
        registry.register(command);
    }

    const timer = new ManualTimer();
    const status = new StatusText(timer);
    const runner = new CommandRunner(status);
    const dispatcher = new ShortcutDispatcher(registry, runner, platform);

    return { dispatcher, runner, status };
}

function repeated(input: KeyboardInputData): KeyboardInputData {
    return { ...input, repeat: true };
}

const TAB = recordedKey('Tab', 'Tab');
const CTRL_S = recordedKey('KeyS', 's', { ctrlKey: true });

describe('ShortcutDispatcher', () => {
    test('an editor key runs its command in the level view and in a panel', () => {
        const undo = fakeCommand('edit.undo', ['Ctrl+Z']);
        const { dispatcher } = buildDispatcher([undo]);

        const usedInLevel = dispatcher.handleKeyDown(US_KEYS.ctrlZ, 'level', false);
        const usedInPanel = dispatcher.handleKeyDown(US_KEYS.ctrlZ, 'panel', false);

        expect(usedInLevel).toBe(true);
        expect(usedInPanel).toBe(true);
        expect(undo.runCount).toBe(2);
    });

    test('an editor key is ignored in a text field and in the code editor', () => {
        const undo = fakeCommand('edit.undo', ['Ctrl+Z']);
        const { dispatcher } = buildDispatcher([undo]);

        const usedInTextField = dispatcher.handleKeyDown(US_KEYS.ctrlZ, 'textField', true);
        const usedInCodeEditor = dispatcher.handleKeyDown(US_KEYS.ctrlZ, 'codeEditor', true);

        expect(usedInTextField).toBe(false);
        expect(usedInCodeEditor).toBe(false);
        expect(undo.runCount).toBe(0);
    });

    test('an everywhere key works while typing', () => {
        const exportFile = fakeCommand('file.export', ['Ctrl+S'], { scope: 'everywhere' });
        const { dispatcher } = buildDispatcher([exportFile]);

        const used = dispatcher.handleKeyDown(CTRL_S, 'textField', false);

        expect(used).toBe(true);
        expect(exportFile.runCount).toBe(1);
    });

    test('an unused key returns false', () => {
        const undo = fakeCommand('edit.undo', ['Ctrl+Z']);
        const { dispatcher } = buildDispatcher([undo]);

        const used = dispatcher.handleKeyDown(US_KEYS.f, 'level', true);

        expect(used).toBe(false);
    });

    test('a level view key needs the mouse over the level view', () => {
        const selectNext = fakeCommand('edit.selectNext', ['Tab'], { scope: 'levelView' });
        const { dispatcher } = buildDispatcher([selectNext]);

        const usedAway = dispatcher.handleKeyDown(TAB, 'level', false);
        const usedOver = dispatcher.handleKeyDown(TAB, 'level', true);

        expect(usedAway).toBe(false);
        expect(usedOver).toBe(true);
        expect(selectNext.runCount).toBe(1);
    });

    test('a level view key is left to a text field even with the mouse over the level view', () => {
        const selectNext = fakeCommand('edit.selectNext', ['Tab'], { scope: 'levelView' });
        const { dispatcher } = buildDispatcher([selectNext]);

        const used = dispatcher.handleKeyDown(TAB, 'textField', true);

        expect(used).toBe(false);
        expect(selectNext.runCount).toBe(0);
    });

    test('the narrowest scope wins when a key is in two', () => {
        const editorTab = fakeCommand('test.editorTab', ['Tab']);
        const levelTab = fakeCommand('test.levelTab', ['Tab'], { scope: 'levelView' });
        const { dispatcher } = buildDispatcher([editorTab, levelTab]);

        dispatcher.handleKeyDown(TAB, 'level', true);
        dispatcher.handleKeyDown(TAB, 'level', false);

        expect(levelTab.runCount).toBe(1);
        expect(editorTab.runCount).toBe(1);
    });

    test('a held key runs its command once, but is still used', () => {
        const undo = fakeCommand('edit.undo', ['Ctrl+Z']);
        const { dispatcher } = buildDispatcher([undo]);

        dispatcher.handleKeyDown(US_KEYS.ctrlZ, 'level', false);
        const usedOnRepeat = dispatcher.handleKeyDown(repeated(US_KEYS.ctrlZ), 'level', false);

        expect(usedOnRepeat).toBe(true);
        expect(undo.runCount).toBe(1);
    });

    test('a held zoom key runs again with each repeat', () => {
        const zoomIn = fakeCommand('view.zoomIn', ['+'], { repeatsWhileHeld: true });
        const { dispatcher } = buildDispatcher([zoomIn]);

        dispatcher.handleKeyDown(US_KEYS.plus, 'level', false);
        dispatcher.handleKeyDown(repeated(US_KEYS.plus), 'level', false);
        dispatcher.handleKeyDown(repeated(US_KEYS.plus), 'level', false);

        expect(zoomIn.runCount).toBe(3);
    });

    test('a disabled command is used and shows its reason', () => {
        const availability = { enabled: false, reason: 'Nothing to undo' } as const;
        const undo = fakeCommand('edit.undo', ['Ctrl+Z'], { availability });
        const { dispatcher, status } = buildDispatcher([undo]);

        const used = dispatcher.handleKeyDown(US_KEYS.ctrlZ, 'level', false);

        expect(used).toBe(true);
        expect(undo.runCount).toBe(0);
        expect(status.current).toBe('Nothing to undo');
    });

    test('no key reaches a command while a dialog is open', () => {
        const undo = fakeCommand('edit.undo', ['Ctrl+Z']);
        const { dispatcher, runner } = buildDispatcher([undo]);
        runner.dialog.open({ kind: 'notice', notice: { title: 'About', text: 'engine-v3' } });

        const used = dispatcher.handleKeyDown(US_KEYS.ctrlZ, 'level', false);

        expect(used).toBe(false);
        expect(undo.runCount).toBe(0);
    });

    test('a symbol typed with AltGr is left to the browser', () => {
        const copyValues = fakeCommand('test.ctrlAltQ', ['Ctrl+Alt+Q']);
        const { dispatcher } = buildDispatcher([copyValues]);

        const used = dispatcher.handleKeyDown(GERMAN_KEYS.altGrQ, 'level', false);

        expect(used).toBe(false);
        expect(copyValues.runCount).toBe(0);
    });

    test('on a Mac, Cmd+Z undoes and Control+Z does not', () => {
        const undo = fakeCommand('edit.undo', ['Ctrl+Z']);
        const { dispatcher } = buildDispatcher([undo], 'mac');

        const usedWithCmd = dispatcher.handleKeyDown(MAC_KEYS.cmdZ, 'level', false);
        const usedWithControl = dispatcher.handleKeyDown(MAC_KEYS.controlZ, 'level', false);

        expect(usedWithCmd).toBe(true);
        expect(usedWithControl).toBe(false);
        expect(undo.runCount).toBe(1);
    });

    test("the editor's own keys work through the registry: holding + zooms in again", () => {
        const timer = new ManualTimer();
        const level = Level.createNew();
        const session = new EditorSession({ level, clock: timer.clock, timer });
        const registry = createCommandRegistry(session);
        const runner = new CommandRunner(session.status);
        const dispatcher = new ShortcutDispatcher(registry, runner, 'other');
        const zoomBefore = session.view.zoom;

        dispatcher.handleKeyDown(US_KEYS.plus, 'level', false);
        dispatcher.handleKeyDown(repeated(US_KEYS.plus), 'level', false);

        expect(session.view.zoom).toBe(zoomBefore * 4);
    });
});
