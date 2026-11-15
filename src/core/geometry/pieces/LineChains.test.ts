import { describe, expect, test } from 'vitest';

import { LineChains } from './LineChains.ts';
import type { Point } from '../Point.ts';
import { turn } from './Ring.ts';
import { createRandomNumbers } from '../testing/testPolygons.ts';

function randomLine(nextRandom: () => number) {
    const pointCount = 2 + Math.floor(nextRandom() * 14);
    const points: Point[] = [];

    for (let i = 0; i < pointCount; i++) {
        const x = Math.round((nextRandom() - 0.5) * 2000) / 10;
        const y = Math.round((nextRandom() - 0.5) * 2000) / 10;
        points.push({ x, y });
    }

    return points;
}

// Strictly through each other, so segments that only meet at a chain's shared point don't count.
function crossesStrictly(a: Point, b: Point, c: Point, d: Point) {
    const cSide = turn(a, b, c);
    const dSide = turn(a, b, d);
    const aSide = turn(c, d, a);
    const bSide = turn(c, d, b);

    return cSide * dSide < 0 && aSide * bSide < 0;
}

function segmentsOf(chain: readonly Point[]) {
    const segments: [Point, Point][] = [];

    for (let i = 0; i + 1 < chain.length; i++) {
        const start = chain[i];
        const end = chain[i + 1];
        if (start === undefined || end === undefined) throw new Error('A chain has a gap.');

        segments.push([start, end]);
    }

    return segments;
}

function crossesItself(chain: readonly Point[]) {
    const segments = segmentsOf(chain);

    for (let first = 0; first < segments.length; first++) {
        for (let second = first + 2; second < segments.length; second++) {
            const [a, b] = segments[first] ?? [];
            const [c, d] = segments[second] ?? [];
            if (a === undefined || b === undefined || c === undefined || d === undefined) continue;
            if (crossesStrictly(a, b, c, d)) return true;
        }
    }

    return false;
}

function shortestStepSquared(chain: readonly Point[]) {
    let shortest = Infinity;

    for (const [start, end] of segmentsOf(chain)) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        shortest = Math.min(shortest, dx * dx + dy * dy);
    }

    return shortest;
}

describe('LineChains.build', () => {
    test('keeps a straight line as one chain, its points as they are', () => {
        const line = [
            { x: 0, y: 0 },
            { x: 50, y: 0 },
            { x: 100, y: 0 },
        ];

        expect(LineChains.build(line)).toEqual([line]);
    });

    test('cuts a line that crosses itself once into three chains meeting at the crossing', () => {
        const line = [
            { x: 0, y: 50 },
            { x: 100, y: 50 },
            { x: 100, y: 0 },
            { x: 50, y: 0 },
            { x: 50, y: 100 },
        ];
        const crossingPoint = { x: 50, y: 50 };

        expect(LineChains.build(line)).toEqual([
            [{ x: 0, y: 50 }, crossingPoint],
            [crossingPoint, { x: 100, y: 50 }, { x: 100, y: 0 }, { x: 50, y: 0 }, crossingPoint],
            [crossingPoint, { x: 50, y: 100 }],
        ]);
    });

    test('cuts a line that crosses itself twice into five chains', () => {
        const line = [
            { x: 0, y: 0 },
            { x: 128, y: 0 },
            { x: 128, y: -64 },
            { x: 32, y: -64 },
            { x: 32, y: 64 },
            { x: 96, y: 64 },
            { x: 96, y: -32 },
        ];
        const left = { x: 32, y: 0 };
        const right = { x: 96, y: 0 };

        expect(LineChains.build(line)).toEqual([
            [{ x: 0, y: 0 }, left],
            [left, right],
            [right, { x: 128, y: 0 }, { x: 128, y: -64 }, { x: 32, y: -64 }, left],
            [left, { x: 32, y: 64 }, { x: 96, y: 64 }, right],
            [right, { x: 96, y: -32 }],
        ]);
    });

    test('cuts the earlier part where the line ends on it', () => {
        const line = [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 50 },
            { x: 50, y: 50 },
            { x: 50, y: 0 },
        ];
        const touch = { x: 50, y: 0 };

        expect(LineChains.build(line)).toEqual([
            [{ x: 0, y: 0 }, touch],
            [touch, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 50 }, touch],
        ]);
    });

    test('cuts at a point the line passes through twice', () => {
        const line = [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
            { x: 0, y: 0 },
            { x: -100, y: 0 },
        ];
        const twice = { x: 0, y: 0 };

        expect(LineChains.build(line)).toEqual([
            [twice, { x: 100, y: 0 }, { x: 100, y: 100 }, twice],
            [twice, { x: -100, y: 0 }],
        ]);
    });

    test('merges points closer than 0.25 px, keeping both ends of the line', () => {
        const line = [
            { x: 0, y: 0 },
            { x: 0.2, y: 0 },
            { x: 50, y: 0 },
            { x: 100, y: 0 },
            { x: 100.1, y: 0 },
        ];

        expect(LineChains.build(line)).toEqual([
            [
                { x: 0, y: 0 },
                { x: 50, y: 0 },
                { x: 100.1, y: 0 },
            ],
        ]);
    });

    test('gives no chain for a line shorter than 0.25 px or with one point', () => {
        expect(LineChains.build([{ x: 0, y: 0 }])).toEqual([]);
        expect(
            LineChains.build([
                { x: 0, y: 0 },
                { x: 0.1, y: 0.1 },
            ]),
        ).toEqual([]);
    });

    test('does not cut a line that turns back along itself', () => {
        const line = [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 50, y: 0 },
        ];

        expect(LineChains.build(line)).toEqual([line]);
    });

    test('gives chains that never cross themselves, with points at least 0.25 px apart, for random lines', () => {
        const nextRandom = createRandomNumbers(7);

        for (let run = 0; run < 500; run++) {
            const line = randomLine(nextRandom);
            const chains = LineChains.build(line);

            expect(chains).toEqual(LineChains.build(line));
            for (const chain of chains) {
                expect(chain.length).toBeGreaterThanOrEqual(2);
                expect(shortestStepSquared(chain)).toBeGreaterThanOrEqual(0.25 * 0.25);
                expect(crossesItself(chain)).toBe(false);
            }
        }
    });
});
