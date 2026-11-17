import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Every command registered so far, as the main menu should list it, with its first shortcut.
const MAIN_MENU: Record<string, [string, string][]> = {
    File: [
        ['New', ''],
        ['Import', 'Ctrl+O'],
        ['Export', 'Ctrl+S'],
    ],
    Edit: [
        ['Undo', 'Ctrl+Z'],
        ['Redo', 'Ctrl+Shift+Z'],
        ['Cut', 'Ctrl+X'],
        ['Copy', 'Ctrl+C'],
        ['Paste', 'Ctrl+V'],
        ['Duplicate', 'Ctrl+D'],
        ['Delete', 'Del'],
        ['Select all', 'Ctrl+A'],
        ['Rename', 'F2'],
        ['Hide or show', 'Ctrl+Shift+H'],
    ],
    Arrange: [
        ['Group', 'Ctrl+G'],
        ['Ungroup', 'Ctrl+Shift+G'],
        ['Go into group', 'Enter'],
    ],
    View: [
        ['Grid', 'G'],
        ['Grid snapping', 'Shift+G'],
        ['Joint icons', 'Shift+J'],
        ['Camera frame', 'Shift+C'],
        ['Physics view', 'Shift+P'],
        ['Zoom in', '+'],
        ['Zoom out', '-'],
        ['100%', 'Shift+0'],
        ['Whole level', ''],
        ['Selection', 'F'],
        ['Camera frame', 'Shift+3'],
    ],
    Play: [
        ['Play', 'Shift+T'],
        ['Pause', 'F8'],
        ['Step', 'F9'],
    ],
    Help: [['About', '']],
};

async function openEditor(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
}

async function menuRows(page: Page) {
    const rows = page.locator('.submenu .menu-action-row');
    const count = await rows.count();
    const listed: [string, string][] = [];

    for (let index = 0; index < count; index += 1) {
        const row = rows.nth(index);
        const label = await row.locator('.label').innerText();
        const shortcutCount = await row.locator('.shortcut').count();
        let shortcut = '';
        if (shortcutCount > 0) {
            shortcut = await row.locator('.shortcut').innerText();
        }

        listed.push([label, shortcut]);
    }

    return listed;
}

test('the main menu lists every registered command with its shortcut', async ({ page }) => {
    await openEditor(page);
    await page.getByRole('button', { name: 'Main menu' }).click();

    const submenuRows = page.locator('.menu-submenu-row .label');
    await expect(submenuRows).toHaveText(Object.keys(MAIN_MENU));

    for (const [submenuName, expected] of Object.entries(MAIN_MENU)) {
        await page.getByRole('menuitem', { name: submenuName, exact: true }).hover();
        await expect(page.locator('.submenu .menu-action-row')).toHaveCount(expected.length);

        expect(await menuRows(page)).toEqual(expected);
    }
});

test('a switch shows its tick, and choosing it closes the menu', async ({ page }) => {
    await openEditor(page);
    await page.getByRole('button', { name: 'View menu' }).click();

    const grid = page.getByRole('menuitem', { name: /^Grid G/ });
    await expect(grid).toHaveAttribute('aria-checked', 'true');
    await grid.click();
    await expect(grid).toBeHidden();

    await page.getByRole('button', { name: 'View menu' }).click();
    await expect(page.getByRole('menuitem', { name: /^Grid G/ })).toHaveAttribute('aria-checked', 'false');
});

test('renaming the level is an undo step, and the tab title follows the name', async ({ page }) => {
    await openEditor(page);
    const nameBox = page.getByRole('textbox', { name: 'Level name' });
    const undo = page.getByRole('button', { name: /^Undo/ });

    await expect(nameBox).toHaveValue('Untitled level');
    await expect(page).toHaveTitle('Untitled level - engine-v3');
    await expect(undo).toHaveAttribute('aria-disabled', 'true');

    await nameBox.click();
    await nameBox.fill('Bridge');
    await nameBox.press('Enter');

    await expect(nameBox).toHaveValue('Bridge');
    await expect(page).toHaveTitle('Bridge - engine-v3');
    await expect(page.getByRole('button', { name: 'Undo: Rename level' })).toHaveAttribute('aria-disabled', 'false');

    await undo.click();

    await expect(nameBox).toHaveValue('Untitled level');
    await expect(page).toHaveTitle('Untitled level - engine-v3');
    await expect(page.getByRole('button', { name: 'Redo: Rename level' })).toHaveAttribute('aria-disabled', 'false');
});

test('Esc puts the name back, and leaving the box renames like Enter', async ({ page }) => {
    await openEditor(page);
    const nameBox = page.getByRole('textbox', { name: 'Level name' });

    await nameBox.click();
    await nameBox.fill('Cave');
    await nameBox.press('Escape');
    await expect(nameBox).toHaveValue('Untitled level');

    await nameBox.click();
    await nameBox.fill('Cave');
    await page.getByRole('button', { name: 'View menu' }).click();
    await expect(nameBox).toHaveValue('Cave');
    await expect(page).toHaveTitle('Cave - engine-v3');
});

test('the zoom shows the percentage, and a typed value zooms to it', async ({ page }) => {
    await openEditor(page);
    const zoom = page.getByRole('button', { name: 'Zoom' });

    await zoom.click();
    const box = page.getByRole('textbox', { name: 'Zoom percentage' });
    await expect(box).toBeFocused();
    await box.fill('250');
    await box.press('Enter');

    await expect(box).toBeHidden();
    await expect(zoom).toHaveText('250%');

    await zoom.click();
    await page.getByRole('textbox', { name: 'Zoom percentage' }).fill('5000');
    await page.getByRole('textbox', { name: 'Zoom percentage' }).press('Enter');
    await expect(zoom).toHaveText('1000%');

    await zoom.click();
    await page.getByRole('menuitem', { name: /^100%/ }).click();
    await expect(zoom).toHaveText('100%');
});

test('the Help button opens About', async ({ page }) => {
    await openEditor(page);

    await page.getByRole('button', { name: 'Help' }).click();

    await expect(page.getByRole('menuitem', { name: /^About/ })).toBeVisible();
});
