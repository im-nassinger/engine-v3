import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// v3's journeys (testing.md, journeys 9 to 11): a trigger drawn with the Trigger tool that wins when a
// tagged ball falls into it, then Restart and Leave; a key trigger adding to a body's velocity; the World's variables
// and inputs edited, saved and read back after a reload.

type ScreenPoint = { x: number; y: number };

// A drawn shape's default fill, from styleSchema.ts.
const SHAPE_FILL = { r: 0x4a, g: 0x90, b: 0xd9 };
// The grid is drawn over the level, faintly, and the edges are smoothed, so a colour may move a little.
const COLOUR_TOLERANCE = 24;
// The box is 100 px, about 67 px on screen.
const BOX_RUN_PX = 30;
// Where the ball is placed above the free area's middle, and the trigger's box under it, on screen.
const BALL_ABOVE_PX = 150;
const TRIGGER_HALF_WIDTH_PX = 120;
const TRIGGER_TOP_BELOW_PX = 40;
const TRIGGER_BOTTOM_BELOW_PX = 120;
// The pushed box starts at the camera's middle, so it stays in view falling and rising. Its Linear damping
// makes it fall slowly, about 80 px a second on screen, and the 1,200 px/s up added to its velocity moves it about 300 px up, 200 px on screen, before damping stops it: still plain to see after Chromium's
// column screenshots, which take about 0.5 s each.
const LINEAR_DAMPING = '4';
const KICK_Y = '-1200';
const RISE_SEEN_PX = 20;
// The box falls at about 80 px a second on screen; the editor's view giving way to play's moves it much more.
const SLOW_FALL_MOST_PX_PER_S = 300;
// During play the box is looked at in a column this far right of the view's middle, off the level's y axis.
const OFF_AXIS_PX = 15;
// Long enough for a save after the 2 s quiet delay, and for the slowest browser on CI.
const SAVE_TIMEOUT_MS = 15_000;
const SAVED_TITLE = 'Untitled level - engine-v3';
// Long enough for a ball to fall into the trigger, and for the slowest browser on CI.
const END_TIMEOUT_MS = 15_000;

async function openEditor(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();
}

async function levelMiddle(page: Page): Promise<ScreenPoint> {
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    return { x: free.x + free.width / 2, y: free.y + free.height / 2 };
}

function entityInspector(page: Page) {
    return page.getByRole('region', { name: 'Entity inspector' });
}

function card(page: Page, typeName: string) {
    return entityInspector(page).locator(`.entity-inspector-card[data-type="${typeName}"]`);
}

function entityRow(page: Page, name: string) {
    return page
        .getByRole('tree', { name: 'Entities' })
        .getByRole('treeitem')
        .filter({ has: page.locator('.name', { hasText: name }) });
}

async function addComponent(page: Page, typeName: string) {
    await entityInspector(page).getByRole('button', { name: 'Add Component' }).click();
    await entityInspector(page).getByRole('menuitem', { name: typeName, exact: true }).click();
    await expect(card(page, typeName)).toHaveCount(1);
}

function tool(page: Page, name: string) {
    return page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name, exact: true });
}

function playBar(page: Page) {
    return page.getByRole('toolbar', { name: 'Play bar' });
}

async function play(page: Page) {
    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name: /^Play/ }).click();
    await expect(playBar(page)).toHaveAttribute('data-state', 'playing');
}

// The trigger card's first block, and its words and rows.
function triggerBlock(page: Page) {
    return card(page, 'TriggerComponent').locator('.trigger-block').first();
}

function triggerSection(page: Page, title: string) {
    return triggerBlock(page).locator(`.trigger-section[data-section="${title}"]`);
}

function triggerWord(page: Page, title: string, text: string) {
    return triggerSection(page, title).locator('.trigger-slot-word', { hasText: new RegExp(`^${text}$`) });
}

async function pick(page: Page, opener: ReturnType<Page['locator']>, label: string) {
    await opener.click();
    await menuItem(page, label).click();
    await expect(page.locator('.menu')).toHaveCount(0);
}

