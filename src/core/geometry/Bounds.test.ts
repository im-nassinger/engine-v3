import { describe, expect, test } from 'vitest';

import { Bounds } from './Bounds.ts';
import { Matrix2D } from './Matrix2D.ts';

describe('Bounds', () => {
    test('surrounds every point', () => {
        const bounds = Bounds.around([
            { x: 10, y: -5 },
            { x: -20, y: 30 },
            { x: 0, y: 0 },
        ]);

        expect(bounds).toEqual(new Bounds(-20, -5, 10, 30));
        expect(bounds?.width).toBe(30);
        expect(bounds?.height).toBe(35);
        expect(bounds?.centre).toEqual({ x: -5, y: 12.5 });
    });

    test('has no bounds for no points', () => {
        expect(Bounds.around([])).toBeUndefined();
    });

    test('joins two bounds into one covering both', () => {
        const joined = new Bounds(0, 0, 10, 10).union(new Bounds(5, -5, 20, 8));

        expect(joined).toEqual(new Bounds(0, -5, 20, 10));
    });

    test('grows by a margin on every side', () => {
        const grown = new Bounds(0, 0, 10, 20).expandedBy(2);

        expect(grown).toEqual(new Bounds(-2, -2, 12, 22));
    });

    test('overlaps when touching, not when apart', () => {
        const square = new Bounds(0, 0, 10, 10);

        expect(square.overlaps(new Bounds(5, 5, 15, 15))).toBe(true);
        expect(square.overlaps(new Bounds(10, 0, 20, 10))).toBe(true);
        expect(square.overlaps(new Bounds(10.5, 0, 20, 10))).toBe(false);
        expect(square.overlaps(new Bounds(0, -10, 10, -0.5))).toBe(false);
    });

    test('equals bounds with the same four sides only', () => {
        const square = new Bounds(0, 0, 10, 10);

        expect(square.equals(new Bounds(0, 0, 10, 10))).toBe(true);
        expect(square.equals(new Bounds(0, 0, 10, 11))).toBe(false);
        expect(square.equals(new Bounds(1, 0, 10, 10))).toBe(false);
    });

    test('contains points inside and on its edge', () => {
        const square = new Bounds(0, 0, 10, 10);

        expect(square.contains({ x: 5, y: 5 })).toBe(true);
        expect(square.contains({ x: 10, y: 0 })).toBe(true);
        expect(square.contains({ x: 10.1, y: 5 })).toBe(false);
    });

    test('moves through a matrix and covers the turned corners', () => {
        const eighthTurn = Matrix2D.fromTransform({
            position: { x: 100, y: 0 },
            rotation: 45,
            scale: { x: 1, y: 1 },
            skew: 0,
        });

        const turned = new Bounds(-10, -10, 10, 10).transformedBy(eighthTurn);
        const halfDiagonal = 10 * Math.SQRT2;

        expect(turned.left).toBeCloseTo(100 - halfDiagonal, 9);
        expect(turned.right).toBeCloseTo(100 + halfDiagonal, 9);
        expect(turned.top).toBeCloseTo(-halfDiagonal, 9);
        expect(turned.bottom).toBeCloseTo(halfDiagonal, 9);
    });
});
