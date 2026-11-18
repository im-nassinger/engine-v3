import { expect, test } from '@playwright/test';
import type { Browser, Locator, Page } from '@playwright/test';

// Change 9 of before-v2.md: nothing in the editor is covered. Each case opens a part that shows over the
// others (a menu, submenu, tooltip, popup, dropdown, kinds menu, hint or editor message) and checks it at
// the layout checks' five window sizes: the topmost element at its four corners and its centre must be
// that part or inside it, and the part must lie inside the window. The cases found are listed in
// docs/steps/stage-18.md, step 14.

type WindowSize = { name: string; width: number; height: number; zoom: number };
// Records what is wrong with the part, and says whether anything was.
type Inspect = (what: string, part: Locator) => Promise<boolean>;
type CoverCase = {
    name: string;
    run: (page: Page, inspect: Inspect) => Promise<void>;
};

// The same five as layout.spec.ts.
const SIZES: WindowSize[] = [
    { name: '1280×720', width: 1280, height: 720, zoom: 1 },
    { name: '1440×900', width: 1440, height: 900, zoom: 1 },
    { name: '1920×1080', width: 1920, height: 1080, zoom: 1 },
    { name: '1280×720 at 150%', width: 1280, height: 720, zoom: 1.5 },
    { name: '1280×720 at 200%', width: 1280, height: 720, zoom: 2 },
];

// The corners are looked at this far inside, past a 4 px rounded corner and a fractional pixel's edge.
const CORNER_INSET_PX = 4;
// A part may reach this far past the window's edge, for a zoomed page's fractional pixels.
const EDGE_TOLERANCE_PX = 1;
// Each case opens the editor five times.
const CASE_TIMEOUT_MS = 120_000;
// A hover or click that can't happen fails the case instead of waiting for its whole time.
const ACTION_TIMEOUT_MS = 10_000;

// Run in the page: what is wrong with the part, as short sentences. Tooltips let the mouse through, so
// the part takes the mouse while it is looked at, or the browser would always report what lies under it.
function problemsOf(part: Element, args: { inset: number; tolerance: number }): string[] {
    const { inset, tolerance } = args;
    const box = part.getBoundingClientRect();
    const windowWidth = document.documentElement.clientWidth;
    const windowHeight = document.documentElement.clientHeight;
    const problems: string[] = [];

    if (box.width === 0 || box.height === 0) return ['it has no size'];
    const overhangs = [
        { edge: 'left', past: -box.left },
        { edge: 'top', past: -box.top },
        { edge: 'right', past: box.right - windowWidth },
        { edge: 'bottom', past: box.bottom - windowHeight },
    ];
    for (const { edge, past } of overhangs) {
        if (past <= tolerance) continue;

        problems.push(`it is ${Math.round(past)} px past the ${edge} edge`);
    }

    const describe = (element: Element | null) => {
        if (!element) return 'nothing';

        const classes = (element.getAttribute('class') ?? '').split(' ').filter((name) => name !== '');
        const label = element.getAttribute('aria-label');
        const name = [element.tagName.toLowerCase(), ...classes].join('.');

        return label ? `${name} "${label}"` : name;
    };

    const insetX = Math.min(inset, box.width / 4);
    const insetY = Math.min(inset, box.height / 4);
    const points = [
        { place: 'top left corner', x: box.left + insetX, y: box.top + insetY },
        { place: 'top right corner', x: box.right - insetX, y: box.top + insetY },
        { place: 'bottom left corner', x: box.left + insetX, y: box.bottom - insetY },
        { place: 'bottom right corner', x: box.right - insetX, y: box.bottom - insetY },
        { place: 'centre', x: box.left + box.width / 2, y: box.top + box.height / 2 },
    ];

    const element = part as HTMLElement;
    const oldPointerEvents = element.style.pointerEvents;
    element.style.pointerEvents = 'auto';
    for (const point of points) {
        const isInWindow = point.x >= 0 && point.y >= 0 && point.x < windowWidth && point.y < windowHeight;
        if (!isInWindow) continue;

        const top = document.elementFromPoint(point.x, point.y);
        if (top && part.contains(top)) continue;

        problems.push(`its ${point.place} is under ${describe(top)}`);
    }
    element.style.pointerEvents = oldPointerEvents;

    return problems;
}

