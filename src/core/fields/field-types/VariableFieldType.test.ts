import { describe, expect, test } from 'vitest';

import { VariableFieldType } from './VariableFieldType.ts';

describe('VariableFieldType', () => {
    test('a variable round-trips through serialize and parse', () => {
        const fieldType = new VariableFieldType();
        const coins = { name: 'coins', value: 0 };

        expect(fieldType.kind).toBe('variable');
        expect(fieldType.parse(fieldType.serialize(coins))).toEqual({ ok: true, value: coins });
    });

    test('its name is made a word name: lowercase, spaces as `_`, other characters dropped', () => {
        const fieldType = new VariableFieldType();

        expect(fieldType.normalize({ name: 'Extra Lives!', value: 3 })).toEqual({ name: 'extra_lives', value: 3 });
    });

    test('a name with nothing left once made a word is refused', () => {
        const fieldType = new VariableFieldType();

        expect(fieldType.parse({ name: '!!', value: 0 })).toEqual({ ok: false, problem: { reason: 'noName' } });
        expect(fieldType.parse({ name: '', value: 0 })).toEqual({ ok: false, problem: { reason: 'noName' } });
    });

    test('anything but exactly a text name and a finite number is refused', () => {
        const fieldType = new VariableFieldType();
        const wrongType = { ok: false, problem: { reason: 'wrongType' } };

        expect(fieldType.parse('coins')).toEqual(wrongType);
        expect(fieldType.parse({ name: 'coins' })).toEqual(wrongType);
        expect(fieldType.parse({ name: 'coins', value: '5' })).toEqual(wrongType);
        expect(fieldType.parse({ name: 7, value: 5 })).toEqual(wrongType);
        expect(fieldType.parse({ name: 'coins', value: 5, type: 'number' })).toEqual(wrongType);
        expect(fieldType.parse({ name: 'coins', value: Infinity })).toEqual({
            ok: false,
            problem: { reason: 'notFinite' },
        });
    });

    test('equals compares the name and the value, and clone is a copy', () => {
        const fieldType = new VariableFieldType();
        const coins = { name: 'coins', value: 1 };

        expect(fieldType.equals(coins, { name: 'coins', value: 1 })).toBe(true);
        expect(fieldType.equals(coins, { name: 'coins', value: 2 })).toBe(false);
        expect(fieldType.equals(coins, { name: 'lives', value: 1 })).toBe(false);
        expect(fieldType.clone(coins)).not.toBe(coins);
    });
});
