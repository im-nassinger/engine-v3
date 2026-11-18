import { createElement } from 'react';
import { afterEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { closeControl, computedAs, shownControl, showControl, styleOf, tokenColour } from '../testing/controlLooks.ts';
import { Menu } from './Menu.tsx';
import type { MenuEntry } from './MenuEntry.ts';

const ENTRIES: MenuEntry[] = [
    { kind: 'action', id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', onChoose: () => undefined },
    { kind: 'action', id: 'redo', label: 'Redo', disabledReason: 'Nothing to redo', onChoose: () => undefined },
    {
        kind: 'submenu',
        id: 'view',
        label: 'View',
        entries: [{ kind: 'action', id: 'grid', label: 'Grid', onChoose: () => undefined }],
    },
];

let anchor: HTMLElement | undefined;

afterEach(() => {
    closeControl();
    anchor?.remove();
});

async function showMenu() {
    await page.viewport(1280, 800);
    anchor = document.createElement('button');
    anchor.style.cssText = 'position: fixed; left: 10px; top: 10px; width: 48px; height: 48px';
    document.body.append(anchor);
    const anchorRef = { current: anchor };
    showControl(createElement(Menu, { entries: ENTRIES, onClose: () => undefined, anchor: anchorRef }));
    await expect.poll(() => document.querySelector('.menu-panel')).not.toBeNull();
}

function row(label: string) {
    const rows = document.querySelectorAll<HTMLElement>('[role="menuitem"]');
    const found = [...rows].find((each) => each.querySelector('.label')?.textContent === label);
    if (found === undefined) throw new Error(`No ${label} entry is shown.`);

    return found;
}

describe("Menu's look", () => {
    test('is solid panel with 12 px corners, 6 px inside and the shade, and no edge', async () => {
        await showMenu();

        const panel = styleOf(shownControl('.menu-panel'));
        expect(panel.backgroundColor).toBe(tokenColour('--panel'));
        expect(panel.borderTopLeftRadius).toBe('12px');
        expect(panel.paddingTop).toBe('6px');
        expect(panel.boxShadow).toBe(computedAs('box-shadow', 'var(--shade)'));
        expect(panel.borderTopWidth).toBe('0px');
    });

    test('has 28 px entries with 8 px corners and the shortcut muted at the right', async () => {
        await showMenu();

        const undo = row('Undo');
        expect(undo.getBoundingClientRect().height).toBe(28);
        expect(styleOf(undo).borderTopLeftRadius).toBe('8px');
        const shortcut = shownControl('.menu-action-row .shortcut');
        expect(styleOf(shortcut).color).toBe(tokenColour('--muted'));
        expect(shortcut.getBoundingClientRect().right).toBeGreaterThan(undo.getBoundingClientRect().right - 16);
    });

    test('gives the hovered entry the soft accent, keeping its text', async () => {
        await showMenu();

        await userEvent.hover(row('Undo'));

        await expect.poll(() => styleOf(row('Undo')).backgroundColor).toBe(tokenColour('--accent-soft'));
        expect(styleOf(row('Undo')).color).toBe(tokenColour('--text'));
    });

    test('draws a disabled entry faint, also under the mouse', async () => {
        await showMenu();

        await userEvent.hover(row('Redo'));

        expect(styleOf(row('Redo')).color).toBe(tokenColour('--faint'));
        expect(styleOf(row('Redo')).backgroundColor).toBe(computedAs('background-color', 'transparent'));
    });

    test('opens a submenu to the right of its entry, its first entry level with it', async () => {
        await showMenu();

        await userEvent.hover(row('View'));

        await expect.poll(() => document.querySelector('.submenu .menu-panel')).not.toBeNull();
        expect(styleOf(row('View')).backgroundColor).toBe(tokenColour('--accent-soft'));
        const mainPanel = shownControl('.menu > .menu-panel').getBoundingClientRect();
        const submenuPanel = shownControl('.submenu .menu-panel').getBoundingClientRect();
        expect(submenuPanel.left).toBeCloseTo(mainPanel.right, 0);
        expect(row('Grid').getBoundingClientRect().top).toBeCloseTo(row('View').getBoundingClientRect().top, 0);
    });
});
