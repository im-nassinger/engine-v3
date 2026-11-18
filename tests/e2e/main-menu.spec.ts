import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Every command in a submenu, as the main menu should list it, with its first shortcut. Select all, Rename
// and Hide or show are in no menu for now (owner, 2026-11-18), and Pause and Step are on the Play bar.
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

async function openMainMenu(page: Page) {
    await page.getByRole('button', { name: 'Main menu' }).click();
}

async function openSubmenu(page: Page, name: string) {
    await openMainMenu(page);
    await page.getByRole('menuitem', { name, exact: true }).hover();
}

test('☰ opens the main menu to its right: Play with its keys, then every command in its submenu', async ({ page }) => {
    await openEditor(page);
    await openMainMenu(page);

    const island = await page.getByRole('region', { name: 'Main menu' }).boundingBox();
    const menu = await page.locator('.menu > .menu-panel').first().boundingBox();
    if (island === null || menu === null) throw new Error('No ☰ island or no menu.');
    expect(menu.x).toBeGreaterThan(island.x + island.width);
    expect(menu.y).toBeCloseTo(island.y, 0);

    const play = page.locator('.menu > .menu-panel > .menu-action-row').first();
    await expect(play.locator('.label')).toHaveText('Play');
    await expect(play.locator('.shortcut')).toHaveText('Ctrl+Enter');

    const submenuRows = page.locator('.menu-submenu-row .label');
    await expect(submenuRows).toHaveText(Object.keys(MAIN_MENU));

    for (const [submenuName, expected] of Object.entries(MAIN_MENU)) {
        await page.getByRole('menuitem', { name: submenuName, exact: true }).hover();
        await expect(page.locator('.submenu .menu-action-row')).toHaveCount(expected.length);

        expect(await menuRows(page)).toEqual(expected);
    }
});

test('Play in the main menu starts test play, and Stop brings ☰ back', async ({ page }) => {
    await openEditor(page);
    await openMainMenu(page);

    await page.getByRole('menuitem', { name: /^Play/ }).click();
    const playBar = page.getByRole('toolbar', { name: 'Play bar' });
    await expect(playBar).toBeVisible();
    await expect(page.getByRole('region', { name: 'Main menu' })).toBeHidden();

    await playBar.getByRole('button', { name: /^Stop/ }).click();
    await expect(page.getByRole('region', { name: 'Main menu' })).toBeVisible();
});

test('a switch shows its tick, and choosing it closes the menu', async ({ page }) => {
    await openEditor(page);
    await openSubmenu(page, 'View');

    const grid = page.getByRole('menuitem', { name: /^Grid G/ });
    await expect(grid).toHaveAttribute('aria-checked', 'true');
    await grid.click();
    await expect(grid).toBeHidden();

    await openSubmenu(page, 'View');
    await expect(page.getByRole('menuitem', { name: /^Grid G/ })).toHaveAttribute('aria-checked', 'false');
});

test("renaming the level is an undo step, Edit's Undo names it, and the tab title follows", async ({ page }) => {
    await openEditor(page);
    const nameBox = page.getByRole('textbox', { name: 'Level name' });

    await expect(nameBox).toHaveValue('Untitled level');
    await expect(page).toHaveTitle('Untitled level - engine-v3');
    await openSubmenu(page, 'Edit');
    await expect(page.getByRole('menuitem', { name: /^Undo/ })).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Escape');

    await nameBox.click();
    await nameBox.fill('Bridge');
    await nameBox.press('Enter');

    await expect(nameBox).toHaveValue('Bridge');
    await expect(page).toHaveTitle('Bridge - engine-v3');
    await openSubmenu(page, 'Edit');
    await page.getByRole('menuitem', { name: /^Undo: Rename level/ }).click();

    await expect(nameBox).toHaveValue('Untitled level');
    await expect(page).toHaveTitle('Untitled level - engine-v3');
    await openSubmenu(page, 'Edit');
    await expect(page.getByRole('menuitem', { name: /^Redo: Rename level/ })).toHaveAttribute('aria-disabled', 'false');
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
    await openMainMenu(page);
    await expect(nameBox).toHaveValue('Cave');
    await expect(page).toHaveTitle('Cave - engine-v3');
});
