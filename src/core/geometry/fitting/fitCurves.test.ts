import { describe, expect, test } from 'vitest';

import { DeterministicMath } from '../../math/index.ts';

import { curveBetween, pointOnCubic } from '../path/cubicCurve.ts';
import { nearestOnCurve } from '../path/nearestOnCurve.ts';
import type { PathGeometry } from '../PathGeometry.ts';
import type { Point } from '../Point.ts';

import { fitCurves } from './fitCurves.ts';

const MAX_PATH_POINTS = 2_000;

// The tolerance is checked at the fit's own shares, and the nearest place on the curve is found by sampling.
const MEASURING_SLACK = 1e-6;

function wave(count: number): Point[] {
    const points: Point[] = [];
    for (let i = 0; i < count; i++) {
        const x = i * 2;
        points.push({ x, y: DeterministicMath.sin(x / 40) * 60 + DeterministicMath.sin(x / 13) * 15 });
    }
    return points;
}

function loop(count: number): Point[] {
    const points: Point[] = [];
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const radius = 100 + DeterministicMath.sin(angle * 5) * 20;
        points.push({ x: DeterministicMath.cos(angle) * radius, y: DeterministicMath.sin(angle) * radius });
    }
    return points;
}

function distanceToPath(path: PathGeometry, position: Point) {
    const { points, closed } = path;
    const segmentCount = closed ? points.length : points.length - 1;
    let nearest = Infinity;

    for (let i = 0; i < segmentCount; i++) {
        const from = points[i];
        const to = points[(i + 1) % points.length];
        if (from === undefined || to === undefined) throw new Error('The path is missing a point.');

        const share = nearestOnCurve(from, to, position);
        const onCurve = pointOnCubic(curveBetween(from, to), share);
        const dx = onCurve.x - position.x;
        const dy = onCurve.y - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        nearest = Math.min(nearest, distance);
    }

    return nearest;
}

function farthestFromPath(path: PathGeometry, dragged: readonly Point[]) {
    let farthest = 0;
    for (const position of dragged) {
        farthest = Math.max(farthest, distanceToPath(path, position));
    }
    return farthest;
}

