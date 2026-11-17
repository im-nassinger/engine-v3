import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Level } from '../../../core/level/index.ts';
import { ShortcutDispatcher } from '../../../editor/shortcuts/index.ts';
import { EscapeChain, OpenWindowCount } from '../../../editor/tools/index.ts';
import { closeEditorPage, editorPageContainer, openEditorPage, showWithEditor } from '../../testing/editorPage.ts';
import { Toolbar } from './Toolbar.tsx';

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

describe('Toolbar', () => {
    test('shows each tool ToolController holds, the active one on', async () => {
        showWithEditor(Level.createNew(), createElement(Toolbar));

        await expect.poll(() => selectButton().getAttribute('aria-pressed')).toBe('true');
        const buttons = editorPageContainer().querySelectorAll('.tool-button');
        expect(buttons.length).toBe(3);
        expect(selectButton().getAttribute('aria-label')).toBe('Select');
        expect(toolButton('shape').getAttribute('aria-label')).toBe('Shape');
        expect(toolButton('shape').getAttribute('aria-pressed')).toBe('false');
        expect(toolButton('joint').getAttribute('aria-label')).toBe('Joint');
    });

    test('key 4 picks the Shape tool, and its button shows it on', async () => {
        const { session, commands, tools } = showWithEditor(Level.createNew(), createElement(Toolbar));
        const escape = new EscapeChain(session, tools.controller, new OpenWindowCount());
        const toolKeys = { tools: tools.controller, escape };
        const dispatcher = new ShortcutDispatcher(commands.registry, commands.runner, 'other', toolKeys);
        await expect.poll(() => selectButton().getAttribute('aria-pressed')).toBe('true');

        const used = dispatcher.handleKeyDown(digitPress('4'), 'level', true);

        expect(used).toBe(true);
        expect(tools.controller.active.id).toBe('shape');
        await expect.poll(() => toolButton('shape').getAttribute('aria-pressed')).toBe('true');
        expect(selectButton().getAttribute('aria-pressed')).toBe('false');
    });

    test('key 6 picks the Joint tool, and its button shows it on', async () => {
        const { session, commands, tools } = showWithEditor(Level.createNew(), createElement(Toolbar));
        const escape = new EscapeChain(session, tools.controller, new OpenWindowCount());
        const toolKeys = { tools: tools.controller, escape };
        const dispatcher = new ShortcutDispatcher(commands.registry, commands.runner, 'other', toolKeys);
        await expect.poll(() => selectButton().getAttribute('aria-pressed')).toBe('true');

        const used = dispatcher.handleKeyDown(digitPress('6'), 'level', true);

        expect(used).toBe(true);
        expect(tools.controller.active.id).toBe('joint');
        await expect.poll(() => toolButton('joint').getAttribute('aria-pressed')).toBe('true');
        expect(selectButton().getAttribute('aria-pressed')).toBe('false');
    });

    test('clicking the Shape button picks it', async () => {
        const { tools } = showWithEditor(Level.createNew(), createElement(Toolbar));
        await expect.poll(() => toolButton('shape').getAttribute('aria-pressed')).toBe('false');

        await userEvent.click(toolButton('shape'));

        expect(tools.controller.active.id).toBe('shape');
    });

    test('double-clicking Select locks it, shown by its dot, and Esc ends the lock', async () => {
        const { tools } = showWithEditor(Level.createNew(), createElement(Toolbar));
        await expect.poll(() => selectPlace().dataset['locked']).toBe('false');

        await userEvent.dblClick(selectButton());

        expect(tools.controller.isLocked).toBe(true);
        await expect.poll(() => selectPlace().dataset['locked']).toBe('true');
        const dot = getComputedStyle(selectPlace(), '::after');
        expect(dot.content).not.toBe('none');

        tools.controller.returnToSelect();
        await expect.poll(() => selectPlace().dataset['locked']).toBe('false');
    });
});
