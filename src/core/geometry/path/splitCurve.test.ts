import { describe, expect, test } from 'vitest';

import type { PathPoint } from '../PathGeometry.ts';

import { curveBetween, pointOnCubic } from './cubicCurve.ts';
import { nearestOnCurve } from './nearestOnCurve.ts';
import { splitCurve } from './splitCurve.ts';

const FROM: PathPoint = { x: 0, y: 0, handleIn: null, handleOut: { x: 30, y: -60 }, corner: 'smooth' };
const TO: PathPoint = { x: 120, y: 0, handleIn: { x: -10, y: -80 }, handleOut: null, corner: 'separate' };

function sharp(x: number, y: number): PathPoint {
    return { x, y, handleIn: null, handleOut: null, corner: 'sharp' };
}

describe('splitCurve', () => {
    test('the two curves left draw exactly the one before', () => {
        const share = 0.3;
        const split = splitCurve(FROM, TO, share);
        const whole = curveBetween(FROM, TO);
        const first = curveBetween(split.from, split.added);
        const second = curveBetween(split.added, split.to);

        for (const along of [0, 0.25, 0.5, 0.75, 1]) {
            const onFirst = pointOnCubic(first, along);
            const onWhole = pointOnCubic(whole, along * share);
            expect(onFirst.x).toBeCloseTo(onWhole.x, 9);
            expect(onFirst.y).toBeCloseTo(onWhole.y, 9);

            const onSecond = pointOnCubic(second, along);
            const onWholeAfter = pointOnCubic(whole, share + along * (1 - share));
            expect(onSecond.x).toBeCloseTo(onWholeAfter.x, 9);
            expect(onSecond.y).toBeCloseTo(onWholeAfter.y, 9);
        }
    });

    test('the new point is smooth, its handles on one line, and the neighbours keep their corners', () => {
        const split = splitCurve(FROM, TO, 0.5);
        const { handleIn, handleOut } = split.added;
        if (handleIn === null || handleOut === null) throw new Error('The new point has no handles.');

        expect(split.added.corner).toBe('smooth');
        expect(handleIn.x * handleOut.y - handleIn.y * handleOut.x).toBeCloseTo(0, 9);
        expect(handleIn.x * handleOut.x + handleIn.y * handleOut.y).toBeLessThan(0);
        expect(split.from.corner).toBe('smooth');
        expect(split.to.corner).toBe('separate');
        expect(split.from.handleIn).toBeNull();
        expect(split.to.handleOut).toBeNull();
    });

    test("the neighbours' handles shorten to match, and a missing one stays missing", () => {
        const split = splitCurve(FROM, TO, 0.5);

        expect(split.from.handleOut).toEqual({ x: 15, y: -30 });
        expect(split.to.handleIn).toEqual({ x: -5, y: -40 });

        const oneSided = splitCurve(sharp(0, 0), TO, 0.5);
        expect(oneSided.from.handleOut).toBeNull();
        expect(oneSided.added.corner).toBe('smooth');
    });

    test('on a straight segment the new point is sharp and the neighbours stay as they were', () => {
        const from = sharp(0, 0);
        const to = sharp(100, 50);

        const split = splitCurve(from, to, 0.25);

        expect(split.added).toEqual(sharp(25, 12.5));
        expect(split.from).toBe(from);
        expect(split.to).toBe(to);
    });
});

describe('nearestOnCurve', () => {
    test('finds the share of a place on the curve', () => {
        const place = pointOnCubic(curveBetween(FROM, TO), 0.37);

        expect(nearestOnCurve(FROM, TO, place)).toBeCloseTo(0.37, 6);
    });

    test('a position off the curve gives the share of the nearest place on it', () => {
        const place = pointOnCubic(curveBetween(FROM, TO), 0.6);
        const off = { x: place.x, y: place.y - 0.5 };
        const share = nearestOnCurve(FROM, TO, off);
        const found = pointOnCubic(curveBetween(FROM, TO), share);

        const dx = found.x - off.x;
        const dy = found.y - off.y;
        expect(dx * dx + dy * dy).toBeLessThanOrEqual(0.25 + 1e-9);
    });

    test('on a straight segment the share is of its length, kept between 0 and 1', () => {
        expect(nearestOnCurve(sharp(0, 0), sharp(100, 0), { x: 40, y: 5 })).toBeCloseTo(0.4, 12);
        expect(nearestOnCurve(sharp(0, 0), sharp(100, 0), { x: -20, y: 5 })).toBe(0);
        expect(nearestOnCurve(sharp(0, 0), sharp(100, 0), { x: 130, y: 0 })).toBe(1);
    });
});
