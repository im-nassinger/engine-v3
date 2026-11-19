import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { Level } from '../../../core/level/index.ts';
import { JointTool, OpenWindowCount, ShapeTool } from '../../../editor/tools/index.ts';
import type { LevelPointerInput } from '../../../editor/tools/index.ts';
import { LevelViewMountContext } from '../../level-view-host/index.ts';
import { MinimapMountContext } from '../../minimap/index.ts';
import type { LevelViewMount } from '../../level-view-host/index.ts';
import { OpenWindowsContext } from '../../open-windows/index.ts';
import { closeEditorPage, editorPageContainer, openEditorPage, showWithEditor } from '../../testing/editorPage.ts';
import { EditorShell } from './EditorShell.tsx';

// The shell without a canvas: the level view isn't what these tests look at.
const NO_LEVEL_VIEW: LevelViewMount = {
    mount: () => {},
    unmount: () => {},
};

const WINDOW = { width: 1280, height: 800 };
// From the window's edge and between islands.
const GAP = 10;
const TOOL_COLUMN = 48;
const ENTITY_INSPECTOR = 300;
const ENTITIES_VIEWER = 260;
const MINIMAP = { width: 180, height: 93 };
const MAIN_MENU = 48;
const DEBUG_BOX = 28;
const PANEL_HEAD = 40;
const ROW = 30;
// Under the last row of the Entities viewer.
const ROWS_BOTTOM = 6;

// Wide enough that the free area isn't covered by the Entities viewer, as on a real screen.
beforeEach(async () => {
    await page.viewport(WINDOW.width, WINDOW.height);
    openEditorPage();
});

afterEach(() => {
    closeEditorPage();
});

function showShell(level = Level.createNew()) {
    const shell = createElement(EditorShell);
    const withMinimap = createElement(MinimapMountContext, { value: NO_LEVEL_VIEW }, shell);
    const withView = createElement(LevelViewMountContext, { value: NO_LEVEL_VIEW }, withMinimap);
    const withWindows = createElement(OpenWindowsContext, { value: new OpenWindowCount() }, withView);

    return showWithEditor(level, withWindows);
}

function find(selector: string) {
    return editorPageContainer().querySelector<HTMLElement>(selector);
}

function boxOf(label: string) {
    const box = find(`section[aria-label="${label}"]`)?.getBoundingClientRect();
    if (box === undefined) throw new Error(`The shell has no ${label}.`);

    return box;
}

function viewerHeightFor(rowCount: number) {
    return PANEL_HEAD + rowCount * ROW + ROWS_BOTTOM;
}

function levelWithEntities(count: number) {
    const level = Level.createNew();
    for (let index = 0; index < count; index += 1) {
        level.createEntity(level.world, 0);
    }

    return level;
}

function entitiesList() {
    const list = find('.entities-list');
    if (list === null) throw new Error('The Entities viewer shows its list.');

    return list;
}

function entityInspector() {
    return find('section[aria-label="Entity inspector"]');
}

function kindButton(label: string) {
    const options = find('.kinds-menu');
    const button = [...(options?.querySelectorAll('button') ?? [])].find((each) => each.textContent === label);
    if (button === undefined) throw new Error(`The kinds menu has no ${label}.`);

    return button;
}

function nameBoxValue() {
    return entityInspector()?.querySelector('input')?.value ?? '';
}

function leftClickAt(x: number, y: number): LevelPointerInput {
    return {
        levelPosition: { x, y },
        screenPosition: { x, y },
        button: 'left',
        modifiers: { shift: false, alt: false, ctrl: false },
        clickCount: 1,
    };
}

