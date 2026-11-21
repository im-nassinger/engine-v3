import { describe, expect, test } from 'vitest';

import type { Fill } from './Fill.ts';
import { switchFillKind } from './switchFillKind.ts';

const RED = '#FF000080';
const BLUE = '#4A90D9FF';
const stops = [
    { colour: RED, place: 0.2 },
    { colour: '#00FF00FF', place: 0.9 },
];
const linear: Fill = { kind: 'linear', stops, start: { x: 0.1, y: 0.1 }, end: { x: 0.9, y: 0.9 } };
const radial: Fill = { kind: 'radial', stops, centre: { x: 0.3, y: 0.3 }, radius: 0.2 };

const NEW_LINE = { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
const NEW_CIRCLE = { centre: { x: 0.5, y: 0.5 }, radius: 0.5 };

describe('switchFillKind', () => {
    test('Solid to a gradient makes the colour and the same colour fully see-through, at 0% and 100%', () => {
        const solid: Fill = { kind: 'solid', colour: RED };
        const twoStops = [
            { colour: RED, place: 0 },
            { colour: '#FF000000', place: 1 },
        ];

        expect(switchFillKind(solid, 'linear')).toEqual({ kind: 'linear', stops: twoStops, ...NEW_LINE });
        expect(switchFillKind(solid, 'radial')).toEqual({ kind: 'radial', stops: twoStops, ...NEW_CIRCLE });
    });

    test('Linear and Radial swap and keep the stops', () => {
        expect(switchFillKind(linear, 'radial')).toEqual({ kind: 'radial', stops, ...NEW_CIRCLE });
        expect(switchFillKind(radial, 'linear')).toEqual({ kind: 'linear', stops, ...NEW_LINE });
    });

    test("a gradient to Solid keeps its first stop's colour", () => {
        expect(switchFillKind(linear, 'solid')).toEqual({ kind: 'solid', colour: RED });
        expect(switchFillKind(radial, 'solid')).toEqual({ kind: 'solid', colour: RED });
    });

    test("None to Solid or a gradient starts from v1's default fill", () => {
        const none: Fill = { kind: 'none' };
        const twoStops = [
            { colour: BLUE, place: 0 },
            { colour: '#4A90D900', place: 1 },
        ];

        expect(switchFillKind(none, 'solid')).toEqual({ kind: 'solid', colour: BLUE });
        expect(switchFillKind(none, 'linear')).toEqual({ kind: 'linear', stops: twoStops, ...NEW_LINE });
        expect(switchFillKind(none, 'radial')).toEqual({ kind: 'radial', stops: twoStops, ...NEW_CIRCLE });
    });

    test('any fill to None paints nothing', () => {
        expect(switchFillKind({ kind: 'solid', colour: RED }, 'none')).toEqual({ kind: 'none' });
        expect(switchFillKind(linear, 'none')).toEqual({ kind: 'none' });
        expect(switchFillKind(radial, 'none')).toEqual({ kind: 'none' });
    });

    test('the same kind keeps the fill as it is', () => {
        expect(switchFillKind(linear, 'linear')).toBe(linear);
        expect(switchFillKind(radial, 'radial')).toBe(radial);
    });
});
