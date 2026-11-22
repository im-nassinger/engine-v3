import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Level } from '../../../core/level/index.ts';
import { ShortcutDispatcher } from '../../../editor/shortcuts/index.ts';
import { EscapeChain, JointTool, OpenWindowCount, ShapeTool } from '../../../editor/tools/index.ts';
import { closeEditorPage, editorPageContainer, openEditorPage, showWithEditor } from '../../testing/editorPage.ts';
import '../../theme.css';
import { ToolColumn } from './ToolColumn.tsx';

beforeEach(() => {
    openEditorPage();
});

afterEach(() => {
    closeEditorPage();
});

function toolPlace(toolId: string) {
    const place = editorPageContainer().querySelector<HTMLElement>(`.tool-button[data-tool="${toolId}"]`);
    if (place === null) throw new Error(`No ${toolId} button is shown.`);

    return place;
}

function toolButton(toolId: string) {
    const button = toolPlace(toolId).querySelector('button');
    if (button === null) throw new Error(`The ${toolId} place holds no button.`);

    return button;
}

function selectPlace() {
    return toolPlace('select');
}

function selectButton() {
    return toolButton('select');
}

function showColumn() {
    // As wide as its island, so the kinds menu has the window's room to its right.
    const island = createElement('div', { style: { width: '48px' } }, createElement(ToolColumn));

    return showWithEditor(Level.createNew(), island);
}

function kindsMenu() {
    return editorPageContainer().querySelector<HTMLElement>('.kinds-menu');
}

function kindButton(label: string) {
    const buttons = [...(kindsMenu()?.querySelectorAll('button') ?? [])];
    const button = buttons.find((each) => each.textContent === label);
    if (button === undefined) throw new Error(`The kinds menu has no ${label}.`);

    return button;
}

function kindLabels() {
    const buttons = [...(kindsMenu()?.querySelectorAll('button') ?? [])];

    return buttons.map((button) => button.textContent);
}

// A number key going down with the mouse over the level view, as the page's keyboard reports it.
function digitPress(digit: string) {
    return {
        code: `Digit${digit}`,
        key: digit,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        altGraph: false,
        repeat: false,
    };
}

