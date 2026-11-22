import { describe, expect, test } from 'vitest';

import { KeyCodes } from './KeyCodes.ts';
import type { KeyCode } from './KeyCodes.ts';

describe('KeyCodes', () => {
    test('names each key as the Entity inspector shows it', () => {
        expect(KeyCodes.label('KeyW' as KeyCode)).toBe('W');
        expect(KeyCodes.label('ArrowLeft' as KeyCode)).toBe('Left arrow');
        expect(KeyCodes.label('Space' as KeyCode)).toBe('Space');
        expect(KeyCodes.label('Digit1' as KeyCode)).toBe('1');
        expect(KeyCodes.labels(['KeyA', 'ArrowLeft'] as KeyCode[])).toBe('A, Left arrow');
    });

    test('the letters, digits, arrows, Space and Enter can be bound', () => {
        for (const code of ['KeyA', 'KeyZ', 'Digit0', 'ArrowUp', 'Space', 'Enter', 'ShiftLeft', 'Numpad5']) {
            expect(KeyCodes.isBindable(code)).toBe(true);
        }
    });

    test('Tab, Esc, the browser keys and the shortcut keys can not', () => {
        const refused = ['Tab', 'Escape', 'F1', 'F5', 'F12', 'ControlLeft', 'AltRight', 'MetaLeft', 'ContextMenu'];
        for (const code of [...refused, 'BrowserBack', 'MediaPlayPause', 'AudioVolumeUp', 'PrintScreen', '', 'w']) {
            expect(KeyCodes.isBindable(code)).toBe(false);
        }
    });

    test('every bindable key has a name, and each name is used once', () => {
        const labels = KeyCodes.all.map((code) => KeyCodes.label(code));

        expect(KeyCodes.all.length).toBe(78);
        expect(new Set(labels).size).toBe(labels.length);
    });

    test('a key that can not be bound has no name', () => {
        expect(() => KeyCodes.label('Tab' as KeyCode)).toThrow();
    });
});
