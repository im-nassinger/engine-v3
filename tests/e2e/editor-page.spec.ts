import { expect, test } from '@playwright/test';

const PANEL_PLACES = ['Top bar', 'Tools', 'Inspector', 'Entities', 'Status bar'];

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
    expect(errors).toEqual([]);
});
