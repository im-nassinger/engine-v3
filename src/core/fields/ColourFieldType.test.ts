import { describe, expect, test } from 'vitest';

import { ColourFieldType } from './ColourFieldType.ts';

describe('ColourFieldType', () => {
    const fieldType = new ColourFieldType();

    test('parse accepts #RRGGBBAA in either case', () => {
        expect(fieldType.parse('#1F3552FF')).toEqual({ ok: true, value: '#1F3552FF' });
        expect(fieldType.parse('#bfe3f5ff')).toEqual({ ok: true, value: '#bfe3f5ff' });
    });

    test('parse refuses any other way of writing a colour', () => {
        for (const raw of ['#1F3552', '1F3552FF', '#1F3552FG', '#1F3552FF0', 'blue', '']) {
            expect(fieldType.parse(raw)).toEqual({ ok: false, problem: { reason: 'badColour' } });
        }
    });

    test('parse refuses what is not a text', () => {
        expect(fieldType.parse(0xff)).toEqual({ ok: false, problem: { reason: 'wrongType' } });
        expect(fieldType.parse(null)).toEqual({ ok: false, problem: { reason: 'wrongType' } });
    });

    test('normalize stores uppercase, so equal colours compare equal', () => {
        const normalized = fieldType.normalize('#bfe3f5ff');

        expect(normalized).toBe('#BFE3F5FF');
        expect(fieldType.equals(normalized, '#BFE3F5FF')).toBe(true);
    });
});
