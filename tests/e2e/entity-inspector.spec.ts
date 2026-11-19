import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Opens the editor and draws a crate with the Shape tool, which selects it with its ShapeComponent.
async function openEditorWithCrateSelected(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    await page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Shape' }).click();
    await page.getByRole('group', { name: 'Kinds menu' }).getByRole('button', { name: 'Rectangle' }).click();
    await page.mouse.click(free.x + free.width / 2, free.y + free.height / 2);
    await expect(card(page, 'ShapeComponent')).toHaveCount(1);
}

function entityInspector(page: Page) {
    return page.getByRole('region', { name: 'Entity inspector' });
}

function card(page: Page, typeName: string) {
    return entityInspector(page).locator(`.entity-inspector-card[data-type="${typeName}"]`);
}

async function addComponent(page: Page, typeName: string) {
    await entityInspector(page).getByRole('button', { name: 'Add Component' }).click();
    await entityInspector(page).getByRole('menuitem', { name: typeName, exact: true }).click();
    await expect(card(page, typeName)).toHaveCount(1);
}

test("a body on a shape shows the SurfaceComponent's note, and its fix clears it", async ({ page }) => {
    await openEditorWithCrateSelected(page);

    await addComponent(page, 'BodyComponent');

    const note = card(page, 'BodyComponent').getByRole('note');
    await expect(note).toContainText('Needs a Surface to collide.');

    await note.getByRole('button', { name: 'Add Surface' }).click();

    await expect(card(page, 'SurfaceComponent')).toHaveCount(1);
    await expect(note).toHaveCount(0);
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
