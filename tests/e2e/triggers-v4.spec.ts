import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

// v4's journeys (versions/v4/architecture.md#tests, testing.md journeys 12 to 14): a button firing `open`
// on a door, which waits 2 s and flips its own `door_open`, winning when it becomes true; a ball hitting a
// wall that is destroyed and adds 1 to the level's `score`, "When score becomes 3 or more" winning; and a
// boolean and a string variable on an entity edited, saved and read back after a reload. The shortcut
// sheet's journey is in shortcut-sheet.spec.ts.

type ScreenPoint = { x: number; y: number };

// Where the ball is placed above the free area's middle, and the button's box or the wall under it, on screen.
const BALL_ABOVE_PX = 150;
const BUTTON_HALF_WIDTH_PX = 120;
const BUTTON_TOP_BELOW_PX = 40;
const BUTTON_BOTTOM_BELOW_PX = 120;
const WALL_BELOW_PX = 60;
// The door stands to the right of the button, clear of it and of the ball.
const DOOR_RIGHT_PX = 220;
const DOOR_WAIT_S = 2;
// The ball reaches the button within a second; the rest of this is room for a slow browser on CI.
const DOOR_WIN_LATEST_S = 6;
// The level's score starts here, so the one wall's hit makes it 3.
const SCORE_START = 2;
// Long enough for a ball to fall, a 2 s wait, and the slowest browser on CI.
const END_TIMEOUT_MS = 20_000;
// Long enough for a save after the 2 s quiet delay, and for the slowest browser on CI.
const SAVE_TIMEOUT_MS = 15_000;
const SAVED_TITLE = 'Untitled level - engine-v3';

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
        .filter({ has: page.locator('.name', { hasText: new RegExp(`^${name}$`) }) });
}

async function addComponent(page: Page, typeName: string) {
    await entityInspector(page).getByRole('button', { name: 'Add Component' }).click();
    await entityInspector(page).getByRole('menuitem', { name: typeName, exact: true }).click();
    await expect(card(page, typeName)).toHaveCount(1);
}

function tool(page: Page, name: string) {
    return page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name, exact: true });
}

async function play(page: Page) {
    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name: /^Play/ }).click();
    await expect(page.getByRole('toolbar', { name: 'Play bar' })).toHaveAttribute('data-state', 'playing');
}

async function rename(page: Page, from: string, to: string) {
    await entityRow(page, from).click();
    await page.keyboard.press('F2');
    await page.keyboard.type(to);
    await page.keyboard.press('Enter');
    await expect(entityRow(page, to)).toHaveAttribute('aria-selected', 'true');
}

// A click with the Shape tool places the kind's default shape there, selected.
async function placeShape(page: Page, kind: 'Rectangle' | 'Circle', at: ScreenPoint) {
    await tool(page, 'Shape').click();
    await page.getByRole('group', { name: 'Kinds menu' }).getByRole('button', { name: kind }).click();
    await page.mouse.click(at.x, at.y);
    await expect(card(page, 'ShapeComponent')).toHaveCount(1);
}

// A Dynamic ball with a SurfaceComponent, placed above the free area's middle.
async function placeBall(page: Page, middle: ScreenPoint) {
    await placeShape(page, 'Circle', { x: middle.x, y: middle.y - BALL_ABOVE_PX });
    await addComponent(page, 'BodyComponent');
    await expect(card(page, 'BodyComponent').getByRole('button', { name: 'Type' })).toHaveText('Dynamic');
    await card(page, 'BodyComponent').getByRole('button', { name: 'Add Surface' }).click();
    await expect(card(page, 'SurfaceComponent')).toHaveCount(1);
}

// The trigger card's blocks, one per trigger, and a block's sections and words.
function triggerBlock(page: Page, index: number) {
    return card(page, 'TriggerComponent').locator('.trigger-block').nth(index);
}

function triggerSection(block: Locator, title: string) {
    return block.locator(`.trigger-section[data-section="${title}"]`);
}

function triggerWord(block: Locator, title: string, text: string) {
    return triggerSection(block, title).locator('.trigger-slot-word', { hasText: new RegExp(`^${text}$`) });
}

// A menu item by its label alone: an item may carry a faint note after it, such as a variable's type.
async function pick(page: Page, opener: Locator, label: string) {
    await opener.click();
    await menuItem(page, label).click();
    await expect(page.locator('.menu, .entity-picker')).toHaveCount(0);
}

// A menu's item, or one above the entity picker's tree, by its label and not the line under it.
function menuItem(page: Page, label: string) {
    const exactLabel = new RegExp(`^${label}$`);

    return page.locator('.menu [role="menuitem"], .entity-picker [role="menuitem"]').filter({
        has: page.locator('.label:not(:has(span)), .label > span:first-child', { hasText: exactLabel }),
    });
}

// A value in the value menu, inside its component's submenu.
async function pickValue(page: Page, opener: Locator, component: string, value: string) {
    await opener.click();
    await menuItem(page, component).click();
    await menuItem(page, value).click();
    await expect(page.locator('.menu')).toHaveCount(0);
}

