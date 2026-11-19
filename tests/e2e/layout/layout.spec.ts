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

const ISLANDS = ['Main menu', 'Tools', 'Entity inspector', 'Entities viewer', 'Minimap', 'Debug box'];
// From the window's edge and between islands.
const ISLAND_GAP = 10;
// The tool column, the Entity inspector and the Entities viewer side by side with their gaps. A narrower
// window (1280×720 at 200% is 640 px) can't keep them 10 px apart; fitting small windows is v3, so there
// they only must not overlap.
const ISLANDS_ROW_WIDTH = 10 + 48 + 10 + 300 + 10 + 260 + 10;
// The level view's smallest zoom, 1%.
const MIN_ZOOM = 0.01;
// A new level's camera size.
const CAMERA_WIDTH = 1920;
const CAMERA_HEIGHT = 1080;
// The debug box shows the zoom as a whole percentage, so the real zoom is up to half a percent more.
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

// How far apart two boxes are: negative if they overlap.
function distanceBetween(a: Box, b: Box) {
    const across = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width));
    const down = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height));

    return Math.max(across, down);
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

        test('every island is 10 px from the window and from the others, and the free area lies between them', async ({
            page,
        }, testInfo) => {
            await openEditor(page);
            // The World selected, so the Entity inspector shows.
            await page.getByRole('tree', { name: 'Entities' }).getByRole('treeitem').first().click();
            await expect(page.getByRole('region', { name: 'Entity inspector' })).toBeVisible();
            await attachScreenshot(page, testInfo, size);

            const islands = await Promise.all(ISLANDS.map((name) => boxOf(page, name)));
            const gapBetween = cssWidth >= ISLANDS_ROW_WIDTH ? ISLAND_GAP : 0;
            for (const [index, box] of islands.entries()) {
                expect(box.x).toBeGreaterThanOrEqual(ISLAND_GAP - EDGE_TOLERANCE_PX);
                expect(box.y).toBeGreaterThanOrEqual(ISLAND_GAP - EDGE_TOLERANCE_PX);
                expect(box.x + box.width).toBeLessThanOrEqual(cssWidth - ISLAND_GAP + EDGE_TOLERANCE_PX);
                expect(box.y + box.height).toBeLessThanOrEqual(cssHeight - ISLAND_GAP + EDGE_TOLERANCE_PX);
                for (const other of islands.slice(index + 1)) {
                    expect(distanceBetween(box, other)).toBeGreaterThanOrEqual(gapBetween - EDGE_TOLERANCE_PX);
                }
            }

            const free = await freeAreaBox(page);
            for (const island of islands) {
                expect(distanceBetween(free, island)).toBeGreaterThanOrEqual(-EDGE_TOLERANCE_PX);
            }
            const entityInspector = await boxOf(page, 'Entity inspector');
            const entitiesViewer = await boxOf(page, 'Entities viewer');
            expect(free.x).toBeCloseTo(entityInspector.x + entityInspector.width, 0);
            expect(free.x + free.width).toBeCloseTo(entitiesViewer.x, 0);
            expect(free.width).toBeGreaterThan(0);
            expect(free.height).toBeGreaterThan(0);
        });

        test("the new level's camera frame fits inside the free area", async ({ page }) => {
            await openEditor(page);
            const free = await freeAreaBox(page);

            const percentText = await page.locator('.debug-box [data-entry="ZOOM"] .value').textContent();
            const percent = Number((percentText ?? '').replace('%', ''));
            expect(percent).toBeGreaterThan(0);
            const largestZoom = percent / 100 + ZOOM_ROUNDING;
            // At 1280×720 at 200% the islands leave the free area narrower than the camera frame at the
            // smallest zoom; fitting small windows is v3, so the view only goes as small as it can.
            if (CAMERA_WIDTH * MIN_ZOOM > free.width) {
                expect(percent).toBe(MIN_ZOOM * 100);
                return;
            }

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
            // Measured with the Entity inspector shown, so the point stays free once the Shape tool returns to Select.
            const free = await freeAreaBox(page);
            const middle = { x: free.x + free.width / 2, y: free.y + free.height / 2 };

            await page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Shape' }).click();
            await page.getByRole('group', { name: 'Kinds menu' }).getByRole('button', { name: 'Rectangle' }).click();
            await page.mouse.click(middle.x, middle.y);
            await expect(crateRow(page)).toHaveAttribute('aria-selected', 'true');
            await page.keyboard.press('Escape');
            await expect(crateRow(page)).toHaveAttribute('aria-selected', 'false');

            await page.mouse.click(middle.x, middle.y);
            await expect(crateRow(page)).toHaveAttribute('aria-selected', 'true');
        });
    });
}
