import { createElement, Fragment } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { TriggerComponent } from '../../../core/components/index.ts';
import type { Action } from '../../../core/fields/index.ts';
import { Level } from '../../../core/level/index.ts';
import { placeBody, transform } from '../../../core/simulation/testing/scriptedLevel.ts';
import { PlayBar } from '../../play-bar/index.ts';
import { closeEditorPage, editorPageContainer, openEditorPage, showWithEditor } from '../../testing/editorPage.ts';
import { EndWindow } from './EndWindow.tsx';

const FRAME_MS = 1000 / 60;

beforeEach(() => {
    openEditorPage();
});

afterEach(() => {
    closeEditorPage();
});

// A level whose World runs the action when the level starts, played with the end window and the Play bar
// on the page, one frame after the run started.
async function showEnded(action: Action) {
    const level = Level.createNew();
    placeBody(level, level.world, transform(0, 0));
    const trigger = {
        id: 1,
        name: null,
        on: true,
        when: { kind: 'levelStart' },
        checks: [],
        actions: [action],
    } as const;
    level.world.addComponent(new TriggerComponent({ triggers: [trigger], nextTriggerId: 2 }));

    const page = createElement(Fragment, null, createElement(EndWindow), createElement(PlayBar));
    const shown = showWithEditor(level, page);
    shown.play.play();
    await expect.poll(() => shown.play.state).toBe('playing');

    shown.timer.clock.advance(FRAME_MS);
    shown.frames.runFrame(shown.timer.clock.nowMs());
    await expect.poll(() => shown.play.state).toBe('ended');

    return shown;
}

function find(selector: string) {
    return editorPageContainer().querySelector<HTMLElement>(selector);
}

function buttonNamed(name: string) {
    const buttons = [...editorPageContainer().querySelectorAll<HTMLElement>('.end-window .button')];
    const found = buttons.find((button) => button.textContent === name);
    if (found === undefined) throw new Error(`The end window has no ${name}.`);

    return found;
}

describe('EndWindow', () => {
    test('a Win shows "Level won", the time as m:ss.hh, Leave and Restart, and the Play bar reads ENDED', async () => {
        await showEnded({ kind: 'win' });

        await expect.poll(() => find('.end-window h2')?.textContent).toBe('Level won');
        expect(find('.end-window .time')?.textContent).toBe('Time 0:00.01');
        const names = [...editorPageContainer().querySelectorAll('.end-window .button')].map(
            (button) => button.textContent,
        );
        expect(names).toEqual(['Leave', 'Restart']);
        expect(buttonNamed('Restart').dataset.variant).toBe('primary');
        expect(document.activeElement).toBe(buttonNamed('Restart'));
        expect(find('.play-bar .state-label')?.textContent).toBe('ENDED');
    });

    test('a Lose shows "Level lost"', async () => {
        await showEnded({ kind: 'lose' });

        await expect.poll(() => find('.end-window h2')?.textContent).toBe('Level lost');
    });

    test('the window is 320 px wide, centred over the scrim', async () => {
        await showEnded({ kind: 'win' });

        const window = find('.end-window');
        const box = find('.end-window .box');
        if (window === null || box === null) throw new Error('No end window.');
        expect(getComputedStyle(window).backgroundColor).toBe('rgba(0, 0, 0, 0.5)');
        expect(box.getBoundingClientRect().width).toBe(320);
    });

    test('Leave is Stop, and Restart starts the run again', async () => {
        const shown = await showEnded({ kind: 'win' });

        await userEvent.click(buttonNamed('Restart'));
        await expect.poll(() => shown.play.state).toBe('playing');
        expect(find('.end-window .box')).toBeNull();

        shown.timer.clock.advance(FRAME_MS);
        shown.frames.runFrame(shown.timer.clock.nowMs());
        await expect.poll(() => shown.play.state).toBe('ended');

        await userEvent.click(buttonNamed('Leave'));
        expect(shown.play.state).toBe('idle');
        expect(find('.end-window .box')).toBeNull();
    });

    test('shows nothing while the run plays', () => {
        const level = Level.createNew();
        const shown = showWithEditor(level, createElement(EndWindow));
        shown.play.play();

        expect(find('.end-window')).toBeNull();
    });
});
