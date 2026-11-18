import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

type Rgb = { r: number; g: number; b: number };

// A new level's World fill, its camera's size, and the panels' colour from theme.css.
const BACKGROUND: Rgb = { r: 0xbf, g: 0xe3, b: 0xf5 };
const PANEL: Rgb = { r: 0x21, g: 0x25, b: 0x2c };
const CAMERA_WIDTH = 1920;
const CAMERA_HEIGHT = 1080;
// ViewState's FIT_MARGIN_PX.
const FIT_MARGIN_PX = 40;

// The colour on screen at a CSS pixel of the page, read from a screenshot, because a WebGL canvas
// can't be read back after it is shown. The PNG is decoded in the page.
async function colourOnPageAt(page: Page, x: number, y: number): Promise<Rgb> {
    const png = await page.screenshot({ scale: 'css' });

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

function isCloseTo(actual: Rgb, expected: Rgb) {
    // The grid is drawn over the level, faintly, so a colour may move a little.
    const tolerance = 24;
    const redClose = Math.abs(actual.r - expected.r) <= tolerance;
    const greenClose = Math.abs(actual.g - expected.g) <= tolerance;
    const blueClose = Math.abs(actual.b - expected.b) <= tolerance;

    return redClose && greenClose && blueClose;
}

// The grid's lines cross the level view every few pixels, so a colour is looked for at a few points
// along a short diagonal, and one of them is enough.
async function showsColourNear(page: Page, x: number, y: number, expected: Rgb) {
    for (let offset = 2; offset <= 12; offset += 2) {
        const colour = await colourOnPageAt(page, x + offset, y + offset);
        if (isCloseTo(colour, expected)) return true;
    }

    return false;
}

async function freeAreaBox(page: Page) {
    const freeArea = page.locator('.free-area');
    const box = await freeArea.boundingBox();
    if (!box) throw new Error('The free area has no size.');

    return box;
}

// Where the fitted camera frame's left edge falls, in the middle of the part no panel covers.
function cameraFrameLeftEdge(free: { x: number; width: number; height: number }) {
    const availableWidth = free.width - 2 * FIT_MARGIN_PX;
    const availableHeight = free.height - 2 * FIT_MARGIN_PX;
    const zoom = Math.min(availableWidth / CAMERA_WIDTH, availableHeight / CAMERA_HEIGHT);
    const frameWidth = CAMERA_WIDTH * zoom;
    const middleX = free.x + free.width / 2;

    return middleX - frameWidth / 2;
}

test('a new level opens fitted to its camera frame, between the empty panels', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    await expect(page.locator('.level-view-host canvas')).toBeVisible();
    const free = await freeAreaBox(page);
    const middleX = free.x + free.width / 2;
    const middleY = free.y + free.height / 2;

    await expect.poll(() => showsColourNear(page, middleX, middleY, BACKGROUND)).toBe(true);

    // The frame is a dark line 1.5 px wide, so one of the pixels around its edge is much darker.
    const frameLeft = cameraFrameLeftEdge(free);
    const reds: number[] = [];
    for (let offset = -3; offset <= 3; offset += 1) {
        const colour = await colourOnPageAt(page, frameLeft + offset, middleY);
        reds.push(colour.r);
    }
    const darkest = Math.min(...reds);
    expect(darkest).toBeLessThan(150);

    expect(await showsColourNear(page, frameLeft + 10, middleY, BACKGROUND)).toBe(true);

    // The Entity inspector sits over the canvas, which fills the whole window.
    const entityInspector = await page.getByRole('region', { name: 'Entity inspector' }).boundingBox();
    if (!entityInspector) throw new Error('The Entity inspector has no size.');
    expect(await showsColourNear(page, entityInspector.x + 20, entityInspector.y + 20, PANEL)).toBe(true);
    expect(errors).toEqual([]);
});

test.describe('at a device pixel ratio of 2', () => {
    test.use({ deviceScaleFactor: 2 });

    test('the canvas fills the window with twice the pixels of its size', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('.level-view-host canvas');
        await expect(canvas).toBeVisible();

        await expect
            .poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.width === 2 * element.clientWidth))
            .toBe(true);
        const size = await canvas.evaluate((element: HTMLCanvasElement) => ({
            height: element.height,
            cssWidth: element.clientWidth,
            cssHeight: element.clientHeight,
        }));
        const windowSize = page.viewportSize();

        expect(size.cssWidth).toBe(windowSize?.width);
        expect(size.cssHeight).toBe(windowSize?.height);
        expect(size.height).toBe(2 * size.cssHeight);
    });
});
