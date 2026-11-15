import { describe, expect, test } from 'vitest';

import { AngleFieldType } from './AngleFieldType.ts';

describe('AngleFieldType', () => {
    test('an angle with no range takes any finite number of degrees', () => {
        const fieldType = new AngleFieldType();

        expect(fieldType.parse(720)).toEqual({ ok: true, value: 720 });
        expect(fieldType.normalize(720)).toBe(720);
    });

    test('parse refuses what is not a finite number', () => {
        const fieldType = new AngleFieldType();

        expect(fieldType.parse('90')).toEqual({ ok: false, problem: { reason: 'wrongType' } });
        expect(fieldType.parse(Number.NaN)).toEqual({ ok: false, problem: { reason: 'notFinite' } });
    });

    test('normalize clamps to the range', () => {
        const fieldType = new AngleFieldType({ min: -180, max: 180 });

        expect(fieldType.parse(200)).toEqual({ ok: true, value: 200 });
        expect(fieldType.normalize(200)).toBe(180);
        expect(fieldType.normalize(-200)).toBe(-180);
    });

    describe('refusing its limits, as skew does', () => {
        const skew = new AngleFieldType({ min: -90, max: 90, refuseLimits: true });
        const outsideLimits = { ok: false, problem: { reason: 'outsideLimits', min: -90, max: 90 } };

        test('parse accepts anything strictly between the limits', () => {
            expect(skew.parse(0)).toEqual({ ok: true, value: 0 });
            expect(skew.parse(89.99)).toEqual({ ok: true, value: 89.99 });
            expect(skew.parse(-89.99)).toEqual({ ok: true, value: -89.99 });
        });

        test('parse refuses the limits themselves and anything past them', () => {
            for (const raw of [90, -90, 90.5, -120, 1000]) {
                expect(skew.parse(raw)).toEqual(outsideLimits);
            }
        });

        test('normalize never clamps', () => {
            expect(skew.normalize(45)).toBe(45);
        });
    });

    test('refusing limits without both a min and a max is a bug', () => {
        expect(() => new AngleFieldType({ max: 90, refuseLimits: true })).toThrow();
    });
});
