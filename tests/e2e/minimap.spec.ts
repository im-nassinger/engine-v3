import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// How many of the minimap's pixels are the view rectangle's accent line.
function accentPixels(page: Page) {
    return page.locator('.minimap canvas').evaluate((canvas: HTMLCanvasElement) => {
        const context = canvas.getContext('2d');
        if (context === null) throw new Error('The minimap has no 2D canvas.');

        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        const positions: number[] = [];
        for (let index = 0; index < data.length; index += 4) {
            const red = data[index] ?? 0;
            const blue = data[index + 2] ?? 0;
            const isAccent = blue >= 200 && red < 120;
            if (!isAccent) continue;

            positions.push(index);
        }

        return positions;
    });
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.minimap canvas')).toBeVisible();
});

test('the minimap shows the level bounds and the view rectangle, which follows the view', async ({ page }) => {
    await expect.poll(async () => (await accentPixels(page)).length).toBeGreaterThan(0);
    const before = await accentPixels(page);

    const levelView = page.locator('.level-view-host');
    const box = await levelView.boundingBox();
    if (box === null) throw new Error('The level view has no box.');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 600);

    await expect.poll(() => accentPixels(page)).not.toEqual(before);
});

test('clicking the minimap leaves the view where it is', async ({ page }) => {
    await expect.poll(async () => (await accentPixels(page)).length).toBeGreaterThan(0);
    const before = await accentPixels(page);

    await page.locator('.minimap').click({ position: { x: 20, y: 20 } });
    await page.waitForTimeout(400);

    expect(await accentPixels(page)).toEqual(before);
});
