import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openEditor(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
}

function entitiesTree(page: Page) {
    return page.getByRole('tree', { name: 'Entities' });
}

function row(page: Page, name: string) {
    return entitiesTree(page)
        .getByRole('treeitem')
        .filter({ has: page.locator('.name', { hasText: name }) });
}

// The Entity inspector's header has a name box too.
function nameBox(page: Page) {
    return page.getByRole('region', { name: 'Entities viewer' }).getByRole('textbox', { name: 'Entity name' });
}

test('a double-click on a name, typing and Enter renames, and Ctrl+Z puts the name back', async ({ page }) => {
    await openEditor(page);

    await row(page, 'Camera').locator('.name').dblclick();
    await expect(nameBox(page)).toBeFocused();
    await expect(nameBox(page)).toHaveValue('Camera');

    await nameBox(page).fill('Eye in the sky');
    await nameBox(page).press('Enter');

    await expect(nameBox(page)).toHaveCount(0);
    await expect(row(page, 'Eye in the sky')).toHaveCount(1);

    await page.keyboard.press('Control+z');
    await expect(row(page, 'Camera')).toHaveCount(1);
    await expect(row(page, 'Eye in the sky')).toHaveCount(0);
});

test('F2 renames the selected row', async ({ page }) => {
    await openEditor(page);

    await row(page, 'Camera').click();
    await expect(row(page, 'Camera')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('F2');

    await expect(nameBox(page)).toBeFocused();
    await page.keyboard.type('Lens');
    await page.keyboard.press('Enter');

    await expect(row(page, 'Lens')).toHaveCount(1);
});

test('Esc keeps the old name', async ({ page }) => {
    await openEditor(page);

    await row(page, 'Camera').locator('.name').dblclick();
    await nameBox(page).fill('Lens');
    await nameBox(page).press('Escape');

    await expect(nameBox(page)).toHaveCount(0);
    await expect(row(page, 'Camera')).toHaveCount(1);
    await expect(row(page, 'Lens')).toHaveCount(0);
});
