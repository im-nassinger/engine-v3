import { describe, expect, test } from 'vitest';

import { TextFieldType } from './TextFieldType.ts';

describe('TextFieldType', () => {
    test('parse accepts any string as it is, and refuses anything else', () => {
        const fieldType = new TextFieldType({ maxLength: 4, trimmed: true });

        expect(fieldType.parse('  long name  ')).toEqual({ ok: true, value: '  long name  ' });
        expect(fieldType.parse(12)).toEqual({ ok: false, problem: { reason: 'wrongType' } });
        expect(fieldType.parse(null)).toEqual({ ok: false, problem: { reason: 'wrongType' } });
    });

    test('normalize trims a trimmed field', () => {
        const fieldType = new TextFieldType({ trimmed: true });

        expect(fieldType.normalize('  Crate \n')).toBe('Crate');
    });

    test('normalize keeps spaces in a field that is not trimmed', () => {
        const fieldType = new TextFieldType();

        expect(fieldType.normalize('  Crate ')).toBe('  Crate ');
    });

    test('normalize cuts a text past the maximum length', () => {
        const fieldType = new TextFieldType({ maxLength: 5 });

        expect(fieldType.normalize('Crates and more')).toBe('Crate');
        expect(fieldType.normalize('Box')).toBe('Box');
    });

    test('normalize trims after cutting, so a cut never ends in a space', () => {
        const fieldType = new TextFieldType({ maxLength: 4, trimmed: true });

        expect(fieldType.normalize('Big crate')).toBe('Big');
    });

    test('the length counts characters, so a character outside the basic plane is never cut in half', () => {
        const fieldType = new TextFieldType({ maxLength: 2 });

        expect(fieldType.normalize('😀😀😀')).toBe('😀😀');
    });
});
