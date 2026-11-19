import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Level } from '../../../core/level/index.ts';
import { closeEditorPage, editorPageContainer, openEditorPage, showWithEditor } from '../../testing/editorPage.ts';
import { DebugBox } from './DebugBox.tsx';

beforeEach(() => {
    openEditorPage();
});

afterEach(() => {
    closeEditorPage();
});

function entry(label: string) {
    return editorPageContainer().querySelector(`[data-entry="${label}"]`);
}

function valueOf(label: string) {
    return entry(label)?.querySelector('.value')?.textContent;
}

describe('DebugBox', () => {
    test('shows its four entries, in order, each with a label in capitals', async () => {
        showWithEditor(Level.createNew(), createElement(DebugBox));
        await expect.poll(() => entry('X')).not.toBeNull();

        const entries = [...editorPageContainer().querySelectorAll('.debug-entry .label')];
        const labels = entries.map((label) => label.textContent);
        expect(labels).toEqual(['X:', 'Y:', 'GRID:', 'ZOOM:']);
    });

    test('labels are muted and values use the text colour in tabular figures', async () => {
        showWithEditor(Level.createNew(), createElement(DebugBox));
        await expect.poll(() => entry('ZOOM')).not.toBeNull();

        const label = entry('ZOOM')?.querySelector('.label');
        const value = entry('ZOOM')?.querySelector('.value');
        if (!label || !value) throw new Error('The entry has no label or value.');

        const rootStyle = getComputedStyle(document.documentElement);
        const probe = document.createElement('span');
        document.body.append(probe);
        probe.style.color = rootStyle.getPropertyValue('--muted');
        const mutedColour = getComputedStyle(probe).color;
        probe.style.color = rootStyle.getPropertyValue('--text');
        const textColour = getComputedStyle(probe).color;
        probe.remove();

        expect(getComputedStyle(label).color).toBe(mutedColour);
        expect(getComputedStyle(value).color).toBe(textColour);
        expect(getComputedStyle(value).fontVariantNumeric).toBe('tabular-nums');
    });

    test('the mouse position follows the mouse once a frame, and goes when it leaves', async () => {
        const { tools, frames } = showWithEditor(Level.createNew(), createElement(DebugBox));
        await expect.poll(() => valueOf('X')).toBe('');

        tools.mouse.moveTo({ x: 10.4, y: -20.6 });
        tools.mouse.moveTo({ x: 120.4, y: -39.6 });
        expect(valueOf('X')).toBe('');

        frames.runFrame();
        await expect.poll(() => valueOf('X')).toBe('120');
        expect(valueOf('Y')).toBe('−40');

        tools.mouse.leave();
        frames.runFrame();
        await expect.poll(() => valueOf('X')).toBe('');
        expect(valueOf('Y')).toBe('');
    });

    test('the box keeps its width when the mouse leaves', async () => {
        const { tools, frames } = showWithEditor(Level.createNew(), createElement(DebugBox));
        await expect.poll(() => entry('X')).not.toBeNull();
        const box = editorPageContainer().querySelector('.debug-box');
        if (!box) throw new Error('There is no debug box.');
        const widthWithoutMouse = box.getBoundingClientRect().width;

        tools.mouse.moveTo({ x: 120, y: -40 });
        frames.runFrame();
        await expect.poll(() => valueOf('X')).toBe('120');

        expect(box.getBoundingClientRect().width).toBe(widthWithoutMouse);
    });

    test('shows the grid size, following a change and a new level', async () => {
        const { session } = showWithEditor(Level.createNew(), createElement(DebugBox));
        await expect.poll(() => valueOf('GRID')).toBe('50');

        session.openLevel.level.editorData.setGridSize(25);
        await expect.poll(() => valueOf('GRID')).toBe('25');

        session.replaceOpenLevel(Level.createNew());
        await expect.poll(() => valueOf('GRID')).toBe('50');
    });

    test('shows the zoom as a whole percentage', async () => {
        const { session } = showWithEditor(Level.createNew(), createElement(DebugBox));

        session.view.zoomAboutMiddle(2.504);

        await expect.poll(() => valueOf('ZOOM')).toBe('250%');
    });
});
