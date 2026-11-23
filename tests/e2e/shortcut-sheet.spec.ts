import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openEditor(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();
}

function sheet(page: Page) {
    return page.getByRole('region', { name: 'Shortcut list' });
}

function searchBox(page: Page) {
    return sheet(page).getByRole('textbox', { name: 'Search shortcuts' });
}

async function clickLevel(page: Page) {
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    await page.mouse.click(free.x + free.width / 2, free.y + free.height / 2);
}

async function isGridOn(page: Page) {
    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name: 'View', exact: true }).hover();
    const grid = page.getByRole('menuitem', { name: /^Grid G/ });
    const checked = await grid.getAttribute('aria-checked');
    await page.keyboard.press('Escape');
    await expect(grid).toBeHidden();

    return checked === 'true';
}

test('? opens the shortcut list with its search focused, and ? closes it again', async ({ page }) => {
    await openEditor(page);
    await clickLevel(page);
    await expect(sheet(page)).toBeHidden();

    await page.keyboard.press('?');
    await expect(sheet(page)).toBeVisible();
    await expect(searchBox(page)).toBeFocused();
    await expect(page.getByRole('region', { name: 'Entities viewer' })).toBeHidden();

    await clickLevel(page);
    await page.keyboard.press('?');
    await expect(sheet(page)).toBeHidden();
    await expect(page.getByRole('region', { name: 'Entities viewer' })).toBeVisible();
});

test('typing in the search reaches no editor shortcut, and Esc closes the list', async ({ page }) => {
    await openEditor(page);
    await clickLevel(page);
    await page.keyboard.press('?');
    await expect(searchBox(page)).toBeFocused();

    await page.keyboard.type('g?2');
    await expect(searchBox(page)).toHaveValue('g?2');
    await expect(sheet(page)).toBeVisible();
    await expect(page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Select' })).toHaveAttribute(
        'aria-pressed',
        'true',
    );

    await searchBox(page).fill('ctrl z');
    await expect(sheet(page).locator('.shortcut-sheet-row .name')).toHaveText(['Undo', 'Redo']);

    await page.keyboard.press('Escape');
    await expect(sheet(page)).toBeHidden();
    expect(await isGridOn(page)).toBe(true);
});

test('Help › Keyboard shortcuts opens and closes it, and it stays open while the level is edited', async ({ page }) => {
    await openEditor(page);

    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name: 'Help', exact: true }).hover();
    await page.getByRole('menuitem', { name: /^Keyboard shortcuts/ }).click();
    await expect(sheet(page)).toBeVisible();
    await expect(searchBox(page)).toBeFocused();

    await clickLevel(page);
    await page.keyboard.press('2');
    await clickLevel(page);
    await expect(page.getByRole('region', { name: 'Entity inspector' })).toBeVisible();
    await expect(sheet(page)).toBeVisible();

    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name: 'Help', exact: true }).hover();
    await page.getByRole('menuitem', { name: /^Keyboard shortcuts/ }).click();
    await expect(sheet(page)).toBeHidden();
});
