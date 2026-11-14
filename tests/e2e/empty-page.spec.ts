import { expect, test } from '@playwright/test';

test('the built page opens, shows the project name and logs no error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() !== 'error') return;

        errors.push(message.text());
    });

    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'engine-v3' })).toBeVisible();
    expect(errors).toEqual([]);
});
