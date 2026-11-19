import { describe, expect, test } from 'vitest';

import { isDarkBackground, isDarkColour } from './levelBackground.ts';

describe('isDarkBackground', () => {
    test('a light fill is light and a dark fill dark', () => {
        expect(isDarkBackground({ kind: 'solid', colour: '#BFE3F5FF' })).toBe(false);
        expect(isDarkBackground({ kind: 'solid', colour: '#1A2140FF' })).toBe(true);
    });

    test('no fill shows the dark app behind the canvas', () => {
        expect(isDarkBackground({ kind: 'none' })).toBe(true);
        expect(isDarkBackground(undefined)).toBe(true);
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
