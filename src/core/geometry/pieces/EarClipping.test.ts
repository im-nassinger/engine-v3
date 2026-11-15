import { describe, expect, test } from 'vitest';

import { EarClipping } from './EarClipping.ts';
import type { Point } from '../Point.ts';
import { PolygonLibrary } from './PolygonLibrary.ts';
import { areaOf, createRandomNumbers, ONE_STROKE_STAR, randomPolygon, totalArea } from '../testing/testPolygons.ts';

describe('EarClipping.triangulate', () => {
    test('cuts a square into two triangles', () => {
        const square: Point[] = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
        ];

        const triangles = EarClipping.triangulate(square);

        expect(triangles).toHaveLength(2);
        expect(totalArea(triangles)).toBe(100);
    });

    test('covers the filled star exactly, middle included', () => {
        const [starOutline = []] = PolygonLibrary.fillEnclosedAreas(ONE_STROKE_STAR);

        const triangles = EarClipping.triangulate(starOutline);

        expect(triangles).toHaveLength(8);
        expect(totalArea(triangles)).toBeCloseTo(areaOf(starOutline), 9);
    });

    test('turns every triangle the positive way, whichever way the outline turns', () => {
        const clockwise: Point[] = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 5, y: 3 },
            { x: 0, y: 10 },
        ];
        const counterClockwise = [...clockwise].reverse();

        const triangles = EarClipping.triangulate(counterClockwise);

        expect(triangles).toHaveLength(3);
        for (const triangle of triangles) {
            expect(areaOf(triangle)).toBeGreaterThan(0);
        }
    });

    test('has nothing for fewer than three points', () => {
        expect(EarClipping.triangulate([{ x: 0, y: 0 }])).toEqual([]);
    });

    test('covers every filled outline of many random polygons, the same way twice', () => {
        const nextRandom = createRandomNumbers(3);

        for (let i = 0; i < 500; i++) {
            const polygon = randomPolygon(nextRandom);
            const outlines = PolygonLibrary.fillEnclosedAreas(polygon);

            for (const outline of outlines) {
                const triangles = EarClipping.triangulate(outline);
                const again = EarClipping.triangulate(outline);
                const outlineArea = areaOf(outline);

                expect(triangles).toHaveLength(outline.length - 2);
                expect(totalArea(triangles)).toBeCloseTo(outlineArea, 6);
                expect(again).toStrictEqual(triangles);
            }
        }
    });
});
