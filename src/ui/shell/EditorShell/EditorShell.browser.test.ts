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

// Wide enough that the free area isn't covered by the Entities panel, as on a real screen.
beforeEach(async () => {
    await page.viewport(1280, 800);
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
