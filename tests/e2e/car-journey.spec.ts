import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { unzipSync } from 'fflate';

// Journey 2 of testing.md: a car of a group, a body and two hinged wheels, exported, a new level, imported,
// and every entity and value back. Journeys 1, 3 and 4 are in test-play.spec.ts and saving.spec.ts.

type ScreenPoint = { x: number; y: number };
type ScreenBox = { readonly from: ScreenPoint; readonly to: ScreenPoint };

// The car's parts on screen, around the free area's middle: a chassis 240 by 60 px, and two wheels of
// 25 px whose middles are on its bottom edge, so a click just above a wheel's middle is on both.
const CHASSIS_HALF_WIDTH_PX = 120;
const CHASSIS_HALF_HEIGHT_PX = 30;
const WHEEL_RADIUS_PX = 25;
const WHEEL_APART_PX = 80;
const ABOVE_WHEEL_MIDDLE_PX = 10;
const PARTS = ['Rectangle 1', 'Circle 1', 'Circle 2', 'Hinge 1', 'Hinge 2'];
// Long enough for a save after the 2 s quiet delay, and for the slowest browser on CI.
const SAVE_TIMEOUT_MS = 15_000;

// Opens the editor with grid snapping off, so a dragged shape's size follows the mouse exactly.
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

// A shape dragged with the Shape tool, given a BodyComponent and, through the note's fix, a SurfaceComponent.
async function drawBody(page: Page, kind: 'Rectangle' | 'Circle', box: ScreenBox, name: string) {
    await page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Shape' }).click();
    await page.getByRole('group', { name: 'Kinds menu' }).getByRole('button', { name: kind }).click();
    await page.mouse.move(box.from.x, box.from.y);
    await page.mouse.down();
    await page.mouse.move((box.from.x + box.to.x) / 2, (box.from.y + box.to.y) / 2, { steps: 4 });
    await page.mouse.move(box.to.x, box.to.y, { steps: 4 });
    await page.mouse.up();
    await expect(rows(page, name)).toHaveAttribute('aria-selected', 'true');

    await entityInspector(page).getByRole('button', { name: 'Add Component' }).click();
    await entityInspector(page).getByRole('menuitem', { name: 'BodyComponent', exact: true }).click();
    await card(page, 'BodyComponent').getByRole('button', { name: 'Add Surface' }).click();
    await expect(card(page, 'SurfaceComponent')).toHaveCount(1);
}

// A Hinge where a wheel overlaps the chassis joins them, the smaller, the wheel, as A.
async function hingeWheel(page: Page, wheelMiddle: ScreenPoint, hinge: string, wheel: string) {
    await page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Joint' }).click();
    await page.getByRole('group', { name: 'Kinds menu' }).getByRole('button', { name: 'Hinge' }).click();
    const at = offset(wheelMiddle, 0, -ABOVE_WHEEL_MIDDLE_PX);
    await page.mouse.click(at.x, at.y);

    await expect(rows(page, hinge)).toHaveAttribute('aria-selected', 'true');
    const joint = card(page, 'JointComponent');
    await expect(joint.getByRole('button', { name: 'A', exact: true })).toContainText(wheel);
    await expect(joint.getByRole('button', { name: 'B', exact: true })).toContainText('Rectangle 1');
}

async function buildCar(page: Page) {
    const middle = await levelMiddle(page);
    await drawBody(
        page,
        'Rectangle',
        {
            from: offset(middle, -CHASSIS_HALF_WIDTH_PX, -CHASSIS_HALF_HEIGHT_PX),
            to: offset(middle, CHASSIS_HALF_WIDTH_PX, CHASSIS_HALF_HEIGHT_PX),
        },
        'Rectangle 1',
    );

    const wheels = [
        { middle: offset(middle, -WHEEL_APART_PX, CHASSIS_HALF_HEIGHT_PX), name: 'Circle 1', hinge: 'Hinge 1' },
        { middle: offset(middle, WHEEL_APART_PX, CHASSIS_HALF_HEIGHT_PX), name: 'Circle 2', hinge: 'Hinge 2' },
    ];
    for (const wheel of wheels) {
        const box = {
            from: offset(wheel.middle, -WHEEL_RADIUS_PX, -WHEEL_RADIUS_PX),
            to: offset(wheel.middle, WHEEL_RADIUS_PX, WHEEL_RADIUS_PX),
        };
        await drawBody(page, 'Circle', box, wheel.name);
    }
    for (const wheel of wheels) {
        await hingeWheel(page, wheel.middle, wheel.hinge, wheel.name);
    }

    // Select all skips the camera, so it selects the car's five parts.
    await page.mouse.move(middle.x, middle.y);
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('ControlOrMeta+g');
    await expect(rows(page, 'Group 1')).toHaveAttribute('aria-selected', 'true');
}