describe('fitCurves', () => {
    test.each([1.5, 4, 10])('every dragged point lies within a tolerance of %d', (tolerance) => {
        const dragged = wave(400);

        const fit = fitCurves(dragged, { closed: false, tolerance, maxPoints: MAX_PATH_POINTS });

        expect(fit.toleranceRaised).toBe(false);
        expect(fit.path.points.length).toBeLessThan(dragged.length / 4);
        expect(farthestFromPath(fit.path, dragged)).toBeLessThanOrEqual(tolerance + MEASURING_SLACK);
    });

    test('a smaller tolerance gives more points', () => {
        const dragged = wave(400);

        const loose = fitCurves(dragged, { closed: false, tolerance: 10, maxPoints: MAX_PATH_POINTS });
        const close = fitCurves(dragged, { closed: false, tolerance: 1.5, maxPoints: MAX_PATH_POINTS });

        expect(close.path.points.length).toBeGreaterThan(loose.path.points.length);
    });

    test('an open path starts and ends on the drag, and every point is smooth', () => {
        const dragged = wave(400);

        const { path } = fitCurves(dragged, { closed: false, tolerance: 4, maxPoints: MAX_PATH_POINTS });

        const first = path.points[0];
        const last = path.points[path.points.length - 1];
        expect(path.closed).toBe(false);
        expect(first).toMatchObject({ ...dragged[0], handleIn: null });
        expect(last).toMatchObject({ ...dragged[dragged.length - 1], handleOut: null });
        for (const point of path.points) {
            expect(point.corner).toBe('smooth');
        }
    });

    test('the points between the ends keep their two handles in one line', () => {
        const { path } = fitCurves(wave(400), { closed: false, tolerance: 1.5, maxPoints: MAX_PATH_POINTS });

        const middle = path.points.slice(1, -1);
        expect(middle.length).toBeGreaterThan(0);
        for (const point of middle) {
            const handleIn = point.handleIn as Point;
            const handleOut = point.handleOut as Point;
            const cross = handleIn.x * handleOut.y - handleIn.y * handleOut.x;
            const facing = handleIn.x * handleOut.x + handleIn.y * handleOut.y;
            expect(Math.abs(cross)).toBeLessThan(1e-6 * (1 + Math.abs(facing)));
            expect(facing).toBeLessThanOrEqual(0);
        }
    });

    test('a closed loop closes, smooth all the way round, within the tolerance', () => {
        const dragged = loop(300);

        const { path } = fitCurves(dragged, { closed: true, tolerance: 4, maxPoints: MAX_PATH_POINTS });

        expect(path.closed).toBe(true);
        expect(path.points.length).toBeGreaterThanOrEqual(3);
        expect(path.points[0]).toMatchObject(dragged[0] as Point);
        for (const point of path.points) {
            expect(point.corner).toBe('smooth');
            expect(point.handleIn).not.toBeNull();
            expect(point.handleOut).not.toBeNull();
        }

        const start = path.points[0];
        const startIn = start?.handleIn as Point;
        const startOut = start?.handleOut as Point;
        expect(startIn.x * startOut.y - startIn.y * startOut.x).toBeCloseTo(0);
        expect(farthestFromPath(path, dragged)).toBeLessThanOrEqual(4 + MEASURING_SLACK);
    });

    test('a small closed loop still has the 3 points a closed path needs', () => {
        const triangle = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 5, y: 8 },
        ];

        const { path } = fitCurves(triangle, { closed: true, tolerance: 10, maxPoints: MAX_PATH_POINTS });

        expect(path.closed).toBe(true);
        expect(path.points).toHaveLength(3);
    });

    test('a straight drag gives two points', () => {
        const dragged: Point[] = [];
        for (let i = 0; i <= 80; i++) {
            dragged.push({ x: i * 3, y: i * 1.5 });
        }

        const { path } = fitCurves(dragged, { closed: false, tolerance: 1.5, maxPoints: MAX_PATH_POINTS });

        expect(path.points).toHaveLength(2);
        expect(path.points[0]).toMatchObject({ x: 0, y: 0 });
        expect(path.points[1]).toMatchObject({ x: 240, y: 120 });
    });

    test('repeated points are skipped', () => {
        const dragged = [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 0 },
        ];

        const { path } = fitCurves(dragged, { closed: false, tolerance: 1.5, maxPoints: MAX_PATH_POINTS });

        expect(path.points).toHaveLength(2);
    });

    test('a drag of one place is refused', () => {
        const still = [
            { x: 5, y: 5 },
            { x: 5, y: 5 },
        ];

        expect(() => fitCurves(still, { closed: false, tolerance: 4, maxPoints: MAX_PATH_POINTS })).toThrow();
    });

    test('the same drag twice gives the same path, and the drag is left as it was', () => {
        const dragged = loop(500);
        const copy = dragged.map((point) => ({ ...point }));

        const once = fitCurves(dragged, { closed: true, tolerance: 1.5, maxPoints: MAX_PATH_POINTS });
        const twice = fitCurves(dragged, { closed: true, tolerance: 1.5, maxPoints: MAX_PATH_POINTS });

        expect(twice).toEqual(once);
        expect(dragged).toEqual(copy);
    });

    test('an over-detailed fit doubles the tolerance until it stays within 2,000 points', () => {
        const zigzag: Point[] = [];
        for (let i = 0; i < 4_000; i++) {
            zigzag.push({ x: i, y: (i % 2) * 6 + DeterministicMath.sin(i / 50) * 40 });
        }

        const fit = fitCurves(zigzag, { closed: false, tolerance: 0.01, maxPoints: MAX_PATH_POINTS });

        expect(fit.toleranceRaised).toBe(true);
        expect(fit.path.points.length).toBeLessThanOrEqual(MAX_PATH_POINTS);
        expect(fit.path.points.length).toBeGreaterThan(2);
    });
});
