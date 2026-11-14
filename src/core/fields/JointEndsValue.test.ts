import { describe, expect, test } from 'vitest';

import { JointEndsValue } from './JointEndsValue.ts';

describe('JointEndsValue', () => {
    const valueType = new JointEndsValue();
    const ends = { a: { x: -40, y: 0 }, b: { x: 60, y: 10 } };

    test('a round trip keeps both ends', () => {
        const saved = valueType.serialize(ends);

        expect(valueType.parse(saved)).toEqual({ ok: true, value: ends });
    });

    test('parse refuses a missing end and a bad point', () => {
        const wrongType = { ok: false, problem: { reason: 'wrongType' } };

        expect(valueType.parse({ a: { x: 0, y: 0 } })).toEqual(wrongType);
        expect(valueType.parse({ a: { x: 0, y: 0 }, b: { x: 0 } })).toEqual(wrongType);
        expect(valueType.parse({ a: { x: 0, y: 0 }, b: { x: NaN, y: 0 } })).toEqual({
            ok: false,
            problem: { reason: 'notFinite' },
        });
    });

    test('clone shares nothing and equals compares both ends', () => {
        const cloned = valueType.clone(ends);

        expect(cloned.a).not.toBe(ends.a);
        expect(valueType.equals(cloned, ends)).toBe(true);
        expect(valueType.equals({ ...ends, b: { x: 0, y: 0 } }, ends)).toBe(false);
    });
});
