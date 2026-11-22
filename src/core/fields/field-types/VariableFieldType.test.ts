import { describe, expect, test } from 'vitest';

import { startingValueOf, VariableFieldType, variableTypeOf } from './VariableFieldType.ts';

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

    test('anything but exactly a text name and a finite number, a string or a boolean is refused', () => {
        const fieldType = new VariableFieldType();
        const wrongType = { ok: false, problem: { reason: 'wrongType' } };

        expect(fieldType.parse('coins')).toEqual(wrongType);
        expect(fieldType.parse({ name: 'coins' })).toEqual(wrongType);
        expect(fieldType.parse({ name: 7, value: 5 })).toEqual(wrongType);
        expect(fieldType.parse({ name: 'coins', value: 5, type: 'number' })).toEqual(wrongType);
        expect(fieldType.parse({ name: 'coins', value: null })).toEqual(wrongType);
        expect(fieldType.parse({ name: 'coins', value: [1] })).toEqual(wrongType);
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

    test('a string and a boolean round-trip, typed by their JSON values with no type field', () => {
        const fieldType = new VariableFieldType();
        const playerName = { name: 'player_name', value: 'Ada' };
        const doorOpen = { name: 'door_open', value: false };

        expect(fieldType.parse(fieldType.serialize(playerName))).toEqual({ ok: true, value: playerName });
        expect(fieldType.parse(fieldType.serialize(doorOpen))).toEqual({ ok: true, value: doorOpen });
        expect(fieldType.serialize(doorOpen)).toEqual({ name: 'door_open', value: false });
        expect(fieldType.parse({ name: 'score', value: '5' })).toEqual({
            ok: true,
            value: { name: 'score', value: '5' },
        });
        expect(variableTypeOf(0)).toBe('number');
        expect(variableTypeOf('')).toBe('string');
        expect(variableTypeOf(false)).toBe('boolean');
    });

    test('normalize cuts a string to 1,000 characters, never in half a character', () => {
        const fieldType = new VariableFieldType();

        expect(fieldType.normalize({ name: 'note', value: 'a'.repeat(1_001) }).value).toBe('a'.repeat(1_000));
        expect(fieldType.normalize({ name: 'note', value: '😀'.repeat(1_001) }).value).toBe('😀'.repeat(1_000));
        expect(fieldType.normalize({ name: 'note', value: ' kept as typed ' }).value).toBe(' kept as typed ');
    });

    test('a type starts at 0, "" or false, and equals tells a string from a number', () => {
        const fieldType = new VariableFieldType();

        expect([startingValueOf('number'), startingValueOf('string'), startingValueOf('boolean')]).toEqual([
            0,
            '',
            false,
        ]);
        expect(fieldType.equals({ name: 'a', value: '0' }, { name: 'a', value: 0 })).toBe(false);
        expect(fieldType.equals({ name: 'a', value: false }, { name: 'a', value: 0 })).toBe(false);
    });
});
