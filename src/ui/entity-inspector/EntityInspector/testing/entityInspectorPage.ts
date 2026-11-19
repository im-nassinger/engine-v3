import { createElement } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import {
    BodyComponent,
    NameComponent,
    ShapeComponent,
    SurfaceComponent,
    TransformComponent,
} from '../../../../core/components/index.ts';
import type { Entity, Level } from '../../../../core/level/index.ts';
import { CommandRunner, createCommandRegistry } from '../../../../editor/commands/index.ts';
import { EditorSession } from '../../../../editor/session/index.ts';
import { ManualClock, ManualFrames, ManualTimer } from '../../../../editor/time/testing/index.ts';
import { CommandsContext } from '../../../commands/index.ts';
import type { EditorCommands } from '../../../commands/index.ts';
import { EditorContext } from '../../../EditorContext.tsx';
import '../../../theme.css';
import { EntitiesViewer } from '../../../entities-viewer/index.ts';
import { ToolsContext } from '../../../tools/index.ts';
import { buildEditorTools } from '../../../tools/testing/buildEditorTools.ts';
import { EntityInspector } from '../EntityInspector.tsx';

let container: HTMLElement;
let root: Root;

// Before each test: an empty place the Entity inspector's size to show it in.
export function openEntityInspectorPage() {
    container = document.createElement('div');
    container.style.width = '300px';
    container.style.height = '700px';
    document.body.append(container);
    root = createRoot(container);
}

// After each test.
export function closeEntityInspectorPage() {
    root.unmount();
    container.remove();
}

export function addCrate(level: Level, name: string) {
    const crate = level.createEntity(level.world, 0);
    crate.addComponent(new TransformComponent());
    crate.addComponent(new NameComponent({ name }));
    crate.addComponent(new ShapeComponent());
    crate.addComponent(new BodyComponent());
    crate.addComponent(new SurfaceComponent());

    return crate;
}

export function addBareEntity(level: Level, name: string) {
    const entity = level.createEntity(level.world, 0);
    entity.addComponent(new TransformComponent());
    entity.addComponent(new NameComponent({ name }));

    return entity;
}

// The session, and the frames its editor messages are checked on, with the World selected, since the shell
// shows the Entity inspector only with something selected. With the Entities panel beside it, for dragging
// its rows onto the Entity inspector's fields.
export function showEntityInspector(level: Level, withPanel = false) {
    const frames = new ManualFrames();
    const session = new EditorSession({ level, clock: new ManualClock(), timer: new ManualTimer(), frames });
    session.openLevel.selection.replace([level.world.id]);

    const commands: EditorCommands = {
        registry: createCommandRegistry(session),
        runner: new CommandRunner(session.status),
        platform: 'other',
    };
    const tools = buildEditorTools(session, commands.registry, frames);

    let shown: ReactElement = createElement(EntityInspector);
    if (withPanel) {
        container.style.width = '560px';
        const entityInspectorPlace = createElement('div', { style: { width: '300px' } }, shown);
        const panelPlace = createElement('div', { style: { width: '260px' } }, createElement(EntitiesViewer));
        shown = createElement('div', { style: { display: 'flex', height: '700px' } }, entityInspectorPlace, panelPlace);
    }

    const withTools = createElement(ToolsContext, { value: tools }, shown);
    const withCommands = createElement(CommandsContext, { value: commands }, withTools);
    const withSession = createElement(EditorContext, { value: session }, withCommands);
    root.render(withSession);

    return { session, frames, tools };
}

export function select(session: EditorSession, entities: readonly Entity[]) {
    const ids = entities.map((entity) => entity.id);
    session.openLevel.selection.replace(ids);
}

export function shownCardTypes() {
    const cards = container.querySelectorAll<HTMLElement>('.entity-inspector-card');

    return [...cards].map((card) => card.dataset['type']);
}

export function cardOf(typeName: string) {
    return container.querySelector<HTMLElement>(`.entity-inspector-card[data-type="${typeName}"]`);
}

export function requireCard(typeName: string) {
    const card = cardOf(typeName);
    if (card === null) throw new Error(`No ${typeName} card is shown.`);

    return card;
}

export function requireElement<Found extends Element>(within: ParentNode, selector: string) {
    const found = within.querySelector<Found>(selector);
    if (found === null) throw new Error(`Nothing matches ${selector}.`);

    return found;
}

export function entityInspectorContainer() {
    return container;
}

export function buttonNamed(within: ParentNode, text: string) {
    const buttons = within.querySelectorAll<HTMLButtonElement>('button');
    const button = [...buttons].find((candidate) => candidate.textContent.trim() === text);
    if (button === undefined) throw new Error(`No button reads ${text}.`);

    return button;
}

export function click(element: Element) {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
}

export function hover(element: Element) {
    const event = new PointerEvent('pointerover', { bubbles: true });
    element.dispatchEvent(event);
}

// Sets the box's text the way typing does, through the setter React listens to.
export function type(input: HTMLInputElement, text: string) {
    Reflect.set(HTMLInputElement.prototype, 'value', text, input);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}
