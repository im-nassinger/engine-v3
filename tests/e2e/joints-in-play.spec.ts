import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

type ScreenPoint = { x: number; y: number };
type ScreenBox = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
type Colour = { readonly r: number; readonly g: number; readonly b: number };

const BOX_HALF_PX = 40;
// The two boxes' middles are this far left and right of the camera's middle, and this far above it,
// so the Rope between them is off the level's x axis, and in play, about 4 times bigger, below the Play bar.
const APART_PX = 100;
const ABOVE_PX = 40;
// The Rope's ends, this far into each box from its inner edge.
const ROPE_END_INSET_PX = 10;
// Wide enough to be found in a 1 px column at the camera's zoom: 0.08 m, 8 px at the default 100 px per metre.
const ROPE_OUTLINE_WIDTH = '0.08';
// A joint icon's fill is white; nothing else in this level is near it: the background is #BFE3F5,
// the grid and outlines are dark, the boxes blue.
const WHITE = { r: 0xff, g: 0xff, b: 0xff };
const WHITE_TOLERANCE = 12;
// StyleComponent's default outline colour, from styleSchema.ts. The edges are smoothed, so a colour may move a little.
const ROPE_COLOUR = { r: 0x1f, g: 0x35, b: 0x52 };
const ROPE_TOLERANCE = 24;
// Around a joint icon, whose radius is 7 px.
const ICON_CLIP_HALF_PX = 12;
// A new level's camera size, and ViewState's FIT_MARGIN_PX.
const CAMERA_WIDTH = 1920;
const CAMERA_HEIGHT = 1080;
const FIT_MARGIN_PX = 40;
// How long play is watched, many frames, before the canvas is read.
const SETTLE_MS = 400;

// Opens the editor with grid snapping off, so a click lands exactly where it is made.
async function openEditor(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();

    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name: 'View', exact: true }).hover();
    await page.getByRole('menuitem', { name: /^Grid snapping/ }).click();
    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name: 'View', exact: true }).hover();
    await expect(page.getByRole('menuitem', { name: /^Grid snapping/ })).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('Escape');
}

// A new level's camera frame is fitted around the middle of the part no panel covers, with this zoom.
async function editorCamera(page: Page) {
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    const availableWidth = free.width - 2 * FIT_MARGIN_PX;
    const availableHeight = free.height - 2 * FIT_MARGIN_PX;
    const zoom = Math.min(availableWidth / CAMERA_WIDTH, availableHeight / CAMERA_HEIGHT);

    return { middle: { x: free.x + free.width / 2, y: free.y + free.height / 2 }, zoom };
}

// During play the panels are hidden and the camera's box fills the level view one way, centred.
async function playCamera(page: Page) {
    const view = await canvasBox(page);
    const zoom = Math.min(view.width / CAMERA_WIDTH, view.height / CAMERA_HEIGHT);

    return { middle: { x: view.x + view.width / 2, y: view.y + view.height / 2 }, zoom };
}

async function canvasBox(page: Page): Promise<ScreenBox> {
    const box = await page.locator('.level-view-host canvas').boundingBox();
    if (!box) throw new Error('The level view has no size.');

    return box;
}

function offset(point: ScreenPoint, dx: number, dy: number): ScreenPoint {
    return { x: point.x + dx, y: point.y + dy };
}

function entityInspector(page: Page) {
    return page.getByRole('region', { name: 'Entity inspector' });
}

function card(page: Page, typeName: string) {
    return entityInspector(page).locator(`.entity-inspector-card[data-type="${typeName}"]`);
}

function rows(page: Page, name: string) {
    return page
        .getByRole('tree', { name: 'Entities' })
        .getByRole('treeitem')
        .filter({ has: page.locator('.name', { hasText: name }) });
}

async function addComponent(page: Page, typeName: string) {
    await entityInspector(page).getByRole('button', { name: 'Add Component' }).click();
    await entityInspector(page).getByRole('menuitem', { name: typeName, exact: true }).click();
    await expect(card(page, typeName)).toHaveCount(1);
}