// An entity in the entity picker's tree.
async function pickEntity(page: Page, opener: Locator, name: string) {
    await opener.click();
    await page
        .locator('.entity-picker [role="treeitem"]')
        .filter({ hasText: new RegExp(`^${name}$`) })
        .click();
    await expect(page.locator('.entity-picker')).toHaveCount(0);
}

// A word that asks for a number, a name or a text opens a small field; Enter types the value in.
async function typeIntoField(page: Page, value: string) {
    const field = page.getByRole('textbox', { name: 'Value', exact: true });
    await field.fill(value);
    await field.press('Enter');
    await expect(field).toHaveCount(0);
}

async function typeWord(page: Page, block: Locator, title: string, text: string, value: string) {
    await triggerWord(block, title, text).click();
    await typeIntoField(page, value);
}

// A trigger added to the selected entity, its card added first when it has none; returns its block.
async function addTrigger(page: Page, event: string) {
    if ((await card(page, 'TriggerComponent').count()) === 0) {
        await addComponent(page, 'TriggerComponent');
    }
    const index = await card(page, 'TriggerComponent').locator('.trigger-block').count();
    await card(page, 'TriggerComponent').getByRole('button', { name: 'Add trigger' }).click();
    const block = triggerBlock(page, index);
    await pick(page, triggerWord(block, 'When', 'pick an event'), event);

    return block;
}

async function addAction(page: Page, block: Locator, kind: string) {
    await pick(page, block.getByRole('button', { name: 'Add action' }), kind);
}

// Each row's words joined by spaces, as the card reads: its text runs them together.
function sentences(block: Locator, title: string) {
    return triggerSection(block, title)
        .locator('.trigger-sentence-row')
        .evaluateAll((rows) =>
            rows.map((row) =>
                [...row.querySelectorAll('.text, .trigger-slot-word')].map((word) => word.textContent).join(' '),
            ),
        );
}

async function expectSentences(block: Locator, title: string, expected: readonly string[]) {
    await expect.poll(() => sentences(block, title)).toEqual(expected);
    await expect(block.locator('.card-note-box')).toHaveCount(0);
}

// The selected entity's Variables card, a variable added and named: the new one is `variable_1`.
async function addVariable(page: Page, name: string) {
    if ((await card(page, 'VariablesComponent').count()) === 0) {
        await addComponent(page, 'VariablesComponent');
    }
    const variables = card(page, 'VariablesComponent');
    await variables.getByRole('button', { name: 'Add variable' }).click();
    const nameBox = variables.getByRole('textbox', { name: 'Name of variable_1' });
    await nameBox.fill(name);
    await nameBox.press('Enter');
    await expect(variables.getByRole('textbox', { name: `Name of ${name}` })).toHaveValue(name);
}

async function pickVariableType(page: Page, name: string, type: 'Number' | 'String' | 'Boolean') {
    await card(page, 'VariablesComponent')
        .getByRole('button', { name: `Type of ${name}` })
        .click();
    await page.locator('.menu').getByText(type, { exact: true }).click();
    await expect(card(page, 'VariablesComponent').getByRole('button', { name: `Type of ${name}` })).toHaveText(type);
}

// The end window's time, "Time 0:02.03", in seconds.
async function wonAfterSeconds(page: Page) {
    const endWindow = page.getByRole('dialog', { name: 'Level won' });
    await expect(endWindow).toBeVisible({ timeout: END_TIMEOUT_MS });
    const text = await endWindow.textContent();
    const time = /Time (\d+):(\d\d\.\d\d)/.exec(text ?? '');
    if (!time) throw new Error(`The end window shows no time: ${text}`);

    return Number(time[1]) * 60 + Number(time[2]);
}

