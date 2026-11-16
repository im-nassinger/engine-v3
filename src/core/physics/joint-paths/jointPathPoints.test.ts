import { describe, expect, test } from 'vitest';

import { jointPathPoints } from './jointPathPoints.ts';

describe('jointPathPoints', () => {
    test('a Rope is a straight line between its ends', () => {
        const path = jointPathPoints('rope', { x: 0, y: 0 }, { x: 30, y: 40 });

        expect(path.closed).toBe(false);
        expect(path.points.map(({ x, y }) => ({ x, y }))).toEqual([
            { x: 0, y: 0 },
            { x: 30, y: 40 },
        ]);
        expect(path.points.every((point) => point.corner === 'sharp' && point.handleIn === null)).toBe(true);
    });

    test('a Spring zigzags 8 teeth, 8 px each side of the line, from end to end', () => {
        const path = jointPathPoints('spring', { x: 0, y: 0 }, { x: 160, y: 0 });
        const points = path.points;

        expect(points).toHaveLength(10);
        expect(points[0]).toMatchObject({ x: 0, y: 0 });
        expect(points[9]).toMatchObject({ x: 160, y: 0 });

        const teeth = points.slice(1, 9);
        expect(teeth.map((point) => point.x)).toEqual([10, 30, 50, 70, 90, 110, 130, 150]);
        expect(teeth.map((point) => point.y)).toEqual([-8, 8, -8, 8, -8, 8, -8, 8]);
    });

    test("a Spring's teeth stand across a slanted line", () => {
        const path = jointPathPoints('spring', { x: 10, y: 10 }, { x: 10, y: 90 });
        const firstTooth = path.points[1];

        expect(firstTooth?.x).toBeCloseTo(18, 9);
        expect(firstTooth?.y).toBeCloseTo(15, 9);
    });

    test('a Spring with both ends in one place still has its teeth', () => {
        const path = jointPathPoints('spring', { x: 5, y: 5 }, { x: 5, y: 5 });

        expect(path.points).toHaveLength(10);
        expect(path.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
        expect(path.points[1]).toMatchObject({ x: 5, y: -3 });
    });
});
