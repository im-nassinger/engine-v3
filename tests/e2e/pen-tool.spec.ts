import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

type ScreenPoint = { x: number; y: number };

// At 100% zoom one level pixel is one screen pixel, and a new level has the default 100 px per metre.
const SCREEN_PX_PER_METRE = 100;
const PEN_HINT = 'Click for a corner, drag for a curve. Click the first point to close. Enter finishes.';

async function openEditorSnapping(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();
}

// Opens the editor with grid snapping off, so each point sits exactly where it is clicked.
async function openEditor(page: Page) {
    await openEditorSnapping(page);

    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name: 'View', exact: true }).hover();
    await page.getByRole('menuitem', { name: /^Grid snapping/ }).click();
    await page.keyboard.press('Escape');
}

// The middle of the part no panel covers. A new level's camera frame is fitted around it, and the
// inside of the frame is empty.
async function levelMiddle(page: Page): Promise<ScreenPoint> {
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    return { x: free.x + free.width / 2, y: free.y + free.height / 2 };
}

async function typeInDebugBox(page: Page, label: string, value: string) {
    await page.getByRole('textbox', { name: label }).click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type(value);
    await page.keyboard.press('Enter');
}

// The mouse's level position, as the debug box shows it.
async function mouseInLevel(page: Page, at: ScreenPoint) {
    await page.mouse.move(at.x, at.y);
    const read = async (label: string) => {
        const shown = await page.locator(`.debug-entry[data-entry="${label}"] .value`).textContent();
        return Number((shown ?? '').replace('−', '-'));
    };

    return { x: await read('X'), y: await read('Y') };
}

// The screen point of the grid spot nearest to `near`, at 100% zoom, measured from the debug box, which
// shows the mouse in metres; `gridSize` is in metres too.
async function gridSpotNear(page: Page, near: ScreenPoint, gridSize: number): Promise<ScreenPoint> {
    const here = await mouseInLevel(page, near);
    const along = await mouseInLevel(page, offset(near, 40, 40));
    const signX = Math.sign(along.x - here.x);
    const signY = Math.sign(along.y - here.y);
    const spotX = Math.round(here.x / gridSize) * gridSize;
    const spotY = Math.round(here.y / gridSize) * gridSize;

    return offset(near, (spotX - here.x) * signX * SCREEN_PX_PER_METRE, (spotY - here.y) * signY * SCREEN_PX_PER_METRE);
}

function offset(point: ScreenPoint, dx: number, dy: number): ScreenPoint {
    return { x: point.x + dx, y: point.y + dy };
}

// Separate clicks, far enough apart in place that none is taken for a double-click.
async function click(page: Page, at: ScreenPoint) {
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.up();
}

async function drag(page: Page, from: ScreenPoint, to: ScreenPoint) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
}

function toolButton(page: Page, name: string) {
    return page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name, exact: true });
}

function entityRow(page: Page, name: string) {
    return page.getByRole('tree', { name: 'Entities' }).getByRole('treeitem').filter({ hasText: name });
}

function entityInspector(page: Page) {
    return page.getByRole('region', { name: 'Entity inspector' });
}

function pathCard(page: Page) {
    return entityInspector(page).locator('.entity-inspector-card[data-type="PathComponent"]');
}

function cornerOf(page: Page, number: number) {
    return pathCard(page).getByRole('button', { name: `Corner of point ${number}`, exact: true });
}

test('key 4 picks the pen, which hides the Entity inspector and shows its hint, and draws an open path by clicks and drags', async ({
    page,
}) => {
    await openEditor(page);
    const middle = await levelMiddle(page);

    await page.mouse.move(middle.x, middle.y);
    await page.keyboard.press('4');
    await expect(toolButton(page, 'Bézier pen')).toHaveAttribute('aria-pressed', 'true');
    await expect(entityInspector(page)).toHaveCount(0);
    await expect(page.locator('.message-pill .message')).toHaveText(PEN_HINT);

    await click(page, offset(middle, -150, 0));
    await click(page, offset(middle, -50, -80));
    // A drag places a smooth point at the press and pulls its handle out to the mouse.
    await drag(page, offset(middle, 50, 0), offset(middle, 110, 0));
    await click(page, offset(middle, 150, -80));
    await page.keyboard.press('Enter');

    await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'true');
    await expect(toolButton(page, 'Select')).toHaveAttribute('aria-pressed', 'true');
    await expect(pathCard(page).locator('.path-points-field .count')).toHaveText('4');
    await expect(cornerOf(page, 1)).toHaveText('Sharp');
    await expect(cornerOf(page, 2)).toHaveText('Sharp');
    await expect(cornerOf(page, 3)).toHaveText('Smooth');
    await expect(cornerOf(page, 4)).toHaveText('Sharp');
});

