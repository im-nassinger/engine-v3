import { describe, expect, test } from 'vitest';

import { KeyChord } from './KeyChord.ts';
import type { KeyboardInputData, KeyboardPlatform } from './KeyboardInputData.ts';
import { KeyPress } from './KeyPress.ts';
import { ABNT2_KEYS, GERMAN_KEYS, MAC_KEYS, RUSSIAN_KEYS, US_KEYS } from './testing/recordedKeys.ts';

function chordMatches(chordText: string, input: KeyboardInputData, platform: KeyboardPlatform = 'other') {
    const chord = KeyChord.parse(chordText);
    const press = KeyPress.fromKeyboard(input, platform);
    if (press === undefined) return false;

    return chord.matches(press);
}

describe('KeyChord on a US layout', () => {
    test('matches letters by the typed letter, with exact modifiers', () => {
        expect(chordMatches('Ctrl+Z', US_KEYS.ctrlZ)).toBe(true);
        expect(chordMatches('Ctrl+Z', US_KEYS.ctrlShiftZ)).toBe(false);
        expect(chordMatches('Ctrl+Shift+Z', US_KEYS.ctrlShiftZ)).toBe(true);
        expect(chordMatches('F', US_KEYS.f)).toBe(true);
        expect(chordMatches('F', US_KEYS.shiftF)).toBe(false);
    });

    test('matches digits by the physical key, on the number row and the numpad', () => {
        expect(chordMatches('Shift+3', US_KEYS.shift3)).toBe(true);
        expect(chordMatches('Shift+0', US_KEYS.shift0)).toBe(true);
        expect(chordMatches('1', US_KEYS.digit1)).toBe(true);
        expect(chordMatches('1', US_KEYS.numpad1)).toBe(true);
        expect(chordMatches('3', US_KEYS.shift3)).toBe(false);
    });

    test('matches symbols by the typed character, whatever Shift it took', () => {
        expect(chordMatches('+', US_KEYS.plus)).toBe(true);
        expect(chordMatches('+', US_KEYS.numpadPlus)).toBe(true);
        expect(chordMatches('+', US_KEYS.equals)).toBe(false);
        expect(chordMatches('=', US_KEYS.equals)).toBe(true);
        expect(chordMatches('=', US_KEYS.ctrlEquals)).toBe(false);
        expect(chordMatches('-', US_KEYS.numpadMinus)).toBe(true);
        expect(chordMatches('Ctrl+=', US_KEYS.ctrlEquals)).toBe(true);
        expect(chordMatches('-', US_KEYS.minus)).toBe(true);
        expect(chordMatches('-', US_KEYS.ctrlMinus)).toBe(false);
        expect(chordMatches('Ctrl+-', US_KEYS.ctrlMinus)).toBe(true);
        expect(chordMatches('?', US_KEYS.questionMark)).toBe(true);
    });

    test('matches named keys by their name', () => {
        expect(chordMatches('Del', US_KEYS.deleteKey)).toBe(true);
        expect(chordMatches('Enter', US_KEYS.enter)).toBe(true);
    });

    test('matches Ctrl+Alt when the browser reports no AltGr', () => {
        expect(chordMatches('Ctrl+Alt+C', US_KEYS.ctrlAltC)).toBe(true);
    });
});

describe('KeyChord on a Brazilian ABNT2 layout', () => {
    test('finds the same shortcuts as on a US layout', () => {
        expect(chordMatches('Ctrl+Z', ABNT2_KEYS.ctrlZ)).toBe(true);
        expect(chordMatches('Shift+3', ABNT2_KEYS.shift3)).toBe(true);
        expect(chordMatches('Shift+0', ABNT2_KEYS.shift0)).toBe(true);
        expect(chordMatches('+', ABNT2_KEYS.plus)).toBe(true);
        expect(chordMatches('Ctrl+=', ABNT2_KEYS.ctrlEquals)).toBe(true);
        expect(chordMatches('?', ABNT2_KEYS.questionMark)).toBe(true);
    });

    test('a letter outside A to Z matches no letter shortcut', () => {
        expect(chordMatches('L', ABNT2_KEYS.cedilla)).toBe(false);
    });
});

