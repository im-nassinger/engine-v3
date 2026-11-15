import { describe, expect, test } from 'vitest';

import { CommandRunner } from '../commands/index.ts';
import { EscapeChain } from '../tools/index.ts';
import { buildToolTestSession, pointerAt } from '../tools/testing/toolTestSession.ts';

import { ShortcutDispatcher } from './ShortcutDispatcher.ts';
import { recordedKey, US_KEYS } from './testing/recordedKeys.ts';

const ESC = recordedKey('Escape', 'Escape');
const SPACE = recordedKey('Space', ' ');
const DIGIT_4 = recordedKey('Digit4', '4');
const ENTER = recordedKey('Enter', 'Enter');

function buildDispatcher() {
    const parts = buildToolTestSession();
    const runner = new CommandRunner(parts.session.status);
    const windows = { isOpen: () => false };
    const escape = new EscapeChain(parts.session, parts.controller, windows);
    const dispatcher = new ShortcutDispatcher(parts.commands, runner, 'other', { tools: parts.controller, escape });

    return { ...parts, runner, dispatcher };
}

describe('ShortcutDispatcher with the tools', () => {
    test('key 1 picks Select, and pressing it twice locks it', () => {
        const { dispatcher, controller } = buildDispatcher();
        controller.pick('shape');

        expect(dispatcher.handleKeyDown(US_KEYS.digit1, 'level', true)).toBe(true);
        expect(controller.active.id).toBe('select');

        dispatcher.handleKeyDown(US_KEYS.digit1, 'panel', false);
        expect(controller.isLocked).toBe(true);
    });

    test('a held number key picks once and never locks', () => {
        const { dispatcher, controller } = buildDispatcher();

        dispatcher.handleKeyDown(DIGIT_4, 'level', true);
        dispatcher.handleKeyDown({ ...DIGIT_4, repeat: true }, 'level', true);

        expect(controller.active.id).toBe('shape');
        expect(controller.isLocked).toBe(false);
    });

    test('the numpad 1 picks Select too', () => {
        const { dispatcher, controller } = buildDispatcher();
        controller.pick('shape');

        dispatcher.handleKeyDown(US_KEYS.numpad1, 'level', true);

        expect(controller.active.id).toBe('select');
    });

    test('a key for a tool v1 does not have is left alone', () => {
        const { dispatcher } = buildDispatcher();
        const digit2 = recordedKey('Digit2', '2');

        expect(dispatcher.handleKeyDown(digit2, 'level', true)).toBe(false);
    });

    test('tool keys and Esc are ignored while typing', () => {
        const { dispatcher, controller, session, square } = buildDispatcher();
        session.openLevel.selection.replace([square.id]);
        controller.pick('shape');

        expect(dispatcher.handleKeyDown(US_KEYS.digit1, 'textField', true)).toBe(false);
        expect(dispatcher.handleKeyDown(ESC, 'textField', true)).toBe(false);
        expect(dispatcher.handleKeyDown(SPACE, 'codeEditor', true)).toBe(false);
        expect(controller.active.id).toBe('shape');
    });

    test('Esc runs the chain', () => {
        const { dispatcher, controller } = buildDispatcher();
        controller.pick('shape');

        expect(dispatcher.handleKeyDown(ESC, 'level', true)).toBe(true);
        expect(controller.active.id).toBe('select');
    });

    test('Esc is left to an open dialog', () => {
        const { dispatcher, runner, controller } = buildDispatcher();
        controller.pick('shape');
        runner.dialog.open({ kind: 'notice', notice: { title: 'About', text: 'A game.' } });

        expect(dispatcher.handleKeyDown(ESC, 'level', true)).toBe(false);
        expect(controller.active.id).toBe('shape');
    });

    test('Space held pans, and its key up returns to the tool', () => {
        const { dispatcher, controller, select, session } = buildDispatcher();

        expect(dispatcher.handleKeyDown(SPACE, 'level', true)).toBe(true);
        controller.pointerDown(pointerAt({ x: 0, y: 0 }));
        controller.pointerMove(pointerAt({ x: 30, y: 0 }));
        controller.pointerUp(pointerAt({ x: 30, y: 0 }));
        dispatcher.handleKeyUp(SPACE);
        controller.pointerDown(pointerAt({ x: 0, y: 0 }));

        expect(session.view.middle).toEqual({ x: -30, y: 0 });
        expect(select.heard).toEqual(['activate', 'keyUp Space', 'down left']);
    });

    test('a key the tool uses goes to it before the commands', () => {
        const { dispatcher, controller, select, group, session } = buildDispatcher();
        session.openLevel.selection.replace([group.id]);
        select.usedKeys.add('Enter');

        dispatcher.handleKeyDown(ENTER, 'level', true);

        expect(session.openLevel.currentGroup.group).toBe(session.openLevel.level.world);
        expect(controller.active).toBe(select);
    });

    test('a key the tool leaves goes on to the commands: Enter goes into the group', () => {
        const { dispatcher, group, session } = buildDispatcher();
        session.openLevel.selection.replace([group.id]);

        expect(dispatcher.handleKeyDown(ENTER, 'level', true)).toBe(true);

        expect(session.openLevel.currentGroup.group).toBe(group);
    });
});
