import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

type ScreenPoint = { x: number; y: number };

const PENCIL_HINT = 'Drag to draw. End near the start to close.';
const SMOOTHNESSES = ['Low', 'Medium', 'High'] as const;

async function openEditor(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();
}

// The middle of the part no panel covers. A new level's camera frame is fitted around it, and the
// inside of the frame is empty.
async function levelMiddle(page: Page): Promise<ScreenPoint> {
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    return { x: free.x + free.width / 2, y: free.y + free.height / 2 };
}

// A slightly wobbly circle around centre, from the angle 0 round to `turn` of a full turn, as a hand
// draws one.
function wobblyArc(centre: ScreenPoint, radius: number, turn: number): ScreenPoint[] {
    const steps = Math.round(turn * 120);
    const points: ScreenPoint[] = [];
    for (let step = 0; step <= steps; step++) {
        const angle = (step / 120) * 2 * Math.PI;
        const wobble = 4 * Math.sin(step / 5);
        points.push({
            x: centre.x + (radius + wobble) * Math.cos(angle),
            y: centre.y + (radius + wobble) * Math.sin(angle),
        });
    }

    return points;
}

async function stroke(page: Page, points: readonly ScreenPoint[]) {
    const [first] = points;
    if (first === undefined) throw new Error('A stroke needs points.');

    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (const point of points.slice(1)) {
        await page.mouse.move(point.x, point.y);
    }
    await page.mouse.up();
}

async function click(page: Page, at: ScreenPoint) {
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.up();
}

function toolButton(page: Page, name: string) {
    return page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name, exact: true });
}

function smoothness(page: Page, name: string) {
    return page.getByRole('group', { name: 'Kinds menu' }).getByRole('button', { name, exact: true });
}

function entityRow(page: Page, name: string) {
    return page.getByRole('tree', { name: 'Entities' }).getByRole('treeitem').filter({ hasText: name });
}

function entityInspector(page: Page) {
    return page.getByRole('region', { name: 'Entity inspector' });
}

function pointCount(page: Page) {
    return entityInspector(page).locator('.entity-inspector-card[data-type="PathComponent"] .path-points-field .count');
}

async function pointsOf(page: Page) {
    return Number(await pointCount(page).textContent());
}

test('key 5 picks the Pencil, which hides the Entity inspector, shows its hint and its smoothness on Medium', async ({
    page,
}) => {
    await openEditor(page);
    const middle = await levelMiddle(page);

    await page.mouse.move(middle.x, middle.y);
    await page.keyboard.press('5');

    await expect(toolButton(page, 'Pencil')).toHaveAttribute('aria-pressed', 'true');
    await expect(entityInspector(page)).toHaveCount(0);
    await expect(page.locator('.message-pill .message')).toHaveText(PENCIL_HINT);
    await expect(smoothness(page, 'Medium')).toHaveAttribute('aria-pressed', 'true');
});

for (const chosen of SMOOTHNESSES) {
    test(`at ${chosen} smoothness, a stroke ending near its start closes and one that doesn't stays open`, async ({
        page,
    }) => {
        // About 180 mouse moves take some 10 s here and can pass 30 s on CI's slower machines.
        test.slow();
        await openEditor(page);
        const middle = await levelMiddle(page);

        await toolButton(page, 'Pencil').click();
        await smoothness(page, chosen).click();
        await expect(smoothness(page, chosen)).toHaveAttribute('aria-pressed', 'true');

        // Round to 99% of a turn, so the release is about 8 px from the press: the path closes.
        await stroke(page, wobblyArc(middle, 120, 0.99));
        await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'true');
        await expect(toolButton(page, 'Select')).toHaveAttribute('aria-pressed', 'true');
        const closedPoints = await pointsOf(page);
        expect(closedPoints).toBeGreaterThanOrEqual(3);
        expect(closedPoints).toBeLessThan(60);

        // Closed, the path is filled, so a click inside it selects it.
        await click(page, { x: middle.x + 300, y: middle.y - 200 });
        await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'false');
        await click(page, middle);
        await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'true');

        // Half a turn ends far from its start: the path stays open, with nothing filled inside it.
        await page.keyboard.press('5');
        await expect(smoothness(page, chosen)).toHaveAttribute('aria-pressed', 'true');
        const inner = { x: middle.x, y: middle.y + 10 };
        await stroke(page, wobblyArc(inner, 60, 0.5));
        await expect(entityRow(page, 'Path 2')).toHaveAttribute('aria-selected', 'true');
        expect(await pointsOf(page)).toBeGreaterThanOrEqual(2);

        // A click inside the half circle, on Path 1's fill, selects Path 1, since the open Path 2 has none.
        await click(page, { x: inner.x, y: inner.y + 30 });
        await expect(entityRow(page, 'Path 1')).toHaveAttribute('aria-selected', 'true');
    });
}

test('Esc during a stroke drops it', async ({ page }) => {
    await openEditor(page);
    const middle = await levelMiddle(page);
    const points = wobblyArc(middle, 100, 0.5);
    const [first] = points;
    const last = points.at(-1);
    if (first === undefined || last === undefined) throw new Error('No stroke.');

    await page.keyboard.press('5');
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (const point of points.slice(1)) {
        await page.mouse.move(point.x, point.y);
    }
    await page.keyboard.press('Escape');
    await page.mouse.up();

    await expect(toolButton(page, 'Pencil')).toHaveAttribute('aria-pressed', 'true');
    await expect(entityRow(page, 'Path 1')).toHaveCount(0);
});
