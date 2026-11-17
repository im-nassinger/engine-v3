import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

type ScreenPoint = { x: number; y: number };

// A drawn shape's default fill, from styleSchema.ts.
const SHAPE_FILL = { r: 0x4a, g: 0x90, b: 0xd9 };
// The grid is drawn over the level, faintly, and the edges are smoothed, so a colour may move a little.
const COLOUR_TOLERANCE = 24;
// How long a still box is watched to see that it stays still: many frames, and many ticks if any ran.
const STILL_MS = 400;
// How far the box falls on screen before it is paused.
const FALL_BEFORE_PAUSE_PX = 20;
// During play the box is looked at in a column this far right of its middle, since the level's y axis
// is drawn there, darker than the grid; the box is 100 px wide, about 67 px on screen.
const OFF_AXIS_PX = 15;
// The box's Linear damping. Gravity soon stops speeding it up, and it falls at about 120 px a second,
// 2 px a tick: slowly enough to stay in the camera for several seconds of slow screenshots, and fast
// enough that one tick moves it on screen. One tick is about 1.4 px on screen at the camera's zoom.
const LINEAR_DAMPING = '4';
const ONE_TICK_MOST_PX = 2;
// How far above the camera's middle the box starts, so it has the camera's height to fall through.
const START_ABOVE_PX = 300;
// A new level's camera size, and ViewState's FIT_MARGIN_PX.
const CAMERA_WIDTH = 1920;
const CAMERA_HEIGHT = 1080;
const FIT_MARGIN_PX = 40;

async function openEditor(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();
}

// Where the box is drawn: START_ABOVE_PX above the camera's middle. A new level's camera frame is
// fitted around the middle of the part no panel covers.
async function boxStart(page: Page): Promise<ScreenPoint> {
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    const availableWidth = free.width - 2 * FIT_MARGIN_PX;
    const availableHeight = free.height - 2 * FIT_MARGIN_PX;
    const zoom = Math.min(availableWidth / CAMERA_WIDTH, availableHeight / CAMERA_HEIGHT);

    return { x: free.x + free.width / 2, y: free.y + free.height / 2 - START_ABOVE_PX * zoom };
}

// The column the box is looked at in during play. The panels are hidden then, so the camera's middle,
// above which the box starts, is the whole level view's middle.
async function playColumn(page: Page) {
    const view = await page.locator('.level-view-host canvas').boundingBox();
    if (!view) throw new Error('The level view has no size.');

    return view.x + view.width / 2 + OFF_AXIS_PX;
}

function inspector(page: Page) {
    return page.getByRole('region', { name: 'Inspector' });
}

function card(page: Page, typeName: string) {
    return inspector(page).locator(`.inspector-card[data-type="${typeName}"]`);
}

async function addComponent(page: Page, typeName: string) {
    await inspector(page).getByRole('button', { name: 'Add Component' }).click();
    await inspector(page).getByRole('menuitem', { name: typeName, exact: true }).click();
    await expect(card(page, typeName)).toHaveCount(1);
}

function playBar(page: Page) {
    return page.getByRole('toolbar', { name: 'Play bar' });
}

function playBarButton(page: Page, name: string) {
    return playBar(page).getByRole('button', { name: new RegExp(`^${name}`) });
}

// Draws a 100 px rectangle above the camera's middle and makes it a Dynamic body that collides and falls
// slowly. In the editor it is looked at in the column of its middle, where the y axis is too faint to hide it.
async function drawFallingBox(page: Page) {
    const start = await boxStart(page);
    await page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Shape' }).click();
    await page.getByRole('toolbar', { name: 'Tool options' }).getByRole('button', { name: 'Rectangle' }).click();
    await page.mouse.click(start.x, start.y);
    await expect(card(page, 'ShapeComponent')).toHaveCount(1);

    await addComponent(page, 'BodyComponent');
    await expect(card(page, 'BodyComponent').getByRole('button', { name: 'Type' })).toHaveText('Dynamic');
    const damping = card(page, 'BodyComponent').getByRole('textbox', { name: 'Linear damping' });
    await damping.fill(LINEAR_DAMPING);
    await damping.press('Enter');
    await expect(damping).toHaveValue(LINEAR_DAMPING);
    await addComponent(page, 'SurfaceComponent');

    return start;
}

async function play(page: Page) {
    await page.locator('.top-bar').getByRole('button', { name: 'Play', exact: true }).click();
    await expect(playBar(page)).toHaveAttribute('data-state', 'playing');
}

// Where the box's fill starts, going down the screen's column at x, read from a screenshot of that
// column alone, because a WebGL canvas can't be read back after it is shown, and a whole page's
// screenshot is too slow to follow a falling box. The PNG is decoded in the page. Undefined when the
// column holds none of it.
async function boxTopAt(page: Page, x: number): Promise<number | undefined> {
    const height = page.viewportSize()?.height;
    if (height === undefined) throw new Error('The page has no viewport.');
    const png = await page.screenshot({ scale: 'css', clip: { x: Math.round(x), y: 0, width: 1, height } });

    return page.evaluate(
        async ({ base64, fill, tolerance }) => {
            const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
            const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
            const reader = new OffscreenCanvas(image.width, image.height).getContext('2d');
            if (!reader) throw new Error('No 2D context to read the screenshot.');

            reader.drawImage(image, 0, 0);
            const column = reader.getImageData(0, 0, 1, image.height).data;
            for (let y = 0; y < image.height; y++) {
                const redClose = Math.abs((column[4 * y] ?? 0) - fill.r) <= tolerance;
                const greenClose = Math.abs((column[4 * y + 1] ?? 0) - fill.g) <= tolerance;
                const blueClose = Math.abs((column[4 * y + 2] ?? 0) - fill.b) <= tolerance;
                if (redClose && greenClose && blueClose) return y;
            }

            return undefined;
        },
        { base64: png.toString('base64'), fill: SHAPE_FILL, tolerance: COLOUR_TOLERANCE },
    );
}