// A dragged rectangle with a BodyComponent and a SurfaceComponent, Dynamic unless Static is asked for.
async function drawBody(page: Page, centre: ScreenPoint, name: string, type: 'Dynamic' | 'Static') {
    const from = offset(centre, -BOX_HALF_PX, -BOX_HALF_PX);
    const to = offset(centre, BOX_HALF_PX, BOX_HALF_PX);
    await page.mouse.move(from.x, from.y);
    await page.keyboard.press('2');
    await page.mouse.down();
    await page.mouse.move(centre.x, centre.y, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
    await expect(rows(page, name)).toHaveAttribute('aria-selected', 'true');

    await addComponent(page, 'BodyComponent');
    await card(page, 'BodyComponent').getByRole('button', { name: 'Add Surface' }).click();
    await expect(card(page, 'SurfaceComponent')).toHaveCount(1);
    if (type === 'Static') {
        const typeButton = card(page, 'BodyComponent').getByRole('button', { name: 'Type' });
        await typeButton.click();
        await entityInspector(page).getByRole('menuitem', { name: 'Static', exact: true }).click();
        await expect(typeButton).toHaveText('Static');
    }
}

async function pickJointTool(page: Page, type: 'Hinge' | 'Rope') {
    await page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Joint' }).click();
    await page.getByRole('group', { name: 'Kinds menu' }).getByRole('button', { name: type }).click();
}

async function click(page: Page, at: ScreenPoint) {
    await page.mouse.click(at.x, at.y);
}

// A Static box on the left, a Dynamic box on the right pinned at its middle by an unstyled Hinge, and a
// Rope between them, styled with a wide outline. The Rope is as long as drawn, so nothing moves in play.
async function buildLevel(page: Page) {
    const { middle } = await editorCamera(page);
    const left = offset(middle, -APART_PX, -ABOVE_PX);
    const right = offset(middle, APART_PX, -ABOVE_PX);
    await drawBody(page, left, 'Rectangle 1', 'Static');
    await drawBody(page, right, 'Rectangle 2', 'Dynamic');

    await pickJointTool(page, 'Hinge');
    await click(page, right);
    await expect(rows(page, 'Hinge 1')).toHaveAttribute('aria-selected', 'true');

    await pickJointTool(page, 'Rope');
    await click(page, offset(left, BOX_HALF_PX - ROPE_END_INSET_PX, 0));
    await click(page, offset(right, -BOX_HALF_PX + ROPE_END_INSET_PX, 0));
    await expect(rows(page, 'Rope 1')).toHaveAttribute('aria-selected', 'true');
    await addComponent(page, 'StyleComponent');
    const width = card(page, 'StyleComponent').getByRole('textbox', { name: 'Outline width' });
    await width.fill(ROPE_OUTLINE_WIDTH);
    await width.press('Enter');
    await expect(width).toHaveValue(ROPE_OUTLINE_WIDTH);

    // Nothing selected, so no selection is drawn near the icons.
    await page.keyboard.press('Escape');
    await expect(rows(page, 'Rope 1')).toHaveAttribute('aria-selected', 'false');

    return { hinge: right, ropeMiddle: offset(middle, 0, -ABOVE_PX) };
}

// How many pixels of this clip have this colour, read from a screenshot, because a WebGL canvas can't be
// read back after it is shown. The PNG is decoded in the page.
async function countColour(page: Page, clip: ScreenBox, colour: Colour, tolerance: number) {
    const png = await page.screenshot({
        scale: 'css',
        clip: {
            x: Math.round(clip.x),
            y: Math.round(clip.y),
            width: Math.round(clip.width),
            height: Math.round(clip.height),
        },
    });

    return page.evaluate(
        async ({ base64, wanted, within }) => {
            const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
            const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
            const reader = new OffscreenCanvas(image.width, image.height).getContext('2d');
            if (!reader) throw new Error('No 2D context to read the screenshot.');

            reader.drawImage(image, 0, 0);
            const data = reader.getImageData(0, 0, image.width, image.height).data;
            let count = 0;
            for (let start = 0; start < data.length; start += 4) {
                const redClose = Math.abs((data[start] ?? 0) - wanted.r) <= within;
                const greenClose = Math.abs((data[start + 1] ?? 0) - wanted.g) <= within;
                const blueClose = Math.abs((data[start + 2] ?? 0) - wanted.b) <= within;
                if (redClose && greenClose && blueClose) {
                    count += 1;
                }
            }

            return count;
        },
        { base64: png.toString('base64'), wanted: colour, within: tolerance },
    );
}

function aroundPoint(point: ScreenPoint): ScreenBox {
    return {
        x: point.x - ICON_CLIP_HALF_PX,
        y: point.y - ICON_CLIP_HALF_PX,
        width: 2 * ICON_CLIP_HALF_PX,
        height: 2 * ICON_CLIP_HALF_PX,
    };
}

async function whiteNear(page: Page, point: ScreenPoint) {
    return countColour(page, aroundPoint(point), WHITE, WHITE_TOLERANCE);
}

// Where an editor screen point is drawn during play: both views show the camera's middle at their own
// middle, at their own zoom.
function inPlay(
    point: ScreenPoint,
    editor: { middle: ScreenPoint; zoom: number },
    play: { middle: ScreenPoint; zoom: number },
) {
    const scale = play.zoom / editor.zoom;

    return {
        x: play.middle.x + (point.x - editor.middle.x) * scale,
        y: play.middle.y + (point.y - editor.middle.y) * scale,
    };
}

function playBar(page: Page) {
    return page.getByRole('toolbar', { name: 'Play bar' });
}

test('in play an unstyled Hinge draws nothing and a styled Rope its path; after Stop the icons are back', async ({
    page,
}) => {
    await openEditor(page);
    const { hinge, ropeMiddle } = await buildLevel(page);
    const editor = await editorCamera(page);
    await expect.poll(() => whiteNear(page, hinge), { intervals: [50] }).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name: /^Play/ }).click();
    await expect(playBar(page)).toHaveAttribute('data-state', 'playing');
    await expect(page.getByRole('region', { name: 'Main menu' })).toBeHidden();
    await page.waitForTimeout(SETTLE_MS);

    const play = await playCamera(page);
    const ropeInPlay = inPlay(ropeMiddle, editor, play);
    const ropeColumn = {
        x: ropeInPlay.x,
        y: ropeInPlay.y - ICON_CLIP_HALF_PX,
        width: 1,
        height: 2 * ICON_CLIP_HALF_PX,
    };
    await expect.poll(() => countColour(page, ropeColumn, ROPE_COLOUR, ROPE_TOLERANCE)).toBeGreaterThan(0);
    expect(await countColour(page, await canvasBox(page), WHITE, WHITE_TOLERANCE)).toBe(0);

    await playBar(page).getByRole('button', { name: /^Stop/ }).click();
    await expect(playBar(page)).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Main menu' })).toBeVisible();
    await expect.poll(() => whiteNear(page, hinge), { intervals: [50] }).toBeGreaterThan(0);
});
