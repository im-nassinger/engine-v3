import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

type ScreenPoint = { x: number; y: number };

// A press within 4 px of the last one, and within 500 ms, is a double-click, so separate clicks in these
// tests land further apart than this.
const APART_PX = 60;
// The size a click places before any drag has set one.
const FIRST_SIDE = 100;

// Opens the editor with grid snapping off, so a drag's size follows the mouse exactly and two drags
// of the same length give the same size wherever they start.
async function openEditor(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();

    const snapping = page.locator('.top-bar').getByRole('button', { name: 'Grid snapping' });
    await snapping.click();
    await expect(snapping).toHaveAttribute('aria-pressed', 'false');
}

// The middle of the part no panel covers. A new level's camera frame is fitted around it, and the
// inside of the frame is empty.
async function levelMiddle(page: Page): Promise<ScreenPoint> {
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    return { x: free.x + free.width / 2, y: free.y + free.height / 2 };
}

function offset(point: ScreenPoint, dx: number, dy: number): ScreenPoint {
    return { x: point.x + dx, y: point.y + dy };
}

async function pickShapeTool(page: Page, kind: 'Rectangle' | 'Circle' | 'Polygon') {
    await page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Shape' }).click();
    await page.getByRole('toolbar', { name: 'Tool options' }).getByRole('button', { name: kind }).click();
}

async function drag(page: Page, from: ScreenPoint, to: ScreenPoint) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
}

// A drag with a key held from the press to the release.
async function dragHolding(page: Page, keys: readonly string[], from: ScreenPoint, to: ScreenPoint) {
    await page.mouse.move(from.x, from.y);
    for (const key of keys) {
        await page.keyboard.down(key);
    }
    await drag(page, from, to);
    for (const key of [...keys].reverse()) {
        await page.keyboard.up(key);
    }
}

function entityRow(page: Page, name: string) {
    return page.getByRole('tree', { name: 'Entities' }).getByRole('treeitem').filter({ hasText: name });
}

function entityInspector(page: Page) {
    return page.getByRole('region', { name: 'Entity inspector' });
}

function shapeCard(page: Page) {
    return entityInspector(page).locator('.entity-inspector-card[data-type="ShapeComponent"]');
}

function shapeField(page: Page, label: string) {
    return shapeCard(page).getByRole('textbox', { name: label, exact: true });
}

async function numberIn(field: Locator) {
    return Number(await field.inputValue());
}

async function shapeSize(page: Page) {
    return { width: await numberIn(shapeField(page, 'Width')), height: await numberIn(shapeField(page, 'Height')) };
}

// The Points list's count, "4 items", shown while it is folded.
function pointsCount(page: Page) {
    return shapeCard(page).locator('.list-field .count');
}

async function expectFinished(page: Page, name: string) {
    await expect(entityRow(page, name)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('toolbar', { name: 'Tool options' })).toHaveCount(0);
    await expect(shapeCard(page)).toHaveCount(1);
}

test('key 4 picks the Shape tool and hides the Entity inspector, and a click places a rectangle of the first size', async ({
    page,
}) => {
    await openEditor(page);
    const middle = await levelMiddle(page);

    await page.mouse.move(middle.x, middle.y);
    await page.keyboard.press('4');
    await expect(page.getByRole('toolbar', { name: 'Tool options' })).toBeVisible();
    await expect(entityInspector(page)).toHaveCount(0);

    await page.mouse.click(middle.x, middle.y);

    await expectFinished(page, 'Rectangle 1');
    expect(await shapeSize(page)).toEqual({ width: FIRST_SIDE, height: FIRST_SIDE });
});

test('a drag sizes a rectangle, and the next click places the same size', async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);

    await pickShapeTool(page, 'Rectangle');
    await drag(page, middle, offset(middle, 120, 60));
    await expectFinished(page, 'Rectangle 1');
    const dragged = await shapeSize(page);
    expect(dragged.width).toBeGreaterThan(dragged.height);
    expect(dragged.width).not.toBe(FIRST_SIDE);

    await pickShapeTool(page, 'Rectangle');
    await page.mouse.click(middle.x - 3 * APART_PX, middle.y);
    await expectFinished(page, 'Rectangle 2');
    expect(await shapeSize(page)).toEqual(dragged);
});

test('Shift keeps a dragged rectangle square, and Alt draws it from the press as its centre', async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);

    await pickShapeTool(page, 'Rectangle');
    await drag(page, middle, offset(middle, 120, 60));
    const plain = await shapeSize(page);

    await pickShapeTool(page, 'Rectangle');
    const shiftStart = offset(middle, -3 * APART_PX, 0);
    await dragHolding(page, ['Shift'], shiftStart, offset(shiftStart, 120, 60));
    await expectFinished(page, 'Rectangle 2');
    const square = await shapeSize(page);
    expect(square.width).toBe(square.height);
    expect(square.width).toBeCloseTo(plain.width, 0);

    await pickShapeTool(page, 'Rectangle');
    const altStart = offset(middle, 0, 2 * APART_PX);
    await dragHolding(page, ['Alt'], altStart, offset(altStart, 120, 60));
    await expectFinished(page, 'Rectangle 3');
    const fromCentre = await shapeSize(page);
    expect(fromCentre.width).toBeCloseTo(2 * plain.width, 0);
    expect(fromCentre.height).toBeCloseTo(2 * plain.height, 0);
});

