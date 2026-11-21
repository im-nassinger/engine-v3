import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

type ScreenPoint = { x: number; y: number };

// A new rectangle's half width in the level.
const HALF_SIDE = 50;
// How far, in screen px, a paste's mouse is from the copied crate: past its side, so the copy doesn't cover it.
const PASTE_OFFSET_PX = 150;

// Opens the editor with grid snapping off, so the rectangle sits exactly where it is clicked, and draws
// one in the middle of the part no panel covers, which selects it. Returns its middle on screen.
async function openEditorWithCrate(page: Page): Promise<ScreenPoint> {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();

    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name: 'View', exact: true }).hover();
    await page.getByRole('menuitem', { name: /^Grid snapping/ }).click();
    await page.keyboard.press('Escape');

    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');
    const middle = { x: free.x + free.width / 2, y: free.y + free.height / 2 };

    await page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Shape' }).click();
    await page.getByRole('group', { name: 'Kinds menu' }).getByRole('button', { name: 'Rectangle' }).click();
    await page.mouse.click(middle.x, middle.y);
    await expect(styleCard(page)).toHaveCount(1);

    return middle;
}

function styleCard(page: Page) {
    return page
        .getByRole('region', { name: 'Entity inspector' })
        .locator('.entity-inspector-card[data-type="StyleComponent"]');
}

// The debug box shows the zoom as a percent.
async function zoomOf(page: Page) {
    const shown = await page.getByRole('textbox', { name: 'ZOOM' }).inputValue();

    return Number.parseFloat(shown) / 100;
}

async function percentOf(box: Locator) {
    return Number.parseFloat(await box.inputValue());
}

async function drag(page: Page, from: ScreenPoint, to: ScreenPoint) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
}

// The gradient as the Fill's editor shows it: its kind, each stop's colour and place, and where it ends.
// Reading a stop chooses it, so the last stop is left chosen.
async function shownGradient(page: Page) {
    const card = styleCard(page);
    const swatches = card.locator('.stop-swatches .stop');
    const stops: { colour: string; place: string }[] = [];
    for (let index = 0; index < (await swatches.count()); index += 1) {
        await card.getByRole('button', { name: `Stop ${index + 1}`, exact: true }).click();
        stops.push({
            colour: await card.getByRole('textbox', { name: 'Stop colour', exact: true }).inputValue(),
            place: await card.getByRole('textbox', { name: 'Place', exact: true }).inputValue(),
        });
    }

    return {
        kind: await card.getByRole('button', { name: 'Fill', exact: true }).textContent(),
        stops,
        end: [
            await card.getByRole('textbox', { name: 'End X' }).inputValue(),
            await card.getByRole('textbox', { name: 'End Y' }).inputValue(),
        ],
    };
}

function rectangleRows(page: Page) {
    return page.getByRole('tree', { name: 'Entities' }).getByRole('treeitem').filter({ hasText: 'Rectangle 1' });
}

// A click a quarter of the way along the gradient bar adds a stop there.
async function addStopOnBar(page: Page) {
    const bar = await styleCard(page).getByRole('button', { name: 'Add a stop here' }).boundingBox();
    if (!bar) throw new Error('The gradient bar has no size.');

    await page.mouse.click(bar.x + bar.width / 4, bar.y + bar.height / 2);
}

test("a rectangle's fill goes Solid to Linear, gets a stop, has its end handle dragged, and Ctrl+Z puts each back", async ({
    page,
}) => {
    const crate = await openEditorWithCrate(page);
    const card = styleCard(page);
    const fill = card.getByRole('button', { name: 'Fill', exact: true });
    await expect(fill).toHaveText('Solid');

    await fill.click();
    await page.getByRole('menuitem', { name: 'Linear' }).click();
    await expect(fill).toHaveText('Linear');

    const endX = card.getByRole('textbox', { name: 'End X' });
    const endY = card.getByRole('textbox', { name: 'End Y' });
    await expect(endX).toHaveValue('100');
    await expect(endY).toHaveValue('50');

    const swatches = card.locator('.stop-swatches .stop');
    await expect(swatches).toHaveCount(2);
    await addStopOnBar(page);
    await expect(swatches).toHaveCount(3);
    // The new stop is chosen, near the quarter of the bar the click was on.
    await expect
        .poll(async () => percentOf(card.getByRole('textbox', { name: 'Place', exact: true })))
        .toBeCloseTo(25, -0.7);

    // The end handle sits on the middle of the right side, over the frame's own handle there. Dragged to
    // the middle of the bottom side, the end goes to 50%, 100%.
    const zoom = await zoomOf(page);
    const endHandle = { x: crate.x + HALF_SIDE * zoom, y: crate.y };
    const bottomMiddle = { x: crate.x, y: crate.y + HALF_SIDE * zoom };
    await drag(page, endHandle, bottomMiddle);

    // Within a pixel of the mouse: the crate's middle on screen is rounded to whole pixels.
    await expect.poll(async () => percentOf(endX)).toBeCloseTo(50, -0.7);
    await expect.poll(async () => percentOf(endY)).toBeCloseTo(100, -0.7);

    await page.keyboard.press('Control+z');
    await expect(endX).toHaveValue('100');
    await expect(endY).toHaveValue('50');
    await expect(swatches).toHaveCount(3);

    await page.keyboard.press('Control+z');
    await expect(swatches).toHaveCount(2);

    await page.keyboard.press('Control+z');
    await expect(fill).toHaveText('Solid');
});

test('a gradient survives save, reload, copy and paste', async ({ page }) => {
    const crate = await openEditorWithCrate(page);
    const card = styleCard(page);
    await card.getByRole('button', { name: 'Fill', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Linear' }).click();
    await addStopOnBar(page);
    await expect(card.locator('.stop-swatches .stop')).toHaveCount(3);

    // The new stop, chosen, gets a colour of its own, so the stops differ from a new gradient's.
    const stopColour = card.getByRole('textbox', { name: 'Stop colour', exact: true });
    await stopColour.fill('#FF8800');
    await stopColour.press('Enter');
    await expect(stopColour).toHaveValue(/^#FF8800/i);

    const made = await shownGradient(page);
    expect(made.kind).toBe('Linear');
    expect(made.stops).toHaveLength(3);

    await page.keyboard.press('Control+s');
    await expect(page.locator('.message-pill .message')).toHaveText('Saved in this browser');
    await page.reload();

    await rectangleRows(page).click();
    await expect(card).toHaveCount(1);
    expect(await shownGradient(page)).toEqual(made);

    // The level view has the keys once clicked, and the click on the crate keeps it selected.
    await page.mouse.click(crate.x, crate.y);
    await page.keyboard.press('ControlOrMeta+c');
    await page.mouse.move(crate.x + PASTE_OFFSET_PX, crate.y);
    await page.keyboard.press('ControlOrMeta+v');

    await expect(rectangleRows(page)).toHaveCount(2);
    // The copy is listed first, and selected, so the Entity inspector shows its fill.
    await expect(rectangleRows(page).first()).toHaveAttribute('aria-selected', 'true');
    await expect(rectangleRows(page).last()).toHaveAttribute('aria-selected', 'false');
    expect(await shownGradient(page)).toEqual(made);
});
