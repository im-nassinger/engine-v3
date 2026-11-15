import { describe, expect, test } from 'vitest';

import { ShapeGeometryValue } from './ShapeGeometryValue.ts';

describe('ShapeGeometryValue', () => {
    const valueType = new ShapeGeometryValue();
    const triangle = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 80 },
    ];

    test('parse accepts each of the four kinds', () => {
        const rawShapes = [
            { kind: 'rectangle', width: 200, height: 100 },
            { kind: 'ellipse', width: 50, height: 50 },
            { kind: 'polygon', points: triangle },
            { kind: 'line', points: triangle.slice(0, 2) },
        ];

        for (const raw of rawShapes) {
            expect(valueType.parse(raw)).toEqual({ ok: true, value: raw });
        }
    });

    test('a polygon needs 3 points and a line 2', () => {
        const twoPoints = triangle.slice(0, 2);
        const onePoint = triangle.slice(0, 1);

        expect(valueType.parse({ kind: 'polygon', points: twoPoints })).toEqual({
            ok: false,
            problem: { reason: 'tooFewPoints', minCount: 3 },
        });
        expect(valueType.parse({ kind: 'line', points: onePoint })).toEqual({
            ok: false,
            problem: { reason: 'tooFewPoints', minCount: 2 },
        });
    });

    test('a rectangle can never hold points, nor a polygon a size', () => {
        const wrongType = { ok: false, problem: { reason: 'wrongType' } };

        expect(valueType.parse({ kind: 'rectangle', points: triangle })).toEqual(wrongType);
        expect(valueType.parse({ kind: 'rectangle', width: 1, height: 1, points: triangle })).toEqual(wrongType);
        expect(valueType.parse({ kind: 'polygon', width: 10, height: 10 })).toEqual(wrongType);
    });

    test('parse refuses an unknown kind, a bad number and a bad point', () => {
        expect(valueType.parse({ kind: 'star', width: 1, height: 1 })).toEqual({
            ok: false,
            problem: { reason: 'unknownChoice' },
        });
        expect(valueType.parse({ kind: 'ellipse', width: Infinity, height: 1 })).toEqual({
            ok: false,
            problem: { reason: 'notFinite' },
        });
        expect(valueType.parse({ kind: 'line', points: [{ x: 0, y: 0 }, { x: 1 }] })).toEqual({
            ok: false,
            problem: { reason: 'wrongType' },
        });
    });

    test('a rectangle or ellipse is at least 1 px each side', () => {
        const normalized = valueType.normalize({ kind: 'rectangle', width: 0.2, height: -5 });

        expect(normalized).toEqual({ kind: 'rectangle', width: 1, height: 1 });
    });

    test('a round trip keeps the value and clone shares nothing', () => {
        const polygon = { kind: 'polygon', points: triangle } as const;
        const saved = valueType.serialize(polygon);
        const parsed = valueType.parse(saved);
        const cloned = valueType.clone(polygon);

        expect(parsed).toEqual({ ok: true, value: polygon });
        expect(cloned).toEqual(polygon);
        expect(cloned.kind === 'polygon' && cloned.points[0]).not.toBe(triangle[0]);
    });

    test('equals compares the kind and what it holds', () => {
        const square = { kind: 'rectangle', width: 10, height: 10 } as const;

        expect(valueType.equals(square, { kind: 'rectangle', width: 10, height: 10 })).toBe(true);
        expect(valueType.equals(square, { kind: 'ellipse', width: 10, height: 10 })).toBe(false);
        expect(valueType.equals(square, { kind: 'polygon', points: triangle })).toBe(false);
        expect(valueType.equals({ kind: 'line', points: triangle }, { kind: 'line', points: triangle.slice(1) })).toBe(
            false,
        );
    });
});