describe('ToolColumn', () => {
    test('shows each tool ToolController holds, the active one on', async () => {
        showWithEditor(Level.createNew(), createElement(ToolColumn));

        await expect.poll(() => selectButton().getAttribute('aria-pressed')).toBe('true');
        const buttons = editorPageContainer().querySelectorAll('.tool-button');
        expect(buttons.length).toBe(6);
        expect(selectButton().getAttribute('aria-label')).toBe('Select');
        expect(toolButton('shape').getAttribute('aria-label')).toBe('Shape');
        expect(toolButton('shape').getAttribute('aria-pressed')).toBe('false');
        expect(toolButton('joint').getAttribute('aria-label')).toBe('Joint');
        expect(toolButton('pen').getAttribute('aria-label')).toBe('Bézier pen');
        expect(toolButton('pencil').getAttribute('aria-label')).toBe('Pencil');
        expect(toolButton('trigger').getAttribute('aria-label')).toBe('Trigger');
    });

    test('key 6 picks the Trigger tool, its button shows it on, and it has no kinds menu', async () => {
        const { session, commands, tools } = showWithEditor(Level.createNew(), createElement(ToolColumn));
        const escape = new EscapeChain(session, tools.controller, new OpenWindowCount());
        const toolKeys = { tools: tools.controller, escape };
        const dispatcher = new ShortcutDispatcher(commands.registry, commands.runner, 'other', toolKeys);
        await expect.poll(() => selectButton().getAttribute('aria-pressed')).toBe('true');

        const used = dispatcher.handleKeyDown(digitPress('6'), 'level', true);

        expect(used).toBe(true);
        expect(tools.controller.active.id).toBe('trigger');
        await expect.poll(() => toolButton('trigger').getAttribute('aria-pressed')).toBe('true');
        expect(kindsMenu()).toBeNull();
    });

    test('the Trigger tool’s tooltip is "Trigger 6", and its icon is a dashed rectangle with a bolt', async () => {
        showWithEditor(Level.createNew(), createElement(ToolColumn));
        await expect.poll(() => selectButton().getAttribute('aria-pressed')).toBe('true');

        expect(toolButton('trigger').querySelector('svg rect')?.getAttribute('stroke-dasharray')).toBe('3 2.5');
        await userEvent.hover(toolButton('trigger'));

        await expect.poll(() => document.querySelector('[role="tooltip"]')?.textContent).toBe('Trigger6');
        expect(document.querySelector('[role="tooltip"] .shortcut')?.textContent).toBe('6');
    });

    test('key 4 picks the pen, its button shows it on, and it has no kinds menu', async () => {
        const { session, commands, tools } = showWithEditor(Level.createNew(), createElement(ToolColumn));
        const escape = new EscapeChain(session, tools.controller, new OpenWindowCount());
        const toolKeys = { tools: tools.controller, escape };
        const dispatcher = new ShortcutDispatcher(commands.registry, commands.runner, 'other', toolKeys);
        await expect.poll(() => selectButton().getAttribute('aria-pressed')).toBe('true');

        const used = dispatcher.handleKeyDown(digitPress('4'), 'level', true);

        expect(used).toBe(true);
        expect(tools.controller.active.id).toBe('pen');
        await expect.poll(() => toolButton('pen').getAttribute('aria-pressed')).toBe('true');
        expect(kindsMenu()).toBeNull();
    });

    test('clicking the pen’s button picks it', async () => {
        const { tools } = showWithEditor(Level.createNew(), createElement(ToolColumn));
        await expect.poll(() => toolButton('pen').getAttribute('aria-pressed')).toBe('false');

        await userEvent.click(toolButton('pen'));

        expect(tools.controller.active.id).toBe('pen');
    });

    test('key 5 picks the Pencil and opens its smoothness, Medium on', async () => {
        const { session, commands, tools } = showWithEditor(Level.createNew(), createElement(ToolColumn));
        const escape = new EscapeChain(session, tools.controller, new OpenWindowCount());
        const toolKeys = { tools: tools.controller, escape };
        const dispatcher = new ShortcutDispatcher(commands.registry, commands.runner, 'other', toolKeys);
        await expect.poll(() => selectButton().getAttribute('aria-pressed')).toBe('true');

        const used = dispatcher.handleKeyDown(digitPress('5'), 'level', true);

        expect(used).toBe(true);
        expect(tools.controller.active.id).toBe('pencil');
        await expect.poll(() => toolButton('pencil').getAttribute('aria-pressed')).toBe('true');
        await expect.poll(kindLabels).toEqual(['Low', 'Medium', 'High']);
        expect(kindsMenu()?.querySelector('.pencil-options > .title')?.textContent).toBe('Smoothness');
        expect(kindButton('Medium').getAttribute('aria-pressed')).toBe('true');
    });

    test('clicking the Pencil’s button picks it, and its smoothness is kept when it is picked again', async () => {
        const { tools } = showWithEditor(Level.createNew(), createElement(ToolColumn));
        await expect.poll(() => toolButton('pencil').getAttribute('aria-pressed')).toBe('false');

        await userEvent.click(toolButton('pencil'));
        expect(tools.controller.active.id).toBe('pencil');
        await expect.poll(kindLabels).toEqual(['Low', 'Medium', 'High']);
        await userEvent.click(kindButton('High'));
        await expect.poll(() => kindButton('High').getAttribute('aria-pressed')).toBe('true');

        await userEvent.click(selectButton());
        await expect.poll(kindsMenu).toBeNull();
        await userEvent.click(toolButton('pencil'));
        await expect.poll(() => kindButton('High').getAttribute('aria-pressed')).toBe('true');
        expect(kindButton('Medium').getAttribute('aria-pressed')).toBe('false');
    });

    test('key 2 picks the Shape tool, and its button shows it on', async () => {
        const { session, commands, tools } = showWithEditor(Level.createNew(), createElement(ToolColumn));
        const escape = new EscapeChain(session, tools.controller, new OpenWindowCount());
        const toolKeys = { tools: tools.controller, escape };
        const dispatcher = new ShortcutDispatcher(commands.registry, commands.runner, 'other', toolKeys);
        await expect.poll(() => selectButton().getAttribute('aria-pressed')).toBe('true');

        const used = dispatcher.handleKeyDown(digitPress('2'), 'level', true);

        expect(used).toBe(true);
        expect(tools.controller.active.id).toBe('shape');
        await expect.poll(() => toolButton('shape').getAttribute('aria-pressed')).toBe('true');
        expect(selectButton().getAttribute('aria-pressed')).toBe('false');
    });

    test('key 3 picks the Joint tool, and its button shows it on', async () => {
        const { session, commands, tools } = showWithEditor(Level.createNew(), createElement(ToolColumn));
        const escape = new EscapeChain(session, tools.controller, new OpenWindowCount());
        const toolKeys = { tools: tools.controller, escape };
        const dispatcher = new ShortcutDispatcher(commands.registry, commands.runner, 'other', toolKeys);
        await expect.poll(() => selectButton().getAttribute('aria-pressed')).toBe('true');

        const used = dispatcher.handleKeyDown(digitPress('3'), 'level', true);

        expect(used).toBe(true);
        expect(tools.controller.active.id).toBe('joint');
        await expect.poll(() => toolButton('joint').getAttribute('aria-pressed')).toBe('true');
        expect(selectButton().getAttribute('aria-pressed')).toBe('false');
    });

    test('clicking the Shape button picks it', async () => {
        const { tools } = showWithEditor(Level.createNew(), createElement(ToolColumn));
        await expect.poll(() => toolButton('shape').getAttribute('aria-pressed')).toBe('false');

        await userEvent.click(toolButton('shape'));

        expect(tools.controller.active.id).toBe('shape');
    });

    test('double-clicking Select locks it, shown by its dot, and Esc ends the lock', async () => {
        const { tools } = showWithEditor(Level.createNew(), createElement(ToolColumn));
        await expect.poll(() => selectPlace().dataset['locked']).toBe('false');

        await userEvent.dblClick(selectButton());

        expect(tools.controller.isLocked).toBe(true);
        await expect.poll(() => selectPlace().dataset['locked']).toBe('true');
        const dot = getComputedStyle(selectPlace(), '::after');
        expect(dot.content).not.toBe('none');

        tools.controller.returnToSelect();
        await expect.poll(() => selectPlace().dataset['locked']).toBe('false');
    });

    test('its buttons are the 34 px island buttons, muted until active', async () => {
        showColumn();
        await expect.poll(() => selectButton().getAttribute('aria-pressed')).toBe('true');

        const shape = getComputedStyle(toolButton('shape'));
        expect(shape.width).toBe('34px');
        expect(shape.height).toBe('34px');
        expect(shape.borderTopLeftRadius).toBe('7px');
        const select = getComputedStyle(selectButton());
        expect(select.color).not.toBe(shape.color);
    });

    test('Select has no kinds menu', async () => {
        showColumn();
        await expect.poll(() => selectButton().getAttribute('aria-pressed')).toBe('true');

        expect(kindsMenu()).toBeNull();
    });

    test('clicking Shape opens its kinds and clicking Joint swaps them for its types', async () => {
        showColumn();
        await expect.poll(() => toolButton('shape').getAttribute('aria-pressed')).toBe('false');

        await userEvent.click(toolButton('shape'));
        await expect.poll(kindLabels).toEqual(['Rectangle', 'Circle', 'Polygon']);

        await userEvent.click(toolButton('joint'));
        await expect.poll(kindLabels).toEqual(['Hinge', 'Rope', 'Spring']);
    });

    test('the number keys open the same menus', async () => {
        const { session, commands, tools } = showColumn();
        const escape = new EscapeChain(session, tools.controller, new OpenWindowCount());
        const toolKeys = { tools: tools.controller, escape };
        const dispatcher = new ShortcutDispatcher(commands.registry, commands.runner, 'other', toolKeys);
        await expect.poll(() => selectButton().getAttribute('aria-pressed')).toBe('true');

        dispatcher.handleKeyDown(digitPress('2'), 'level', true);
        await expect.poll(kindLabels).toEqual(['Rectangle', 'Circle', 'Polygon']);

        dispatcher.handleKeyDown(digitPress('3'), 'level', true);
        await expect.poll(kindLabels).toEqual(['Hinge', 'Rope', 'Spring']);
    });

    test('the menu is centred on its tool, 12 px from the column, with its arrow on its middle', async () => {
        const { tools } = showColumn();
        tools.controller.pick('joint');
        await expect.poll(() => kindsMenu()).not.toBeNull();

        const menu = kindsMenu();
        if (menu === null) throw new Error('No kinds menu is shown.');
        const menuBox = menu.getBoundingClientRect();
        const toolBox = toolButton('joint').getBoundingClientRect();
        const columnBox = editorPageContainer().querySelector('.tool-column')?.getBoundingClientRect();
        const menuMiddle = menuBox.top + menuBox.height / 2;
        const toolMiddle = toolBox.top + toolBox.height / 2;

        expect(menuBox.left).toBe((columnBox?.right ?? 0) + 12);
        expect(Math.abs(menuMiddle - toolMiddle)).toBeLessThanOrEqual(0.5);
        const arrow = getComputedStyle(menu, '::before');
        expect(arrow.left).toBe('-6px');
        expect(arrow.backgroundColor).toBe(getComputedStyle(menu).backgroundColor);
    });

    test('a click chooses a kind, drawn like the active tool', async () => {
        const { tools } = showColumn();
        tools.controller.pick('shape');
        await expect.poll(() => kindButton('Rectangle').getAttribute('aria-pressed')).toBe('true');

        await userEvent.click(kindButton('Circle'));

        const shapeTool = tools.controller.active;
        expect(shapeTool instanceof ShapeTool && shapeTool.kind).toBe('circle');
        await expect.poll(() => kindButton('Circle').getAttribute('aria-pressed')).toBe('true');
        expect(kindButton('Rectangle').getAttribute('aria-pressed')).toBe('false');
        await userEvent.unhover(kindButton('Circle'));
        const chosen = getComputedStyle(kindButton('Circle'));
        const active = getComputedStyle(toolButton('shape'));
        await expect.poll(() => chosen.backgroundColor).toBe(active.backgroundColor);
        expect(chosen.color).toBe(active.color);
    });

    test('Enter on a focused entry chooses it', async () => {
        const { tools } = showColumn();
        tools.controller.pick('joint');
        await expect.poll(() => kindsMenu()).not.toBeNull();

        kindButton('Rope').focus();
        await userEvent.keyboard('{Enter}');

        const jointTool = tools.controller.active;
        expect(jointTool instanceof JointTool && jointTool.type).toBe('rope');
    });

    test('the menu stays open through a choice and a press elsewhere, and goes with its tool', async () => {
        const { tools } = showColumn();
        tools.controller.pick('shape');
        await expect.poll(() => kindsMenu()).not.toBeNull();

        await userEvent.click(kindButton('Polygon'));
        document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        expect(kindsMenu()).not.toBeNull();
        expect(tools.controller.active.id).toBe('shape');

        tools.controller.returnToSelect();
        await expect.poll(() => kindsMenu()).toBeNull();
    });

    test('a locked Shape tool keeps its dot and its menu', async () => {
        const { tools } = showColumn();
        await expect.poll(() => toolPlace('shape').dataset['locked']).toBe('false');

        await userEvent.dblClick(toolButton('shape'));

        expect(tools.controller.isLocked).toBe(true);
        await expect.poll(() => toolPlace('shape').dataset['locked']).toBe('true');
        expect(kindLabels()).toEqual(['Rectangle', 'Circle', 'Polygon']);
    });
});
