import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { FocusPlace, KeyboardInputData } from '../../../editor/shortcuts/index.ts';
import { KeyboardInput } from './KeyboardInput.ts';

type Call = {
    readonly input: KeyboardInputData;
    readonly focus: FocusPlace;
    readonly pointerOverLevelView: boolean;
};

// Uses only the G key, like the editor's Hide grid.
class FakeDispatcher {
    readonly calls: Call[] = [];
    readonly keyUps: string[] = [];

    handleKeyUp(input: KeyboardInputData) {
        this.keyUps.push(input.code);
    }

    handleKeyDown(input: KeyboardInputData, focus: FocusPlace, pointerOverLevelView: boolean) {
        this.calls.push({ input, focus, pointerOverLevelView });

        return input.code === 'KeyG';
    }

    get lastCall() {
        const call = this.calls.at(-1);
        if (call === undefined) throw new Error('No key reached the dispatcher');

        return call;
    }
}

let dispatcher: FakeDispatcher;
let disconnect: () => void;
let page: HTMLElement;

beforeEach(() => {
    dispatcher = new FakeDispatcher();
    const keyboard = new KeyboardInput(dispatcher, window);
    disconnect = keyboard.connect();

    page = document.createElement('div');
    page.innerHTML = `
        <div data-focus-place="level" tabindex="0" id="level"><canvas id="canvas"></canvas></div>
        <div data-focus-place="panel" id="panel">
            <input id="name" type="text">
            <input id="checkbox" type="checkbox">
            <button id="button">OK</button>
            <div id="editable" contenteditable="true"></div>
        </div>
        <div data-focus-place="codeEditor"><textarea id="code"></textarea></div>
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

function pressOn(target: EventTarget, code: string, key: string, init: KeyboardEventInit = {}) {
    const event = new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);

    return event;
}

function focusPlaceAfterFocusing(id: string) {
    element(id).focus();
    pressOn(element(id), 'KeyX', 'x');

    return dispatcher.lastCall.focus;
}

describe('KeyboardInput', () => {
    test("stops a used key's default and leaves an unused one's", () => {
        const used = pressOn(document.body, 'KeyG', 'g');
        const unused = pressOn(document.body, 'KeyQ', 'q');

        expect(used.defaultPrevented).toBe(true);
        expect(unused.defaultPrevented).toBe(false);
    });

    test('copies the key data out of the event', () => {
        pressOn(document.body, 'KeyZ', 'Z', { ctrlKey: true, shiftKey: true, repeat: true });

        expect(dispatcher.lastCall.input).toEqual({
            code: 'KeyZ',
            key: 'Z',
            ctrlKey: true,
            shiftKey: true,
            altKey: false,
            metaKey: false,
            altGraph: false,
            repeat: true,
        });
    });

    test('reads focus in a text input, a textarea or an editable element as a text field', () => {
        expect(focusPlaceAfterFocusing('name')).toBe('textField');
        expect(focusPlaceAfterFocusing('editable')).toBe('textField');
    });

    test('reads a checkbox or a button as the panel it is in', () => {
        expect(focusPlaceAfterFocusing('checkbox')).toBe('panel');
        expect(focusPlaceAfterFocusing('button')).toBe('panel');
    });

    test('reads the level view and the code editor from data-focus-place', () => {
        expect(focusPlaceAfterFocusing('level')).toBe('level');
        expect(focusPlaceAfterFocusing('code')).toBe('codeEditor');
    });

    test('reads focus on nothing as a panel', () => {
        const focused = document.activeElement;
        if (focused instanceof HTMLElement) {
            focused.blur();
        }

        pressOn(document.body, 'KeyX', 'x');

        expect(dispatcher.lastCall.focus).toBe('panel');
    });

    test('knows when the mouse is over the level view', () => {
        element('canvas').dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
        pressOn(document.body, 'KeyX', 'x');

        expect(dispatcher.lastCall.pointerOverLevelView).toBe(true);

        element('panel').dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
        pressOn(document.body, 'KeyX', 'x');

        expect(dispatcher.lastCall.pointerOverLevelView).toBe(false);
    });

    test('forgets the level view when the mouse leaves the window', () => {
        element('canvas').dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
        element('canvas').dispatchEvent(new PointerEvent('pointerout', { bubbles: true, relatedTarget: null }));
        pressOn(document.body, 'KeyX', 'x');

        expect(dispatcher.lastCall.pointerOverLevelView).toBe(false);
    });

    test('keeps Alt pressed alone from the browser and the dispatcher', () => {
        const down = pressOn(document.body, 'AltLeft', 'Alt', { altKey: true });
        const up = new KeyboardEvent('keyup', { code: 'AltLeft', key: 'Alt', bubbles: true, cancelable: true });
        document.body.dispatchEvent(up);

        expect(down.defaultPrevented).toBe(true);
        expect(up.defaultPrevented).toBe(true);
        expect(dispatcher.calls).toEqual([]);
    });

    test('releases every held key when the window loses focus, not when a field does', () => {
        const keyboard = new KeyboardInput(dispatcher, window);
        const disconnectSecond = keyboard.connect();

        pressOn(document.body, 'KeyW', 'w');

        expect(keyboard.isHeld('KeyW')).toBe(true);

        element('name').focus();
        element('name').blur();

        expect(keyboard.isHeld('KeyW')).toBe(true);

        window.dispatchEvent(new FocusEvent('blur'));

        expect(keyboard.isHeld('KeyW')).toBe(false);

        disconnectSecond();
    });

    test('a key up releases its key and reaches the dispatcher', () => {
        const keyboard = new KeyboardInput(dispatcher, window);
        const disconnectSecond = keyboard.connect();

        pressOn(document.body, 'KeyW', 'w');
        document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }));

        expect(keyboard.isHeld('KeyW')).toBe(false);
        expect(dispatcher.keyUps).toContain('KeyW');

        disconnectSecond();
    });

    test('hears nothing once disconnected', () => {
        disconnect();
        const event = pressOn(document.body, 'KeyG', 'g');

        expect(event.defaultPrevented).toBe(false);
        expect(dispatcher.calls).toEqual([]);
    });
});