async function runFileCommand(page: Page, label: string) {
    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name: 'File', exact: true }).hover();
    await page.getByRole('menuitem', { name: new RegExp(`^${label}`) }).click();
}

async function answerReplace(page: Page) {
    const question = page.getByRole('dialog');
    await expect(question).toContainText('Replace the open level?');
    await question.getByRole('button', { name: 'Replace' }).click();
}

async function exportLevel(page: Page) {
    const downloading = page.waitForEvent('download');
    await runFileCommand(page, 'Export');
    const download = await downloading;

    return { name: download.suggestedFilename(), bytes: await readFile(await download.path()) };
}

// A drop, not Import's file dialog, as saving.spec.ts explains.
async function dropFile(page: Page, file: { name: string; bytes: Buffer }) {
    const transfer = await page.evaluateHandle(
        ({ name, base64 }) => {
            const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
            const dropped = new DataTransfer();
            dropped.items.add(new File([bytes], name));

            return dropped;
        },
        { name: file.name, base64: file.bytes.toString('base64') },
    );
    await page.dispatchEvent('.level-view-host', 'drop', { dataTransfer: transfer });
    await answerReplace(page);
}

function levelJsonOf(projectFile: Buffer): unknown {
    const files = unzipSync(new Uint8Array(projectFile));
    const levelJson = files['level.json'];
    if (!levelJson) throw new Error('The project file holds no level.json.');

    return JSON.parse(new TextDecoder().decode(levelJson));
}

test('journey 2: a car of a group, a body and two hinged wheels, exported and imported into a new level, is all back', async ({
    page,
}) => {
    test.setTimeout(60_000);
    await openEditor(page);
    await buildCar(page);
    const exported = await exportLevel(page);
    const before = levelJsonOf(exported.bytes);
    const beforeText = JSON.stringify(before);
    for (const part of [...PARTS, 'Group 1']) {
        expect(beforeText).toContain(`"${part}"`);
    }

    await runFileCommand(page, 'New');
    await answerReplace(page);
    await expect(rows(page, 'Group 1')).toHaveCount(0);
    await expect(rows(page, 'Rectangle 1')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save state: Saved' })).toBeVisible({ timeout: SAVE_TIMEOUT_MS });

    await dropFile(page, exported);
    await expect(page.getByRole('status').locator('.status-text')).toHaveText(`Imported ${exported.name}`);
    await expect(rows(page, 'Group 1')).toHaveCount(1);

    // Every entity and every value: the imported level writes the same level.json as the one exported.
    const reexported = await exportLevel(page);
    expect(levelJsonOf(reexported.bytes)).toEqual(before);

    // The hinges still join their wheels to the chassis, as the Entity inspector shows them.
    // The import may open the group folded.
    const unfold = rows(page, 'Group 1').getByRole('button', { name: 'Unfold' });
    if ((await unfold.count()) > 0) {
        await unfold.click();
    }
    for (const [hinge, wheel] of [
        ['Hinge 1', 'Circle 1'],
        ['Hinge 2', 'Circle 2'],
    ] as const) {
        await rows(page, hinge).click();
        const joint = card(page, 'JointComponent');
        await expect(joint.getByRole('button', { name: 'A', exact: true })).toContainText(wheel);
        await expect(joint.getByRole('button', { name: 'B', exact: true })).toContainText('Rectangle 1');
    }
});
