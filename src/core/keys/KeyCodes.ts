// The keys a level may use, each a `KeyboardEvent.code` with the name the Entity inspector shows. A code
// names a key by its place on the keyboard, so `KeyW` is the key left of E on any layout.
//
// Every key not listed can't be bound: Tab (the pause menu), Esc (it leaves full screen), the browser's
// keys (F1 to F12, the media and browser keys), and Ctrl, Alt and the system key, which start the
// browser's and the system's shortcuts. Shift+T is the editor's, but Shift and T each stay bindable.
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => [`Key${letter}`, letter] as const);
const DIGITS = '0123456789'.split('').map((digit) => [`Digit${digit}`, digit] as const);
const NUMPAD_DIGITS = '0123456789'.split('').map((digit) => [`Numpad${digit}`, `Numpad ${digit}`] as const);

const OTHER_KEYS = [
    ['Space', 'Space'],
    ['Enter', 'Enter'],
    ['Backspace', 'Backspace'],
    ['ShiftLeft', 'Left Shift'],
    ['ShiftRight', 'Right Shift'],
    ['ArrowLeft', 'Left arrow'],
    ['ArrowRight', 'Right arrow'],
    ['ArrowUp', 'Up arrow'],
    ['ArrowDown', 'Down arrow'],
    ['Insert', 'Insert'],
    ['Delete', 'Delete'],
    ['Home', 'Home'],
    ['End', 'End'],
    ['PageUp', 'Page Up'],
    ['PageDown', 'Page Down'],
    ['Minus', '-'],
    ['Equal', '='],
    ['BracketLeft', '['],
    ['BracketRight', ']'],
    ['Backslash', '\\'],
    ['Semicolon', ';'],
    ['Quote', "'"],
    ['Backquote', '`'],
    ['Comma', ','],
    ['Period', '.'],
    ['Slash', '/'],
    ['NumpadAdd', 'Numpad +'],
    ['NumpadSubtract', 'Numpad -'],
    ['NumpadMultiply', 'Numpad *'],
    ['NumpadDivide', 'Numpad /'],
    ['NumpadDecimal', 'Numpad .'],
    ['NumpadEnter', 'Numpad Enter'],
] as const;

const LABELS: ReadonlyMap<string, string> = new Map([...LETTERS, ...DIGITS, ...OTHER_KEYS, ...NUMPAD_DIGITS]);

// A `KeyboardEvent.code` a level may use, such as `KeyW` or `Space`.
export type KeyCode = string & { readonly bindable: unique symbol };

export class KeyCodes {
    // Every bindable key, letters first, in the order a key menu lists them.
    static readonly all: readonly KeyCode[] = [...LABELS.keys()] as KeyCode[];

    static isBindable(code: string): code is KeyCode {
        return LABELS.has(code);
    }

    // What the Entity inspector shows: `W`, `Left arrow`, `Space`.
    static label(code: KeyCode) {
        const label = LABELS.get(code);
        if (label === undefined) throw new Error(`${code} is not a key a level can use.`);

        return label;
    }

    // The keys as one line, such as "A, Left arrow".
    static labels(codes: readonly KeyCode[]) {
        return codes.map((code) => KeyCodes.label(code)).join(', ');
    }
}