async function shownBoxTop(page: Page, x: number) {
    const top = await boxTopAt(page, x);
    if (top === undefined) throw new Error(`The box isn't drawn at x ${x}.`);

    return top;
}

// The box's top, once it has stopped moving on screen: two looks STILL_MS apart agree.
async function settledBoxTop(page: Page, x: number) {
    let before = await shownBoxTop(page, x);
    for (;;) {
        await page.waitForTimeout(STILL_MS);
        const after = await shownBoxTop(page, x);
        if (after === before) return after;

        before = after;
    }
}

async function waitForBoxBelow(page: Page, x: number, y: number) {
    await expect.poll(async () => (await shownBoxTop(page, x)) > y, { intervals: [50] }).toBe(true);

    return shownBoxTop(page, x);
}

// Everything a person can read of the level and its history: the rows, the selected box's cards with
// every value, and what Undo would undo.
async function editorSnapshot(page: Page) {
    return {
        rows: await page.getByRole('tree', { name: 'Entities' }).ariaSnapshot(),
        cards: await inspector(page).ariaSnapshot(),
        undo: await page.getByRole('button', { name: /^Undo/ }).ariaSnapshot(),
    };
}

// Hides or shows the tab as the browser would, since a test can't send its own tab to the background.
async function setTabHidden(page: Page, hidden: boolean) {
    await page.evaluate((isHidden) => {
        if (isHidden) {
            Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
        } else {
            Reflect.deleteProperty(document, 'visibilityState');
        }
        document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
}

test('a drawn Dynamic box falls during play, and after Stop the level is exactly as before', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openEditor(page);
    const start = await drawFallingBox(page);
    const before = await editorSnapshot(page);
    const editorTop = await settledBoxTop(page, start.x);

    await play(page);
    await expect(page.locator('.top-bar')).toBeHidden();
    await expect(inspector(page)).toBeHidden();
    const column = await playColumn(page);
    const firstTop = await shownBoxTop(page, column);
    await waitForBoxBelow(page, column, firstTop + FALL_BEFORE_PAUSE_PX);

    await playBarButton(page, 'Stop').click();
    await expect(playBar(page)).toHaveCount(0);
    await expect(page.locator('.top-bar')).toBeVisible();
    expect(await editorSnapshot(page)).toEqual(before);
    expect(await settledBoxTop(page, start.x)).toBe(editorTop);
    expect(errors).toEqual([]);
});

test('Pause holds the box still, and Step moves it one tick', async ({ page }) => {
    await openEditor(page);
    await drawFallingBox(page);

    await play(page);
    const column = await playColumn(page);
    const firstTop = await shownBoxTop(page, column);
    await waitForBoxBelow(page, column, firstTop + FALL_BEFORE_PAUSE_PX);

    await page.keyboard.press('F8');
    await expect(playBar(page)).toHaveAttribute('data-state', 'paused');
    const paused = await settledBoxTop(page, column);

    await playBarButton(page, 'Step').click();
    const stepped = await waitForBoxBelow(page, column, paused);
    // One tick at the speed it falls at, and then it stays there.
    expect(stepped - paused).toBeLessThanOrEqual(ONE_TICK_MOST_PX);
    expect(await settledBoxTop(page, column)).toBe(stepped);
    await expect(playBar(page)).toHaveAttribute('data-state', 'paused');

    await page.keyboard.press('F8');
    await expect(playBar(page)).toHaveAttribute('data-state', 'playing');
    await waitForBoxBelow(page, column, stepped);
});

test('a hidden tab pauses the run and adds no ticks', async ({ page }) => {
    await openEditor(page);
    await drawFallingBox(page);

    await play(page);
    const column = await playColumn(page);
    const firstTop = await shownBoxTop(page, column);
    await waitForBoxBelow(page, column, firstTop);

    await setTabHidden(page, true);
    await expect(playBar(page)).toHaveAttribute('data-state', 'paused');
    const hidden = await settledBoxTop(page, column);
    await page.waitForTimeout(2 * STILL_MS);
    expect(await shownBoxTop(page, column)).toBe(hidden);

    // Coming back leaves it paused, so nothing moves until Resume.
    await setTabHidden(page, false);
    await page.waitForTimeout(STILL_MS);
    await expect(playBar(page)).toHaveAttribute('data-state', 'paused');
    expect(await shownBoxTop(page, column)).toBe(hidden);

    await playBarButton(page, 'Resume').click();
    await expect(playBar(page)).toHaveAttribute('data-state', 'playing');
    await waitForBoxBelow(page, column, hidden);
});