describe('KeyChord on a German layout', () => {
    test('keeps Ctrl+Z on the key marked Z, where Y is on a US keyboard', () => {
        expect(chordMatches('Ctrl+Z', GERMAN_KEYS.ctrlZ)).toBe(true);
        expect(chordMatches('Ctrl+Y', GERMAN_KEYS.ctrlY)).toBe(true);
        expect(chordMatches('Ctrl+Z', GERMAN_KEYS.ctrlY)).toBe(false);
    });

    test('finds digits by place although Shift types other symbols', () => {
        expect(chordMatches('Shift+3', GERMAN_KEYS.shift3)).toBe(true);
        expect(chordMatches('Shift+0', GERMAN_KEYS.shift0)).toBe(true);
    });

    test('finds + and - on their own keys, and Ctrl+= behind Shift', () => {
        expect(chordMatches('+', GERMAN_KEYS.plus)).toBe(true);
        expect(chordMatches('-', GERMAN_KEYS.minus)).toBe(true);
        expect(chordMatches('Ctrl+=', GERMAN_KEYS.ctrlEquals)).toBe(true);
        expect(chordMatches('Shift+0', GERMAN_KEYS.ctrlEquals)).toBe(false);
        expect(chordMatches('?', GERMAN_KEYS.questionMark)).toBe(true);
    });

    test('a press with AltGr down is never a shortcut', () => {
        expect(KeyPress.fromKeyboard(GERMAN_KEYS.altGrQ, 'other')).toBeUndefined();
        expect(chordMatches('Ctrl+Alt+Q', GERMAN_KEYS.altGrQ)).toBe(false);
        expect(chordMatches('Ctrl+Alt+E', GERMAN_KEYS.altGrE)).toBe(false);
    });
});

describe('KeyChord on other keyboards', () => {
    test('a layout without Latin letters falls back to the physical key', () => {
        expect(chordMatches('Ctrl+Z', RUSSIAN_KEYS.ctrlZ)).toBe(true);
    });

    test('on a Mac, Cmd is Ctrl and the Control key matches nothing', () => {
        expect(chordMatches('Ctrl+Z', MAC_KEYS.cmdZ, 'mac')).toBe(true);
        expect(chordMatches('Ctrl+Z', MAC_KEYS.controlZ, 'mac')).toBe(false);
        expect(chordMatches('Alt+Z', MAC_KEYS.optionZ, 'mac')).toBe(true);
    });

    test('elsewhere the Windows key matches nothing', () => {
        expect(chordMatches('Ctrl+Z', MAC_KEYS.cmdZ, 'other')).toBe(false);
        expect(chordMatches('Z', MAC_KEYS.cmdZ, 'other')).toBe(false);
    });
});

describe('KeyChord.parse', () => {
    test('reads a + key after modifiers and alone', () => {
        expect(chordMatches('+', US_KEYS.plus)).toBe(true);
        expect(KeyChord.parse('Ctrl++').ctrl).toBe(true);
    });

    test('refuses unknown modifiers, unknown keys, lower case letters and Shift on a symbol', () => {
        expect(() => KeyChord.parse('Hyper+Z')).toThrow('Hyper');
        expect(() => KeyChord.parse('Ctrl+Banana')).toThrow('Banana');
        expect(() => KeyChord.parse('Ctrl+z')).toThrow('z');
        expect(() => KeyChord.parse('Shift+?')).toThrow('Shift');
    });

    test('knows two spellings of the same keys', () => {
        const first = KeyChord.parse('Ctrl+Shift+Z');
        const second = KeyChord.parse('Shift+Ctrl+Z');
        const third = KeyChord.parse('Ctrl+Z');

        expect(first.sameKeysAs(second)).toBe(true);
        expect(first.sameKeysAs(third)).toBe(false);
    });
});

describe('KeyChord.text', () => {
    test('spells the chord as the requirements do, with Cmd and Option on a Mac', () => {
        expect(KeyChord.parse('Ctrl+Shift+Z').text('other')).toBe('Ctrl+Shift+Z');
        expect(KeyChord.parse('Ctrl+Shift+Z').text('mac')).toBe('Cmd+Shift+Z');
        expect(KeyChord.parse('Ctrl+Alt+C').text('mac')).toBe('Cmd+Option+C');
        expect(KeyChord.parse('Del').text('other')).toBe('Del');
        expect(KeyChord.parse('+').text('other')).toBe('+');
        expect(KeyChord.parse('Ctrl+=').text('other')).toBe('Ctrl+=');
    });
});
