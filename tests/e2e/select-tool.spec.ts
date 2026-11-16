import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// A new level's camera's size, and ViewState's FIT_MARGIN_PX.
const CAMERA_WIDTH = 1920;
const CAMERA_HEIGHT = 1080;
const FIT_MARGIN_PX = 40;
// Away from the frame's middle handle, which a selected camera shows on its left edge.
const BELOW_HANDLE_PX = 80;
// A press within 4 px of the last one, and within 500 ms, is a double-click, so a drag after a click
// starts further away.
const AWAY_FROM_CLICK_PX = 20;

type ScreenPoint = { x: number; y: number };

// A new level holds only the World and the camera until stage 10's Shape tool draws, so these tests
// select, move and go into the camera, which its frame's edge selects.
async function openEditor(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();
}

function cameraRow(page: Page) {
    return page.getByRole('tree', { name: 'Entities' }).getByRole('treeitem').filter({ hasText: 'Camera' });
}

function positionX(page: Page) {
    const transform = page
        .getByRole('region', { name: 'Inspector' })
        .locator('.inspector-card[data-type="TransformComponent"]');

    return transform.getByRole('textbox', { name: 'Position X' });
}

// The fitted camera frame's left edge, in the middle of the part no panel covers, as level-view.spec.ts
// works it out.
async function cameraFrameLeftEdge(page: Page): Promise<ScreenPoint> {
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    const availableWidth = free.width - 2 * FIT_MARGIN_PX;
    const availableHeight = free.height - 2 * FIT_MARGIN_PX;
    const zoom = Math.min(availableWidth / CAMERA_WIDTH, availableHeight / CAMERA_HEIGHT);
    const middleX = free.x + free.width / 2;
    const middleY = free.y + free.height / 2;

    return { x: middleX - (CAMERA_WIDTH * zoom) / 2, y: middleY + BELOW_HANDLE_PX };
}

async function drag(page: Page, from: ScreenPoint, to: ScreenPoint) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
}

test('a click on the camera frame selects it, a drag moves it, and Ctrl+Z puts it back', async ({ page }) => {
    await openEditor(page);
    const edge = await cameraFrameLeftEdge(page);

    await page.mouse.click(edge.x, edge.y);
    await expect(cameraRow(page)).toHaveAttribute('aria-selected', 'true');
    const before = await positionX(page).inputValue();

    const grab = { x: edge.x, y: edge.y + AWAY_FROM_CLICK_PX };
    await drag(page, grab, { x: grab.x + 120, y: grab.y });
    await expect(positionX(page)).not.toHaveValue(before);

    await page.keyboard.press('Control+z');
    await expect(positionX(page)).toHaveValue(before);
    await expect(cameraRow(page)).toHaveAttribute('aria-selected', 'true');
});

test('a click inside the frame selects nothing, and a selection box across its edge selects the camera', async ({
    page,
}) => {
    await openEditor(page);
    const edge = await cameraFrameLeftEdge(page);
    const inside = { x: edge.x + 100, y: edge.y };

    await page.mouse.click(inside.x, inside.y);
    await expect(cameraRow(page)).toHaveAttribute('aria-selected', 'false');

    const boxStart = { x: inside.x, y: inside.y + AWAY_FROM_CLICK_PX };
    await drag(page, boxStart, { x: edge.x - 40, y: boxStart.y + 40 });
    await expect(cameraRow(page)).toHaveAttribute('aria-selected', 'true');
});

test('a double-click on the frame goes into the camera, and Esc goes up, selecting it, then clears', async ({
    page,
}) => {
    await openEditor(page);
    const edge = await cameraFrameLeftEdge(page);

    // At the World, with nothing selected, Esc has nothing to do.
    await page.mouse.click(edge.x + 100, edge.y);
    await page.keyboard.press('Escape');
    await expect(cameraRow(page)).toHaveAttribute('aria-selected', 'false');

    await page.mouse.dblclick(edge.x, edge.y);
    await expect(cameraRow(page)).toHaveAttribute('aria-selected', 'false');

    await page.keyboard.press('Escape');
    await expect(cameraRow(page)).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Escape');
    await expect(cameraRow(page)).toHaveAttribute('aria-selected', 'false');
});
