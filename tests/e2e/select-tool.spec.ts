import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

type ScreenPoint = { x: number; y: number };

// A click with the Shape tool places a rectangle of 100 by 100 px in the level, about 60 px on screen at
// a new level's zoom, so a point this far from its middle is still on it.
const ON_CRATE_PX = 15;
// Far enough from the crate's middle to be off it, and inside the empty camera frame.
const OFF_CRATE_PX = 150;
// A press within 4 px of the last one, and within 500 ms, is a double-click, so a drag after a click
// starts further away.
const AWAY_FROM_CLICK_PX = 10;

// Opens the editor and draws a crate in the middle of the part no panel covers, then clears the selection.
async function openEditorWithCrate(page: Page): Promise<ScreenPoint> {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();

    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');
    const middle = { x: free.x + free.width / 2, y: free.y + free.height / 2 };

    await page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Shape' }).click();
    await page.getByRole('toolbar', { name: 'Tool options' }).getByRole('button', { name: 'Rectangle' }).click();
    await page.mouse.click(middle.x, middle.y);
    await expect(crateRow(page)).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Escape');
    await expect(crateRow(page)).toHaveAttribute('aria-selected', 'false');

    return middle;
}

function crateRow(page: Page) {
    return page
        .getByRole('tree', { name: 'Entities' })
        .getByRole('treeitem')
        .filter({ has: page.locator('.name', { hasText: 'Rectangle 1' }) });
}

function positionX(page: Page) {
    const transform = page
        .getByRole('region', { name: 'Inspector' })
        .locator('.inspector-card[data-type="TransformComponent"]');

    return transform.getByRole('textbox', { name: 'Position X' });
}

async function drag(page: Page, from: ScreenPoint, to: ScreenPoint) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
}

test('a click on a drawn crate selects it, a drag moves it, and Ctrl+Z puts it back', async ({ page }) => {
    const crate = await openEditorWithCrate(page);

    await page.mouse.click(crate.x, crate.y);
    await expect(crateRow(page)).toHaveAttribute('aria-selected', 'true');
    const before = await positionX(page).inputValue();

    const grab = { x: crate.x - AWAY_FROM_CLICK_PX, y: crate.y + AWAY_FROM_CLICK_PX };
    await drag(page, grab, { x: grab.x + 120, y: grab.y });
    await expect(positionX(page)).not.toHaveValue(before);

    await page.keyboard.press('Control+z');
    await expect(positionX(page)).toHaveValue(before);
    await expect(crateRow(page)).toHaveAttribute('aria-selected', 'true');
});

test('a click on empty space selects nothing, and a selection box touching the crate selects it', async ({ page }) => {
    const crate = await openEditorWithCrate(page);
    const empty = { x: crate.x + OFF_CRATE_PX, y: crate.y + OFF_CRATE_PX };

    await page.mouse.click(empty.x, empty.y);
    await expect(crateRow(page)).toHaveAttribute('aria-selected', 'false');

    // From empty space to a point on the crate, so the box only touches it.
    const boxStart = { x: empty.x + AWAY_FROM_CLICK_PX, y: empty.y + AWAY_FROM_CLICK_PX };
    await drag(page, boxStart, { x: crate.x + ON_CRATE_PX, y: crate.y + ON_CRATE_PX });
    await expect(crateRow(page)).toHaveAttribute('aria-selected', 'true');
});
