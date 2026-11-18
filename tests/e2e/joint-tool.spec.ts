import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

type ScreenPoint = { x: number; y: number };
type ScreenBox = { readonly centre: ScreenPoint; readonly half: number };

// Bodies far apart enough that neither covers the other, and further than a double-click's 4 px.
const APART_PX = 200;
const BOX_HALF_PX = 40;
// How far, in screen px, a paste's mouse is from the copied entities.
const PASTE_OFFSET_PX = 300;

// Opens the editor with grid snapping off, so a dragged box's size follows the mouse exactly.
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

// The middle of the part no panel covers, inside the new level's empty camera frame.
async function levelMiddle(page: Page): Promise<ScreenPoint> {
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    return { x: free.x + free.width / 2, y: free.y + free.height / 2 };
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

// A rectangle dragged with the Shape tool, given a BodyComponent and, through the note's fix, a
// SurfaceComponent, so the Joint tool can join it. The Shape tool numbers rectangles in the order drawn.
async function drawBody(page: Page, box: ScreenBox, name: string) {
    const from = offset(box.centre, -box.half, -box.half);
    const to = offset(box.centre, box.half, box.half);
    await page.mouse.move(from.x, from.y);
    await page.keyboard.press('4');
    await page.mouse.down();
    await page.mouse.move(box.centre.x, box.centre.y, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
    await expect(rows(page, name)).toHaveAttribute('aria-selected', 'true');

    await entityInspector(page).getByRole('button', { name: 'Add Component' }).click();
    await entityInspector(page).getByRole('menuitem', { name: 'BodyComponent', exact: true }).click();
    await card(page, 'BodyComponent').getByRole('button', { name: 'Add Surface' }).click();
    await expect(card(page, 'SurfaceComponent')).toHaveCount(1);
}

async function pickJointTool(page: Page, type: 'Hinge' | 'Rope' | 'Spring') {
    await page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Joint' }).click();
    await page.getByRole('group', { name: 'Kinds menu' }).getByRole('button', { name: type }).click();
}

async function click(page: Page, at: ScreenPoint) {
    await page.mouse.click(at.x, at.y);
}

// The selected joint's A or B, as the Entity inspector's JointComponent card names it.
function jointEnd(page: Page, label: 'A' | 'B') {
    return card(page, 'JointComponent').getByRole('button', { name: label, exact: true });
}

// After placing, the joint is selected and the tool is back to Select, so the Entity inspector shows it.
async function expectPlaced(page: Page, name: string) {
    await expect(rows(page, name)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('group', { name: 'Kinds menu' })).toHaveCount(0);
    await expect(card(page, 'JointComponent')).toHaveCount(1);
}

// Two bodies side by side, Rectangle 1 on the left and Rectangle 2 on the right.
async function drawTwoBodies(page: Page) {
    const middle = await levelMiddle(page);
    const left = offset(middle, -APART_PX / 2, 0);
    const right = offset(middle, APART_PX / 2, 0);
    await drawBody(page, { centre: left, half: BOX_HALF_PX }, 'Rectangle 1');
    await drawBody(page, { centre: right, half: BOX_HALF_PX }, 'Rectangle 2');

    return { left, right };
}

test('key 6 picks the Joint tool, and a click on one box pins it with a Hinge', async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);
    await drawBody(page, { centre: middle, half: BOX_HALF_PX }, 'Rectangle 1');

    await page.mouse.move(middle.x, middle.y);
    await page.keyboard.press('6');
    await expect(page.getByRole('group', { name: 'Kinds menu' })).toBeVisible();
    await click(page, offset(middle, BOX_HALF_PX / 2, 0));

    await expectPlaced(page, 'Hinge 1');
    await expect(jointEnd(page, 'A')).toContainText('Rectangle 1');
    await expect(jointEnd(page, 'B')).toContainText('None');
});

