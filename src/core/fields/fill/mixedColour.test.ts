import { describe, expect, test } from 'vitest';

import type { ColourStop, Fill } from './Fill.ts';
import { mixedColour } from './mixedColour.ts';

function linear(stops: readonly ColourStop[]): Fill {
    return { kind: 'linear', stops, start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
}

describe('mixedColour', () => {
    test('no fill has no colour, and a solid fill is its colour', () => {
        expect(mixedColour({ kind: 'none' })).toBeUndefined();
        expect(mixedColour({ kind: 'solid', colour: '#4A90D9FF' })).toBe('#4A90D9FF');
    });

    test('two stops at the ends mix half and half', () => {
        const fill = linear([
            { colour: '#000000FF', place: 0 },
            { colour: '#FFFFFF00', place: 1 },
        ]);

        expect(mixedColour(fill)).toBe('#80808080');
    });

    test('each stop weighs as much of the bar as it covers', () => {
        // Black alone up to 50%, then black to white: three quarters black, a quarter white.
        const fill = linear([
            { colour: '#000000FF', place: 0.5 },
            { colour: '#FFFFFFFF', place: 1 },
        ]);

        expect(mixedColour(fill)).toBe('#404040FF');
    });

    test('a radial gradient mixes the same way, and the colour past the last stop counts', () => {
        const fill: Fill = {
            kind: 'radial',
            stops: [
                { colour: '#FF0000FF', place: 0 },
                { colour: '#FF0000FF', place: 0.2 },
                { colour: '#0000FFFF', place: 0.2 },
            ],
            centre: { x: 0.5, y: 0.5 },
            radius: 0.5,
        };

        expect(mixedColour(fill)).toBe('#3300CCFF');
    });
});
