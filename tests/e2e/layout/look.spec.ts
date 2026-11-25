import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const ISLANDS = ['Main menu', 'Tools', 'Entity inspector', 'Entities viewer', 'Minimap', 'Debug box'];
// Too long for the vector box's unit beside it in the 360 px Entity inspector.
const LONG_POSITION = '-123456.25';
const SHORT_POSITION = '20';

async function openEditor(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();
}

function entityInspector(page: Page) {
    return page.getByRole('region', { name: 'Entity inspector' });
}

async function drawRectangle(page: Page) {
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    await page.keyboard.press('2');
    await page.mouse.click(free.x + free.width / 2, free.y + free.height / 2);
    await expect(entityInspector(page).getByRole('textbox', { name: 'Position X' })).toBeVisible();
}

async function typeInto(field: Locator, text: string) {
    await field.fill(text);
    await field.press('Enter');
}

// The labels of the Entity inspector's text boxes whose text is wider than the box.
function cutOffFields(page: Page) {
    return entityInspector(page)
        .locator('input:not([type="checkbox"], [type="color"])')
        .evaluateAll((inputs: HTMLInputElement[]) =>
            inputs
                .filter((input) => input.scrollWidth > input.clientWidth)
                .map((input) => input.getAttribute('aria-label')),
        );
}

test("the Entity inspector's fields show their whole values", async ({ page }) => {
    await openEditor(page);
    await drawRectangle(page);
    await typeInto(entityInspector(page).getByRole('textbox', { name: 'Position X' }), LONG_POSITION);
    await expect(entityInspector(page).getByRole('textbox', { name: 'Position X' })).toHaveValue(LONG_POSITION);
    expect(await cutOffFields(page)).toEqual([]);

    await page.getByRole('tree', { name: 'Entities' }).getByRole('treeitem').filter({ hasText: 'World' }).click();
    await expect(entityInspector(page).getByRole('textbox', { name: 'Gravity Y' })).toBeVisible();
    expect(await cutOffFields(page)).toEqual([]);
});

test("a vector's unit stays while it fits, and gives way to a long value", async ({ page }) => {
    await openEditor(page);
    await drawRectangle(page);
    const field = entityInspector(page).getByRole('textbox', { name: 'Position X' });
    const unitIsOnTheValuesLine = () =>
        field.evaluate((input) => {
            const unit = input.parentElement?.querySelector<HTMLElement>('.unit');
            if (!unit) throw new Error('The box has no unit.');

            return unit.getBoundingClientRect().top < input.getBoundingClientRect().bottom;
        });

    await typeInto(field, SHORT_POSITION);
    await expect(field).toHaveValue(SHORT_POSITION);
    expect(await unitIsOnTheValuesLine()).toBe(true);

    await typeInto(field, LONG_POSITION);
    await expect(field).toHaveValue(LONG_POSITION);
    expect(await unitIsOnTheValuesLine()).toBe(false);
});

test('nothing in an island has a border', async ({ page }) => {
    await openEditor(page);
    await drawRectangle(page);

    for (const name of ISLANDS) {
        const bordered = await page.getByRole('region', { name }).evaluate((island) =>
            [island, ...island.querySelectorAll('*')]
                .filter((element) => !element.closest('svg'))
                .filter((element) => {
                    const style = getComputedStyle(element);
                    return ['Top', 'Right', 'Bottom', 'Left'].some(
                        (side) => style.getPropertyValue(`border-${side.toLowerCase()}-width`) !== '0px',
                    );
                })
                .map((element) => `${element.tagName.toLowerCase()}.${element.className}`),
        );

        expect(bordered, name).toEqual([]);
    }
});