// A menu's item by its label alone, not the line under it.
function menuItem(page: Page, label: string) {
    const exactLabel = new RegExp(`^${label}$`);

    return page.locator('.menu [role="menuitem"]').filter({
        has: page.locator('.label:not(:has(span)), .label > span:first-child', { hasText: exactLabel }),
    });
}

async function addTriggerRow(page: Page, label: 'Add check' | 'Add action', kind: string) {
    await pick(page, triggerBlock(page).getByRole('button', { name: label }), kind);
}

// Each row's words joined by spaces, as the card reads: its text runs them together.
function sentences(page: Page, title: string) {
    return triggerSection(page, title)
        .locator('.trigger-sentence-row')
        .evaluateAll((rows) =>
            rows.map((row) =>
                [...row.querySelectorAll('.text, .trigger-slot-word')].map((word) => word.textContent).join(' '),
            ),
        );
}

async function expectSentences(page: Page, title: string, expected: readonly string[]) {
    await expect.poll(() => sentences(page, title)).toEqual(expected);
}

async function addTag(page: Page, tag: string) {
    await addComponent(page, 'TagsComponent');
    const box = card(page, 'TagsComponent').getByRole('textbox', { name: 'Tags' });
    await box.fill(tag);
    await box.press('Enter');
    await expect(card(page, 'TagsComponent')).toContainText(tag);
}

// A click with the Shape tool places the kind's default shape there, selected; it gets a Dynamic body
// and a SurfaceComponent.
async function placeBody(page: Page, kind: 'Rectangle' | 'Circle', at: ScreenPoint) {
    await tool(page, 'Shape').click();
    await page.getByRole('group', { name: 'Kinds menu' }).getByRole('button', { name: kind }).click();
    await page.mouse.click(at.x, at.y);
    await expect(card(page, 'ShapeComponent')).toHaveCount(1);

    await addComponent(page, 'BodyComponent');
    await expect(card(page, 'BodyComponent').getByRole('button', { name: 'Type' })).toHaveText('Dynamic');
    await card(page, 'BodyComponent').getByRole('button', { name: 'Add Surface' }).click();
    await expect(card(page, 'SurfaceComponent')).toHaveCount(1);
}

// Where the box's fill starts, going down the screen's column at x, read from a screenshot of that column
// alone, as test-play.spec.ts reads it: a WebGL canvas can't be read back after it is shown. Only a run of
// BOX_RUN_PX pixels of the fill counts, since a button's blue at the top of the page is close to it.
async function boxTopAt(page: Page, x: number): Promise<number | undefined> {
    const height = page.viewportSize()?.height;
    if (height === undefined) throw new Error('The page has no viewport.');
    const png = await page.screenshot({ scale: 'css', clip: { x: Math.round(x), y: 0, width: 1, height } });

    return page.evaluate(
        async ({ base64, fill, tolerance, run }) => {
            const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
            const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
            const reader = new OffscreenCanvas(image.width, image.height).getContext('2d');
            if (!reader) throw new Error('No 2D context to read the screenshot.');

            reader.drawImage(image, 0, 0);
            const column = reader.getImageData(0, 0, 1, image.height).data;
            let runStart = 0;
            for (let y = 0; y < image.height; y++) {
                const redClose = Math.abs((column[4 * y] ?? 0) - fill.r) <= tolerance;
                const greenClose = Math.abs((column[4 * y + 1] ?? 0) - fill.g) <= tolerance;
                const blueClose = Math.abs((column[4 * y + 2] ?? 0) - fill.b) <= tolerance;
                if (!(redClose && greenClose && blueClose)) {
                    runStart = y + 1;
                } else if (y - runStart + 1 >= run) {
                    return runStart;
                }
            }

            return undefined;
        },
        { base64: png.toString('base64'), fill: SHAPE_FILL, tolerance: COLOUR_TOLERANCE, run: BOX_RUN_PX },
    );
}

async function shownBoxTop(page: Page, x: number) {
    let top: number | undefined;
    await expect
        .poll(
            async () => {
                top = await boxTopAt(page, x);
                return top !== undefined;
            },
            { intervals: [50] },
        )
        .toBe(true);
    if (top === undefined) throw new Error(`The box isn't drawn at x ${x}.`);

    return top;
}

