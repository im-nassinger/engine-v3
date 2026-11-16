import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { NameComponent, ShapeComponent, TransformComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import { EditorClipboard } from '../../../editor/clipboard/index.ts';
import type { SystemClipboard } from '../../../editor/clipboard/index.ts';
import { ClipboardEvents, CommandRunner, createCommandRegistry } from '../../../editor/commands/index.ts';
import type { PasteCommand } from '../../../editor/commands/index.ts';
import { EditorSession } from '../../../editor/session/index.ts';
import { ManualFrames, ManualTimer } from '../../../editor/time/testing/index.ts';
import { ClipboardBridge } from './ClipboardBridge.ts';

// A system clipboard that refuses every read, as a browser may for the menu's Paste.
class RefusingSystemClipboard implements SystemClipboard {
    writeText() {
        return Promise.resolve();
    }

    readText() {
        return Promise.reject(new Error('Read refused.'));
    }
}

type Editor = {
    readonly level: Level;
    readonly session: EditorSession;
    readonly paste: PasteCommand;
};

let editor: Editor;
let disconnect: () => void;
let page: HTMLElement;

// A new level with a selected crate, and the editor's clipboard events on the window.
beforeEach(() => {
    const timer = new ManualTimer();
    const level = Level.createNew();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    session.viewSettings.set('gridSnapping', false);

    const crate = level.createEntity(level.world, 0);
    crate.addComponent(new TransformComponent());
    crate.addComponent(new NameComponent({ name: 'Crate' }));
    crate.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 40, height: 20 } }));
    session.openLevel.selection.replace([crate.id]);

    const clipboard = new EditorClipboard(new RefusingSystemClipboard());
    const registry = createCommandRegistry(session, { clipboard, mouse: { current: undefined } });
    const runner = new CommandRunner(session.status);
    const bridge = new ClipboardBridge(new ClipboardEvents(registry, runner), window);
    disconnect = bridge.connect();

    const paste = registry.find('edit.paste') as PasteCommand;
    editor = { level, session, paste };

    page = document.createElement('div');
    page.innerHTML = `
        <div data-focus-place="level" tabindex="0" id="level"></div>
        <div data-focus-place="panel"><input id="name" type="text"></div>
    `;
    document.body.append(page);
});

afterEach(() => {
    disconnect();
    page.remove();
});

function element(id: string) {
    const found = document.getElementById(id);
    if (found === null) throw new Error(`No element #${id}`);

    return found;
}

function send(type: 'copy' | 'cut' | 'paste', target: EventTarget, text = '') {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    const event = new ClipboardEvent(type, { bubbles: true, cancelable: true });
    // Firefox copies the data given to a made-up event and keeps a paste's unreadable, so the event is
    // given this one directly, as a real event's would be readable and writable.
    Object.defineProperty(event, 'clipboardData', { value: clipboardData });
    target.dispatchEvent(event);

    return { event, clipboardData };
}

describe('ClipboardBridge', () => {
    test('a copy event carries the tagged text, and a paste event of it adds the entities', () => {
        element('level').focus();

        const copied = send('copy', element('level'));
        const text = copied.clipboardData.getData('text/plain');
        const pasted = send('paste', element('level'), text);

        expect(copied.event.defaultPrevented).toBe(true);
        expect(text).toContain('"engine-v3":"entities"');
        expect(pasted.event.defaultPrevented).toBe(true);
        expect(editor.level.entityCount).toBe(4);
        expect(editor.session.openLevel.history.undoLabel).toBe('Paste Crate');
    });

    test('a cut event carries the text and removes the selection', () => {
        element('level').focus();

        const cut = send('cut', element('level'));

        expect(cut.event.defaultPrevented).toBe(true);
        expect(cut.clipboardData.getData('text/plain')).toContain('"engine-v3":"entities"');
        expect(editor.level.entityCount).toBe(2);
    });

    test("in a text field the events are the browser's", () => {
        element('name').focus();

        const copied = send('copy', element('name'));
        const cut = send('cut', element('name'));
        const pasted = send('paste', element('name'), 'plain text');

        expect(copied.event.defaultPrevented).toBe(false);
        expect(cut.event.defaultPrevented).toBe(false);
        expect(pasted.event.defaultPrevented).toBe(false);
        expect(editor.level.entityCount).toBe(3);
        expect(editor.session.status.current).toBeUndefined();
    });

    test('a refused read from the menu pastes the last copy', async () => {
        element('level').focus();
        send('copy', element('level'));

        await editor.paste.readAndPaste();

        expect(editor.level.entityCount).toBe(4);
    });
});
