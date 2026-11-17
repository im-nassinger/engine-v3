import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Opens the editor and draws a crate with the Shape tool, which selects it with its ShapeComponent.
async function openEditorWithCrateSelected(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    await page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Shape' }).click();
    await page.getByRole('toolbar', { name: 'Tool options' }).getByRole('button', { name: 'Rectangle' }).click();
    await page.mouse.click(free.x + free.width / 2, free.y + free.height / 2);
    await expect(card(page, 'ShapeComponent')).toHaveCount(1);
}

function inspector(page: Page) {
    return page.getByRole('region', { name: 'Inspector' });
}

function card(page: Page, typeName: string) {
    return inspector(page).locator(`.inspector-card[data-type="${typeName}"]`);
}

async function addComponent(page: Page, typeName: string) {
    await inspector(page).getByRole('button', { name: 'Add Component' }).click();
    await inspector(page).getByRole('menuitem', { name: typeName, exact: true }).click();
    await expect(card(page, typeName)).toHaveCount(1);
}

function messagesCount(page: Page) {
    return page.getByRole('region', { name: 'Status bar' }).getByRole('button', { name: /^Editor messages/ });
}

test("a body on a shape shows the SurfaceComponent's note and the count, and its fix clears both", async ({ page }) => {
    await openEditorWithCrateSelected(page);
    await expect(messagesCount(page)).toHaveCount(0);

    await addComponent(page, 'BodyComponent');

    const note = card(page, 'BodyComponent').getByRole('note');
    await expect(note).toContainText('Needs a SurfaceComponent to collide.');
    await expect(messagesCount(page)).toHaveText('1 warning');

    await messagesCount(page).click();
    const listed = page.getByRole('menuitem', { name: 'Rectangle 1: Needs a SurfaceComponent to collide.' });
    await expect(listed).toBeVisible();
    await page.keyboard.press('Escape');

    await note.getByRole('button', { name: 'Add SurfaceComponent' }).click();

    await expect(card(page, 'SurfaceComponent')).toHaveCount(1);
    await expect(note).toHaveCount(0);
    await expect(messagesCount(page)).toHaveCount(0);
});

test('picking a message from the count selects its entity', async ({ page }) => {
    await openEditorWithCrateSelected(page);
    await addComponent(page, 'BodyComponent');

    await page.getByRole('tree', { name: 'Entities' }).getByRole('treeitem').filter({ hasText: 'World' }).click();
    await expect(card(page, 'BodyComponent')).toHaveCount(0);

    await messagesCount(page).click();
    await page.getByRole('menuitem', { name: 'Rectangle 1: Needs a SurfaceComponent to collide.' }).click();

    await expect(card(page, 'BodyComponent')).toHaveCount(1);
});

test('a typed Linear damping is one step, and Ctrl+Z puts it back', async ({ page }) => {
    await openEditorWithCrateSelected(page);
    await addComponent(page, 'BodyComponent');

    const damping = card(page, 'BodyComponent').getByRole('textbox', { name: 'Linear damping' });
    const before = await damping.inputValue();

    await damping.fill('2.5');
    await damping.press('Enter');
    await expect(damping).toHaveValue('2.5');

    await page.keyboard.press('Control+z');
    await expect(damping).toHaveValue(before);
});

test('Kind changes a rectangle to a circle in one step', async ({ page }) => {
    await openEditorWithCrateSelected(page);

    const kind = card(page, 'ShapeComponent').getByRole('button', { name: 'Kind' });
    await expect(kind).toHaveText('Rectangle');
    await expect(card(page, 'ShapeComponent').getByRole('textbox', { name: 'Radius' })).toHaveCount(0);

    await kind.click();
    await page.getByRole('menuitem', { name: 'Circle' }).click();

    await expect(kind).toHaveText('Circle');
    await expect(card(page, 'ShapeComponent').getByRole('textbox', { name: 'Radius' })).toHaveCount(1);

    await page.keyboard.press('Control+z');
    await expect(kind).toHaveText('Rectangle');
});