// The box's top once it is seen falling slowly: two looks in a row, the second lower by less than
// SLOW_FALL_MOST_PX_PER_S. The first frames of play may still show the editor's view, where the box is
// drawn elsewhere. A look takes up to a second on a busy computer, so the speed is per second, not per look.
async function fallingBoxTop(page: Page, x: number) {
    let before = await shownBoxTop(page, x);
    let lookedAt = Date.now();
    for (;;) {
        const after = await shownBoxTop(page, x);
        const now = Date.now();
        const speed = ((after - before) * 1000) / Math.max(1, now - lookedAt);
        if (after > before && speed < SLOW_FALL_MOST_PX_PER_S) return after;

        before = after;
        lookedAt = now;
    }
}

async function playColumn(page: Page) {
    const view = await page.locator('.level-view-host canvas').boundingBox();
    if (!view) throw new Error('The level view has no size.');

    return view.x + view.width / 2 + OFF_AXIS_PX;
}

test('a trigger drawn with the Trigger tool wins when a tagged ball falls into it, then Restart and Leave', async ({
    page,
}) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openEditor(page);
    const middle = await levelMiddle(page);

    await placeBody(page, 'Circle', { x: middle.x, y: middle.y - BALL_ABOVE_PX });
    await addTag(page, 'player');

    // The Trigger tool drags a rectangle under the ball: a touch trigger and no Surface, so the ball falls
    // through it, selected.
    await tool(page, 'Trigger').click();
    await page.mouse.move(middle.x - TRIGGER_HALF_WIDTH_PX, middle.y + TRIGGER_TOP_BELOW_PX);
    await page.mouse.down();
    await page.mouse.move(middle.x, middle.y + TRIGGER_BOTTOM_BELOW_PX, { steps: 4 });
    await page.mouse.move(middle.x + TRIGGER_HALF_WIDTH_PX, middle.y + TRIGGER_BOTTOM_BELOW_PX, { steps: 4 });
    await page.mouse.up();
    await expect(entityRow(page, 'Trigger 1')).toHaveAttribute('aria-selected', 'true');
    await expect(tool(page, 'Select')).toHaveAttribute('aria-pressed', 'true');
    await expect(card(page, 'SurfaceComponent')).toHaveCount(0);
    await expectSentences(page, 'When', ['something starts touching this']);

    await addTriggerRow(page, 'Add check', 'a value');
    await triggerWord(page, 'If', 'pick a value').click();
    await menuItem(page, 'Tags').first().click();
    await menuItem(page, 'Tags').last().click();
    await expect(page.locator('.menu')).toHaveCount(0);
    await pick(page, triggerWord(page, 'If', 'pick a tag'), 'player');
    await expectSentences(page, 'If', ['other has the tag player']);
    await addTriggerRow(page, 'Add action', 'win');
    await expectSentences(page, 'Do', ['win']);
    await expect(triggerBlock(page).locator('.card-note-box')).toHaveCount(0);

    await play(page);
    const endWindow = page.getByRole('dialog', { name: 'Level won' });
    await expect(endWindow).toBeVisible({ timeout: END_TIMEOUT_MS });
    await expect(playBar(page)).toHaveAttribute('data-state', 'ended');
    await expect(endWindow).toContainText(/Time \d+:\d\d\.\d\d/);

    // Restart plays the level again from its start, so the ball falls in again and the level is won again.
    await endWindow.getByRole('button', { name: 'Restart' }).click();
    await expect(endWindow).toBeHidden();
    await expect(playBar(page)).toHaveAttribute('data-state', 'playing');
    await expect(endWindow).toBeVisible({ timeout: END_TIMEOUT_MS });

    await endWindow.getByRole('button', { name: 'Leave' }).click();
    await expect(endWindow).toBeHidden();
    await expect(playBar(page)).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Main menu' })).toBeVisible();
    await expect(entityRow(page, 'Trigger 1')).toHaveCount(1);
    expect(errors).toEqual([]);
});

