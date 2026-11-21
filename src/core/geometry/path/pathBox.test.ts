import { describe, expect, test } from 'vitest';
import type { PathGeometry, PathPoint } from '../PathGeometry.ts';
import { pathBox } from './pathBox.ts';

function sharp(x: number, y: number): PathPoint {
    return { x, y, handleIn: null, handleOut: null, corner: 'sharp' };
}

describe('pathBox', () => {
    test('a straight path is its points box', () => {
        const path: PathGeometry = { closed: false, points: [sharp(0, 0), sharp(30, -10), sharp(10, 20)] };

        const box = pathBox(path);

        expect([box?.left, box?.top, box?.right, box?.bottom]).toEqual([0, -10, 30, 20]);
    });

    test('a curve bulging past its points reaches its top, not its handles', () => {
        // Handles of 40 straight up from both ends: the curve's top is at 3/4 of them, 30 above.
        const from: PathPoint = { ...sharp(0, 0), handleOut: { x: 0, y: -40 }, corner: 'smooth' };
        const to: PathPoint = { ...sharp(100, 0), handleIn: { x: 0, y: -40 }, corner: 'smooth' };

        const box = pathBox({ closed: false, points: [from, to] });

        expect(box?.top).toBeCloseTo(-30);
        expect([box?.left, box?.right, box?.bottom]).toEqual([0, 100, 0]);
    });

    test('a closed path counts its closing curve', () => {
        const first: PathPoint = { ...sharp(0, 0), handleIn: { x: -40, y: 0 }, corner: 'separate' };
        const last: PathPoint = { ...sharp(0, 100), handleOut: { x: -40, y: 0 }, corner: 'separate' };

        const open = pathBox({ closed: false, points: [first, sharp(50, 50), last] });
        const closed = pathBox({ closed: true, points: [first, sharp(50, 50), last] });

        expect(open?.left).toBe(0);
        expect(closed?.left).toBeCloseTo(-30);
    });

    test('a path with no points has no box', () => {
        expect(pathBox({ closed: false, points: [] })).toBeUndefined();
    });
});
