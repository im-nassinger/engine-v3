import { createElement } from 'react';
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
import { Inspector } from '../Inspector.tsx';

let container: HTMLElement;
let root: Root;

// Before each test: an empty place the Inspector's size to show it in.
export function openInspectorPage() {
    container = document.createElement('div');
    container.style.width = '300px';
    container.style.height = '700px';
    document.body.append(container);
    root = createRoot(container);
}

// After each test.
export function closeInspectorPage() {
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

// The session, and the frames its editor messages are checked on.
export function showInspector(level: Level) {
    const frames = new ManualFrames();
    const session = new EditorSession({ level, clock: new ManualClock(), timer: new ManualTimer(), frames });

    const commands: EditorCommands = {
        registry: createCommandRegistry(session),
        runner: new CommandRunner(session.status),
        platform: 'other',
    };

    const inspector = createElement(Inspector);
    const withCommands = createElement(CommandsContext, { value: commands }, inspector);
    const withSession = createElement(EditorContext, { value: session }, withCommands);
    root.render(withSession);

    return { session, frames };
}

export function select(session: EditorSession, entities: readonly Entity[]) {
    const ids = entities.map((entity) => entity.id);
    session.openLevel.selection.replace(ids);
}

export function shownCardTypes() {
    const cards = container.querySelectorAll<HTMLElement>('.inspector-card');

    return [...cards].map((card) => card.dataset['type']);
}

export function cardOf(typeName: string) {
    return container.querySelector<HTMLElement>(`.inspector-card[data-type="${typeName}"]`);
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

export function inspectorContainer() {
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
