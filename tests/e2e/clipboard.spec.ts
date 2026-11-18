import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

type ScreenPoint = { x: number; y: number };

// How far, in screen px, a paste's mouse is from the copied shape.
const PASTE_OFFSET_PX = 150;

// Opens the editor with grid snapping off, so a paste lands exactly on the mouse.
async function openEditor(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();

    const snapping = page.locator('.top-bar').getByRole('button', { name: 'Grid snapping' });
    await snapping.click();
    await expect(snapping).toHaveAttribute('aria-pressed', 'false');
}

// The middle of the part no panel covers, inside the new level's empty camera frame.
async function levelMiddle(page: Page): Promise<ScreenPoint> {
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    return { x: free.x + free.width / 2, y: free.y + free.height / 2 };
}

// Key 4 picks the Shape tool, whose first kind is the rectangle, and a click places one, selected.
async function drawRectangle(page: Page, at: ScreenPoint) {
    await page.mouse.move(at.x, at.y);
    await page.keyboard.press('4');
    await page.mouse.click(at.x, at.y);
    await expect(rectangleRows(page)).not.toHaveCount(0);
}

function rectangleRows(page: Page) {
    return page.getByRole('tree', { name: 'Entities' }).getByRole('treeitem').filter({ hasText: 'Rectangle 1' });
}

function statusText(page: Page) {
    return page.locator('.status-bar .status-text');
}

// The selected entity's position, read from the Entity inspector's TransformComponent card.
async function selectedPosition(page: Page) {
    const transform = page
        .getByRole('region', { name: 'Entity inspector' })
        .locator('.entity-inspector-card[data-type="TransformComponent"]');
    const read = async (label: string) => {
        const text = await transform.getByRole('textbox', { name: label, exact: true }).inputValue();
        return Number(text.replace('−', '-'));
    };

    return { x: await read('Position X'), y: await read('Position Y') };
}

// Puts text on the browser's clipboard as a person would: typed into a text field, selected and copied
// with the keys, which a text field leaves to the browser. The field is then removed, and the level view
// gets the focus back with a click.
async function copyText(page: Page, text: string, focusBack: ScreenPoint) {
    await page.evaluate((value) => {
        const field = document.createElement('textarea');
        field.id = 'clipboard-source';
        field.value = value;
        document.body.append(field);
        field.focus();
        field.select();
    }, text);
    await page.keyboard.press('ControlOrMeta+c');
    await page.evaluate(() => document.getElementById('clipboard-source')?.remove());
    await page.mouse.click(focusBack.x, focusBack.y);
}

test('a copied shape pastes centred on the mouse, with the keys', async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);
    await drawRectangle(page, middle);
    const original = await selectedPosition(page);

    await page.keyboard.press('ControlOrMeta+c');
    await page.mouse.move(middle.x + PASTE_OFFSET_PX, middle.y);
    await page.keyboard.press('ControlOrMeta+v');

    await expect(rectangleRows(page)).toHaveCount(2);
    const pasted = await selectedPosition(page);
    expect(pasted.x).toBeGreaterThan(original.x);
    expect(pasted.y).toBeCloseTo(original.y, 0);

    // The copy stays on the clipboard, so a second paste on the other side adds a third.
    await page.mouse.move(middle.x - PASTE_OFFSET_PX, middle.y);
    await page.keyboard.press('ControlOrMeta+v');
    await expect(rectangleRows(page)).toHaveCount(3);
    expect((await selectedPosition(page)).x).toBeLessThan(original.x);
});

test('Ctrl+D duplicates a shape in place, and Ctrl+Z removes the copy', async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);
    await drawRectangle(page, middle);
    const original = await selectedPosition(page);

    await page.keyboard.press('ControlOrMeta+d');
    await expect(rectangleRows(page)).toHaveCount(2);
    await expect(rectangleRows(page).first()).toHaveAttribute('aria-selected', 'true');
    await expect(rectangleRows(page).last()).toHaveAttribute('aria-selected', 'false');
    expect(await selectedPosition(page)).toEqual(original);

    await page.keyboard.press('ControlOrMeta+z');
    await expect(rectangleRows(page)).toHaveCount(1);
});

test('Ctrl+X cuts a shape, Ctrl+Z brings it back, and the cut copy pastes', async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);
    await drawRectangle(page, middle);

    await page.keyboard.press('ControlOrMeta+x');
    await expect(rectangleRows(page)).toHaveCount(0);

    await page.keyboard.press('ControlOrMeta+z');
    await expect(rectangleRows(page)).toHaveCount(1);

    await page.mouse.move(middle.x + PASTE_OFFSET_PX, middle.y);
    await page.keyboard.press('ControlOrMeta+v');
    await expect(rectangleRows(page)).toHaveCount(2);
});

test('pasting plain text says Nothing to paste and adds nothing', async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);
    await drawRectangle(page, middle);

    await copyText(page, 'just some words', middle);
    await page.keyboard.press('ControlOrMeta+v');

    await expect(statusText(page)).toHaveText('Nothing to paste');
    await expect(rectangleRows(page)).toHaveCount(1);
});

test('pasting damaged tagged text is refused and changes nothing', async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);
    await drawRectangle(page, middle);

    // The game's tag and versions, but no entities and no box.
    await copyText(page, '{"engine-v3":"entities","formatVersion":1,"physicsVersion":1}', middle);
    await page.keyboard.press('ControlOrMeta+v');

    await expect(statusText(page)).toHaveText("The pasted entities can't be read: they are damaged");
    await expect(rectangleRows(page)).toHaveCount(1);

    // The paste made no step, so one undo removes the rectangle and nothing is left to undo.
    await page.keyboard.press('ControlOrMeta+z');
    await expect(rectangleRows(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Undo/ })).toHaveAttribute('aria-disabled', 'true');
});
