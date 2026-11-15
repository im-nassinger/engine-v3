import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

declare global {
    // Filled by the test's own listener, which runs after the editor's capturing one.
    var keysLeftToTheBrowser: string[];
}

async function openEditor(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
}

async function isGridOn(page: Page) {
    await page.getByRole('button', { name: 'View menu' }).click();
    const grid = page.getByRole('menuitem', { name: /^Grid/ });
    const checked = await grid.getAttribute('aria-checked');
    await page.keyboard.press('Escape');
    await expect(grid).toBeHidden();

    return checked === 'true';
}

// Records which keys still had their default when they reached the window's bubbling listener, then
// stops the default itself, so F5 and Ctrl+R don't reload the page under the test.
async function recordKeysLeftToTheBrowser(page: Page) {
    await page.evaluate(() => {
        globalThis.keysLeftToTheBrowser = [];

        window.addEventListener('keydown', (event) => {
            if (!event.defaultPrevented) {
                globalThis.keysLeftToTheBrowser.push(event.key);
            }

            event.preventDefault();
        });
    });
}

test('G hides the grid, but G typed into the level name box does not', async ({ page }) => {
    await openEditor(page);
    expect(await isGridOn(page)).toBe(true);

    await page.locator('body').click({ position: { x: 640, y: 360 } });
    await page.keyboard.press('g');
    expect(await isGridOn(page)).toBe(false);

    const nameBox = page.getByRole('textbox', { name: 'Level name' });
    await nameBox.click();
    await nameBox.press('End');
    await nameBox.press('g');
    await expect(nameBox).toHaveValue('Untitled levelg');
    await nameBox.press('Escape');
    expect(await isGridOn(page)).toBe(false);
});

test('Ctrl+Z undoes a rename once the keyboard is out of the box', async ({ page }) => {
    await openEditor(page);
    const nameBox = page.getByRole('textbox', { name: 'Level name' });

    await nameBox.click();
    await nameBox.fill('Bridge');
    await nameBox.press('Enter');
    await expect(nameBox).toHaveValue('Bridge');
    await nameBox.blur();

    await page.keyboard.press('Control+z');
    await expect(nameBox).toHaveValue('Untitled level');
});

test('Ctrl+0, F5 and Ctrl+R keep their default, and G does not', async ({ page }) => {
    await openEditor(page);
    await recordKeysLeftToTheBrowser(page);

    await page.keyboard.press('Control+0');
    await page.keyboard.press('F5');
    await page.keyboard.press('Control+r');
    await page.keyboard.press('g');

    const left = await page.evaluate(() => globalThis.keysLeftToTheBrowser);
    expect(left).toEqual(['Control', '0', 'F5', 'Control', 'r']);
});

test('the page never scrolls', async ({ page }) => {
    await openEditor(page);

    await page.mouse.move(640, 360);
    await page.mouse.wheel(0, 2000);
    await page.mouse.wheel(1500, 0);
    await page.evaluate(() => window.scrollTo(400, 400));

    const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    expect(scroll).toEqual({ x: 0, y: 0 });

    const rootStyle = await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);

        return { overflow: style.overflow, overscroll: style.overscrollBehavior };
    });
    expect(rootStyle).toEqual({ overflow: 'hidden', overscroll: 'none' });

    const levelViewTouch = await page
        .locator('.level-view-host')
        .evaluate((host) => getComputedStyle(host).touchAction);
    expect(levelViewTouch).toBe('none');
});
