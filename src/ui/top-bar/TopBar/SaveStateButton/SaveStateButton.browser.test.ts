import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Level } from '../../../../core/level/index.ts';
import { SAVE_FAILED_TEXT, SAVED_EXPLANATION, UNSAVED_EXPLANATION } from '../../../../editor/saving/index.ts';
import { closeEditorPage, editorPageContainer, openEditorPage, showWithEditor } from '../../../testing/editorPage.ts';
import { SaveStateButton } from './SaveStateButton.tsx';

beforeEach(() => {
    openEditorPage();
});

afterEach(() => {
    closeEditorPage();
});

function saveStateButton() {
    const button = editorPageContainer().querySelector('.save-state-button button');
    if (!(button instanceof HTMLButtonElement)) throw new Error('No save state is shown.');

    return button;
}

// React draws on its own turn, so a test waits for the button before clicking it.
async function waitForButton() {
    await expect.poll(() => editorPageContainer().querySelector('.save-state-button button')).not.toBeNull();
}

function explanation() {
    return editorPageContainer().querySelector('.save-explanation')?.textContent;
}

describe('SaveStateButton', () => {
    test("shows each save state's label", async () => {
        const { saveIndicator } = showWithEditor(Level.createNew(), createElement(SaveStateButton));
        const labels: Record<string, string> = {
            saved: 'Saved',
            saving: 'Saving',
            unsaved: 'Unsaved changes',
            failed: 'Save failed',
        };

        for (const [status, label] of Object.entries(labels)) {
            saveIndicator.state.set(status as 'saved');
            await expect.poll(() => saveStateButton().textContent).toBe(label);
            expect(saveStateButton().getAttribute('aria-label')).toBe(`Save state: ${label}`);
        }
    });

    test('clicking it explains the state, and the explanation follows it', async () => {
        const { saveIndicator } = showWithEditor(Level.createNew(), createElement(SaveStateButton));
        await waitForButton();

        await userEvent.click(saveStateButton());
        await expect.poll(explanation).toBe(SAVED_EXPLANATION);

        saveIndicator.state.set('unsaved');
        await expect.poll(explanation).toBe(UNSAVED_EXPLANATION);
        saveIndicator.state.set('failed');
        await expect.poll(explanation).toBe(SAVE_FAILED_TEXT);
    });

    test('a second click, Esc or a press outside closes the explanation', async () => {
        showWithEditor(Level.createNew(), createElement(SaveStateButton));
        await waitForButton();

        await userEvent.click(saveStateButton());
        await expect.poll(explanation).toBe(SAVED_EXPLANATION);
        await userEvent.click(saveStateButton());
        await expect.poll(explanation).toBeUndefined();

        await userEvent.click(saveStateButton());
        await expect.poll(explanation).toBe(SAVED_EXPLANATION);
        await userEvent.keyboard('{Escape}');
        await expect.poll(explanation).toBeUndefined();

        await userEvent.click(saveStateButton());
        await expect.poll(explanation).toBe(SAVED_EXPLANATION);
        await userEvent.click(document.body, { position: { x: 5, y: 400 } });
        await expect.poll(explanation).toBeUndefined();
    });
});
