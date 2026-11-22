import { describe, expect, test } from 'vitest';

import type { KeyCode } from '../../keys/index.ts';

import { InputFieldType } from './InputFieldType.ts';

const jump = { name: 'jump', keys: ['Space', 'KeyW'] as KeyCode[] };

describe('InputFieldType', () => {
    test('an input round-trips through serialize and parse', () => {
        const fieldType = new InputFieldType();

        expect(fieldType.kind).toBe('input');
        expect(fieldType.serialize(jump)).toEqual({ name: 'jump', keys: ['Space', 'KeyW'] });
        expect(fieldType.parse(fieldType.serialize(jump))).toEqual({ ok: true, value: jump });
    });

    test('its name is made a word name, and a repeated key is kept once', () => {
        const fieldType = new InputFieldType();
        const typed = { name: 'Jump High', keys: ['Space', 'KeyW', 'Space'] as KeyCode[] };

        expect(fieldType.normalize(typed)).toEqual({ name: 'jump_high', keys: ['Space', 'KeyW'] });
    });

    test('a key a level can not use is refused, naming it', () => {
        const fieldType = new InputFieldType();

        expect(fieldType.parse({ name: 'menu', keys: ['Tab'] })).toEqual({
            ok: false,
            problem: { reason: 'unbindableKey', key: 'Tab' },
        });
        expect(fieldType.parse({ name: 'help', keys: ['KeyA', 'F1'] })).toEqual({
            ok: false,
            problem: { reason: 'unbindableKey', key: 'F1' },
        });
    });

    test('an input with no key is kept', () => {
        const fieldType = new InputFieldType();

        expect(fieldType.parse({ name: 'fire', keys: [] })).toEqual({ ok: true, value: { name: 'fire', keys: [] } });
    });

    test('a name with nothing left once made a word is refused', () => {
        const fieldType = new InputFieldType();

        expect(fieldType.parse({ name: '!!', keys: [] })).toEqual({ ok: false, problem: { reason: 'noName' } });
    });

    test('anything but exactly a text name and a list of texts is refused', () => {
        const fieldType = new InputFieldType();
        const wrongType = { ok: false, problem: { reason: 'wrongType' } };

        expect(fieldType.parse(null)).toEqual(wrongType);
        expect(fieldType.parse({ name: 'jump' })).toEqual(wrongType);
        expect(fieldType.parse({ name: 'jump', keys: 'Space' })).toEqual(wrongType);
        expect(fieldType.parse({ name: 'jump', keys: [32] })).toEqual(wrongType);
        expect(fieldType.parse({ name: 3, keys: [] })).toEqual(wrongType);
        expect(fieldType.parse({ name: 'jump', keys: [], extra: 1 })).toEqual(wrongType);
    });

    test('equals compares the name and the keys in order', () => {
        const fieldType = new InputFieldType();

        expect(fieldType.equals(jump, fieldType.clone(jump))).toBe(true);
        expect(fieldType.equals(jump, { name: 'jump', keys: ['KeyW', 'Space'] as KeyCode[] })).toBe(false);
        expect(fieldType.equals(jump, { name: 'up', keys: jump.keys })).toBe(false);
    });
});