async function openEditorAt(browser: Browser, size: WindowSize) {
    const context = await browser.newContext({
        viewport: { width: Math.round(size.width / size.zoom), height: Math.round(size.height / size.zoom) },
        deviceScaleFactor: size.zoom,
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();

    return { context, page };
}

function region(page: Page, name: string) {
    return page.getByRole('region', { name });
}

function entityInspector(page: Page) {
    return region(page, 'Entity inspector');
}

function card(page: Page, typeName: string) {
    return entityInspector(page).locator(`.entity-inspector-card[data-type="${typeName}"]`);
}

// The open menu's own panel, and its open submenu: the menu's root is only as big as its panel.
function menuPanel(within: Locator) {
    return within.locator('.menu > .menu-panel');
}

function openSubmenu(within: Locator) {
    return within.locator('.menu > .submenu');
}

async function pickTool(page: Page, name: string) {
    await region(page, 'Tools').getByRole('button', { name, exact: true }).click();
}

// A crate drawn in the free area's middle with the Shape tool, which selects it.
async function drawCrate(page: Page) {
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    await pickTool(page, 'Shape');
    await page.getByRole('group', { name: 'Kinds menu' }).getByRole('button', { name: 'Rectangle' }).click();
    await page.mouse.click(free.x + free.width / 2, free.y + free.height / 2);
    await expect(card(page, 'ShapeComponent')).toHaveCount(1);
}

async function addComponent(page: Page, typeName: string) {
    await entityInspector(page).getByRole('button', { name: 'Add Component' }).click();
    await entityInspector(page).getByRole('menuitem', { name: typeName, exact: true }).click();
    await expect(card(page, typeName)).toHaveCount(1);
}

async function selectRow(page: Page, name: string) {
    await page
        .getByRole('tree', { name: 'Entities' })
        .getByRole('treeitem')
        .filter({ has: page.locator('.name', { hasText: name }) })
        .first()
        .click();
}

// Hovers each of the tooltips' owners in turn and looks at the bubble each shows. An owner that is covered
// itself can't be hovered, so it is reported instead.
async function inspectTooltips(page: Page, inspect: Inspect, owners: Locator, what: string) {
    const count = await owners.count();
    for (let index = 0; index < count; index++) {
        const owner = owners.nth(index);
        if (!(await owner.isVisible())) continue;
        await owner.scrollIntoViewIfNeeded();
        const isCovered = await inspect(`${what}'s tooltip's button`, owner);
        if (isCovered) continue;

        await owner.hover();
        const bubble = owner.getByRole('tooltip');
        await expect(bubble).toBeVisible();
        const text = (await bubble.textContent()) ?? '';
        await inspect(`${what}'s tooltip "${text}"`, bubble);
        await page.mouse.move(0, 0);
        await expect(bubble).toBeHidden();
    }
}

async function inspectMenuButton(page: Page, inspect: Inspect, within: Locator, name: string | RegExp) {
    await within.getByRole('button', { name }).click();
    await inspect(`the ${String(name)} menu`, menuPanel(within));
    await page.keyboard.press('Escape');
    await expect(within.locator('.menu')).toHaveCount(0);
}

const CASES: CoverCase[] = [
    {
        name: "the main menu and the save state's explanation",
        run: async (page, inspect) => {
            await inspectMenuButton(page, inspect, region(page, 'Main menu'), 'Main menu');

            const statusBar = region(page, 'Status bar');
            await statusBar.getByRole('button', { name: /^Save state/ }).click();
            await inspect("the save state's explanation", statusBar.locator('.save-explanation'));
        },
    },
    {
        name: "the main menu's submenus",
        run: async (page, inspect) => {
            const mainMenu = region(page, 'Main menu');
            await mainMenu.getByRole('button', { name: 'Main menu' }).click();
            const rows = mainMenu.locator('.menu-submenu-row');
            const count = await rows.count();
            expect(count).toBeGreaterThan(0);

            for (let index = 0; index < count; index++) {
                const row = rows.nth(index);
                await row.hover();
                await expect(row).toHaveAttribute('aria-expanded', 'true');
                await inspect(`the main menu's ${(await row.textContent()) ?? ''} submenu`, openSubmenu(mainMenu));
            }
        },
    },
    {
        name: "the tool buttons' tooltips",
        run: async (page, inspect) => {
            await inspectTooltips(page, inspect, region(page, 'Tools').locator('.tooltip'), 'a tool button');
        },
    },
    ...['Shape', 'Joint'].map((tool) => ({
        name: `the ${tool} tool's kinds menu, its tooltips and its hint`,
        run: async (page: Page, inspect: Inspect) => {
            const kindsMenu = page.getByRole('group', { name: 'Kinds menu' });
            await pickTool(page, tool);
            await inspect(`the ${tool} tool's kinds menu`, kindsMenu);
            await inspectTooltips(page, inspect, kindsMenu.locator('.tooltip'), `the ${tool} tool's kinds`);
            await inspect(`the ${tool} tool's hint`, region(page, 'Status bar').locator('.status-text'));
        },
    })),
    {
        name: "the Entity inspector's menus and dropdowns",
        run: async (page, inspect) => {
            await drawCrate(page);
            await addComponent(page, 'BodyComponent');
            const panel = entityInspector(page);

            await inspectMenuButton(page, inspect, panel, 'Add Component');
            await inspectMenuButton(page, inspect, card(page, 'ShapeComponent'), 'ShapeComponent menu');
            await inspectMenuButton(page, inspect, card(page, 'BodyComponent'), 'BodyComponent menu');
            await inspectMenuButton(page, inspect, card(page, 'ShapeComponent'), 'Kind');
            await inspectMenuButton(page, inspect, card(page, 'BodyComponent'), 'Type');

            await card(page, 'ShapeComponent').getByRole('button', { name: 'ShapeComponent menu' }).click();
            const disabled = menuPanel(card(page, 'ShapeComponent')).locator('.tooltip');
            await inspectTooltips(page, inspect, disabled, "a card menu's disabled entry");
        },
    },
    {
        name: "the Entity inspector's tooltips",
        run: async (page, inspect) => {
            await drawCrate(page);
            await addComponent(page, 'BodyComponent');
            const panel = entityInspector(page);

            await inspectTooltips(
                page,
                inspect,
                panel.locator('.entity-inspector-head .tooltip'),
                "the Entity inspector's head",
            );
            const labels = panel.locator('.entity-inspector-card .tooltip[data-long="true"]');
            await inspectTooltips(page, inspect, labels.first(), 'the first described field');
            await inspectTooltips(page, inspect, labels.last(), 'the last described field');

            await card(page, 'ShapeComponent').getByRole('button', { name: 'Kind' }).click();
            await card(page, 'ShapeComponent').getByRole('menuitem', { name: 'Polygon', exact: true }).click();
            const listButtons = card(page, 'ShapeComponent').locator('.list-field .tooltip');
            await inspectTooltips(page, inspect, listButtons.first(), "the Points list's first button");
            await inspectTooltips(page, inspect, listButtons.last(), "the Points list's last button");
        },
    },
    {
        name: "the Entity inspector's editor messages",
        run: async (page, inspect) => {
            await drawCrate(page);
            await addComponent(page, 'BodyComponent');

            const note = card(page, 'BodyComponent').getByRole('note');
            await note.scrollIntoViewIfNeeded();
            await inspect("the BodyComponent's note", note);

            const damping = card(page, 'BodyComponent').getByRole('textbox', { name: 'Linear damping' });
            await damping.fill('abc');
            await damping.press('Enter');
            const refusal = card(page, 'BodyComponent').locator('.field-message[data-tone="refused"]');
            await refusal.scrollIntoViewIfNeeded();
            await inspect("a refused value's message", refusal);

            const statusBar = region(page, 'Status bar');
            await inspectMenuButton(page, inspect, statusBar, /^Editor messages/);
        },
    },
    {
        name: "the Camera's Follow dropdown and its pick button's tooltip",
        run: async (page, inspect) => {
            await selectRow(page, 'Camera');
            const camera = card(page, 'CameraComponent');
            await expect(camera).toHaveCount(1);

            await inspectMenuButton(page, inspect, camera, 'Follow');
            await inspectTooltips(
                page,
                inspect,
                camera.locator('.tooltip', { has: page.getByRole('button', { name: 'Pick in the level view' }) }),
                'the pick button',
            );
        },
    },
    {
        name: 'the play bar, its tooltips and its hint',
        run: async (page, inspect) => {
            await region(page, 'Main menu').getByRole('button', { name: 'Main menu' }).click();
            await page.getByRole('menuitem', { name: /^Play/ }).click();
            const bar = page.getByRole('toolbar', { name: 'Play bar' });
            await expect(bar).toHaveAttribute('data-state', 'playing');
            await inspect('the play bar', bar);
            await inspectTooltips(page, inspect, bar.locator('.tooltip'), 'the play bar');

            // A dropped file is refused during play with the hint "Stop to edit".
            const dropped = await page.evaluateHandle(() => {
                const transfer = new DataTransfer();
                transfer.items.add(new File(['{}'], 'dropped.editable'));
                return transfer;
            });
            await page.dispatchEvent('.level-view-host', 'drop', { dataTransfer: dropped });
            const hint = bar.locator('.message');
            await expect(hint).toBeVisible();
            await inspect("the play bar's hint", hint);
        },
    },
    {
        name: 'a dialog',
        run: async (page, inspect) => {
            await region(page, 'Main menu').getByRole('button', { name: 'Main menu' }).click();
            await page.getByRole('menuitem', { name: 'Help', exact: true }).hover();
            await page.getByRole('menuitem', { name: /^About/ }).click();
            await inspect('the About dialog', page.getByRole('dialog'));
        },
    },
];

test.use({ actionTimeout: ACTION_TIMEOUT_MS });

for (const coverCase of CASES) {
    test(`nothing covers ${coverCase.name}`, async ({ browser }, testInfo) => {
        test.setTimeout(CASE_TIMEOUT_MS);
        const problems: string[] = [];

        for (const size of SIZES) {
            const { context, page } = await openEditorAt(browser, size);
            const inspect: Inspect = async (what, part) => {
                await expect(part).toBeVisible();
                const found = await part.evaluate(problemsOf, { inset: CORNER_INSET_PX, tolerance: EDGE_TOLERANCE_PX });
                for (const problem of found) {
                    problems.push(`${size.name}: ${what}: ${problem}`);
                }

                return found.length > 0;
            };

            await coverCase.run(page, inspect);
            await context.close();
        }

        await testInfo.attach('problems', { body: problems.join('\n') || 'none', contentType: 'text/plain' });
        expect(problems, problems.join('\n')).toEqual([]);
    });
}
