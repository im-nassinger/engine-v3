import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { NameComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { CommandRunner, createCommandRegistry, renameEntity } from '../../../editor/commands/index.ts';
import { EditorSession } from '../../../editor/session/index.ts';
import { ManualClock, ManualTimer } from '../../../editor/time/testing/index.ts';
import { CommandsContext } from '../../commands/index.ts';
import type { EditorCommands } from '../../commands/index.ts';
import { EditorContext } from '../../EditorContext.tsx';
import '../../theme.css';
import { EntitiesPanel } from './EntitiesPanel.tsx';

const PANEL_HEIGHT = 600;
// 600 px shows about 20 rows of 28 px; the overscan adds a few on each side.
const MOST_ROWS_BUILT = 60;

let container: HTMLElement;
let root: Root;

beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '260px';
    container.style.height = `${PANEL_HEIGHT}px`;
    document.body.append(container);
    root = createRoot(container);
});

afterEach(() => {
    root.unmount();
    container.remove();
});

function addNamedEntity(level: Level, name: string) {
    const entity = level.createEntity(level.world, 0);
    entity.addComponent(new NameComponent({ name }));

    return entity;
}

function buildLevel(entityCount: number) {
    const level = Level.createNew();
    const entities: Entity[] = [];

    for (let index = 0; index < entityCount; index += 1) {
        const entity = addNamedEntity(level, `Crate ${index + 1}`);
        entities.push(entity);
    }

    return { level, entities };
}

function showPanel(level: Level) {
    const timer = new ManualTimer();
    const session = new EditorSession({ level, clock: new ManualClock(), timer });
    const commands: EditorCommands = {
        registry: createCommandRegistry(session),
        runner: new CommandRunner(session.status),
        platform: 'other',
    };

    const panel = createElement(EntitiesPanel);
    const withCommands = createElement(CommandsContext, { value: commands }, panel);
    const withSession = createElement(EditorContext, { value: session }, withCommands);
    root.render(withSession);

    return session;
}

function shownRows() {
    return [...container.querySelectorAll<HTMLElement>('[role="treeitem"]')];
}

function findRow(name: string) {
    return shownRows().find((element) => element.querySelector('.name')?.textContent === name);
}

function rowNamed(name: string) {
    const row = findRow(name);
    if (row === undefined) throw new Error(`No row named ${name} is shown.`);

    return row;
}

async function rowShown(name: string) {
    await expect.poll(() => findRow(name)).toBeDefined();

    return rowNamed(name);
}

function click(element: Element, modifiers: MouseEventInit = {}) {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...modifiers });
    element.dispatchEvent(event);
}

function nameBox() {
    return container.querySelector<HTMLInputElement>('input[aria-label="Entity name"]');
}

function requireNameBox() {
    const box = nameBox();
    if (box === null) throw new Error('The name box is open.');

    return box;
}

