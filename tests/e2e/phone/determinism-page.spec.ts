import { expect, test } from '@playwright/test';

// The determinism page's own server, started by playwright.config.ts.
const DETERMINISM_PAGE = 'http://localhost:4174/';
const LEVEL_COUNT = 14;
// Eleven levels of 600 ticks; a slow CI runner without a GPU can take a while.
const RUN_TIMEOUT_MS = 120_000;

test('every determinism level matches its recorded hashes at phone size', async ({ page }, testInfo) => {
    test.setTimeout(RUN_TIMEOUT_MS + 30_000);
    await page.goto(DETERMINISM_PAGE);

    const summary = page.locator('#summary');
    await expect(summary).toHaveAttribute('data-state', 'done', { timeout: RUN_TIMEOUT_MS });
    await testInfo.attach('determinism page', {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
    });

    const rows = page.locator('#levels tr');
    await expect(rows).toHaveCount(LEVEL_COUNT);
    const notMatching = await page.locator('#levels tr:not([data-result="matches"])').allTextContents();
    expect(notMatching).toEqual([]);
    await expect(summary).toHaveText(`${LEVEL_COUNT} of ${LEVEL_COUNT} levels match their recorded hashes.`);
});
