import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { Level } from '../../../core/level/index.ts';
import { JointTool, OpenWindowCount, ShapeTool } from '../../../editor/tools/index.ts';
import type { LevelPointerInput } from '../../../editor/tools/index.ts';
import { LevelViewMountContext } from '../../level-view-host/index.ts';
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
const MINIMAP = { width: 180, height: 90 };
const TOP_BAR = 48;
const STATUS_BAR = 28;

// Wide enough that the free area isn't covered by the Entities viewer, as on a real screen.
beforeEach(async () => {
    await page.viewport(WINDOW.width, WINDOW.height);
    openEditorPage();
});

afterEach(() => {
    closeEditorPage();
});

function showShell() {
    const shell = createElement(EditorShell);
    const withView = createElement(LevelViewMountContext, { value: NO_LEVEL_VIEW }, shell);
    const withWindows = createElement(OpenWindowsContext, { value: new OpenWindowCount() }, withView);

    return showWithEditor(Level.createNew(), withWindows);
}

function find(selector: string) {
    return editorPageContainer().querySelector<HTMLElement>(selector);
}

function boxOf(label: string) {
    const box = find(`section[aria-label="${label}"]`)?.getBoundingClientRect();
    if (box === undefined) throw new Error(`The shell has no ${label}.`);

    return box;
}

function entityInspector() {
    return find('section[aria-label="Entity inspector"]');
}

function optionButton(label: string) {
    const options = find('.tool-options');
    const button = [...(options?.querySelectorAll('button') ?? [])].find((each) => each.textContent === label);
    if (button === undefined) throw new Error(`The options strip has no ${label}.`);

    return button;
}

function nameBoxValue() {
    return entityInspector()?.querySelector('input')?.value ?? '';
}