describe('EditorShell', () => {
    test('each island sits 10 px from the window and from its neighbours, in its place', async () => {
        showShell();
        await expect.poll(() => entityInspector()).not.toBeNull();

        const mainMenu = boxOf('Main menu');
        expect([mainMenu.left, mainMenu.top, mainMenu.width, mainMenu.height]).toEqual([
            GAP,
            GAP,
            MAIN_MENU,
            MAIN_MENU,
        ]);
        const tools = boxOf('Tools');
        expect([tools.left, tools.top, tools.width]).toEqual([GAP, mainMenu.bottom + GAP, TOOL_COLUMN]);
        const inspector = boxOf('Entity inspector');
        expect([inspector.left, inspector.top, inspector.width]).toEqual([tools.right + GAP, GAP, ENTITY_INSPECTOR]);
        const debugBox = boxOf('Debug box');
        expect([debugBox.right, debugBox.bottom, debugBox.height]).toEqual([
            WINDOW.width - GAP,
            WINDOW.height - GAP,
            DEBUG_BOX,
        ]);
        expect(inspector.bottom).toBe(WINDOW.height - GAP);
        const minimap = boxOf('Minimap');
        expect([minimap.right, minimap.bottom, minimap.width, minimap.height]).toEqual([
            WINDOW.width - GAP,
            debugBox.top - GAP,
            MINIMAP.width,
            MINIMAP.height,
        ]);
        const viewer = boxOf('Entities viewer');
        // A new level has two rows: the World and the camera.
        expect([viewer.right, viewer.top, viewer.height, viewer.width]).toEqual([
            WINDOW.width - GAP,
            GAP,
            viewerHeightFor(2),
            ENTITIES_VIEWER,
        ]);
    });

    test('the debug box is as wide as its entries', async () => {
        showShell();
        await expect.poll(() => find('.debug-box')).not.toBeNull();

        const box = boxOf('Debug box');
        expect(box.width).toBe(find('.debug-box')?.getBoundingClientRect().width);
        expect(box.width).toBeLessThan(WINDOW.width / 2);
    });

    test('the message pill sits at the bottom middle of the window, and clicks pass through it', async () => {
        const { session } = showShell();
        session.status.show('Nothing to undo');
        await expect.poll(() => find('.message-pill .message')).not.toBeNull();

        const message = find('.message-pill .message');
        if (!message) throw new Error('There is no message.');
        const box = message.getBoundingClientRect();
        expect(box.left + box.width / 2).toBeCloseTo(WINDOW.width / 2, 0);
        expect(box.bottom).toBe(WINDOW.height - GAP);
        expect(getComputedStyle(message).pointerEvents).toBe('none');
    });

    test('the Entities viewer grows and shrinks with its rows', async () => {
        const level = levelWithEntities(3);
        const { session } = showShell(level);
        // The three entities, the World and the camera.
        await expect.poll(() => boxOf('Entities viewer').height).toBe(viewerHeightFor(5));

        session.openLevel.entitiesRows.setFolded(level.world.id, true);
        await expect.poll(() => boxOf('Entities viewer').height).toBe(viewerHeightFor(1));

        session.openLevel.entitiesRows.setFolded(level.world.id, false);
        await expect.poll(() => boxOf('Entities viewer').height).toBe(viewerHeightFor(5));
        expect(entitiesList().scrollHeight).toBe(entitiesList().clientHeight);
    });

    test('with more rows than fit, the Entities viewer stops 10 px above the minimap and scrolls', async () => {
        showShell(levelWithEntities(100));
        await expect.poll(() => find('[role="treeitem"]')).not.toBeNull();

        const minimap = boxOf('Minimap');
        expect(boxOf('Entities viewer').bottom).toBe(minimap.top - GAP);
        expect(minimap.height).toBe(MINIMAP.height);
        expect(entitiesList().scrollHeight).toBeGreaterThan(entitiesList().clientHeight);
    });

    test('the free area is the level view between the Entity inspector and the Entities viewer', async () => {
        const { session } = showShell();
        await expect.poll(() => entityInspector()).not.toBeNull();

        const free = find('.free-area')?.getBoundingClientRect();
        expect(free?.left).toBe(boxOf('Entity inspector').right);
        expect(free?.right).toBe(boxOf('Entities viewer').left);
        expect(free?.top).toBe(0);
        expect(free?.bottom).toBe(WINDOW.height);
        // Fitting frames the level in what the islands leave free.
        expect(session.view.coveredEdges).toEqual({
            left: 2 * GAP + TOOL_COLUMN + ENTITY_INSPECTOR,
            top: 0,
            right: GAP + ENTITIES_VIEWER,
            bottom: 0,
        });
    });

    test('while the Shape tool hides the Entity inspector, fitting uses the free area up to the tool column', async () => {
        const { session, tools } = showShell();
        await expect.poll(() => entityInspector()).not.toBeNull();

        tools.controller.pick('shape');

        // The free area reports its edges when its size changes, which a busy browser may deliver late.
        await expect.poll(() => session.view.coveredEdges.left, { timeout: 5_000 }).toBe(GAP + TOOL_COLUMN);
    });

    test('the Shape tool hides the Entity inspector, and the free area reaches the tool column', async () => {
        const { tools } = showShell();
        await expect.poll(() => entityInspector()).not.toBeNull();
        expect(find('.kinds-menu')).toBeNull();

        tools.controller.pick('shape');

        await expect.poll(() => entityInspector()).toBeNull();
        const toolColumnBox = find('section[aria-label="Tools"]')?.getBoundingClientRect();
        const freeBox = find('.free-area')?.getBoundingClientRect();
        expect(freeBox?.left).toBe(toolColumnBox?.right);
        expect(find('.kinds-menu')).not.toBeNull();
    });

    test('the kinds menu shows the three kinds, the chosen one on, and changes the kind', async () => {
        const { tools } = showShell();
        tools.controller.pick('shape');
        await expect.poll(() => find('.kinds-menu')).not.toBeNull();
        expect(kindButton('Rectangle').getAttribute('aria-pressed')).toBe('true');
        expect(kindButton('Circle').getAttribute('aria-pressed')).toBe('false');
        expect(kindButton('Polygon').getAttribute('aria-pressed')).toBe('false');

        await userEvent.click(kindButton('Polygon'));

        const shapeTool = tools.controller.active;
        expect(shapeTool instanceof ShapeTool && shapeTool.kind).toBe('polygon');
        await expect.poll(() => kindButton('Polygon').getAttribute('aria-pressed')).toBe('true');
        expect(kindButton('Rectangle').getAttribute('aria-pressed')).toBe('false');
    });

    test('the Joint tool’s kinds menu shows the three types, Hinge on, and changes the type', async () => {
        const { tools } = showShell();
        tools.controller.pick('joint');
        await expect.poll(() => find('.kinds-menu')).not.toBeNull();
        expect(kindButton('Hinge').getAttribute('aria-pressed')).toBe('true');
        expect(kindButton('Rope').getAttribute('aria-pressed')).toBe('false');
        expect(kindButton('Spring').getAttribute('aria-pressed')).toBe('false');
        // The Entity inspector stays, unlike with the Shape tool.
        expect(entityInspector()).not.toBeNull();

        await userEvent.click(kindButton('Spring'));

        const jointTool = tools.controller.active;
        expect(jointTool instanceof JointTool && jointTool.type).toBe('spring');
        await expect.poll(() => kindButton('Spring').getAttribute('aria-pressed')).toBe('true');
        expect(kindButton('Hinge').getAttribute('aria-pressed')).toBe('false');
    });

    test('a joint type’s tooltip adds its physics name', async () => {
        const { tools } = showShell();
        tools.controller.pick('joint');
        await expect.poll(() => find('.kinds-menu')).not.toBeNull();

        await userEvent.hover(kindButton('Hinge'));

        await expect.poll(() => find('.kinds-menu [role="tooltip"]')?.textContent).toBe('Hinge (revolute joint)');
    });

    test('the Entity inspector shows again, with the new shape, once a shape is finished', async () => {
        const { session, tools } = showShell();
        tools.controller.pick('shape');
        await expect.poll(() => entityInspector()).toBeNull();

        tools.controller.pointerDown(leftClickAt(0, 0));
        tools.controller.pointerUp(leftClickAt(0, 0));

        expect(tools.controller.active.id).toBe('select');
        expect(session.openLevel.selection.entities.length).toBe(1);
        await expect.poll(nameBoxValue).toBe('Rectangle 1');
        expect(find('.kinds-menu')).toBeNull();
    });

    test('Play hides every panel and bar, the Play bar shows, and Stop brings them back as they were', async () => {
        const { play, tools } = showShell();
        tools.controller.pick('joint');
        await expect.poll(() => find('.kinds-menu')).not.toBeNull();
        const places = [...editorPageContainer().querySelectorAll<HTMLElement>('.panel-place, .free-area')];
        expect(places.length).toBeGreaterThan(4);

        play.play();

        await expect.poll(() => find('.play-bar')).not.toBeNull();
        for (const place of places) {
            expect(getComputedStyle(place).visibility).toBe('hidden');
        }
        expect(getComputedStyle(find('.kinds-menu') ?? document.body).visibility).toBe('hidden');
        expect(getComputedStyle(find('.level-view-host') ?? document.body).visibility).toBe('visible');

        play.stop();

        await expect.poll(() => find('.play-bar')).toBeNull();
        for (const place of places) {
            expect(place.isConnected).toBe(true);
            expect(getComputedStyle(place).visibility).toBe('visible');
        }
        expect(tools.controller.active.id).toBe('joint');
    });

    test("the main menu's first entry, Play, starts a run", async () => {
        const { play } = showShell();
        await expect.poll(() => mainMenuButton()).not.toBeNull();

        await userEvent.click(mainMenuButton() ?? document.body);
        await expect.poll(() => firstMenuEntry()?.textContent).toBe('PlayCtrl+Enter');
        await userEvent.click(firstMenuEntry() ?? document.body);

        await expect.poll(() => play.state).toBe('playing');
    });
});

function mainMenuButton() {
    return find('section[aria-label="Main menu"] button');
}

function firstMenuEntry() {
    return find('.menu [role="menuitem"]');
}
