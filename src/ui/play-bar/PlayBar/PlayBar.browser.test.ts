import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Level } from '../../../core/level/index.ts';
import { placeBody, transform } from '../../../core/simulation/testing/scriptedLevel.ts';
import { STOP_TO_EDIT_TEXT } from '../../../editor/play/index.ts';
import { closeEditorPage, editorPageContainer, openEditorPage, showWithEditor } from '../../testing/editorPage.ts';
import { PlayBar } from './PlayBar.tsx';

const FRAME_MS = 1000 / 60;

beforeEach(() => {
    openEditorPage();
});

afterEach(() => {
    closeEditorPage();
});

// The Play bar over a level with one body, its run going.
async function showPlaying() {
    const level = Level.createNew();
    placeBody(level, level.world, transform(0, 0));
    const shown = showWithEditor(level, createElement(PlayBar));
    shown.play.play();
    await expect.poll(() => shown.play.state).toBe('playing');
    await expect.poll(() => bar()?.dataset.state).toBe('playing');

    // One frame of the game, its answer, and the redraw.
    async function nextFrame() {
        shown.timer.clock.advance(FRAME_MS);
        shown.frames.runFrame(shown.timer.clock.nowMs());
        await Promise.resolve();
    }

    return { ...shown, nextFrame };
}

function bar() {
    return editorPageContainer().querySelector<HTMLElement>('.play-bar');
}

function label() {
    return bar()?.querySelector('.state-label')?.textContent ?? '';
}

function message() {
    return bar()?.querySelector('.message')?.textContent ?? '';
}

// The Play bar's button whose name starts the way given.
function button(name: string) {
    const buttons = [...(bar()?.querySelectorAll<HTMLElement>('.play-bar-button') ?? [])];
    const found = buttons.find((each) => each.querySelector('.name')?.textContent === name);
    if (found === undefined) throw new Error(`The Play bar has no ${name}.`);

    return found;
}

function keyOf(name: string) {
    return button(name).querySelector('.shortcut')?.textContent;
}

describe('PlayBar', () => {
    test('while playing: PLAYING, Pause, Step off and Stop, each with its key', async () => {
        await showPlaying();

        expect(label()).toBe('PLAYING');
        expect(keyOf('Pause')).toBe('F8');
        expect(keyOf('Step')).toBe('F9');
        expect(keyOf('Stop')).toBe('Shift+T');
        expect(button('Pause').getAttribute('aria-disabled')).toBe('false');
        expect(button('Step').getAttribute('aria-disabled')).toBe('true');
        expect(message()).toBe('');
    });

    test('Pause shows PAUSED and Resume, Step moves one tick, Resume plays on and Stop ends the run', async () => {
        const { play, nextFrame } = await showPlaying();
        for (let frame = 0; frame < 4; frame++) {
            await nextFrame();
        }

        await userEvent.click(button('Pause'));
        await expect.poll(label).toBe('PAUSED');
        expect(bar()?.dataset.state).toBe('paused');
        expect(button('Step').getAttribute('aria-disabled')).toBe('false');
        await expect.poll(() => play.mirror?.tick).toBeGreaterThan(0);
        const pausedAt = play.mirror?.tick ?? 0;

        await userEvent.click(button('Step'));
        for (let frame = 0; frame < 3; frame++) {
            await nextFrame();
        }
        await expect.poll(() => play.mirror?.tick).toBe(pausedAt + 1);

        await userEvent.click(button('Resume'));
        await expect.poll(label).toBe('PLAYING');

        await userEvent.click(button('Stop'));
        expect(play.state).toBe('idle');
    });

    test('an edit during play shows "Stop to edit" under the buttons', async () => {
        const { commands } = await showPlaying();
        const selectAll = commands.registry.find('edit.selectAll');
        if (selectAll === undefined) throw new Error('No Select all.');

        commands.runner.run(selectAll);

        await expect.poll(message).toBe(STOP_TO_EDIT_TEXT);
    });

    test('a click on the Play bar lets go of every key held and keeps the run going', async () => {
        const { play, heldKeys } = await showPlaying();
        heldKeys.press('ArrowRight');

        await userEvent.click(bar()?.querySelector('.state-label') ?? document.body);

        expect(heldKeys.codes()).toEqual([]);
        expect(play.state).toBe('playing');
    });
});
