import { describe, expect, test } from 'vitest';

import { SolidFillFieldType } from './SolidFillFieldType.ts';

describe('SolidFillFieldType', () => {
    const fieldType = new SolidFillFieldType();

    test('its kind is fill, so the colour control never gets a tagged value', () => {
        expect(fieldType.kind).toBe('fill');
    });

    test('parse accepts no fill and a solid colour', () => {
        expect(fieldType.parse({ kind: 'none' })).toEqual({ ok: true, value: { kind: 'none' } });
        expect(fieldType.parse({ kind: 'solid', colour: '#4a90d9ff' })).toEqual({
            ok: true,
            value: { kind: 'solid', colour: '#4a90d9ff' },
        });
    });

    test('parse refuses anything else', () => {
        const wrongType = { ok: false, problem: { reason: 'wrongType' } };

        expect(fieldType.parse('#4A90D9FF')).toEqual(wrongType);
        expect(fieldType.parse({ kind: 'gradient' })).toEqual(wrongType);
        expect(fieldType.parse({ kind: 'none', colour: '#4A90D9FF' })).toEqual(wrongType);
        expect(fieldType.parse({ kind: 'solid' })).toEqual(wrongType);
        expect(fieldType.parse({ kind: 'solid', colour: 'blue' })).toEqual({
            ok: false,
            problem: { reason: 'badColour' },
        });
    });

    test('a round trip keeps the value, stored uppercase', () => {
        const normalized = fieldType.normalize({ kind: 'solid', colour: '#4a90d9ff' });
        const saved = fieldType.serialize(normalized);

        expect(saved).toEqual({ kind: 'solid', colour: '#4A90D9FF' });
        expect(fieldType.parse(saved)).toEqual({ ok: true, value: normalized });
    });

    test('equals compares the kind and the colour', () => {
        const blue = { kind: 'solid', colour: '#4A90D9FF' } as const;

        expect(fieldType.equals(blue, { kind: 'solid', colour: '#4A90D9FF' })).toBe(true);
        expect(fieldType.equals(blue, { kind: 'solid', colour: '#1F3552FF' })).toBe(false);
        expect(fieldType.equals(blue, { kind: 'none' })).toBe(false);
        expect(fieldType.equals({ kind: 'none' }, { kind: 'none' })).toBe(true);
    });
});
