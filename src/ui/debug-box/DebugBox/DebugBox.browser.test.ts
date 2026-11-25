import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
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

// A typed entry's value is its box's text.
function valueOf(label: string) {
    const value = entry(label)?.querySelector('.value');
    if (value instanceof HTMLInputElement) return value.value;

    return value?.textContent;
}

function valueBox(label: string) {
    const box = entry(label)?.querySelector('input');
    if (!box) throw new Error(`${label} has no box to type in.`);

    return box;
}

async function typeOver(label: string, text: string) {
    await userEvent.click(valueBox(label));
    await userEvent.keyboard(`{Control>}a{/Control}${text}`);
}

describe('DebugBox', () => {
    test('shows its four entries, in order, each with a label in capitals', async () => {
        showWithEditor(Level.createNew(), createElement(DebugBox));
        await expect.poll(() => entry('X')).not.toBeNull();

        const entries = [...editorPageContainer().querySelectorAll('[data-entry] > .label')];
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
        await expect.poll(() => valueOf('GRID')).toBe('100');

        session.openLevel.level.editorData.setGridSize(25);
        await expect.poll(() => valueOf('GRID')).toBe('25');

        session.replaceOpenLevel(Level.createNew());
        await expect.poll(() => valueOf('GRID')).toBe('100');
    });

    test('shows the zoom as a whole percentage', async () => {
        const { session } = showWithEditor(Level.createNew(), createElement(DebugBox));

        session.view.zoomAboutMiddle(2.504);

        await expect.poll(() => valueOf('ZOOM')).toBe('250%');
    });

    test('typing a grid size and Enter sets it, with no undo step', async () => {
        const { session } = showWithEditor(Level.createNew(), createElement(DebugBox));
        await expect.poll(() => valueOf('GRID')).toBe('100');

        await typeOver('GRID', '25{Enter}');

        await expect.poll(() => session.openLevel.level.editorData.gridSize).toBe(25);
        expect(valueOf('GRID')).toBe('25');
        expect(session.openLevel.history.undoCount).toBe(0);
        expect(document.activeElement).not.toBe(valueBox('GRID'));
    });

    test('Esc keeps the old grid size, and text that is not a number says why', async () => {
        const { session } = showWithEditor(Level.createNew(), createElement(DebugBox));
        await expect.poll(() => valueOf('GRID')).toBe('100');

        await typeOver('GRID', '25{Escape}');
        await expect.poll(() => valueOf('GRID')).toBe('100');

        await typeOver('GRID', 'big{Enter}');
        await expect.poll(() => session.status.current).toBe('Type the grid size as a number of pixels');
        expect(session.openLevel.level.editorData.gridSize).toBe(100);
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('typing a zoom percentage zooms the level view', async () => {
        const { session } = showWithEditor(Level.createNew(), createElement(DebugBox));
        await expect.poll(() => entry('ZOOM')).not.toBeNull();

        await typeOver('ZOOM', '150%{Enter}');

        await expect.poll(() => session.view.zoom).toBe(1.5);
        expect(valueOf('ZOOM')).toBe('150%');
    });
});
