import { describe, expect, test } from 'vitest';

import { NumberFieldType } from './NumberFieldType.ts';

describe('NumberFieldType', () => {
    test('parse accepts a finite number as it is', () => {
        const fieldType = new NumberFieldType({ min: 0, max: 100 });

        expect(fieldType.parse(150)).toEqual({ ok: true, value: 150 });
        expect(fieldType.parse(-2.5)).toEqual({ ok: true, value: -2.5 });
    });

    test('parse refuses what is not a number', () => {
        const fieldType = new NumberFieldType();

        for (const raw of ['1', null, undefined, true, {}, [1]]) {
            expect(fieldType.parse(raw)).toEqual({ ok: false, problem: { reason: 'wrongType' } });
        }
    });

    test('parse refuses NaN and infinities', () => {
        const fieldType = new NumberFieldType();

        for (const raw of [Number.NaN, Infinity, -Infinity]) {
            expect(fieldType.parse(raw)).toEqual({ ok: false, problem: { reason: 'notFinite' } });
        }
    });

    test('normalize clamps to the range', () => {
        const fieldType = new NumberFieldType({ min: 0, max: 100 });

        expect(fieldType.normalize(150)).toBe(100);
        expect(fieldType.normalize(-1)).toBe(0);
        expect(fieldType.normalize(42.5)).toBe(42.5);
    });

    test('normalize leaves a number with no range alone', () => {
        const fieldType = new NumberFieldType();

        expect(fieldType.normalize(-1e9)).toBe(-1e9);
    });

    test('normalize rounds a whole-number field, then clamps', () => {
        const fieldType = new NumberFieldType({ min: 1, max: 10, wholeNumber: true });

        expect(fieldType.normalize(3.4)).toBe(3);
        expect(fieldType.normalize(3.5)).toBe(4);
        expect(fieldType.normalize(0.2)).toBe(1);
        expect(fieldType.normalize(10.6)).toBe(10);
    });

    test('serialize, clone and equals work on the plain number', () => {
        const fieldType = new NumberFieldType();

        expect(fieldType.serialize(9.8)).toBe(9.8);
        expect(fieldType.clone(9.8)).toBe(9.8);
        expect(fieldType.equals(1, 1)).toBe(true);
        expect(fieldType.equals(1, 2)).toBe(false);
    });
});
