import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { TEST_SQUARE_COLOUR, TEST_SQUARE_POSITION } from '../../src/app/testLevel.ts';

type Rgb = { r: number; g: number; b: number };

function rgbOf(hexColour: string): Rgb {
    return {
        r: parseInt(hexColour.slice(1, 3), 16),
        g: parseInt(hexColour.slice(3, 5), 16),
        b: parseInt(hexColour.slice(5, 7), 16),
    };
}

// The colour on screen at a CSS pixel of the canvas, read from a screenshot, because a WebGL canvas
// can't be read back after it is shown. The PNG is decoded in the page.
async function colourOnCanvasAt(page: Page, x: number, y: number): Promise<Rgb> {
    const canvas = page.locator('#level-view canvas');
    const png = await canvas.screenshot({ scale: 'css' });

    return page.evaluate(
        async ({ base64, x, y }) => {
            const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
            const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
            const reader = new OffscreenCanvas(image.width, image.height).getContext('2d');
            if (!reader) throw new Error('No 2D context to read the screenshot.');

            reader.drawImage(image, 0, 0);
            const [r = 0, g = 0, b = 0] = reader.getImageData(Math.round(x), Math.round(y), 1, 1).data;

            return { r, g, b };
        },
        { base64: png.toString('base64'), x, y },
    );
}

async function canvasMiddle(page: Page) {
    const canvas = page.locator('#level-view canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('The canvas has no size.');

    return { x: box.width / 2, y: box.height / 2 };
}

function expectCloseTo(actual: Rgb, expected: Rgb) {
    // The grid is drawn over the level, faintly, so a colour may move a little.
    const tolerance = 24;
    expect(Math.abs(actual.r - expected.r)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(actual.g - expected.g)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(actual.b - expected.b)).toBeLessThanOrEqual(tolerance);
}

test('the page draws the test level, with no error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    const middle = await canvasMiddle(page);

    // Off the grid's lines, which fall on every 10 px from the origin at 100%.
    const squareX = middle.x + TEST_SQUARE_POSITION.x + 5;
    const squareY = middle.y + TEST_SQUARE_POSITION.y + 5;
    const backgroundX = middle.x - 395;
    const backgroundY = middle.y + 255;

    await expect
        .poll(async () => {
            const colour = await colourOnCanvasAt(page, squareX, squareY);
            return Math.abs(colour.r - rgbOf(TEST_SQUARE_COLOUR).r) < 24;
        })
        .toBe(true);
    expectCloseTo(await colourOnCanvasAt(page, squareX, squareY), rgbOf(TEST_SQUARE_COLOUR));
    expectCloseTo(await colourOnCanvasAt(page, backgroundX, backgroundY), rgbOf('#BFE3F5'));
    expect(errors).toEqual([]);
});

test.describe('at a device pixel ratio of 2', () => {
    test.use({ deviceScaleFactor: 2 });

    test('the canvas has twice the pixels of its size', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#level-view canvas');
        await expect(canvas).toBeVisible();

        await expect
            .poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.width === 2 * element.clientWidth))
            .toBe(true);
        const size = await canvas.evaluate((element: HTMLCanvasElement) => ({
            width: element.width,
            height: element.height,
            cssWidth: element.clientWidth,
            cssHeight: element.clientHeight,
        }));

        expect(size.cssWidth).toBeGreaterThan(100);
        expect(size.height).toBe(2 * size.cssHeight);
    });
});
