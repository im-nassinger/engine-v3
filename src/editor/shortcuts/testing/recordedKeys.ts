import type { KeyboardInputData } from '../KeyboardInputData.ts';

type Modifiers = Partial<Pick<KeyboardInputData, 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey' | 'altGraph'>>;

// One keydown as a browser reports it on a given layout.
export function recordedKey(code: string, key: string, modifiers: Modifiers = {}): KeyboardInputData {
    return {
        code,
        key,
        ctrlKey: modifiers.ctrlKey ?? false,
        shiftKey: modifiers.shiftKey ?? false,
        altKey: modifiers.altKey ?? false,
        metaKey: modifiers.metaKey ?? false,
        altGraph: modifiers.altGraph ?? false,
        repeat: false,
    };
}

const ctrl = { ctrlKey: true };
const shift = { shiftKey: true };
const ctrlShift = { ctrlKey: true, shiftKey: true };
const altGr = { ctrlKey: true, altKey: true, altGraph: true };

// Key data recorded on three layouts the tech notes name: what each press reports, and the shortcut the
// person meant. Browsers can't switch layouts in a test, so the layouts are checked through this data.
export const US_KEYS = {
    ctrlZ: recordedKey('KeyZ', 'z', ctrl),
    ctrlShiftZ: recordedKey('KeyZ', 'Z', ctrlShift),
    ctrlY: recordedKey('KeyY', 'y', ctrl),
    shift3: recordedKey('Digit3', '#', shift),
    shift0: recordedKey('Digit0', ')', shift),
    plus: recordedKey('Equal', '+', shift),
    numpadPlus: recordedKey('NumpadAdd', '+'),
    numpadMinus: recordedKey('NumpadSubtract', '-'),
    ctrlEquals: recordedKey('Equal', '=', ctrl),
    equals: recordedKey('Equal', '='),
    minus: recordedKey('Minus', '-'),
    ctrlMinus: recordedKey('Minus', '-', ctrl),
    questionMark: recordedKey('Slash', '?', shift),
    digit1: recordedKey('Digit1', '1'),
    numpad1: recordedKey('Numpad1', '1'),
    deleteKey: recordedKey('Delete', 'Delete'),
    enter: recordedKey('Enter', 'Enter'),
    f: recordedKey('KeyF', 'f'),
    shiftF: recordedKey('KeyF', 'F', shift),
    ctrlAltC: recordedKey('KeyC', 'c', { ctrlKey: true, altKey: true }),
};

// Brazilian ABNT2: ç on the Semicolon key, ? on the extra key next to the right Shift.
export const ABNT2_KEYS = {
    ctrlZ: recordedKey('KeyZ', 'z', ctrl),
    shift3: recordedKey('Digit3', '#', shift),
    shift0: recordedKey('Digit0', ')', shift),
    plus: recordedKey('Equal', '+', shift),
    equals: recordedKey('Equal', '='),
    ctrlEquals: recordedKey('Equal', '=', ctrl),
    questionMark: recordedKey('IntlRo', '?', shift),
    cedilla: recordedKey('Semicolon', 'ç'),
};

// German QWERTZ: Z and Y swap places, + and - are keys of their own, and AltGr types @ and €.
export const GERMAN_KEYS = {
    ctrlZ: recordedKey('KeyY', 'z', ctrl),
    ctrlY: recordedKey('KeyZ', 'y', ctrl),
    shift3: recordedKey('Digit3', '§', shift),
    shift0: recordedKey('Digit0', '=', shift),
    plus: recordedKey('BracketRight', '+'),
    minus: recordedKey('Slash', '-'),
    ctrlEquals: recordedKey('Digit0', '=', ctrlShift),
    questionMark: recordedKey('Minus', '?', shift),
    altGrQ: recordedKey('KeyQ', '@', altGr),
    altGrE: recordedKey('KeyE', '€', altGr),
};

// Russian: no Latin letters, so letters fall back to their place on a US keyboard.
export const RUSSIAN_KEYS = {
    ctrlZ: recordedKey('KeyZ', 'я', ctrl),
};

// A Mac reports Cmd as metaKey; Option+Z types Ω.
export const MAC_KEYS = {
    cmdZ: recordedKey('KeyZ', 'z', { metaKey: true }),
    controlZ: recordedKey('KeyZ', 'z', ctrl),
    optionZ: recordedKey('KeyZ', 'Ω', { altKey: true }),
};
