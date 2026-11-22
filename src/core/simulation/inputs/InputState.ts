import type { Press } from '../../fields/index.ts';

import type { TickInputs } from './TickInputs.ts';

import { KEY_UP } from './KeyStates.ts';
import type { KeyState } from './KeyStates.ts';

// Each input's keys, by the input's name, as the World's InputComponent lists them.
export type InputKeys = ReadonlyMap<string, readonly string[]>;

// One tick's keys and inputs, each pressed, released or held, from the tick's inputs and the keys down the
// tick before. A key is down while held or pressed this tick, so a press shorter than a tick is pressed and
// held for one tick, then released. An input is held while any of its keys is, so two keys on one input
// keep it held until both are up, and pressing the second while the first stays held is no new press.
export class InputState {
    // The keys down this tick, which the next tick compares with.
    readonly downKeys: ReadonlySet<string>;
    private readonly downBefore: ReadonlySet<string>;
    private readonly held: ReadonlySet<string>;
    private readonly pressed: ReadonlySet<string>;
    private readonly inputKeys: InputKeys;
    private readonly onUnknownInput: (name: string) => void;

    constructor(
        downBefore: ReadonlySet<string>,
        inputs: TickInputs,
        inputKeys: InputKeys,
        onUnknownInput: (name: string) => void,
    ) {
        this.downBefore = downBefore;
        this.held = new Set(inputs.heldKeys);
        this.pressed = new Set(inputs.pressedKeys);
        this.downKeys = new Set([...inputs.heldKeys, ...inputs.pressedKeys]);
        this.inputKeys = inputKeys;
        this.onUnknownInput = onUnknownInput;
    }

    // A raw key, by its KeyboardEvent.code.
    key(code: string): KeyState {
        const held = this.downKeys.has(code);
        const released = this.downBefore.has(code) && !held;

        return { pressed: this.pressed.has(code), released, held };
    }

    // An input by its name. An unknown name reads as not held, and is passed to onUnknownInput.
    input(name: string): KeyState {
        const keys = this.inputKeys.get(name);
        if (keys === undefined) {
            this.onUnknownInput(name);
            return KEY_UP;
        }

        const held = keys.some((code) => this.downKeys.has(code));
        const wasDown = keys.some((code) => this.downBefore.has(code));
        const anyPressed = keys.some((code) => this.pressed.has(code));
        const anyHeldThrough = keys.some((code) => this.isHeldThrough(code));

        return { pressed: anyPressed && !anyHeldThrough, released: wasDown && !held, held };
    }

    isKey(code: string, how: Press) {
        return this.key(code)[how];
    }

    isInput(name: string, how: Press) {
        return this.input(name)[how];
    }

    // Down the tick before and still held, with no new press between.
    private isHeldThrough(code: string) {
        return this.downBefore.has(code) && this.held.has(code) && !this.pressed.has(code);
    }
}
