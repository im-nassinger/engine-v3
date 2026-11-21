import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

type ScreenPoint = { x: number; y: number };

// Opens the editor with grid snapping off, so each point and handle sits exactly where it is put.
async function openEditor(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();

    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name: 'View', exact: true }).hover();
    await page.getByRole('menuitem', { name: /^Grid snapping/ }).click();
    await page.keyboard.press('Escape');
}

// The middle of the part no panel covers, inside a new level's empty camera frame.
async function levelMiddle(page: Page): Promise<ScreenPoint> {
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    return { x: free.x + free.width / 2, y: free.y + free.height / 2 };
}

function offset(point: ScreenPoint, dx: number, dy: number): ScreenPoint {
    return { x: point.x + dx, y: point.y + dy };
}

async function click(page: Page, at: ScreenPoint) {
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.up();
}

async function doubleClick(page: Page, at: ScreenPoint) {
    await page.mouse.dblclick(at.x, at.y);
}

async function drag(page: Page, from: ScreenPoint, to: ScreenPoint) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
}

function pathCard(page: Page) {
    return page
        .getByRole('region', { name: 'Entity inspector' })
        .locator('.entity-inspector-card[data-type="PathComponent"]');
}

function pointRow(page: Page, number: number) {
    return pathCard(page).locator(`.path-point-row[data-index="${number - 1}"]`);
}

function cornerOf(page: Page, number: number) {
    return pathCard(page).getByRole('button', { name: `Corner of point ${number}`, exact: true });
}

// A handle's typed axis, from its row under the point's row.
function handleAxis(page: Page, number: number, handle: 'Handle in' | 'Handle out', axis: 'x' | 'y') {
    return pointRow(page, number)
        .locator('.path-handle-row')
        .filter({ hasText: handle })
        .locator(`.vector-axis-box[data-axis="${axis}"] input`);
}

test("a path's points: a point added on a curve, a handle dragged, and a point switched sharp and smooth", async ({
    page,
}) => {
    await openEditor(page);
    const middle = await levelMiddle(page);
    const first = offset(middle, -150, 0);
    const curved = middle;
    const last = offset(middle, 150, 0);

    // A sharp point, a smooth one with its handles 60 px each way along the line, and a sharp one.
    await page.mouse.move(middle.x, middle.y);
    await page.keyboard.press('4');
    await click(page, first);
    await drag(page, curved, offset(curved, 60, 0));
    await click(page, last);
    await page.keyboard.press('Enter');
    await expect(pathCard(page).locator('.path-points-field .count')).toHaveText('3');

    // A double-click on the path enters point editing; one on its first curve adds a smooth point there.
    await doubleClick(page, offset(middle, -100, 0));
    await doubleClick(page, offset(middle, -75, 0));
    await expect(pathCard(page).locator('.path-points-field .count')).toHaveText('4');
    await expect(cornerOf(page, 2)).toHaveText('Smooth');
    await expect(pointRow(page, 2)).toHaveAttribute('data-selected', 'true');

    // The smooth point selected shows its handles; its row is the blue pill, unfolded.
    await click(page, curved);
    await expect(pointRow(page, 3)).toHaveAttribute('data-selected', 'true');
    await expect(pointRow(page, 3)).toHaveAttribute('data-unfolded', 'true');
    await expect(pointRow(page, 2)).toHaveAttribute('data-selected', 'false');
    await expect(handleAxis(page, 3, 'Handle out', 'y')).toHaveValue('0');

    // Dragging the handle out's end up turns the handle in down, opposite it.
    await drag(page, offset(curved, 60, 0), offset(curved, 60, -60));
    await expect(handleAxis(page, 3, 'Handle out', 'y')).not.toHaveValue('0');
    const outY = Number(await handleAxis(page, 3, 'Handle out', 'y').inputValue());
    const inY = Number(await handleAxis(page, 3, 'Handle in', 'y').inputValue());
    expect(Math.sign(outY)).toBe(-Math.sign(inY));
    await expect(cornerOf(page, 3)).toHaveText('Smooth');

    // Ctrl+Z puts the handles back in one step. It clears the selected points, since their indexes may
    // not match, so the point is selected again to show its handles.
    await page.keyboard.press('Control+z');
    await click(page, curved);
    await expect(handleAxis(page, 3, 'Handle out', 'y')).toHaveValue('0');

    // A double-click on a point switches it: sharp to smooth, and back.
    await doubleClick(page, last);
    await expect(cornerOf(page, 4)).toHaveText('Smooth');
    // A click elsewhere first, so the browser counts the next two clicks as a new double-click.
    await click(page, curved);
    await doubleClick(page, last);
    await expect(cornerOf(page, 4)).toHaveText('Sharp');
});
