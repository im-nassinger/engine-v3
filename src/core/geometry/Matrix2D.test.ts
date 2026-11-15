import { describe, expect, test } from 'vitest';

import { Matrix2D } from './Matrix2D.ts';
import type { TransformValues } from './TransformValues.ts';

const CLOSE = 1e-9;

function transform(x: number, y: number, rotation: number, scaleX: number, scaleY: number, skew: number) {
    const values: TransformValues = { position: { x, y }, rotation, scale: { x: scaleX, y: scaleY }, skew };

    return values;
}

function expectCloseMatrices(actual: Matrix2D, expected: Matrix2D) {
    expect(actual.a).toBeCloseTo(expected.a, 9);
    expect(actual.b).toBeCloseTo(expected.b, 9);
    expect(actual.c).toBeCloseTo(expected.c, 9);
    expect(actual.d).toBeCloseTo(expected.d, 9);
    expect(actual.tx).toBeCloseTo(expected.tx, 9);
    expect(actual.ty).toBeCloseTo(expected.ty, 9);
}

function expectCloseValues(actual: TransformValues, expected: TransformValues) {
    expect(actual.position.x).toBeCloseTo(expected.position.x, 9);
    expect(actual.position.y).toBeCloseTo(expected.position.y, 9);
    expect(actual.rotation).toBeCloseTo(expected.rotation, 9);
    expect(actual.scale.x).toBeCloseTo(expected.scale.x, 9);
    expect(actual.scale.y).toBeCloseTo(expected.scale.y, 9);
    expect(actual.skew).toBeCloseTo(expected.skew, 9);
}

describe('Matrix2D.fromTransform', () => {
    test('rotates clockwise on screen, with y pointing down', () => {
        const quarterTurn = Matrix2D.fromTransform(transform(0, 0, 90, 1, 1, 0));
        const turned = quarterTurn.apply({ x: 1, y: 0 });

        expect(turned).toEqual({ x: 0, y: 1 });
    });

    test('slants horizontally with skew', () => {
        const slanted = Matrix2D.fromTransform(transform(0, 0, 0, 1, 1, 45));
        const top = slanted.apply({ x: 0, y: 1 });

        expect(top.x).toBeCloseTo(1, 12);
        expect(top.y).toBe(1);
    });

    test('scales, then skews, then rotates, then moves', () => {
        const matrix = Matrix2D.fromTransform(transform(10, 20, 90, 2, 3, 0));
        const moved = matrix.apply({ x: 1, y: 1 });

        expect(moved).toEqual({ x: 7, y: 22 });
    });
});

describe('Matrix2D.decompose', () => {
    test.each([
        transform(0, 0, 0, 1, 1, 0),
        transform(15, -40, 30, 2, 0.5, 20),
        transform(-3.5, 7.25, -135, 0.1, 4, -60),
        transform(100, 100, 179, 1, -1, 89.9),
        transform(0, 0, 90, 3, -2, -45),
        transform(1e4, -1e4, -90, 1e-3, 1e3, 10),
    ])('gives back the values of fromTransform: %o', (values) => {
        const matrix = Matrix2D.fromTransform(values);

        expectCloseValues(matrix.decompose(), values);
    });

    test('shows a mirror in x as rotation 180 and a negative y scale, the same matrix', () => {
        const mirrored = Matrix2D.fromTransform(transform(0, 0, 0, -1, 1, 0));
        const values = mirrored.decompose();

        expectCloseValues(values, transform(0, 0, 180, 1, -1, 0));
        expectCloseMatrices(Matrix2D.fromTransform(values), mirrored);
    });

    test('always returns a skew strictly between -90 and 90', () => {
        const steep = new Matrix2D(1, 0, 1000, 1, 0, 0);
        const values = steep.decompose();

        expect(Math.abs(values.skew)).toBeLessThan(90);
        expectCloseMatrices(Matrix2D.fromTransform(values), steep);
    });

    test('never returns -0', () => {
        const values = Matrix2D.fromTransform(transform(-0, -0, -0, 1, 1, -0)).decompose();

        expect(values).toEqual(transform(0, 0, 0, 1, 1, 0));
    });
});

describe('Matrix2D.invert and determinant', () => {
    test('a matrix times its inverse is the identity', () => {
        const matrix = Matrix2D.fromTransform(transform(12, -8, 33, 2, -0.5, 25));
        const inverse = matrix.invert();

        expect(inverse).toBeDefined();
        expectCloseMatrices(matrix.multiply(inverse!), Matrix2D.identity());
    });

    test('a scale of 0 has no inverse', () => {
        const flattened = Matrix2D.fromTransform(transform(5, 5, 30, 0, 1, 0));

        expect(flattened.invert()).toBeUndefined();
    });

    test('the determinant is negative when mirrored', () => {
        const mirrored = Matrix2D.fromTransform(transform(0, 0, 45, -2, 1, 10));
        const plain = Matrix2D.fromTransform(transform(0, 0, 45, 2, 1, 10));

        expect(mirrored.determinant()).toBeLessThan(0);
        expect(plain.determinant()).toBeGreaterThan(0);
    });
});

describe('moving between parents', () => {
    test('keeps the level matrix, with skew in both parents', () => {
        const oldParentWorld = Matrix2D.fromTransform(transform(50, -20, 30, 2, 0.5, 35));
        const newParentWorld = Matrix2D.fromTransform(transform(-80, 140, -110, 0.75, -3, -50));
        const local = Matrix2D.fromTransform(transform(10, 5, 15, 1.5, 0.8, 20));
        const oldWorld = oldParentWorld.multiply(local);

        const newParentInverse = newParentWorld.invert()!;
        const newLocalValues = newParentInverse.multiply(oldWorld).decompose();
        const newLocal = Matrix2D.fromTransform(newLocalValues);
        const newWorld = newParentWorld.multiply(newLocal);

        for (const key of ['a', 'b', 'c', 'd', 'tx', 'ty'] as const) {
            expect(Math.abs(newWorld[key] - oldWorld[key])).toBeLessThan(CLOSE);
        }
    });
});

describe('Matrix2D.largestStretch', () => {
    test('is the larger scale of a rotated, unevenly scaled matrix', () => {
        const matrix = Matrix2D.fromTransform(transform(5, 7, 30, 2, -3, 0));

        expect(Math.abs(matrix.largestStretch() - 3)).toBeLessThan(CLOSE);
    });

    test('is 1 for no change and 0 for a scale of 0', () => {
        expect(Matrix2D.identity().largestStretch()).toBe(1);
        expect(new Matrix2D(0, 0, 0, 0, 4, 4).largestStretch()).toBe(0);
    });

    test('covers how far a skew stretches the diagonal', () => {
        const matrix = Matrix2D.fromTransform(transform(0, 0, 0, 1, 1, 45));
        const diagonal = matrix.apply({ x: Math.SQRT1_2, y: Math.SQRT1_2 });
        const diagonalLength = Math.sqrt(diagonal.x * diagonal.x + diagonal.y * diagonal.y);

        expect(matrix.largestStretch()).toBeGreaterThanOrEqual(diagonalLength);
    });
});
