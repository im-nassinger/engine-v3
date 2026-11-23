import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { TransformComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import { toggleEntityHidden } from '../../../editor/commands/index.ts';
import { closeEditorPage, editorPageContainer, openEditorPage } from '../../testing/editorPage.ts';
import { showShell } from './testing/shellPage.ts';

const WINDOW = { width: 1280, height: 800 };
const GAP = 10;
const SHEET_WIDTH = 320;
const MINIMAP_HEIGHT = 93;
const DEBUG_BOX = 28;

beforeEach(async () => {
    await page.viewport(WINDOW.width, WINDOW.height);
    openEditorPage();
});

afterEach(() => {
    closeEditorPage();
});

function find(selector: string) {
    return editorPageContainer().querySelector<HTMLElement>(selector);
}

function sheet() {
    return find('.shortcut-sheet');
}

function requireSheet() {
    const shown = sheet();
    if (shown === null) throw new Error('The shortcut list is not open.');

    return shown;
}

function searchBox() {
    const box = requireSheet().querySelector<HTMLInputElement>('input');
    if (box === null) throw new Error('The shortcut list has no search box.');

    return box;
}

function areaTitles() {
    const titles = requireSheet().querySelectorAll('.shortcut-sheet-section > .title');

    return [...titles].map((title) => title.textContent);
}

function rowNames() {
    const names = requireSheet().querySelectorAll('.shortcut-sheet-row > .name');

    return [...names].map((name) => name.textContent);
}

function rowNamed(name: string) {
    const rows = requireSheet().querySelectorAll<HTMLElement>('.shortcut-sheet-row');
    const found = [...rows].find((row) => row.querySelector('.name')?.textContent === name);
    if (found === undefined) throw new Error(`The shortcut list has no row ${name}.`);

    return found;
}

// The keys as the row draws them, the key caps in brackets: "[Ctrl]+[Shift]+[Z] or [Ctrl]+[Y]".
function keysOf(name: string) {
    const parts = rowNamed(name).querySelectorAll('.keys > *');
    const texts = [...parts].map((part) => {
        if (part.tagName === 'KBD') return `[${part.textContent}]`;
        if (part.classList.contains('or')) return ' or ';

        return part.textContent;
    });

    return texts.join('');
}

async function openSheet() {
    const shown = showShell();
    shown.session.shortcutSheet.toggle();
    await expect.poll(sheet).not.toBeNull();

    return shown;
}

describe('EditorShell: the shortcut list', () => {
    test('opens in the Entities viewer’s place, 320 px wide, down to 10 px above the minimap, the viewer hidden', async () => {
        const { session } = showShell();
        expect(sheet()).toBeNull();

        session.shortcutSheet.toggle();
        await expect.poll(sheet).not.toBeNull();

        const place = find('[data-area="shortcut-sheet"]')?.getBoundingClientRect();
        const minimapTop = WINDOW.height - GAP * 2 - DEBUG_BOX - MINIMAP_HEIGHT;
        expect(place?.top).toBe(GAP);
        expect(place?.right).toBe(WINDOW.width - GAP);
        expect(place?.width).toBe(SHEET_WIDTH);
        expect(place?.bottom).toBe(minimapTop - GAP);

        const viewer = find('[data-area="entities-viewer"]');
        if (viewer === null) throw new Error('The shell has no Entities viewer.');
        expect(getComputedStyle(viewer).visibility).toBe('hidden');
    });

    test('gives the search the focus, and lists every area with its rows and key caps', async () => {
        await openSheet();

        expect(document.activeElement).toBe(searchBox());
        expect(searchBox().placeholder).toBe('Search shortcuts');
        expect(areaTitles()).toEqual(['Tools', 'Selecting', 'Editing', 'View', 'Test play', 'Mouse']);
        expect(keysOf('Select')).toBe('[1]');
        expect(keysOf('Undo')).toBe('[Ctrl]+[Z]');
        expect(keysOf('Redo')).toBe('[Ctrl]+[Shift]+[Z] or [Ctrl]+[Y]');
        expect(keysOf('Shortcut list')).toBe('[?]');
    });

    test('typing filters the rows by name and keys, hides an empty area, and says when nothing matches', async () => {
        await openSheet();

        await userEvent.type(searchBox(), 'ctrl z');
        expect(rowNames()).toEqual(['Undo', 'Redo']);
        expect(areaTitles()).toEqual(['Editing']);

        await userEvent.clear(searchBox());
        await userEvent.type(searchBox(), 'GRID');
        expect(rowNames()).toEqual(expect.arrayContaining(['Move one grid step', 'Grid', 'Grid snapping']));
        expect(areaTitles()).toEqual(['Editing', 'View']);

        await userEvent.clear(searchBox());
        await userEvent.type(searchBox(), 'nothing like this');
        expect(rowNames()).toEqual([]);
        expect(requireSheet().querySelector('.none')?.textContent).toBe('No shortcut matches');
    });

    test('Esc in the search closes it, and so does its ×, whose tooltip names ?', async () => {
        const { session } = await openSheet();

        await userEvent.keyboard('{Escape}');
        await expect.poll(sheet).toBeNull();
        expect(session.shortcutSheet.isOpen).toBe(false);

        session.shortcutSheet.toggle();
        await expect.poll(sheet).not.toBeNull();
        const close = requireSheet().querySelector<HTMLButtonElement>('button[aria-label="Close"]');
        if (close === null) throw new Error('The shortcut list has no ×.');

        await userEvent.hover(close);
        await expect.poll(() => document.querySelector('[role="tooltip"]')?.textContent).toBe('Close?');
        await userEvent.click(close);
        await expect.poll(sheet).toBeNull();
    });

    test('Help › Keyboard shortcuts in the main menu opens it and closes it', async () => {
        showShell();

        for (const isOpenAfter of [true, false]) {
            await userEvent.click(page.getByRole('button', { name: 'Main menu' }));
            await userEvent.hover(page.getByRole('menuitem', { name: 'Help' }));
            await userEvent.click(page.getByRole('menuitem', { name: /^Keyboard shortcuts/ }));

            if (isOpenAfter) {
                await expect.poll(sheet).not.toBeNull();
                expect(document.activeElement).toBe(searchBox());
            } else {
                await expect.poll(sheet).toBeNull();
            }
        }
    });

    test('stays open, with what was typed, while the level is edited', async () => {
        const level = Level.createNew();
        const crate = level.createEntity(level.world, 0);
        crate.addComponent(new TransformComponent());
        const { session } = showShell(level);
        session.shortcutSheet.toggle();
        await expect.poll(sheet).not.toBeNull();
        await userEvent.type(searchBox(), 'grid');

        session.openLevel.selection.replace([crate.id]);
        toggleEntityHidden(session.openLevel, crate.id);
        await expect.poll(() => find('[data-area="entity-inspector"]')).not.toBeNull();
        expect(crate.isHidden).toBe(true);

        expect(sheet()).not.toBeNull();
        expect(searchBox().value).toBe('grid');
    });
});