test("a key trigger adds to its body's velocity, sending it up, when the key is pressed during play", async ({
    page,
}) => {
    await openEditor(page);
    const middle = await levelMiddle(page);
    await placeBody(page, 'Rectangle', middle);
    const damping = card(page, 'BodyComponent').getByRole('textbox', { name: 'Linear damping' });
    await damping.fill(LINEAR_DAMPING);
    await damping.press('Enter');
    await expect(damping).toHaveValue(LINEAR_DAMPING);

    await addComponent(page, 'TriggerComponent');
    await card(page, 'TriggerComponent').getByRole('button', { name: 'Add trigger' }).click();
    await pick(page, triggerWord(page, 'When', 'pick an event'), 'a key or input is pressed, released or held');
    await pick(page, triggerWord(page, 'When', 'pick a key'), 'Space');
    await expectSentences(page, 'When', ['the key Space is pressed']);
    await addTriggerRow(page, 'Add action', 'change a value');
    await triggerWord(page, 'Do', 'pick a value').click();
    await menuItem(page, 'Body').click();
    await menuItem(page, 'Velocity').click();
    await expect(page.locator('.menu')).toHaveCount(0);
    await triggerWord(page, 'Do', 'a value').click();
    const kickX = page.getByRole('textbox', { name: 'X', exact: true });
    await kickX.fill('0');
    const kickY = page.getByRole('textbox', { name: 'Y', exact: true });
    await kickY.fill(KICK_Y);
    await kickY.press('Enter');
    await expectSentences(page, 'Do', [`add 0, ${KICK_Y} to this Body › Velocity`]);
    await expect(triggerBlock(page).locator('.card-note-box')).toHaveCount(0);

    await play(page);
    const column = await playColumn(page);
    const beforeKick = await fallingBoxTop(page, column);

    await page.keyboard.press('Space');
    await expect.poll(() => shownBoxTop(page, column), { intervals: [50] }).toBeLessThan(beforeKick - RISE_SEEN_PX);
    await expect(playBar(page)).toHaveAttribute('data-state', 'playing');
});

test("the World's variables and inputs are edited, saved and read back after a reload", async ({ page }) => {
    await openEditor(page);
    await entityRow(page, 'World').click();

    await addComponent(page, 'VariablesComponent');
    const variables = card(page, 'VariablesComponent');
    await variables.getByRole('button', { name: 'Add variable' }).click();
    const name = variables.getByRole('textbox', { name: 'Name of variable_1' });
    await name.fill('coins');
    await name.press('Enter');
    const start = variables.getByRole('textbox', { name: 'coins', exact: true });
    await start.fill('3');
    await start.press('Enter');
    await expect(start).toHaveValue('3');

    const inputs = card(page, 'InputComponent');
    const upName = inputs.getByRole('textbox', { name: 'Name of up' });
    await upName.fill('climb');
    await upName.press('Enter');
    await expect(inputs.getByRole('textbox', { name: 'Name of climb' })).toHaveValue('climb');
    // The keys pill listens once clicked; leaving it makes the keys pressed the input's.
    const jumpKeys = inputs.getByRole('textbox', { name: 'Keys of jump' });
    await jumpKeys.click();
    await page.keyboard.press('KeyK');
    await page.keyboard.press('Enter');
    await jumpKeys.blur();
    await expect(jumpKeys).toHaveValue('K, Enter');

    await expect(page).toHaveTitle(SAVED_TITLE, { timeout: SAVE_TIMEOUT_MS });
    await page.reload();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();
    await entityRow(page, 'World').click();

    const readBack = card(page, 'VariablesComponent');
    await expect(readBack.getByRole('textbox', { name: 'Name of coins' })).toHaveValue('coins');
    await expect(readBack.getByRole('textbox', { name: 'coins', exact: true })).toHaveValue('3');
    const readInputs = card(page, 'InputComponent');
    await expect(readInputs.getByRole('textbox', { name: 'Name of climb' })).toHaveValue('climb');
    await expect(readInputs.getByRole('textbox', { name: 'Name of up' })).toHaveCount(0);
    await expect(readInputs.getByRole('textbox', { name: 'Keys of jump' })).toHaveValue('K, Enter');
});