test('the pen’s button picks it, and a click on the first point closes the path', async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);
    const first = offset(middle, -100, 60);

    await toolButton(page, 'Bézier pen').click();
    await expect(entityInspector(page)).toHaveCount(0);

    await click(page, first);
    await click(page, offset(middle, 100, 60));
    await click(page, offset(middle, 0, -100));
    await click(page, first);

    // Closing finishes the drawing, with no point added on the first one.
    await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'true');
    await expect(toolButton(page, 'Select')).toHaveAttribute('aria-pressed', 'true');
    await expect(pathCard(page).locator('.path-points-field .count')).toHaveText('3');

    // A closed path is filled, so a click inside it selects it.
    await click(page, offset(middle, 200, -120));
    await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'false');
    await click(page, offset(middle, 0, 20));
    await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'true');
});

test('with grid snapping off, a press within the ring around the first point closes the path, filled', async ({
    page,
}) => {
    await openEditor(page);
    const middle = await levelMiddle(page);
    const first = offset(middle, -100, 60);

    await page.mouse.move(middle.x, middle.y);
    await page.keyboard.press('4');
    await click(page, first);
    await click(page, offset(middle, 100, 60));
    await click(page, offset(middle, 0, -100));
    await click(page, offset(first, 5, -4));

    await expect(toolButton(page, 'Select')).toHaveAttribute('aria-pressed', 'true');
    await expect(pathCard(page).locator('.path-points-field .count')).toHaveText('3');
    await click(page, offset(middle, 200, -120));
    await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'false');
    await click(page, offset(middle, 0, 20));
    await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'true');
});

// Fix 11: a press outside the ring that snaps onto the first point's grid spot used to add a point there,
// ending the path on its first point but open, with no fill.
test('with grid snapping on, a press that snaps onto the first point closes the path, filled', async ({ page }) => {
    await openEditorSnapping(page);
    await typeInDebugBox(page, 'GRID', '1');
    await typeInDebugBox(page, 'ZOOM', '100');
    const spot = await gridSpotNear(page, await levelMiddle(page), 1);

    await page.keyboard.press('4');
    await click(page, spot);
    await click(page, offset(spot, 200, 0));
    await click(page, offset(spot, 100, -200));
    // 28 px from the first point, well outside the 8 px ring, and snapped onto it.
    await click(page, offset(spot, 20, -20));

    await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'true');
    await expect(toolButton(page, 'Select')).toHaveAttribute('aria-pressed', 'true');
    await expect(pathCard(page).locator('.path-points-field .count')).toHaveText('3');
    await click(page, offset(spot, 300, -200));
    await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'false');
    await click(page, offset(spot, 100, -60));
    await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'true');
});

test('picked with an open path selected, the pen continues it from either end and closes it on the other', async ({
    page,
}) => {
    await openEditor(page);
    const middle = await levelMiddle(page);
    const firstEnd = offset(middle, -100, 0);
    const lastEnd = offset(middle, 100, 0);
    const pointCount = pathCard(page).locator('.path-points-field .count');

    await page.mouse.move(middle.x, middle.y);
    await page.keyboard.press('4');
    await click(page, firstEnd);
    await click(page, lastEnd);
    await page.keyboard.press('Enter');
    await expect(pointCount).toHaveText('2');

    // From the first end: one step, and Ctrl+Z puts the path back as it was.
    await page.keyboard.press('4');
    await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'true');
    await click(page, firstEnd);
    await click(page, offset(middle, -100, 100));
    await page.keyboard.press('Enter');
    await expect(toolButton(page, 'Select')).toHaveAttribute('aria-pressed', 'true');
    await expect(pointCount).toHaveText('3');
    await page.keyboard.press('Control+z');
    await expect(pointCount).toHaveText('2');

    // From the last end, Ctrl+Z while drawing stops at the path's own points; a press on the first end closes it.
    await page.keyboard.press('4');
    await click(page, lastEnd);
    await click(page, offset(middle, 200, 200));
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+z');
    await click(page, offset(middle, 0, -100));
    await click(page, firstEnd);
    await expect(toolButton(page, 'Select')).toHaveAttribute('aria-pressed', 'true');
    await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'true');
    await expect(pointCount).toHaveText('3');
    await expect(entityRow(page, 'Path 2')).toHaveCount(0);

    // Closed, the path is filled, so a click inside it selects it.
    await click(page, offset(middle, 200, -120));
    await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'false');
    await click(page, offset(middle, 0, -30));
    await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'true');
});