test('a circle by click, by drag, and by drag with Shift and Alt', async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);

    await pickShapeTool(page, 'Circle');
    await page.mouse.click(middle.x, middle.y);
    await expectFinished(page, 'Circle 1');
    expect(await numberIn(shapeField(page, 'Radius'))).toBe(FIRST_SIDE / 2);

    // A drag draws the circle that fits the dragged box, as if Shift were held.
    await pickShapeTool(page, 'Circle');
    const dragStart = offset(middle, -3 * APART_PX, 0);
    await drag(page, dragStart, offset(dragStart, 120, 60));
    await expectFinished(page, 'Circle 2');
    const dragged = await numberIn(shapeField(page, 'Radius'));
    expect(dragged).not.toBe(FIRST_SIDE / 2);

    await pickShapeTool(page, 'Circle');
    const shiftStart = offset(middle, 0, 2 * APART_PX);
    await dragHolding(page, ['Shift'], shiftStart, offset(shiftStart, 120, 60));
    await expectFinished(page, 'Circle 3');
    expect(await numberIn(shapeField(page, 'Radius'))).toBeCloseTo(dragged, 0);

    await pickShapeTool(page, 'Circle');
    const altStart = offset(middle, -3 * APART_PX, 2 * APART_PX);
    await dragHolding(page, ['Alt'], altStart, offset(altStart, 120, 60));
    await expectFinished(page, 'Circle 4');
    expect(await numberIn(shapeField(page, 'Radius'))).toBeCloseTo(2 * dragged, 0);
});

test('clicking the first point closes a polygon, and Enter finishes one open as a line', async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);
    const kind = shapeCard(page).getByRole('button', { name: 'Kind' });

    await pickShapeTool(page, 'Polygon');
    const first = offset(middle, -APART_PX, APART_PX);
    await page.mouse.click(first.x, first.y);
    await page.mouse.click(middle.x + APART_PX, middle.y + APART_PX);
    await page.mouse.click(middle.x, middle.y - APART_PX);
    await page.mouse.click(first.x, first.y);
    await expectFinished(page, 'Polygon 1');
    await expect(kind).toContainText('Polygon');
    await expect(pointsCount(page)).toHaveText('3 items');

    await pickShapeTool(page, 'Polygon');
    await page.mouse.click(middle.x - 3 * APART_PX, middle.y);
    await page.mouse.click(middle.x - 2 * APART_PX, middle.y - APART_PX);
    await page.mouse.click(middle.x - APART_PX, middle.y + 2 * APART_PX);
    await page.keyboard.press('Enter');
    await expectFinished(page, 'Line 1');
    await expect(kind).toContainText('Line');
    await expect(pointsCount(page)).toHaveText('3 items');
});

test('Ctrl+Z while drawing removes the last point and makes no step', async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);

    await pickShapeTool(page, 'Polygon');
    await page.mouse.click(middle.x - APART_PX, middle.y);
    await page.mouse.click(middle.x + APART_PX, middle.y);
    await page.mouse.click(middle.x, middle.y - APART_PX);
    await page.keyboard.press('Control+z');
    await expect(page.getByRole('toolbar', { name: 'Tool options' })).toBeVisible();
    await page.keyboard.press('Enter');

    await expectFinished(page, 'Line 1');
    await expect(pointsCount(page)).toHaveText('2 items');

    // The drawing was one step, so one undo removes the line, and nothing was undone before it.
    await page.keyboard.press('Control+z');
    await expect(entityRow(page, 'Line 1')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Undo/ })).toHaveAttribute('aria-disabled', 'true');
});

test('two drawn shapes grouped: a double-click goes into the group, and Esc goes out', async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);
    const left = offset(middle, -2 * APART_PX, 0);
    const right = offset(middle, 2 * APART_PX, 0);

    await pickShapeTool(page, 'Rectangle');
    await page.mouse.click(left.x, left.y);
    await pickShapeTool(page, 'Circle');
    await page.mouse.click(right.x, right.y);

    // Select all skips the camera, so it selects the two shapes.
    await page.mouse.move(middle.x, middle.y);
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+g');
    await expect(entityRow(page, 'Group 1')).toHaveAttribute('aria-selected', 'true');

    await page.mouse.dblclick(left.x, left.y);
    await expect(entityRow(page, 'Rectangle 1')).toHaveAttribute('aria-selected', 'true');
    await expect(entityRow(page, 'Group 1')).toHaveAttribute('aria-selected', 'false');

    await page.keyboard.press('Escape');
    await expect(entityRow(page, 'Rectangle 1')).toHaveAttribute('aria-selected', 'false');
    await expect(entityRow(page, 'Group 1')).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Escape');
    await expect(entityRow(page, 'Group 1')).toHaveAttribute('aria-selected', 'false');
});

test("dragging a polygon's point moves it, and Ctrl+Z puts it back", async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);
    const first = offset(middle, -2 * APART_PX, 2 * APART_PX);
    const second = offset(middle, 2 * APART_PX, 2 * APART_PX);
    const third = offset(middle, 0, -2 * APART_PX);

    await pickShapeTool(page, 'Polygon');
    for (const point of [first, second, third, first]) {
        await page.mouse.click(point.x, point.y);
    }
    await expectFinished(page, 'Polygon 1');

    await shapeCard(page).locator('.list-field > .fold').click();
    const firstX = shapeCard(page).getByRole('textbox', { name: 'Points 1 X', exact: true });
    const before = await firstX.inputValue();

    // A double-click inside the polygon edits its points; the drag starts on the first point.
    await page.mouse.dblclick(middle.x, middle.y + APART_PX);
    await drag(page, first, offset(first, -APART_PX, 0));
    await expect(firstX).not.toHaveValue(before);

    await page.keyboard.press('Control+z');
    await expect(firstX).toHaveValue(before);
});
