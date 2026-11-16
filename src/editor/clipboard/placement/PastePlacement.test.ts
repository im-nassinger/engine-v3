import { describe, expect, test } from 'vitest';

import { Bounds, Matrix2D } from '../../../core/geometry/index.ts';
import type { TransformValues } from '../../../core/geometry/index.ts';

import { PastePlacement } from './PastePlacement.ts';

const BOX = new Bounds(279, -11, 321, 11);

function largestDifference(first: Matrix2D, second: Matrix2D) {
    const differences = [
        first.a - second.a,
        first.b - second.b,
        first.c - second.c,
        first.d - second.d,
        first.tx - second.tx,
        first.ty - second.ty,
    ];

    return Math.max(...differences.map((difference) => Math.abs(difference)));
}

describe('PastePlacement', () => {
    test('centres the box on the destination with grid snapping off', () => {
        const placement = new PastePlacement(BOX, { x: 101, y: 57 }, undefined);

        expect(placement.offset).toEqual({ x: 101 - 300, y: 57 - 0 });
    });

    test("with grid snapping on, puts the centred box's top left on the nearest grid point", () => {
        // Centred, the box's top left is at 80, 46: the nearest grid point is 96, 32.
        const placement = new PastePlacement(BOX, { x: 101, y: 57 }, 32);

        expect(placement.offset).toEqual({ x: 96 - 279, y: 32 - -11 });
    });

    test('the destination is the mouse over the level view, otherwise the view’s middle', () => {
        const middle = { x: 5, y: 6 };

        expect(PastePlacement.destinationOf({ x: 1, y: 2 }, middle)).toEqual({ x: 1, y: 2 });
        expect(PastePlacement.destinationOf(undefined, middle)).toEqual(middle);
    });

    test('a root placed inside a rotated, skewed group looks as it did when copied, moved by the offset', () => {
        const placement = new PastePlacement(BOX, { x: 0, y: 0 }, undefined);
        const root: TransformValues = { position: { x: 300, y: 0 }, rotation: 15, scale: { x: 1, y: 2 }, skew: 5 };
        const groupValues: TransformValues = {
            position: { x: 100, y: 50 },
            rotation: 30,
            scale: { x: 2, y: 1 },
            skew: 10,
        };
        const groupMatrix = Matrix2D.fromTransform(groupValues);

        const placed = placement.placeRoot(root, Matrix2D.identity(), groupMatrix);

        const onScreen = groupMatrix.multiply(Matrix2D.fromTransform(placed));
        const move = new Matrix2D(1, 0, 0, 1, placement.offset.x, placement.offset.y);
        const expected = move.multiply(Matrix2D.fromTransform(root));
        expect(largestDifference(onScreen, expected)).toBeLessThan(1e-9);
    });
});