function statusText() {
    return find('.status-text')?.textContent ?? '';
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

        const topBar = boxOf('Top bar');
        expect([topBar.left, topBar.top, topBar.width, topBar.height]).toEqual([
            GAP,
            GAP,
            WINDOW.width - 2 * GAP,
            TOP_BAR,
        ]);
        const tools = boxOf('Tools');
        expect([tools.left, tools.top, tools.width]).toEqual([GAP, topBar.bottom + GAP, TOOL_COLUMN]);
        const inspector = boxOf('Entity inspector');
        expect([inspector.left, inspector.top, inspector.width]).toEqual([
            tools.right + GAP,
            topBar.bottom + GAP,
            ENTITY_INSPECTOR,
        ]);
        const statusBar = boxOf('Status bar');
        expect([statusBar.left, statusBar.bottom, statusBar.width, statusBar.height]).toEqual([
            GAP,
            WINDOW.height - GAP,
            WINDOW.width - 2 * GAP,
            STATUS_BAR,
        ]);
        expect(inspector.bottom).toBe(statusBar.top - GAP);
        const minimap = boxOf('Minimap');
        expect([minimap.right, minimap.bottom, minimap.width, minimap.height]).toEqual([
            WINDOW.width - GAP,
            statusBar.top - GAP,
            MINIMAP.width,
            MINIMAP.height,
        ]);
        const viewer = boxOf('Entities viewer');
        expect([viewer.right, viewer.top, viewer.bottom, viewer.width]).toEqual([
            WINDOW.width - GAP,
            topBar.bottom + GAP,
            minimap.top - GAP,
            ENTITIES_VIEWER,
        ]);
    });

    test('the free area is the level view between the Entity inspector and the Entities viewer', async () => {
        const { session } = showShell();
        await expect.poll(() => entityInspector()).not.toBeNull();

        const free = find('.free-area')?.getBoundingClientRect();
        expect(free?.left).toBe(boxOf('Entity inspector').right);
        expect(free?.right).toBe(boxOf('Entities viewer').left);
        expect(free?.top).toBe(boxOf('Top bar').bottom);
        expect(free?.bottom).toBe(boxOf('Status bar').top);
        // Fitting frames the level in what the islands leave free.
        expect(session.view.coveredEdges).toEqual({
            left: 2 * GAP + TOOL_COLUMN + ENTITY_INSPECTOR,
            top: GAP + TOP_BAR,
            right: GAP + ENTITIES_VIEWER,
            bottom: GAP + STATUS_BAR,
        });
    });

    test('while the Shape tool hides the Entity inspector, fitting uses the free area up to the tool column', async () => {
        const { session, tools } = showShell();
        await expect.poll(() => entityInspector()).not.toBeNull();

        tools.controller.pick('shape');

        // The free area reports its edges when its size changes, which a busy browser may deliver late.
        await expect.poll(() => session.view.coveredEdges.left, { timeout: 5_000 }).toBe(GAP + TOOL_COLUMN);
    });

    test('the Shape tool hides the Entity inspector, and the free area reaches the toolbar', async () => {
        const { tools } = showShell();
        await expect.poll(() => entityInspector()).not.toBeNull();
        expect(find('.tool-options')).toBeNull();

        tools.controller.pick('shape');

        await expect.poll(() => entityInspector()).toBeNull();
        const toolbarBox = find('section[aria-label="Tools"]')?.getBoundingClientRect();
        const freeBox = find('.free-area')?.getBoundingClientRect();
        expect(freeBox?.left).toBe(toolbarBox?.right);
        expect(find('.tool-options')).not.toBeNull();
    });

    test('the options strip shows the three kinds, the chosen one on, and changes the kind', async () => {
        const { tools } = showShell();
        tools.controller.pick('shape');
        await expect.poll(() => find('.tool-options')).not.toBeNull();
        expect(optionButton('Rectangle').getAttribute('aria-pressed')).toBe('true');
        expect(optionButton('Circle').getAttribute('aria-pressed')).toBe('false');
        expect(optionButton('Polygon').getAttribute('aria-pressed')).toBe('false');

        await userEvent.click(optionButton('Polygon'));

        const shapeTool = tools.controller.active;
        expect(shapeTool instanceof ShapeTool && shapeTool.kind).toBe('polygon');
        await expect.poll(() => optionButton('Polygon').getAttribute('aria-pressed')).toBe('true');
        expect(optionButton('Rectangle').getAttribute('aria-pressed')).toBe('false');
    });

    test('the status bar shows each tool hint, following the kind', async () => {
        const { tools } = showShell();
        await expect.poll(statusText).toContain('Click to select.');

        tools.controller.pick('shape');
        await expect.poll(statusText).toContain('Click to place, drag to size.');

        await userEvent.click(optionButton('Polygon'));
        await expect.poll(statusText).toContain('Click to add points.');
    });

    test('the Joint tool’s strip shows the three types, Hinge on, and changes the type', async () => {
        const { tools } = showShell();
        tools.controller.pick('joint');
        await expect.poll(() => find('.tool-options')).not.toBeNull();
        expect(optionButton('Hinge').getAttribute('aria-pressed')).toBe('true');
        expect(optionButton('Rope').getAttribute('aria-pressed')).toBe('false');
        expect(optionButton('Spring').getAttribute('aria-pressed')).toBe('false');
        // The Entity inspector stays, unlike with the Shape tool.
        expect(entityInspector()).not.toBeNull();

        await userEvent.click(optionButton('Spring'));

        const jointTool = tools.controller.active;
        expect(jointTool instanceof JointTool && jointTool.type).toBe('spring');
        await expect.poll(() => optionButton('Spring').getAttribute('aria-pressed')).toBe('true');
        expect(optionButton('Hinge').getAttribute('aria-pressed')).toBe('false');
    });

    test('a joint type’s tooltip adds its physics name', async () => {
        const { tools } = showShell();
        tools.controller.pick('joint');
        await expect.poll(() => find('.tool-options')).not.toBeNull();

        await userEvent.hover(optionButton('Hinge'));

        await expect.poll(() => find('.tool-options [role="tooltip"]')?.textContent).toBe('Hinge (revolute joint)');
    });

    test('the status bar shows the Joint tool’s hints, following the type', async () => {
        const { tools } = showShell();
        tools.controller.pick('joint');
        await expect.poll(statusText).toContain('Click where two bodies overlap to join them, or on one to pin it.');

        await userEvent.click(optionButton('Rope'));
        await expect.poll(statusText).toContain('Click the first entity, then the second.');
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
        expect(find('.tool-options')).toBeNull();
    });

    test('Play hides every panel and bar, the Play bar shows, and Stop brings them back as they were', async () => {
        const { play, tools } = showShell();
        tools.controller.pick('joint');
        await expect.poll(() => find('.tool-options')).not.toBeNull();
        const places = [...editorPageContainer().querySelectorAll<HTMLElement>('.panel-place, .free-area')];
        expect(places.length).toBeGreaterThan(4);

        play.play();

        await expect.poll(() => find('.play-bar')).not.toBeNull();
        for (const place of places) {
            expect(getComputedStyle(place).visibility).toBe('hidden');
        }
        expect(getComputedStyle(find('.level-view-host') ?? document.body).visibility).toBe('visible');

        play.stop();

        await expect.poll(() => find('.play-bar')).toBeNull();
        for (const place of places) {
            expect(place.isConnected).toBe(true);
            expect(getComputedStyle(place).visibility).toBe('visible');
        }
        expect(tools.controller.active.id).toBe('joint');
    });

    test("the top bar's Play button starts a run", async () => {
        const { play } = showShell();
        await expect.poll(() => playButton()).not.toBeNull();

        await userEvent.click(playButton() ?? document.body);

        await expect.poll(() => play.state).toBe('playing');
    });
});

function playButton() {
    const buttons = [...editorPageContainer().querySelectorAll<HTMLElement>('.top-bar button')];

    return buttons.find((button) => button.textContent === 'Play') ?? null;
}
