import { describe, expect, test } from 'vitest';

import { gridColourFor, isDarkColour } from './gridColour.ts';

describe('gridColourFor', () => {
    test('a light background gets dark blue lines', () => {
        expect(gridColourFor({ kind: 'solid', colour: '#BFE3F5FF' })).toBe(0x1e3c5f);
    });

    test('a dark background gets white lines', () => {
        expect(gridColourFor({ kind: 'solid', colour: '#101820FF' })).toBe(0xffffff);
    });

    test('no fill shows the light page, so the lines stay dark', () => {
        expect(gridColourFor({ kind: 'none' })).toBe(0x1e3c5f);
        expect(gridColourFor(undefined)).toBe(0x1e3c5f);
    });
});

describe('isDarkColour', () => {
    test('brightness weighs green most, so pure green is light and pure blue dark', () => {
        expect(isDarkColour('#00FF00FF')).toBe(false);
        expect(isDarkColour('#0000FFFF')).toBe(true);
    });

    test('the alpha is ignored', () => {
        expect(isDarkColour('#FFFFFF00')).toBe(false);
    });
});
