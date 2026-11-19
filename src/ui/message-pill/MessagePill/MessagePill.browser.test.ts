import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Level } from '../../../core/level/index.ts';
import { StatusText } from '../../../editor/status/index.ts';
import { closeEditorPage, editorPageContainer, openEditorPage, showWithEditor } from '../../testing/editorPage.ts';
import { MessagePill } from './MessagePill.tsx';

const SAVE_EXPLANATION_START = 'Saving in this browser failed';

beforeEach(() => {
    openEditorPage();
});

afterEach(() => {
    closeEditorPage();
});

function shownMessage() {
    return editorPageContainer().querySelector('.message');
}

function showPill() {
    const shown = showWithEditor(Level.createNew(), createElement(MessagePill));

    return { ...shown, saveState: shown.saveIndicator.state };
}

describe('MessagePill', () => {
    test('shows nothing without a message, but keeps its place for screen readers', async () => {
        showPill();

        await expect.poll(() => editorPageContainer().querySelector('[role="status"]')).not.toBeNull();
        expect(shownMessage()).toBeNull();
    });

    test('shows a status text for 4 seconds', async () => {
        const { session, timer } = showPill();

        session.status.show('Undid: Move 3 entities');
        await expect.poll(() => shownMessage()?.textContent).toBe('Undid: Move 3 entities');

        timer.advance(StatusText.showMs);
        await expect.poll(shownMessage).toBeNull();
    });

    test('a failed save stays, with its icon, until it is fixed', async () => {
        const { timer, saveState } = showPill();

        saveState.set('failed');
        await expect.poll(() => shownMessage()?.textContent).toContain(SAVE_EXPLANATION_START);
        expect(shownMessage()?.querySelector('svg')).not.toBeNull();

        timer.advance(StatusText.showMs * 10);
        expect(shownMessage()?.textContent).toContain(SAVE_EXPLANATION_START);

        saveState.set('saved');
        await expect.poll(shownMessage).toBeNull();
    });

    test('a status text shows over a failed save, which comes back after it', async () => {
        const { session, timer, saveState } = showPill();
        saveState.set('failed');
        await expect.poll(() => shownMessage()?.textContent).toContain(SAVE_EXPLANATION_START);

        session.status.show('Nothing to undo');
        await expect.poll(() => shownMessage()?.textContent).toBe('Nothing to undo');
        expect(shownMessage()?.querySelector('svg')).toBeNull();

        timer.advance(StatusText.showMs);
        await expect.poll(() => shownMessage()?.textContent).toContain(SAVE_EXPLANATION_START);
    });
});