test('a Hinge where two boxes overlap joins them, the smaller as A', async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);
    await drawBody(page, { centre: middle, half: 2 * BOX_HALF_PX }, 'Rectangle 1');
    const wheel = offset(middle, BOX_HALF_PX, BOX_HALF_PX);
    await drawBody(page, { centre: wheel, half: BOX_HALF_PX / 2 }, 'Rectangle 2');

    await pickJointTool(page, 'Hinge');
    await click(page, offset(wheel, 5, 3));

    await expectPlaced(page, 'Hinge 1');
    await expect(jointEnd(page, 'A')).toContainText('Rectangle 2');
    await expect(jointEnd(page, 'B')).toContainText('Rectangle 1');
});

test('a click on nothing makes no joint and shows why', async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);

    await pickJointTool(page, 'Hinge');
    await click(page, middle);

    await expect(page.locator('.status-bar .status-text')).toHaveText('Nothing with physics here');
    await expect(rows(page, 'Hinge 1')).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Kinds menu' })).toBeVisible();
});

test('a Rope and a Spring take two clicks each, and Ctrl+Z removes the Spring alone', async ({ page }) => {
    await openEditor(page);
    const { left, right } = await drawTwoBodies(page);

    await pickJointTool(page, 'Rope');
    await click(page, offset(left, 5, 3));
    await expect(rows(page, 'Rope 1')).toHaveCount(0);
    await click(page, offset(right, -5, 3));
    await expectPlaced(page, 'Rope 1');
    await expect(card(page, 'JointComponent')).toContainText('Rope');

    await pickJointTool(page, 'Spring');
    await click(page, offset(left, 5, -3));
    await click(page, offset(right, -5, -3));
    await expectPlaced(page, 'Spring 1');
    const ends = [await jointEnd(page, 'A').textContent(), await jointEnd(page, 'B').textContent()];
    expect(ends.join(' ')).toContain('Rectangle 1');
    expect(ends.join(' ')).toContain('Rectangle 2');

    await page.keyboard.press('Control+z');
    await expect(rows(page, 'Spring 1')).toHaveCount(0);
    await expect(rows(page, 'Rope 1')).toHaveCount(1);
});

test('a Rope copied with its two boxes pastes joined to the copies', async ({ page }) => {
    await openEditor(page);
    const { left, right } = await drawTwoBodies(page);
    await pickJointTool(page, 'Rope');
    await click(page, offset(left, 5, 3));
    await click(page, offset(right, -5, 3));
    await expectPlaced(page, 'Rope 1');

    // Select all skips the camera, so it selects the two boxes and the Rope.
    const middle = await levelMiddle(page);
    await page.mouse.move(middle.x, middle.y);
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('ControlOrMeta+c');
    await page.mouse.move(middle.x, middle.y + PASTE_OFFSET_PX / 2);
    await page.keyboard.press('ControlOrMeta+v');
    await expect(rows(page, 'Rope 1')).toHaveCount(2);

    // A paste keeps the names and goes on top, so the copies are renamed to tell them apart.
    const renames = [
        { name: 'Rectangle 1', renamed: 'Left copy' },
        { name: 'Rectangle 2', renamed: 'Right copy' },
    ];
    for (const { name, renamed } of renames) {
        await rows(page, name).first().click();
        await page.keyboard.press('F2');
        await page.keyboard.type(renamed);
        await page.keyboard.press('Enter');
        await expect(rows(page, renamed)).toHaveCount(1);
    }

    await rows(page, 'Rope 1').first().click();
    const pastedEnds = [await jointEnd(page, 'A').textContent(), await jointEnd(page, 'B').textContent()];
    expect(pastedEnds.join(' ')).toContain('Left copy');
    expect(pastedEnds.join(' ')).toContain('Right copy');

    await rows(page, 'Rope 1').last().click();
    const originalEnds = [await jointEnd(page, 'A').textContent(), await jointEnd(page, 'B').textContent()];
    expect(originalEnds.join(' ')).toContain('Rectangle 1');
    expect(originalEnds.join(' ')).toContain('Rectangle 2');
});
