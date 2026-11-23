import { describe, expect, test } from 'vitest';

import { ColourFieldType, NumberFieldType, TextFieldType, VectorFieldType } from '../../../core/fields/index.ts';

import { TriggerTyping } from './TriggerTyping.ts';

describe('TriggerTyping', () => {
    test('reads a number, with or without its unit, and refuses what is not one', () => {
        const entry = { kind: 'number', value: 2, unit: 's', clearLabel: undefined } as const;

        expect(TriggerTyping.shownText(entry)).toBe('2');
        expect(TriggerTyping.parse(entry, '5')).toEqual({ kind: 'value', value: 5 });
        expect(TriggerTyping.parse(entry, '1.5 s')).toEqual({ kind: 'value', value: 1.5 });
        expect(TriggerTyping.parse(entry, '')).toEqual({ kind: 'restore' });
        expect(TriggerTyping.parse(entry, 'soon')).toEqual({ kind: 'invalid', reason: 'Not a number' });
    });

    test('reads a colour code, keeping the old see-through part', () => {
        const entry = { kind: 'value', value: '#11223380', valueType: new ColourFieldType() } as const;

        expect(TriggerTyping.shownText(entry)).toBe('#11223380');
        expect(TriggerTyping.parse(entry, 'ff0000')).toEqual({ kind: 'value', value: '#FF000080' });
        expect(TriggerTyping.parse(entry, 'red').kind).toBe('invalid');
    });

    test('reads a vector as two numbers, checked by its type', () => {
        const entry = { kind: 'value', value: { x: 1, y: 2 }, valueType: new VectorFieldType() } as const;
        const refusingZero = { ...entry, valueType: new VectorFieldType({ refuseZero: true }) };

        expect(TriggerTyping.shownText(entry)).toBe('1, 2');
        expect(TriggerTyping.parse(entry, '0, -600')).toEqual({ kind: 'value', value: { x: 0, y: -600 } });
        expect(TriggerTyping.parse(entry, '3').kind).toBe('invalid');
        expect(TriggerTyping.parse(refusingZero, '0, 0').kind).toBe('invalid');
    });

    test('reads a text, and refuses a type it cannot type', () => {
        const textEntry = { kind: 'value', value: null, valueType: new TextFieldType() } as const;
        const otherEntry = { kind: 'value', value: null, valueType: new NumberFieldType() } as const;

        expect(TriggerTyping.parse(textEntry, ' Hello ')).toEqual({ kind: 'value', value: 'Hello' });
        expect(TriggerTyping.parse(otherEntry, '3').kind).toBe('invalid');
    });

    test('reads the two boxes of a vector; an empty one keeps its axis, or 0 while unset', () => {
        const entry = { kind: 'vector', value: { x: 1, y: 2 }, unit: 'px' } as const;
        const unset = { ...entry, value: null };

        expect(TriggerTyping.parseAxes(entry, '5', '-6 px')).toEqual({ kind: 'value', value: { x: 5, y: -6 } });
        expect(TriggerTyping.parseAxes(entry, '', '7')).toEqual({ kind: 'value', value: { x: 1, y: 7 } });
        expect(TriggerTyping.parseAxes(unset, '3', '')).toEqual({ kind: 'value', value: { x: 3, y: 0 } });
        expect(TriggerTyping.parseAxes(entry, '1', 'up')).toEqual({ kind: 'invalid', reason: 'y: Not a number' });
    });

    test('a colour picked for a Fill is a solid fill of it', () => {
        expect(TriggerTyping.colourValue({ kind: 'colour', value: null }, '#FF0000FF')).toBe('#FF0000FF');
        expect(TriggerTyping.colourValue({ kind: 'colour', value: null, isFill: true }, '#FF0000FF')).toEqual({
            kind: 'solid',
            colour: '#FF0000FF',
        });
    });
});
