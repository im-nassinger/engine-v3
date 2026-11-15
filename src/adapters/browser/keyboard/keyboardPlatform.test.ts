import { describe, expect, test } from 'vitest';
import { keyboardPlatform } from './keyboardPlatform.ts';

describe('keyboardPlatform', () => {
    test('reads Apple machines as a Mac and the rest as other', () => {
        expect(keyboardPlatform('MacIntel')).toBe('mac');
        expect(keyboardPlatform('iPhone')).toBe('mac');
        expect(keyboardPlatform('Win32')).toBe('other');
        expect(keyboardPlatform('Linux x86_64')).toBe('other');
    });
});
