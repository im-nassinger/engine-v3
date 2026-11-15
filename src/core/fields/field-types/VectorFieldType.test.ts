import { describe, expect, test } from 'vitest';

import { VectorFieldType } from './VectorFieldType.ts';

describe('VectorFieldType', () => {
    test('parse accepts an object with a finite x and y', () => {
        const fieldType = new VectorFieldType();

        expect(fieldType.parse({ x: 3, y: -4.5 })).toEqual({ ok: true, value: { x: 3, y: -4.5 } });
    });

    test('parse refuses a shape that is not exactly { x, y }', () => {
        const fieldType = new VectorFieldType();

        for (const raw of [null, [3, 4], { x: 3 }, { x: 3, y: 4, z: 5 }, 'x: 3, y: 4']) {
            expect(fieldType.parse(raw)).toEqual({ ok: false, problem: { reason: 'wrongType' } });
        }
    });

    test('parse refuses an x or y that is not a finite number', () => {
        const fieldType = new VectorFieldType();

        expect(fieldType.parse({ x: '3', y: 4 })).toEqual({ ok: false, problem: { reason: 'wrongType' } });
        expect(fieldType.parse({ x: 3, y: Infinity })).toEqual({ ok: false, problem: { reason: 'notFinite' } });
    });

    test('a vector that refuses zero, as scale does, refuses 0 in either direction', () => {
        const scale = new VectorFieldType({ refuseZero: true });
        const zero = { ok: false, problem: { reason: 'zero' } };

        expect(scale.parse({ x: 0, y: 1 })).toEqual(zero);
        expect(scale.parse({ x: 1, y: 0 })).toEqual(zero);
        expect(scale.parse({ x: -1, y: 0.01 })).toEqual({ ok: true, value: { x: -1, y: 0.01 } });
    });

    test('normalize clamps x and y to the range', () => {
        const fieldType = new VectorFieldType({ min: -10, max: 10 });

        expect(fieldType.normalize({ x: 20, y: -20 })).toEqual({ x: 10, y: -10 });
    });

    test('clone and serialize never share the object', () => {
        const fieldType = new VectorFieldType();
        const original = { x: 1, y: 2 };

        const copy = fieldType.clone(original);
        const serialized = fieldType.serialize(original);

        expect(copy).toEqual(original);
        expect(copy).not.toBe(original);
        expect(serialized).not.toBe(original);
    });

    test('equals compares x and y', () => {
        const fieldType = new VectorFieldType();

        expect(fieldType.equals({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
        expect(fieldType.equals({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false);
    });
});
