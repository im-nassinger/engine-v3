import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openEditor(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
}

async function openSubmenu(page: Page, name: string) {
    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name, exact: true }).hover();
}

test('with nothing selected, Delete is greyed and its tooltip says why', async ({ page }) => {
    await openEditor(page);
    await openSubmenu(page, 'Edit');

    const deleteEntry = page.getByRole('menuitem', { name: /^Delete/ });
    await expect(deleteEntry).toHaveAttribute('aria-disabled', 'true');

    await deleteEntry.hover();
    await expect(page.getByRole('tooltip')).toHaveText('Nothing selected');
});

test("the status bar shows a status text, then returns to the tool's hint", async ({ page }) => {
    await openEditor(page);
    const statusText = page.locator('.status-bar .status-text');

    await page.locator('.level-view-host canvas').click();
    await page.keyboard.press('Control+z');

    await expect(statusText).toHaveText('Nothing to undo');
    await expect(statusText).toHaveText(/^Click to select\./, { timeout: 6_000 });
});

test('the status bar shows the mouse position over the level view, and nothing once it leaves', async ({ page }) => {
    await openEditor(page);
    const mousePosition = page.locator('.status-bar .mouse-position');
    const canvas = page.locator('.level-view-host canvas');
    const box = await canvas.boundingBox();
    if (box === null) throw new Error('The level view has no box.');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(mousePosition).toHaveText(/^−?\d+, −?\d+$/);
    const first = await mousePosition.textContent();

    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2);
    await expect(mousePosition).not.toHaveText(first ?? '');

    const mainMenu = await page.getByRole('region', { name: 'Main menu' }).boundingBox();
    if (mainMenu === null) throw new Error('☰ has no box.');
    await page.mouse.move(mainMenu.x + mainMenu.width / 2, mainMenu.y + mainMenu.height / 2);
    await expect(mousePosition).toHaveText('');
});

test('the tool column shows Select as the active tool', async ({ page }) => {
    await openEditor(page);

    const select = page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Select' });
    await expect(select).toHaveAttribute('aria-pressed', 'true');
});

test('double-clicking Select locks it, and Esc ends the lock', async ({ page }) => {
    await openEditor(page);
    const selectPlace = page.locator('.tool-button[data-tool="select"]');

    await selectPlace.getByRole('button', { name: 'Select' }).dblclick();
    await expect(selectPlace).toHaveAttribute('data-locked', 'true');

    await page.keyboard.press('Escape');
    await expect(selectPlace).toHaveAttribute('data-locked', 'false');
});

test('About opens from Help, and Esc closes it', async ({ page }) => {
    await openEditor(page);
    await openSubmenu(page, 'Help');
    await page.getByRole('menuitem', { name: /^About/ }).click();

    const about = page.getByRole('dialog', { name: 'About engine-v3' });
    await expect(about).toBeVisible();
    await expect(about).toContainText('Level file format version 1');
    await expect(about.getByRole('button', { name: 'OK' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(about).toBeHidden();
});

test('OK closes About', async ({ page }) => {
    await openEditor(page);
    await openSubmenu(page, 'Help');
    await page.getByRole('menuitem', { name: /^About/ }).click();

    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
});
