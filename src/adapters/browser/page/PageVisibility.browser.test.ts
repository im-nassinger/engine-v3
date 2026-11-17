import { afterEach, describe, expect, test, vi } from 'vitest';

import { NameComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import { ScriptedEngine } from '../../../core/simulation/testing/ScriptedPhysics.ts';
import { placeBody, transform } from '../../../core/simulation/testing/scriptedLevel.ts';
import { HeldKeys, PlaySession } from '../../../editor/play/index.ts';
import { DirectGameRunner } from '../../../editor/play/testing/index.ts';
import { EditorSession } from '../../../editor/session/index.ts';
import { ManualFrames, ManualTimer } from '../../../editor/time/testing/index.ts';

import { PageVisibility } from './PageVisibility.ts';

let disconnects: (() => void)[] = [];

afterEach(() => {
    disconnects.forEach((disconnect) => disconnect());
    disconnects = [];
    vi.restoreAllMocks();
});

async function settle() {
    for (let i = 0; i < 20; i++) {
        await Promise.resolve();
    }
}

function playingSession() {
    const level = Level.createNew();
    placeBody(level, level.world, transform(0, 0)).addComponent(new NameComponent({ name: 'Crate' }));
    const timer = new ManualTimer();
    const frames = new ManualFrames();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    const heldKeys = new HeldKeys();
    const play = new PlaySession({
        session,
        runner: new DirectGameRunner(new ScriptedEngine()),
        clock: timer.clock,
        timer,
        frames,
        commitTyping: () => {},
        saveNow: () => Promise.resolve(),
        isDialogOpen: () => false,
        heldKeys,
    });
    disconnects.push(play.connectPage(new PageVisibility(window)));

    return { play, heldKeys };
}

describe('PageVisibility', () => {
    test('visibilitychange to hidden reaches PlaySession, which pauses and releases the keys', async () => {
        const { play, heldKeys } = playingSession();
        play.play();
        await settle();
        heldKeys.press('ArrowLeft');
        const visibility = vi.spyOn(document, 'visibilityState', 'get');

        visibility.mockReturnValue('visible');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(play.state).toBe('playing');

        visibility.mockReturnValue('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(play.state).toBe('paused');
        expect(heldKeys.codes()).toEqual([]);
    });

    test("the window's blur releases the keys and keeps the run going", async () => {
        const { play, heldKeys } = playingSession();
        play.play();
        await settle();
        heldKeys.press('KeyW');

        window.dispatchEvent(new FocusEvent('blur'));

        expect(heldKeys.codes()).toEqual([]);
        expect(play.state).toBe('playing');
    });

    test('an element losing focus keeps the keys held', () => {
        const { heldKeys } = playingSession();
        heldKeys.press('KeyW');
        const field = document.createElement('input');
        document.body.append(field);
        field.focus();

        field.blur();
        field.remove();

        expect(heldKeys.isHeld('KeyW')).toBe(true);
    });
});
