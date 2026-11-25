import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
    NameComponent,
    PathComponent,
    TagsComponent,
    TransformComponent,
    TriggerComponent,
} from '../../../core/components/index.ts';
import type { PathPoint } from '../../../core/geometry/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { CommandRegistry } from '../../../editor/commands/index.ts';
import { TOOL_KEYS, TOOL_NAMES } from '../../../editor/tools/index.ts';
import type { ToolId } from '../../../editor/tools/index.ts';
import { shortcutText } from '../../commands/index.ts';
import { closeEditorPage, editorPageContainer, openEditorPage } from '../../testing/editorPage.ts';
import { showShell } from './testing/shellPage.ts';

// Every icon button on the page, a button showing an icon and no text, shows a tooltip with its name, and
// the shortcut of the command it runs when that command has one. Each is focused in turn, which shows its
// tooltip as hovering does, without the mouse crossing the others.

const WINDOW = { width: 1280, height: 800 };
const WALK_TIMEOUT_MS = 60_000;

const SHEET_COMMAND = 'help.shortcuts';
const HIDE_OR_SHOW_COMMAND = 'edit.hideOrShow';
// The Entity inspector's eye does what Hide or show does to the selection.
const HEAD_EYE_LABELS = ['Hide', 'Show', 'Hide all'];

type ShownTooltip = {
    readonly label: string;
    readonly shortcut: string | undefined;
};

beforeEach(async () => {
    await page.viewport(WINDOW.width, WINDOW.height);
    openEditorPage();
    const corner = { x: window.innerWidth - 1, y: window.innerHeight - 1 };
    await userEvent.hover(document.documentElement, { position: corner, force: true });
});

afterEach(() => {
    closeEditorPage();
});

function smooth(x: number, y: number): PathPoint {
    return { x, y, handleIn: { x: -10, y: 0 }, handleOut: { x: 10, y: 0 }, corner: 'smooth' };
}

function addNamed(level: Level, parent: Entity, name: string) {
    const entity = level.createEntity(parent, 0);
    entity.addComponent(new TransformComponent());
    entity.addComponent(new NameComponent({ name }));

    return entity;
}

// A group holding a tagged button with a trigger, and a path with a smooth point: every kind of icon button.
function buildLevel() {
    const level = Level.createNew();
    const group = addNamed(level, level.world, 'Group 1');
    const button = addNamed(level, group, 'Button');
    button.addComponent(new TagsComponent({ tags: ['door'] }));
    const trigger = {
        id: 1,
        name: null,
        on: true,
        when: { kind: 'touched' },
        checks: [],
        actions: [{ kind: 'win' }],
    } as const;
    button.addComponent(new TriggerComponent({ triggers: [trigger], nextTriggerId: 2 }));
    const path = addNamed(level, level.world, 'Path 1');
    const points = [smooth(0, 0), smooth(50, 10)];
    path.addComponent(new PathComponent({ path: { closed: false, points } }));

    return { level, button, path };
}

function isShown(element: HTMLElement) {
    const box = element.getBoundingClientRect();
    const hasSize = box.width > 0 && box.height > 0;

    return hasSize && element.checkVisibility({ visibilityProperty: true });
}

function iconButtons() {
    const buttons = editorPageContainer().querySelectorAll<HTMLButtonElement>('button');

    return [...buttons].filter((button) => {
        const hasIcon = button.querySelector('svg') !== null;
        const hasText = button.textContent.trim() !== '';

        return hasIcon && !hasText;
    });
}

const BLOCK_TOOTH_PX = 6;

// A trigger block's × shows only while the mouse is on the block's middle third.
async function bringIntoView(button: HTMLButtonElement) {
    const block = button.closest<HTMLElement>('.script-block');
    if (block !== null) {
        const middle = (block.getBoundingClientRect().height - BLOCK_TOOTH_PX) / 2;
        await userEvent.hover(block, { position: { x: 3, y: middle } });
    }
}

