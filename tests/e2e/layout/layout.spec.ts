import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

type Box = { x: number; y: number; width: number; height: number };
type WindowSize = { name: string; width: number; height: number; zoom: number };

// The three window sizes, and 1280×720 with the browser zoomed: a zoomed page is a smaller CSS window
// with more pixels per CSS pixel (performance.md, stage 17's choices).
const SIZES: WindowSize[] = [
    { name: '1280×720', width: 1280, height: 720, zoom: 1 },
    { name: '1440×900', width: 1440, height: 900, zoom: 1 },
    { name: '1920×1080', width: 1920, height: 1080, zoom: 1 },
    { name: '1280×720 at 150%', width: 1280, height: 720, zoom: 1.5 },
    { name: '1280×720 at 200%', width: 1280, height: 720, zoom: 2 },
];

const PANEL_PLACES = ['Top bar', 'Tools', 'Inspector', 'Entities', 'Status bar'];
// A new level's camera size.
const CAMERA_WIDTH = 1920;
const CAMERA_HEIGHT = 1080;
// The top bar shows the zoom as a whole percentage, so the real zoom is up to half a percent more.
const ZOOM_ROUNDING = 0.005;
// Boxes at a zoomed page's fractional pixels may meet a little inside each other.
const EDGE_TOLERANCE_PX = 1;

async function boxOf(page: Page, name: string): Promise<Box> {
    const box = await page.getByRole('region', { name }).boundingBox();
    if (!box) throw new Error(`The ${name} has no size.`);

    return box;
}

async function freeAreaBox(page: Page): Promise<Box> {
    const box = await page.locator('.free-area').boundingBox();
    if (!box) throw new Error('The free area has no size.');

    return box;
}

function overlapArea(a: Box, b: Box) {
    const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
    if (width <= EDGE_TOLERANCE_PX || height <= EDGE_TOLERANCE_PX) return 0;

    return width * height;
}

async function openEditor(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();
}

async function attachScreenshot(page: Page, testInfo: TestInfo, size: WindowSize) {
    const screenshot = await page.screenshot();
    await testInfo.attach(`editor at ${size.name}`, { body: screenshot, contentType: 'image/png' });
}

function crateRow(page: Page) {
    return page
        .getByRole('tree', { name: 'Entities' })
        .getByRole('treeitem')
        .filter({ has: page.locator('.name', { hasText: 'Rectangle 1' }) });
}

for (const size of SIZES) {
    test.describe(`at ${size.name}`, () => {
        const cssWidth = Math.round(size.width / size.zoom);
        const cssHeight = Math.round(size.height / size.zoom);
        test.use({ viewport: { width: cssWidth, height: cssHeight }, deviceScaleFactor: size.zoom });

        test('no panel or bar overlaps another, and the free area is what they leave', async ({ page }, testInfo) => {
            await openEditor(page);
            await attachScreenshot(page, testInfo, size);

            const boxes = await Promise.all(PANEL_PLACES.map((name) => boxOf(page, name)));
            const free = await freeAreaBox(page);
            const all = [...boxes, free];

            for (const [index, box] of all.entries()) {
                expect(box.x).toBeGreaterThanOrEqual(-EDGE_TOLERANCE_PX);
                expect(box.y).toBeGreaterThanOrEqual(-EDGE_TOLERANCE_PX);
                expect(box.x + box.width).toBeLessThanOrEqual(cssWidth + EDGE_TOLERANCE_PX);
                expect(box.y + box.height).toBeLessThanOrEqual(cssHeight + EDGE_TOLERANCE_PX);
                for (const other of all.slice(index + 1)) {
                    expect(overlapArea(box, other)).toBe(0);
                }
            }

            // Nothing overlaps and everything is inside the window, so equal areas mean no gap is left.
            const covered = all.reduce((sum, box) => sum + box.width * box.height, 0);
            expect(covered).toBeCloseTo(cssWidth * cssHeight, -2);
            expect(free.width).toBeGreaterThan(0);
            expect(free.height).toBeGreaterThan(0);
        });

        test("the new level's camera frame fits inside the free area", async ({ page }) => {
            await openEditor(page);
            const free = await freeAreaBox(page);

            const percentText = await page.getByRole('button', { name: 'Zoom' }).textContent();
            const percent = Number((percentText ?? '').replace('%', ''));
            expect(percent).toBeGreaterThan(0);
            const largestZoom = percent / 100 + ZOOM_ROUNDING;

            expect(CAMERA_WIDTH * largestZoom).toBeLessThanOrEqual(free.width);
            expect(CAMERA_HEIGHT * largestZoom).toBeLessThanOrEqual(free.height);
        });

        test("the canvas has the window's pixels", async ({ page }) => {
            await openEditor(page);
            const canvas = page.locator('.level-view-host canvas');

            await expect
                .poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.width))
                .toBeGreaterThanOrEqual(size.width - EDGE_TOLERANCE_PX);
            const pixels = await canvas.evaluate((element: HTMLCanvasElement) => ({
                width: element.width,
                height: element.height,
                cssWidth: element.clientWidth,
                cssHeight: element.clientHeight,
            }));

            expect(pixels.cssWidth).toBe(cssWidth);
            expect(pixels.cssHeight).toBe(cssHeight);
            expect(Math.abs(pixels.width - cssWidth * size.zoom)).toBeLessThanOrEqual(EDGE_TOLERANCE_PX);
            expect(Math.abs(pixels.height - cssHeight * size.zoom)).toBeLessThanOrEqual(EDGE_TOLERANCE_PX);
        });

        test("a click at a drawn crate's middle selects it", async ({ page }) => {
            await openEditor(page);
            // Measured with the Inspector shown, so the point stays free once the Shape tool returns to Select.
            const free = await freeAreaBox(page);
            const middle = { x: free.x + free.width / 2, y: free.y + free.height / 2 };

            await page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Shape' }).click();
            await page
                .getByRole('toolbar', { name: 'Tool options' })
                .getByRole('button', { name: 'Rectangle' })
                .click();
            await page.mouse.click(middle.x, middle.y);
            await expect(crateRow(page)).toHaveAttribute('aria-selected', 'true');
            await page.keyboard.press('Escape');
            await expect(crateRow(page)).toHaveAttribute('aria-selected', 'false');

            await page.mouse.click(middle.x, middle.y);
            await expect(crateRow(page)).toHaveAttribute('aria-selected', 'true');
        });
    });
}
