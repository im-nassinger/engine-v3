import type { KeyboardPlatform } from './KeyboardInputData.ts';
import { altName, ctrlName } from './modifierNames.ts';
import type { KeyPress } from './KeyPress.ts';

// How a chord's main key is found in a press, following the tech notes: a letter by what the layout
// types (falling back to the physical key when it types no Latin letter), a digit by its physical key,
// a symbol such as '+' or '?' by the typed character, and a named key by its name.
type ChordKey =
    | { readonly kind: 'letter'; readonly letter: string }
    | { readonly kind: 'digit'; readonly digit: string }
    | { readonly kind: 'character'; readonly character: string }
    | { readonly kind: 'named'; readonly name: string };

// The requirement's spelling, then KeyboardEvent.key's.
const NAMED_KEYS = new Map([
    ['Enter', 'Enter'],
    ['Esc', 'Escape'],
    ['Del', 'Delete'],
    ['Backspace', 'Backspace'],
    ['Tab', 'Tab'],
    ['Space', ' '],
    ['Left', 'ArrowLeft'],
    ['Right', 'ArrowRight'],
    ['Up', 'ArrowUp'],
    ['Down', 'ArrowDown'],
    ['PageUp', 'PageUp'],
    ['PageDown', 'PageDown'],
    ['Home', 'Home'],
    ['End', 'End'],
    ['F1', 'F1'],
    ['F2', 'F2'],
    ['F3', 'F3'],
    ['F4', 'F4'],
    ['F5', 'F5'],
    ['F6', 'F6'],
    ['F7', 'F7'],
    ['F8', 'F8'],
    ['F9', 'F9'],
    ['F10', 'F10'],
    ['F11', 'F11'],
    ['F12', 'F12'],
]);

const MODIFIER_NAMES = ['Ctrl', 'Shift', 'Alt'];

// A shortcut as the requirements write it: 'Ctrl+Shift+Z', 'Shift+3', '+', 'Del'.
export class KeyChord {
    readonly ctrl: boolean;
    readonly shift: boolean;
    readonly alt: boolean;
    private readonly chordKey: ChordKey;
    private readonly keyText: string;

    private constructor(modifiers: readonly string[], chordKey: ChordKey, keyText: string) {
        this.ctrl = modifiers.includes('Ctrl');
        this.shift = modifiers.includes('Shift');
        this.alt = modifiers.includes('Alt');
        this.chordKey = chordKey;
        this.keyText = keyText;
    }

    static parse(text: string) {
        const { modifiers, keyText } = splitChordText(text);

        for (const modifier of modifiers) {
            if (!MODIFIER_NAMES.includes(modifier)) {
                throw new Error(`The shortcut ${text} has an unknown modifier ${modifier}.`);
            }
        }

        const chordKey = readChordKey(keyText, text);
        const shiftIsTyped = chordKey.kind === 'character' && modifiers.includes('Shift');
        if (shiftIsTyped) {
            throw new Error(`The shortcut ${text} names Shift, which the typed character already holds.`);
        }

        return new KeyChord(modifiers, chordKey, keyText);
    }

    matches(press: KeyPress) {
        if (press.otherModifier) return false;
        if (press.ctrl !== this.ctrl || press.alt !== this.alt) return false;

        // Shift is part of a typed character: '+' is Shift+= on a US layout and a key of its own on a German one.
        const shiftMatters = this.chordKey.kind !== 'character';
        if (shiftMatters && press.shift !== this.shift) return false;

        return this.keyMatches(press);
    }

    // A chord found by the typed character, which some layouts type on a key another chord names: Shift+0
    // types '=' on a German keyboard. The chord that names its key wins such a press.
    get isTypedCharacter() {
        return this.chordKey.kind === 'character';
    }

    // Two chords with the same keys would fight over one press.
    sameKeysAs(other: KeyChord) {
        const sameModifiers = this.ctrl === other.ctrl && this.shift === other.shift && this.alt === other.alt;
        if (!sameModifiers) return false;

        return sameChordKey(this.chordKey, other.chordKey);
    }

    // What the menu shows at the right of an entry.
    text(platform: KeyboardPlatform) {
        const caps = this.caps(platform);

        return caps.join('+');
    }

    // The keys one by one, modifiers first, as the shortcut list draws them: ['Cmd', 'Shift', 'Z'] on a Mac.
    caps(platform: KeyboardPlatform) {
        const caps: string[] = [];

        if (this.ctrl) {
            caps.push(ctrlName(platform));
        }
        if (this.alt) {
            caps.push(altName(platform));
        }
        if (this.shift) {
            caps.push('Shift');
        }

        caps.push(this.keyText);

        return caps;
    }

    private keyMatches(press: KeyPress) {
        const chordKey = this.chordKey;

        switch (chordKey.kind) {
            case 'letter':
                return typedLetter(press) === chordKey.letter;
            case 'digit':
                return physicalDigit(press.code) === chordKey.digit;
            case 'character':
                return press.key === chordKey.character;
            case 'named':
                return press.key === chordKey.name;
        }
    }
}

// The last '+' that follows another character splits the key off, so 'Ctrl++' and '+' both work.
function splitChordText(text: string) {
    if (text === '+') return { modifiers: [], keyText: '+' };

    const endsWithPlusKey = text.endsWith('++');
    if (endsWithPlusKey) {
        const modifierText = text.slice(0, -2);
        return { modifiers: modifierText.split('+'), keyText: '+' };
    }

    const parts = text.split('+');
    const keyText = parts.pop() ?? '';

    return { modifiers: parts, keyText };
}

function readChordKey(keyText: string, text: string): ChordKey {
    if (/^[A-Z]$/.test(keyText)) return { kind: 'letter', letter: keyText };
    if (/^[0-9]$/.test(keyText)) return { kind: 'digit', digit: keyText };

    const name = NAMED_KEYS.get(keyText);
    if (name !== undefined) return { kind: 'named', name };

    const isOneSymbol = keyText.length === 1 && !/[a-z0-9\s]/.test(keyText);
    if (isOneSymbol) return { kind: 'character', character: keyText };

    throw new Error(`The shortcut ${text} has an unknown key ${keyText}.`);
}

function sameChordKey(first: ChordKey, second: ChordKey) {
    if (first.kind === 'letter' && second.kind === 'letter') return first.letter === second.letter;
    if (first.kind === 'digit' && second.kind === 'digit') return first.digit === second.digit;
    if (first.kind === 'character' && second.kind === 'character') return first.character === second.character;
    if (first.kind === 'named' && second.kind === 'named') return first.name === second.name;

    return false;
}

// The letter the layout typed, so Ctrl+Z stays on Z in every Latin layout. A layout that types no Latin
// letter there (Cyrillic, Greek, or Option on a Mac) falls back to the key's place on a US keyboard.
function typedLetter(press: KeyPress) {
    const isLatinLetter = /^[a-z]$/i.test(press.key);
    if (isLatinLetter) return press.key.toUpperCase();

    const physicalLetter = /^Key([A-Z])$/.exec(press.code);
    if (physicalLetter === null) return undefined;

    return physicalLetter[1];
}

// Shift+3 types '#', '§' or '"' depending on the layout, so digits go by the physical key.
function physicalDigit(code: string) {
    const digit = /^(?:Digit|Numpad)([0-9])$/.exec(code);
    if (digit === null) return undefined;

    return digit[1];
}
