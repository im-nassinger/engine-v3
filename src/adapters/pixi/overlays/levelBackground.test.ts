import { describe, expect, test } from 'vitest';

import { isDarkBackground, isDarkColour } from './levelBackground.ts';

describe('isDarkBackground', () => {
    test('a light fill is light and a dark fill dark', () => {
        expect(isDarkBackground({ kind: 'solid', colour: '#BFE3F5FF' })).toBe(false);
        expect(isDarkBackground({ kind: 'solid', colour: '#1A2140FF' })).toBe(true);
    });

    test("a gradient is as dark as its stops' mixed colour", () => {
        const sky = (top: string, bottom: string) => ({
            kind: 'linear' as const,
            stops: [
                { colour: top, place: 0 },
                { colour: bottom, place: 1 },
            ],
            start: { x: 0.5, y: 0 },
            end: { x: 0.5, y: 1 },
        });

        expect(isDarkBackground(sky('#87CEEBFF', '#FFFFFFFF'))).toBe(false);
        expect(isDarkBackground(sky('#0B1030FF', '#3A2A60FF'))).toBe(true);
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
