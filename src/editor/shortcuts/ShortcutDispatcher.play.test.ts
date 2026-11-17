import { describe, expect, test } from 'vitest';

import { buildPlayTestSession, editorSnapshot, settle } from '../commands/play/testing/playTestSession.ts';

import { ShortcutDispatcher } from './ShortcutDispatcher.ts';
import { recordedKey } from './testing/recordedKeys.ts';

const SHIFT_T = recordedKey('KeyT', 'T', { shiftKey: true });
const CTRL_ENTER = recordedKey('Enter', 'Enter', { ctrlKey: true });
const F8 = recordedKey('F8', 'F8');
const F9 = recordedKey('F9', 'F9');
const CTRL_Z = recordedKey('KeyZ', 'z', { ctrlKey: true });
const DELETE = recordedKey('Delete', 'Delete');

function buildDispatcher() {
    const built = buildPlayTestSession();
    const dispatcher = new ShortcutDispatcher(built.registry, built.runner, 'other');

    return { ...built, dispatcher };
}

describe('ShortcutDispatcher during test play', () => {
    test('Ctrl+Enter inside a field commits it, then plays, and stops again', async () => {
        const { dispatcher, play, calls } = buildDispatcher();

        const used = dispatcher.handleKeyDown(CTRL_ENTER, 'textField', false);

        expect(used).toBe(true);
        expect(calls).toEqual(['commit', 'save']);
        expect(play.state).toBe('starting');

        await settle();
        expect(play.state).toBe('playing');

        dispatcher.handleKeyDown(CTRL_ENTER, 'textField', false);
        expect(play.state).toBe('idle');
    });

    test('Shift+T plays and stops wherever the single-letter keys work', async () => {
        const { dispatcher, play } = buildDispatcher();

        expect(dispatcher.handleKeyDown(SHIFT_T, 'level', false)).toBe(true);
        expect(play.state).toBe('starting');

        await settle();
        expect(play.state).toBe('playing');

        expect(dispatcher.handleKeyDown(SHIFT_T, 'panel', true)).toBe(true);
        expect(play.state).toBe('idle');
    });

    test('Shift+T in a text field or the code editor is left to it, to type a T', () => {
        const { dispatcher, play, calls } = buildDispatcher();

        expect(dispatcher.handleKeyDown(SHIFT_T, 'textField', false)).toBe(false);
        expect(dispatcher.handleKeyDown(SHIFT_T, 'codeEditor', true)).toBe(false);

        expect(play.state).toBe('idle');
        expect(calls).toEqual([]);
    });

    test('during play Shift+T stops the run, so the game never gets it', async () => {
        const built = buildDispatcher();
        const { dispatcher, play } = built;
        await built.startPlaying();

        expect(dispatcher.handleKeyDown(SHIFT_T, 'level', true)).toBe(true);
        expect(play.state).toBe('idle');
    });

    test('F8 pauses and F9 steps, from a field too', async () => {
        const built = buildDispatcher();
        const { dispatcher, play, nextFrame } = built;
        await built.startPlaying();

        dispatcher.handleKeyDown(F8, 'textField', false);
        expect(play.state).toBe('paused');
        await nextFrame();
        const tickWhenPaused = play.mirror?.tick ?? -1;

        dispatcher.handleKeyDown(F9, 'level', false);
        await nextFrame();
        await nextFrame();
        expect(play.mirror?.tick).toBe(tickWhenPaused + 1);

        dispatcher.handleKeyDown(F8, 'level', false);
        expect(play.state).toBe('playing');
    });

    test("another command's key runs nothing, shows no hint, and keeps the browser's own use of it", async () => {
        const built = buildDispatcher();
        const { session, dispatcher, play, square } = built;
        session.openLevel.selection.replace([square.id]);
        const before = editorSnapshot(built);
        await built.startPlaying();

        const usedDelete = dispatcher.handleKeyDown(DELETE, 'level', true);
        const usedUndo = dispatcher.handleKeyDown(CTRL_Z, 'level', true);

        expect(usedDelete).toBe(true);
        expect(usedUndo).toBe(true);
        expect(play.hint.current).toBeUndefined();
        expect(editorSnapshot(built)).toEqual(before);
    });
});
