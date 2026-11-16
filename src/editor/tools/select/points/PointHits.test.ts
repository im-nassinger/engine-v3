import { describe, expect, test } from 'vitest';

import { Bounds } from '../../../../core/geometry/index.ts';

import { PointHits } from './PointHits.ts';

const SQUARE = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
];

describe('PointHits', () => {
    test('a point is hit within 6 screen px, measured at the zoom', () => {
        const hits = new PointHits(SQUARE, true);

        expect(hits.pointAt({ x: 106, y: 100 }, 1)).toBe(2);
        expect(hits.pointAt({ x: 107, y: 100 }, 1)).toBeUndefined();
        expect(hits.pointAt({ x: 103, y: 100 }, 2)).toBe(2);
        expect(hits.pointAt({ x: 104, y: 100 }, 2)).toBeUndefined();
    });

    test('of two points in reach the nearer is hit', () => {
        const hits = new PointHits(
            [
                { x: 0, y: 0 },
                { x: 4, y: 0 },
            ],
            false,
        );

        expect(hits.pointAt({ x: 1, y: 0 }, 1)).toBe(0);
        expect(hits.pointAt({ x: 3, y: 0 }, 1)).toBe(1);
    });

    test('an edge is hit within 5 screen px, with the nearest place on it', () => {
        const hits = new PointHits(SQUARE, true);

        expect(hits.edgeAt({ x: 40, y: -5 }, 1)).toEqual({ startIndex: 0, position: { x: 40, y: 0 } });
        expect(hits.edgeAt({ x: 40, y: -6 }, 1)).toBeUndefined();
        expect(hits.edgeAt({ x: 40, y: -6 }, 0.5)?.startIndex).toBe(0);
    });

    test('a polygon has an edge back to its first point and a line does not', () => {
        const closing = { x: -3, y: 50 };

        expect(new PointHits(SQUARE, true).edgeAt(closing, 1)?.startIndex).toBe(3);
        expect(new PointHits(SQUARE, false).edgeAt(closing, 1)).toBeUndefined();
    });

    test('a box gives the points inside it, in order', () => {
        const hits = new PointHits(SQUARE, true);

        expect(hits.pointsInBox(new Bounds(50, -10, 150, 150))).toEqual([1, 2]);
    });
});
