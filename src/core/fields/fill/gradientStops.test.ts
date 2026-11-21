import { describe, expect, test } from 'vitest';

import { colourAt, withoutStop, withStopAdded, withStopChanged } from './gradientStops.ts';

const BLACK = '#000000FF';
const WHITE = '#FFFFFFFF';
const RED = '#FF000000';

const twoStops = [
    { colour: BLACK, place: 0.2 },
    { colour: WHITE, place: 0.6 },
];

describe('colourAt', () => {
    test('gives the first stop before it and the last one after it', () => {
        expect(colourAt(twoStops, 0)).toBe(BLACK);
        expect(colourAt(twoStops, 1)).toBe(WHITE);
    });

    test('blends each channel on its own between two stops, see-through too', () => {
        expect(colourAt(twoStops, 0.4)).toBe('#808080FF');
        expect(
            colourAt(
                [
                    { colour: BLACK, place: 0 },
                    { colour: RED, place: 1 },
                ],
                0.5,
            ),
        ).toBe('#80000080');
    });

    test('a stop exactly on the place gives its colour', () => {
        const stops = [...twoStops, { colour: RED, place: 0.8 }];

        expect(colourAt(stops, 0.6)).toBe(WHITE);
    });
});

describe('withStopAdded', () => {
    test('adds a stop in the middle of the widest gap, with the colour already there', () => {
        const stops = [
            { colour: BLACK, place: 0 },
            { colour: WHITE, place: 0.25 },
            { colour: BLACK, place: 1 },
        ];

        const added = withStopAdded(stops);

        expect(added.stops).toEqual([stops[0], stops[1], { colour: '#808080FF', place: 0.625 }, stops[2]]);
        expect(added.index).toBe(2);
    });

    test('takes the first of gaps as wide', () => {
        const stops = [
            { colour: BLACK, place: 0 },
            { colour: WHITE, place: 0.5 },
            { colour: BLACK, place: 1 },
        ];

        expect(withStopAdded(stops).stops[1]).toEqual({ colour: '#808080FF', place: 0.25 });
    });
});

describe('withoutStop', () => {
    test('chooses the stop after the removed one, or the new last one', () => {
        const stops = [...twoStops, { colour: RED, place: 0.8 }];

        expect(withoutStop(stops, 1)).toEqual({ stops: [stops[0], stops[2]], index: 1 });
        expect(withoutStop(stops, 2)).toEqual({ stops: [stops[0], stops[1]], index: 1 });
    });
});

describe('withStopChanged', () => {
    test('re-sorts the stops and follows the changed one', () => {
        const moved = withStopChanged(twoStops, 0, { colour: BLACK, place: 0.9 });

        expect(moved.stops).toEqual([twoStops[1], { colour: BLACK, place: 0.9 }]);
        expect(moved.index).toBe(1);
    });

    test('keeps the order of equal places', () => {
        const moved = withStopChanged(twoStops, 1, { colour: WHITE, place: 0.2 });

        expect(moved.stops).toEqual([twoStops[0], { colour: WHITE, place: 0.2 }]);
        expect(moved.index).toBe(1);
    });
});
