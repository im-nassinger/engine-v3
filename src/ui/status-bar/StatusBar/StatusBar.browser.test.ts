import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Level } from '../../../core/level/index.ts';
import { closeEditorPage, editorPageContainer, openEditorPage, showWithEditor } from '../../testing/editorPage.ts';
import { StatusBar } from './StatusBar.tsx';

beforeEach(() => {
    openEditorPage();
});

afterEach(() => {
    closeEditorPage();
});

function textOf(selector: string) {
    return editorPageContainer().querySelector(selector)?.textContent;
}

describe('StatusBar', () => {
    test("shows the tool's hint while there is no status text, and the picker's while it waits", async () => {
        const { session, tools, timer } = showWithEditor(Level.createNew(), createElement(StatusBar));
        const selectHint = tools.controller.active.hint;

        await expect.poll(() => textOf('.status-text')).toBe(selectHint);

        session.status.show('Undid: Move 3 entities');
        await expect.poll(() => textOf('.status-text')).toBe('Undid: Move 3 entities');
        timer.advance(4000);

        const stopWaiting = tools.controller.waitForPick(() => {});
        await expect.poll(() => textOf('.status-text')).toBe('Click an entity to pick it. Esc cancels.');
        stopWaiting();
        await expect.poll(() => textOf('.status-text')).toBe(selectHint);
    });

    test('the mouse position follows the mouse once a frame, and goes when it leaves', async () => {
        const { tools, frames } = showWithEditor(Level.createNew(), createElement(StatusBar));
        await expect.poll(() => textOf('.mouse-position')).toBe('');

        tools.mouse.moveTo({ x: 10.4, y: -20.6 });
        tools.mouse.moveTo({ x: 120.4, y: -39.6 });
        expect(textOf('.mouse-position')).toBe('');

        frames.runFrame();
        await expect.poll(() => textOf('.mouse-position')).toBe('120, −40');

        tools.mouse.leave();
        frames.runFrame();
        await expect.poll(() => textOf('.mouse-position')).toBe('');
    });
});
