import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Level } from '../../../../core/level/index.ts';
import { closeEditorPage, editorPageContainer, openEditorPage, showWithEditor } from '../../../testing/editorPage.ts';
import { GridSnapping } from './GridSnapping.tsx';

beforeEach(() => {
    openEditorPage();
});

afterEach(() => {
    closeEditorPage();
});

function snappingButton() {
    const button = editorPageContainer().querySelector('button[aria-label="Grid snapping"]');
    if (button === null) throw new Error('No Grid snapping button is shown.');

    return button;
}

describe('GridSnapping', () => {
    test('switches grid snapping, never a step, and follows the View menu', async () => {
        const { session } = showWithEditor(Level.createNew(), createElement(GridSnapping));
        await expect.poll(() => snappingButton().getAttribute('aria-pressed')).toBe('true');

        await userEvent.click(snappingButton());
        expect(session.viewSettings.isOn('gridSnapping')).toBe(false);
        await expect.poll(() => snappingButton().getAttribute('aria-pressed')).toBe('false');
        expect(session.openLevel.history.undoCount).toBe(0);

        session.viewSettings.toggle('gridSnapping');
        await expect.poll(() => snappingButton().getAttribute('aria-pressed')).toBe('true');
    });
});