// Sets the box's text the way typing does, through the setter React listens to.
function type(input: HTMLInputElement, text: string) {
    Reflect.set(HTMLInputElement.prototype, 'value', text, input);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function press(input: HTMLInputElement, key: string) {
    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('EntitiesPanel', () => {
    test('at 10,000 rows only the rows on screen exist', async () => {
        const { level } = buildLevel(10_000);
        showPanel(level);

        await rowShown('World');
        const rowCount = shownRows().length;

        expect(rowCount).toBeGreaterThan(10);
        expect(rowCount).toBeLessThan(MOST_ROWS_BUILT);

        const list = container.querySelector('.entities-list');
        list?.scrollTo({ top: list.scrollHeight });

        await rowShown('Crate 1');
        expect(shownRows().length).toBeLessThan(MOST_ROWS_BUILT);
    });

    test('a click selects and Ctrl+click adds', async () => {
        const { level, entities } = buildLevel(5);
        const session = showPanel(level);
        const [first, second] = entities;
        if (first === undefined || second === undefined) throw new Error('The level has its crates.');

        click(await rowShown('Crate 1'));
        await expect.poll(() => rowNamed('Crate 1').getAttribute('aria-selected')).toBe('true');

        click(rowNamed('Crate 2'), { ctrlKey: true });
        await expect.poll(() => rowNamed('Crate 2').getAttribute('aria-selected')).toBe('true');

        expect(session.openLevel.selection.ids).toEqual(expect.arrayContaining([first.id, second.id]));
        expect(session.openLevel.selection.ids).toHaveLength(2);

        click(rowNamed('Crate 3'));
        await expect.poll(() => rowNamed('Crate 1').getAttribute('aria-selected')).toBe('false');
        expect(session.openLevel.selection.ids).toHaveLength(1);
    });

    test('a rename redraws only that row', async () => {
        const { level, entities } = buildLevel(5);
        const session = showPanel(level);
        const crate = entities[2];
        if (crate === undefined) throw new Error('The level has its crates.');

        const renamedRow = await rowShown('Crate 3');
        const rowsVersion = session.openLevel.entitiesRows.version.version;
        const changedNodes: Node[] = [];
        const observer = new MutationObserver((records) => {
            for (const record of records) {
                changedNodes.push(record.target);
            }
        });
        observer.observe(container, { subtree: true, childList: true, characterData: true, attributes: true });

        renameEntity(session.openLevel, crate.id, 'Barrel');
        await rowShown('Barrel');
        observer.disconnect();

        expect(changedNodes.length).toBeGreaterThan(0);
        expect(changedNodes.every((node) => renamedRow.contains(node))).toBe(true);
        expect(session.openLevel.entitiesRows.version.version).toBe(rowsVersion);
    });

    test('the eye hides its own row without selecting it, and the World has none', async () => {
        const { level, entities } = buildLevel(3);
        const session = showPanel(level);
        const crate = entities[0];
        if (crate === undefined) throw new Error('The level has its crates.');

        const row = await rowShown('Crate 1');
        const eye = row.querySelector('button[aria-label="Hide Crate 1"]');
        if (eye === null) throw new Error('The row has an eye.');

        click(eye);

        await expect.poll(() => rowNamed('Crate 1').querySelector('button[aria-label="Show Crate 1"]')).not.toBeNull();
        expect(crate.isHidden).toBe(true);
        expect(session.openLevel.selection.isEmpty).toBe(true);
        expect(session.openLevel.history.undoLabel).toBe('Hide Crate 1');
        expect(rowNamed('World').querySelector('.eye')).toBeNull();
    });

    test('the fold arrow hides and shows the children', async () => {
        const { level } = buildLevel(3);
        showPanel(level);

        const world = await rowShown('World');
        const fold = world.querySelector('button[aria-label="Fold"]');
        if (fold === null) throw new Error('The World has a fold arrow.');

        click(fold);

        await expect.poll(() => shownRows().length).toBe(1);
        expect(level.editorData.isFolded(level.world.id)).toBe(true);
    });
    test('an asked rename scrolls its row into view and opens its box, and Enter renames', async () => {
        const { level, entities } = buildLevel(10_000);
        const session = showPanel(level);
        // Crates are added at the top, so the first one made is the last row.
        const crate = entities[0];
        if (crate === undefined) throw new Error('The level has its crates.');

        await rowShown('World');
        session.openLevel.renameRequest.request(crate.id);

        await expect.poll(() => nameBox()).not.toBeNull();
        const input = requireNameBox();
        expect(input.value).toBe('Crate 1');
        expect(document.activeElement).toBe(input);
        expect(session.openLevel.renameRequest.entityId).toBeUndefined();

        type(input, '  Barrel ');
        press(input, 'Enter');

        await rowShown('Barrel');
        expect(nameBox()).toBeNull();
        expect(session.openLevel.history.undoLabel).toBe('Rename Crate 1');
    });

    test('a double-click on the name opens the box, and Esc keeps the old name', async () => {
        const { level } = buildLevel(3);
        const session = showPanel(level);

        const name = (await rowShown('Crate 2')).querySelector('.name');
        if (name === null) throw new Error('The row shows its name.');
        name.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));

        await expect.poll(() => nameBox()).not.toBeNull();
        const input = requireNameBox();
        type(input, 'Barrel');
        press(input, 'Escape');

        await rowShown('Crate 2');
        expect(nameBox()).toBeNull();
        expect(session.openLevel.history.undoLabel).toBeUndefined();
    });

    test("a double-click on the World's name says it can't be renamed", async () => {
        const { level } = buildLevel(1);
        const session = showPanel(level);

        const name = (await rowShown('World')).querySelector('.name');
        if (name === null) throw new Error('The row shows its name.');
        name.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));

        await expect.poll(() => session.status.current).toBe("The World can't be renamed");
        expect(nameBox()).toBeNull();
    });
});
