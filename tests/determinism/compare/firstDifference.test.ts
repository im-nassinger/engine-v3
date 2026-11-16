import { describe, expect, test } from 'vitest';

import { firstDifference } from './firstDifference.ts';

function tick(number: number, hash: string, bodies: [number, string][]) {
    return { tick: number, hash, bodies: bodies.map(([entityId, bodyHash]) => ({ entityId, hash: bodyHash })) };
}

const RECORDED = [
    tick(1, 'aaaaaaaa', [
        [3, '00000001'],
        [4, '00000002'],
    ]),
    tick(2, 'bbbbbbbb', [
        [3, '00000003'],
        [4, '00000004'],
    ]),
];

describe('firstDifference', () => {
    test('two equal runs have none', () => {
        expect(firstDifference(RECORDED, RECORDED)).toBeUndefined();
    });

    test('names the first tick and the first body that differ', () => {
        const run = [
            RECORDED[0]!,
            tick(2, 'cccccccc', [
                [3, '00000003'],
                [4, '0000ffff'],
            ]),
        ];

        expect(firstDifference(run, RECORDED)).toEqual({ tick: 2, entityId: 4 });
    });

    test('a body missing from one run is the one named', () => {
        const run = [tick(1, 'cccccccc', [[4, '00000002']])];

        expect(firstDifference(run, RECORDED)).toEqual({ tick: 1, entityId: 3 });
    });

    test('a shorter run differs at its first missing tick', () => {
        expect(firstDifference(RECORDED.slice(0, 1), RECORDED)).toEqual({ tick: 2, entityId: 3 });
    });
});
