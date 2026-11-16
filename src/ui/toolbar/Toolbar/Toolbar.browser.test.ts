import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Level } from '../../../core/level/index.ts';
import { closeEditorPage, editorPageContainer, openEditorPage, showWithEditor } from '../../testing/editorPage.ts';
import { Toolbar } from './Toolbar.tsx';

beforeEach(() => {
    openEditorPage();
});

afterEach(() => {
    closeEditorPage();
});

function selectPlace() {
    const place = editorPageContainer().querySelector<HTMLElement>('.tool-button[data-tool="select"]');
    if (place === null) throw new Error('No Select button is shown.');

    return place;
}

function selectButton() {
    const button = selectPlace().querySelector('button');
    if (button === null) throw new Error('The Select place holds no button.');

    return button;
}

describe('Toolbar', () => {
    test('shows each tool ToolController holds, the active one on', async () => {
        showWithEditor(Level.createNew(), createElement(Toolbar));

        await expect.poll(() => selectButton().getAttribute('aria-pressed')).toBe('true');
        const buttons = editorPageContainer().querySelectorAll('.tool-button');
        expect(buttons.length).toBe(1);
        expect(selectButton().getAttribute('aria-label')).toBe('Select');
    });

    test('double-clicking Select locks it, shown by its dot, and Esc ends the lock', async () => {
        const { tools } = showWithEditor(Level.createNew(), createElement(Toolbar));
        await expect.poll(() => selectPlace().dataset['locked']).toBe('false');

        await userEvent.dblClick(selectButton());

        expect(tools.controller.isLocked).toBe(true);
        await expect.poll(() => selectPlace().dataset['locked']).toBe('true');
        const dot = getComputedStyle(selectPlace(), '::after');
        expect(dot.content).not.toBe('none');

        tools.controller.returnToSelect();
        await expect.poll(() => selectPlace().dataset['locked']).toBe('false');
    });
});
