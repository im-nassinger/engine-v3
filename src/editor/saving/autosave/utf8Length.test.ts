import { describe, expect, test } from 'vitest';

import { fitsWithoutCounting, utf8Length } from './utf8Length.ts';

describe('utf8Length', () => {
    // The byte counts are TextEncoder's: the editor's code has no DOM types to call it here.
    test.each([
        ['', 0],
        ['level', 5],
        ['Château', 8],
        ['城', 3],
        ['a🙂b', 6],
        ['\uD800x', 4],
        ['x\uDC00', 4],
    ] as const)('counts %j as %i bytes', (text, bytes) => {
        expect(utf8Length(text)).toBe(bytes);
    });
});

describe('fitsWithoutCounting', () => {
    test('is true only while three bytes for each unit still fit', () => {
        expect(fitsWithoutCounting('abc', 9)).toBe(true);
        expect(fitsWithoutCounting('abc', 8)).toBe(false);
    });
});
