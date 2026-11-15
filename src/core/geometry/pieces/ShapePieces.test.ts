import { describe, expect, test } from 'vitest';

import type { CollisionPiece } from './CollisionPiece.ts';
import { ConvexMerging } from './ConvexMerging.ts';
import type { Point } from '../Point.ts';
import { ELLIPSE_POINT_COUNT, ShapePieces } from './ShapePieces.ts';
import {
    areaOf,
    createRandomNumbers,
    FIGURE_OF_EIGHT,
    ONE_STROKE_STAR,
    randomPolygon,
    totalArea,
} from '../testing/testPolygons.ts';

function polygonPoints(pieces: readonly CollisionPiece[]) {
    const polygons: (readonly Point[])[] = [];

    for (const piece of pieces) {
        if (piece.kind !== 'polygon') throw new Error('Expected only polygon pieces.');
        polygons.push(piece.points);
    }

    return polygons;
}

function expectValidPieces(polygons: readonly (readonly Point[])[]) {
    for (const points of polygons) {
        expect(points.length).toBeGreaterThanOrEqual(3);
        expect(points.length).toBeLessThanOrEqual(8);
        expect(ConvexMerging.isConvex(points)).toBe(true);
    }
}

describe('ShapePieces.build', () => {
    test('makes a rectangle one 4-point piece centred on the origin, turning the positive way', () => {
        const result = ShapePieces.build({ kind: 'rectangle', width: 100, height: 40 });
        const [piece] = polygonPoints(result.pieces);

        expect(result.pieces).toHaveLength(1);
        expect(piece).toEqual([
            { x: -50, y: -20 },
            { x: 50, y: -20 },
            { x: 50, y: 20 },
            { x: -50, y: 20 },
        ]);
        expect(areaOf(piece ?? [])).toBe(4000);
        expect(result.filledOutlines).toEqual([piece]);
    });

    test('makes an ellipse with equal sides one circle', () => {
        const result = ShapePieces.build({ kind: 'ellipse', width: 80, height: 80 });

        expect(result.pieces).toEqual([{ kind: 'circle', radius: 40 }]);
        expect(result.filledOutlines).toEqual([]);
    });

    test('makes any other ellipse convex pieces of its 32 points', () => {
        const result = ShapePieces.build({ kind: 'ellipse', width: 100, height: 60 });
        const polygons = polygonPoints(result.pieces);
        const [outline = []] = result.filledOutlines;

        expect(outline).toHaveLength(ELLIPSE_POINT_COUNT);
        expect(outline).toContainEqual({ x: 50, y: 0 });
        expect(outline).toContainEqual({ x: 0, y: 30 });
        expect(polygons).toHaveLength(5);
        expectValidPieces(polygons);
        expect(totalArea(polygons)).toBeCloseTo(areaOf(outline), 6);
    });

    test('gives the circle as the 32-point polygon when asked for polygons', () => {
        const asPolygons = ShapePieces.buildAsPolygons({ kind: 'ellipse', width: 80, height: 80 });
        const [outline = []] = asPolygons.filledOutlines;

        expect(outline).toHaveLength(ELLIPSE_POINT_COUNT);
        expectValidPieces(polygonPoints(asPolygons.pieces));
    });

    test('cuts a figure-of-eight into its two triangles', () => {
        const result = ShapePieces.build({ kind: 'polygon', points: FIGURE_OF_EIGHT });
        const polygons = polygonPoints(result.pieces);

        expect(result.filledOutlines).toHaveLength(2);
        expect(polygons).toHaveLength(2);
        expectValidPieces(polygons);
        expect(totalArea(polygons)).toBe(5000);
    });

    test('fills a one-stroke star, middle included, with five convex pieces', () => {
        const result = ShapePieces.build({ kind: 'polygon', points: ONE_STROKE_STAR });
        const polygons = polygonPoints(result.pieces);
        const [outline = []] = result.filledOutlines;

        expect(outline).toHaveLength(10);
        expect(polygons).toHaveLength(5);
        expectValidPieces(polygons);
        expect(totalArea(polygons)).toBeCloseTo(areaOf(outline), 6);
    });

    test('merges close points and drops straight ones before cutting', () => {
        const square: Point[] = [
            { x: 0, y: 0 },
            { x: 50, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 0.1 },
            { x: 100, y: 100 },
            { x: 0, y: 100 },
        ];

        const result = ShapePieces.build({ kind: 'polygon', points: square });
        const polygons = polygonPoints(result.pieces);

        expect(polygons).toHaveLength(1);
        expect(polygons[0]).toHaveLength(4);
    });

    test('drops pieces under 1 px on their short side', () => {
        const thinRectangle = ShapePieces.build({ kind: 'rectangle', width: 500, height: 0.9 });
        const tinyCircle = ShapePieces.build({ kind: 'ellipse', width: 0.5, height: 0.5 });
        const thinSliver: Point[] = [
            { x: 0, y: 0 },
            { x: 300, y: 0 },
            { x: 0, y: 0.8 },
        ];
        const sliver = ShapePieces.build({ kind: 'polygon', points: thinSliver });
        const justWideEnough = ShapePieces.build({ kind: 'rectangle', width: 500, height: 1 });

        expect(thinRectangle.pieces).toEqual([]);
        expect(tinyCircle.pieces).toEqual([]);
        expect(sliver.pieces).toEqual([]);
        expect(justWideEnough.pieces).toHaveLength(1);
    });

    test('has no pieces for a line or for a polygon with fewer than three points', () => {
        const line = ShapePieces.build({
            kind: 'line',
            points: [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
            ],
        });
        const twoPoints = ShapePieces.build({
            kind: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
            ],
        });

        expect(line).toEqual({ filledOutlines: [], pieces: [] });
        expect(twoPoints).toEqual({ filledOutlines: [], pieces: [] });
    });

    test('cuts many random polygons into valid pieces, the same way twice', () => {
        const nextRandom = createRandomNumbers(11);

        for (let i = 0; i < 300; i++) {
            const points = randomPolygon(nextRandom);
            const first = ShapePieces.build({ kind: 'polygon', points });
            const second = ShapePieces.build({ kind: 'polygon', points });
            const polygons = polygonPoints(first.pieces);

            expectValidPieces(polygons);
            expect(totalArea(polygons)).toBeLessThanOrEqual(totalArea(first.filledOutlines) + 1e-6);
            expect(second).toEqual(first);
        }
    });
});
