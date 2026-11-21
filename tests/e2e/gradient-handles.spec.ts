import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

type ScreenPoint = { x: number; y: number };

// A new rectangle's half width in the level.
const HALF_SIDE = 50;

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

test("a rectangle's fill goes Solid to Linear, its end handle is dragged, and Ctrl+Z puts each back", async ({
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

    await page.keyboard.press('Control+z');
    await expect(fill).toHaveText('Solid');
});
