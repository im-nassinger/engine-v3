import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Level } from '../../../core/level/index.ts';
import { placeBody, transform } from '../../../core/simulation/testing/scriptedLevel.ts';
import { NOT_PAUSED_REASON } from '../../../editor/commands/index.ts';
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

// The Play bar's button with the name given, which it carries as its accessible name.
function button(name: string) {
    const buttons = [...(bar()?.querySelectorAll<HTMLElement>('.play-bar-button') ?? [])];
    const found = buttons.find((each) => each.getAttribute('aria-label') === name);
    if (found === undefined) throw new Error(`The Play bar has no ${name}.`);

    return found;
}

function tooltipText() {
    return document.querySelector('[role="tooltip"]')?.textContent ?? '';
}

// What the button's tooltip says once the mouse rests on it.
async function tooltipOf(name: string) {
    await userEvent.hover(button(name));
    await expect.poll(tooltipText, { timeout: 2000 }).not.toBe('');
    const text = tooltipText();
    await userEvent.unhover(button(name));
    await expect.poll(tooltipText, { timeout: 2000 }).toBe('');

    return text;
}

function pill() {
    const found = bar()?.querySelector<HTMLElement>('.controls');
    if (found === undefined || found === null) throw new Error('The Play bar has no pill.');

    return found;
}

// What the browser makes of a colour token, which each browser writes its own way.
function colourOf(token: string) {
    const probe = document.createElement('div');
    probe.style.background = `var(${token})`;
    editorPageContainer().append(probe);
    const tint = getComputedStyle(probe).backgroundColor;
    probe.remove();

    return tint;
}

describe('PlayBar', () => {
    test('while playing: PLAYING, Step off, Pause and Stop, each named with its key in its tooltip', async () => {
        await showPlaying();

        expect(label()).toBe('PLAYING');
        const names = [...(bar()?.querySelectorAll('.play-bar-button') ?? [])].map((each) =>
            each.getAttribute('aria-label'),
        );
        expect(names).toEqual(['Step', 'Pause', 'Stop']);
        expect(await tooltipOf('Pause')).toBe('PauseF8');
        expect(await tooltipOf('Stop')).toBe('StopCtrl+Enter');
        expect(await tooltipOf('Step')).toBe(NOT_PAUSED_REASON);
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

    test('the pill is fully round, has the shade and no edge, and its big button takes the colour of its state', async () => {
        await showPlaying();
        const look = getComputedStyle(pill());

        expect(look.borderTopLeftRadius).toBe('999px');
        expect(look.boxShadow).not.toBe('none');
        expect(look.borderTopStyle).toBe('none');
        expect(getComputedStyle(bar() ?? document.body).boxShadow).toBe('none');
        expect(look.backgroundColor).toBe(colourOf('--chip'));
        expect(getComputedStyle(button('Pause')).backgroundColor).toBe(colourOf('--playing'));

        await userEvent.click(button('Pause'));
        await expect.poll(label).toBe('PAUSED');
        // Away from the button, whose colour lightens under the mouse.
        await userEvent.unhover(button('Resume'));

        expect(getComputedStyle(button('Resume')).backgroundColor).toBe(colourOf('--paused'));
        expect(getComputedStyle(pill()).backgroundColor).toBe(colourOf('--chip'));
    });

    test('its buttons are round, and a message sits under the pill, not in it', async () => {
        const { commands } = await showPlaying();
        const selectAll = commands.registry.find('edit.selectAll');
        if (selectAll === undefined) throw new Error('No Select all.');

        commands.runner.run(selectAll);
        await expect.poll(message).toBe(STOP_TO_EDIT_TEXT);

        expect(getComputedStyle(button('Stop')).borderTopLeftRadius).toBe('999px');
        const messageBox = bar()?.querySelector('.message')?.getBoundingClientRect();
        expect(messageBox?.top).toBeGreaterThanOrEqual(pill().getBoundingClientRect().bottom);
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

        // In the pill's left padding, beside Step, where the pill's round end still covers.
        const middle = pill().getBoundingClientRect().height / 2;
        await userEvent.click(pill(), { position: { x: 5, y: middle } });

        expect(heldKeys.codes()).toEqual([]);
        expect(play.state).toBe('playing');
    });
});