test('a button fires open on a door, which waits 2 s and flips door_open, and its becoming true wins', async ({
    page,
}) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openEditor(page);
    const middle = await levelMiddle(page);
    await placeBall(page, middle);

    // The door: its own boolean door_open, off, and two triggers.
    await placeShape(page, 'Rectangle', { x: middle.x + DOOR_RIGHT_PX, y: middle.y });
    await rename(page, 'Rectangle 1', 'Door');
    await addVariable(page, 'door_open');
    await pickVariableType(page, 'door_open', 'Boolean');
    await expect(card(page, 'VariablesComponent').getByRole('checkbox', { name: 'door_open' })).not.toBeChecked();

    const opens = await addTrigger(page, 'this gets a custom event');
    await pick(page, triggerWord(opens, 'When', 'pick a name'), 'New name…');
    await typeIntoField(page, 'open');
    await addAction(page, opens, 'wait');
    await typeWord(page, opens, 'Do', 'how long', String(DOOR_WAIT_S));
    await addAction(page, opens, 'change a value');
    await pickValue(page, triggerWord(opens, 'Do', 'pick a value'), 'Variables', 'door_open');
    await expectSentences(opens, 'When', ['this gets the custom event open']);
    await expectSentences(opens, 'Do', [`wait ${DOOR_WAIT_S} s`, 'flip this door_open']);

    const opened = await addTrigger(page, 'a variable changes');
    await pick(page, triggerWord(opened, 'When', 'pick a variable'), 'door_open');
    await pick(page, triggerWord(opened, 'When', 'changes'), 'becomes true');
    await addAction(page, opened, 'win');
    await expectSentences(opened, 'When', ['the variable door_open of this becomes true']);

    // The button: the Trigger tool's sensor under the ball, firing open on the door when touched.
    await tool(page, 'Trigger').click();
    await page.mouse.move(middle.x - BUTTON_HALF_WIDTH_PX, middle.y + BUTTON_TOP_BELOW_PX);
    await page.mouse.down();
    await page.mouse.move(middle.x, middle.y + BUTTON_BOTTOM_BELOW_PX, { steps: 4 });
    await page.mouse.move(middle.x + BUTTON_HALF_WIDTH_PX, middle.y + BUTTON_BOTTOM_BELOW_PX, { steps: 4 });
    await page.mouse.up();
    await expect(entityRow(page, 'Trigger 1')).toHaveAttribute('aria-selected', 'true');
    const button = triggerBlock(page, 0);
    await addAction(page, button, 'fire a custom event');
    await pick(page, triggerWord(button, 'Do', 'pick a name'), 'open');
    await pickEntity(page, triggerWord(button, 'Do', 'this'), 'Door');
    await expectSentences(button, 'Do', ['fire open on Door with a number (for scripts)']);

    await play(page);
    // The run's time when it is won: the ball's fall, then the door's 2 s wait.
    const seconds = await wonAfterSeconds(page);
    expect(seconds).toBeGreaterThanOrEqual(DOOR_WAIT_S);
    expect(seconds).toBeLessThan(DOOR_WIN_LATEST_S);
    expect(errors).toEqual([]);
});

test('a ball hits a wall, the wall is destroyed and adds 1 to score, and score becoming 3 or more wins', async ({
    page,
}) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openEditor(page);
    const middle = await levelMiddle(page);

    // The level's score, starting at 2, and the World's trigger winning when it becomes 3 or more.
    await entityRow(page, 'World').click();
    await addVariable(page, 'score');
    const start = card(page, 'VariablesComponent').getByRole('textbox', { name: 'score', exact: true });
    await start.fill(String(SCORE_START));
    await start.press('Enter');
    await expect(start).toHaveValue(String(SCORE_START));
    const wins = await addTrigger(page, 'a variable changes');
    await pick(page, triggerWord(wins, 'When', 'pick a variable'), 'score');
    await pick(page, triggerWord(wins, 'When', 'changes'), 'becomes … or more');
    await typeIntoField(page, '3');
    await addAction(page, wins, 'win');
    await expectSentences(wins, 'When', ['the variable score becomes 3 or more']);

    await placeBall(page, middle);

    // The wall: a surface on the ground under the ball, destroyed when hit, adding 1 to score as it goes.
    await placeShape(page, 'Rectangle', { x: middle.x, y: middle.y + WALL_BELOW_PX });
    await addComponent(page, 'SurfaceComponent');
    const hit = await addTrigger(page, 'this hits something');
    await addAction(page, hit, 'destroy');
    await expectSentences(hit, 'Do', ['destroy this']);
    const destroyed = await addTrigger(page, 'this is destroyed');
    await addAction(page, destroyed, 'change a value');
    await pick(page, triggerWord(destroyed, 'Do', 'pick a value'), 'score');
    await typeWord(page, destroyed, 'Do', 'a value', '1');
    await expectSentences(destroyed, 'Do', ['add 1 to score']);

    await play(page);
    await wonAfterSeconds(page);
    expect(errors).toEqual([]);
});

test('a boolean and a string variable on an entity are edited, saved and read back after a reload', async ({
    page,
}) => {
    await openEditor(page);
    await placeShape(page, 'Rectangle', await levelMiddle(page));

    await addVariable(page, 'door_open');
    await pickVariableType(page, 'door_open', 'Boolean');
    const variables = card(page, 'VariablesComponent');
    await variables.getByRole('checkbox', { name: 'door_open' }).check();
    await expect(variables.getByRole('checkbox', { name: 'door_open' })).toBeChecked();

    await addVariable(page, 'player_name');
    await pickVariableType(page, 'player_name', 'String');
    const text = variables.getByRole('textbox', { name: 'player_name', exact: true });
    await text.fill('Ada Lovelace');
    await text.press('Enter');
    await expect(text).toHaveValue('Ada Lovelace');

    await expect(page).toHaveTitle(SAVED_TITLE, { timeout: SAVE_TIMEOUT_MS });
    await page.reload();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();
    await entityRow(page, 'Rectangle 1').click();

    const readBack = card(page, 'VariablesComponent');
    await expect(readBack.getByRole('button', { name: 'Type of door_open' })).toHaveText('Boolean');
    await expect(readBack.getByRole('checkbox', { name: 'door_open' })).toBeChecked();
    await expect(readBack.getByRole('button', { name: 'Type of player_name' })).toHaveText('String');
    await expect(readBack.getByRole('textbox', { name: 'player_name', exact: true })).toHaveValue('Ada Lovelace');
});
