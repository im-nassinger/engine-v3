import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { NameComponent, TransformComponent } from '../../../../core/components/index.ts';
import { Level } from '../../../../core/level/index.ts';
import type { Entity } from '../../../../core/level/index.ts';
import { CommandRunner, createCommandRegistry } from '../../../../editor/commands/index.ts';
import { EditorSession } from '../../../../editor/session/index.ts';
import { OpenWindowCount } from '../../../../editor/tools/index.ts';
import { ManualClock, ManualFrames, ManualTimer } from '../../../../editor/time/testing/index.ts';
import { CommandsContext } from '../../../commands/index.ts';
import type { EditorCommands } from '../../../commands/index.ts';
import { EditorContext } from '../../../EditorContext.tsx';
import { OpenWindowsContext } from '../../../open-windows/index.ts';
import '../../../theme.css';
import { EntitiesPanel } from '../EntitiesPanel.tsx';

export const PANEL_HEIGHT = 600;

let container: HTMLElement;
let root: Root;

// Before each test: an empty 260 by 600 px place to show the panel in.
export function openPanelPage() {
    container = document.createElement('div');
    container.style.width = '260px';
    container.style.height = `${PANEL_HEIGHT}px`;
    document.body.append(container);
    root = createRoot(container);
}

// After each test.
export function closePanelPage() {
    root.unmount();
    container.remove();
}

export function panelContainer() {
    return container;
}

export function addNamedEntity(level: Level, name: string, parent: Entity = level.world) {
    const entity = level.createEntity(parent, 0);
    entity.addComponent(new NameComponent({ name }));
    entity.addComponent(new TransformComponent());

    return entity;
}

// Crates are added at the top, so the first one made is the last row.
export function buildLevel(entityCount: number) {
    const level = Level.createNew();
    const entities: Entity[] = [];

    for (let index = 0; index < entityCount; index += 1) {
        const entity = addNamedEntity(level, `Crate ${index + 1}`);
        entities.push(entity);
    }

    return { level, entities };
}

export function showPanel(level: Level) {
    const session = createSession(level);
    mountPanel(session);

    return session;
}

export function createSession(level: Level, frames = new ManualFrames()) {
    const timer = new ManualTimer();

    return new EditorSession({ level, clock: new ManualClock(), timer, frames });
}

export function mountPanel(session: EditorSession, openWindows = new OpenWindowCount()) {
    const commands: EditorCommands = {
        registry: createCommandRegistry(session),
        runner: new CommandRunner(session.status),
        platform: 'other',
    };

    const panel = createElement(EntitiesPanel);
    const withWindows = createElement(OpenWindowsContext, { value: openWindows }, panel);
    const withCommands = createElement(CommandsContext, { value: commands }, withWindows);
    const withSession = createElement(EditorContext, { value: session }, withCommands);
    root.render(withSession);
}

export function shownRows() {
    return [...container.querySelectorAll<HTMLElement>('[role="treeitem"]')];
}

export function findRow(name: string) {
    return shownRows().find((element) => element.querySelector('.name')?.textContent === name);
}

export function rowNamed(name: string) {
    const row = findRow(name);
    if (row === undefined) throw new Error(`No row named ${name} is shown.`);

    return row;
}

export function click(element: Element, modifiers: MouseEventInit = {}) {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...modifiers });
    element.dispatchEvent(event);
}

export function requireEntity(entities: readonly Entity[], index: number) {
    const entity = entities[index];
    if (entity === undefined) throw new Error('The level has its crates.');

    return entity;
}
