import { expect, test } from '@playwright/test';

const PANEL_PLACES = ['Main menu', 'Tools', 'Entities viewer', 'Debug box'];

test('the built page opens with every panel in its place and logs no error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() !== 'error') return;

        errors.push(message.text());
    });

    await page.goto('/');

    for (const label of PANEL_PLACES) {
        await expect(page.getByRole('region', { name: label })).toBeVisible();
    }
    // Nothing is selected, so the Entity inspector waits for a selection.
    await expect(page.getByRole('region', { name: 'Entity inspector' })).toHaveCount(0);
    await page.getByRole('tree', { name: 'Entities' }).getByRole('treeitem').first().click();
    await expect(page.getByRole('region', { name: 'Entity inspector' })).toBeVisible();
    expect(errors).toEqual([]);
});