async function tooltipOf(button: HTMLButtonElement) {
    button.focus();
    await expect.poll(() => document.querySelector('[role="tooltip"]'), { timeout: 2000 }).not.toBeNull();

    const bubble = document.querySelector('[role="tooltip"]');
    if (bubble === null) throw new Error('No tooltip showed.');
    const shortcut = bubble.querySelector('.shortcut')?.textContent;
    const label = bubble.firstChild?.textContent ?? '';
    button.blur();
    await expect.poll(() => document.querySelector('[role="tooltip"]')).toBeNull();

    return { label, shortcut } satisfies ShownTooltip;
}

function commandShortcut(registry: CommandRegistry, commandId: string) {
    const command = registry.find(commandId);
    if (command === undefined) throw new Error(`No command has the id ${commandId}.`);

    return shortcutText(command, 'other');
}

// What each button with a command shows after its name, by the name.
function expectedShortcuts(registry: CommandRegistry) {
    const shortcuts = new Map<string, string | undefined>();

    const toolIds = Object.keys(TOOL_NAMES) as ToolId[];
    for (const toolId of toolIds) {
        shortcuts.set(TOOL_NAMES[toolId], TOOL_KEYS[toolId]);
    }
    for (const label of HEAD_EYE_LABELS) {
        shortcuts.set(label, commandShortcut(registry, HIDE_OR_SHOW_COMMAND));
    }
    shortcuts.set('Close', commandShortcut(registry, SHEET_COMMAND));

    return shortcuts;
}

async function walkIconButtons(registry: CommandRegistry) {
    const expected = expectedShortcuts(registry);
    const walked: string[] = [];

    for (const button of iconButtons()) {
        await bringIntoView(button);
        if (!isShown(button)) continue;

        const name = button.getAttribute('aria-label');
        expect(name, button.outerHTML).toBeTruthy();
        const tooltip = await tooltipOf(button);

        expect(tooltip.label, `${name}'s tooltip`).toBe(name);
        expect(tooltip.shortcut, `${name}'s shortcut`).toBe(expected.get(name ?? ''));
        walked.push(name ?? '');
    }

    return walked;
}

describe('Tooltips', () => {
    test(
        'with the shortcut list open: ☰, the tools, the ×, and the World’s cards',
        async () => {
            const { session, commands } = showShell();
            session.openLevel.selection.replace([session.openLevel.level.world.id]);
            session.shortcutSheet.toggle();
            await expect.poll(() => editorPageContainer().querySelector('.shortcut-sheet')).not.toBeNull();

            const walked = await walkIconButtons(commands.registry);

            expect(walked).toEqual(expect.arrayContaining(['Main menu', 'Select', 'Trigger', 'Close']));
        },
        WALK_TIMEOUT_MS,
    );

    test(
        'with a tagged button with a trigger selected: the Entities viewer, the eye, the tags and the trigger',
        async () => {
            const { level, button } = buildLevel();
            const { session, commands } = showShell(level);
            session.openLevel.selection.replace([button.id]);
            await expect.poll(() => editorPageContainer().querySelector('.trigger-block')).not.toBeNull();

            const walked = await walkIconButtons(commands.registry);

            const expectedNames = ['Fold', 'Hide Button', 'Hide', 'Remove tag door', 'Remove win'];
            expect(walked).toEqual(expect.arrayContaining(expectedNames));
        },
        WALK_TIMEOUT_MS,
    );

    test(
        'with a path selected: its points’ fold arrows',
        async () => {
            const { level, path } = buildLevel();
            const { session, commands } = showShell(level);
            session.openLevel.selection.replace([path.id]);
            await expect.poll(() => editorPageContainer().querySelector('.path-points-field')).not.toBeNull();

            const walked = await walkIconButtons(commands.registry);

            expect(walked).toEqual(expect.arrayContaining(['Handles of point 1', 'Handles of point 2']));
        },
        WALK_TIMEOUT_MS,
    );
});
