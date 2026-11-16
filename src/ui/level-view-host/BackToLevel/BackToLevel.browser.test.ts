import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Level } from '../../../core/level/index.ts';
import { closeEditorPage, editorPageContainer, openEditorPage, showWithEditor } from '../../testing/editorPage.ts';
import { BackToLevel } from './BackToLevel.tsx';

beforeEach(() => {
    openEditorPage();
});

afterEach(() => {
    closeEditorPage();
});

function backButton() {
    return editorPageContainer().querySelector('.back-to-level button');
}

describe('BackToLevel', () => {
    test('appears only while the view holds nothing of the level, and fits the whole level', async () => {
        const { session } = showWithEditor(Level.createNew(), createElement(BackToLevel));
        const view = session.view;
        view.setSize(800, 600);
        view.centreOn({ x: 0, y: 0 });
        await expect.poll(() => backButton()).toBeNull();

        view.centreOn({ x: 1_000_000, y: 1_000_000 });
        await expect.poll(() => backButton()).not.toBeNull();

        const button = backButton();
        if (button === null) throw new Error('No Back to level button is shown.');
        await userEvent.click(button);

        await expect.poll(() => backButton()).toBeNull();
        const contents = session.openLevel.caches.bounds.subtreeBoundsOf(session.openLevel.level.world);
        expect(view.holdsNothing(contents)).toBe(false);
    });
});
