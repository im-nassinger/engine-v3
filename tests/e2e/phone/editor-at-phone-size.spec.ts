import { expect, test } from '@playwright/test';

// Fitting small windows and the touch notice are v3: at phone size the editor is only checked to open on its
// level with nothing scrolled (performance.md, stage 17's choices).
test('the editor opens on its level at phone size with nothing scrolled', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();
    await testInfo.attach('editor at phone size', { body: await page.screenshot(), contentType: 'image/png' });

    const scroll = await page.evaluate(() => ({
        x: window.scrollX,
        y: window.scrollY,
        top: document.scrollingElement?.scrollTop ?? 0,
        left: document.scrollingElement?.scrollLeft ?? 0,
    }));
    expect(scroll).toEqual({ x: 0, y: 0, top: 0, left: 0 });
});
