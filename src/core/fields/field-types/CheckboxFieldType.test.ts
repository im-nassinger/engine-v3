import { describe, expect, test } from 'vitest';

import { CheckboxFieldType } from './CheckboxFieldType.ts';

describe('CheckboxFieldType', () => {
    const fieldType = new CheckboxFieldType();

    test('parse accepts true and false', () => {
        expect(fieldType.parse(true)).toEqual({ ok: true, value: true });
        expect(fieldType.parse(false)).toEqual({ ok: true, value: false });
    });

    test('parse refuses anything else, even values that look like a boolean', () => {
        for (const raw of [0, 1, 'true', null, undefined]) {
            expect(fieldType.parse(raw)).toEqual({ ok: false, problem: { reason: 'wrongType' } });
        }
    });

    test('serialize and equals work on the plain boolean', () => {
        expect(fieldType.serialize(true)).toBe(true);
        expect(fieldType.equals(true, true)).toBe(true);
        expect(fieldType.equals(true, false)).toBe(false);
    });
});
