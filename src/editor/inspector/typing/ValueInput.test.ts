import { describe, expect, test } from 'vitest';

import { AngleFieldType, NumberFieldType, VectorFieldType } from '../../../core/fields/index.ts';

import { ValueInput } from './ValueInput.ts';
import type { NumberInputDefinition } from './ValueInput.ts';

const damping: NumberInputDefinition = {
    label: 'Linear damping',
    type: new NumberFieldType({ min: 0, max: 1500 }),
    unit: 'per s',
};
const outlineWidth: NumberInputDefinition = {
    label: 'Outline width',
    type: new NumberFieldType({ min: 0, max: 200 }),
    unit: 'px',
};
const opacity: NumberInputDefinition = {
    label: 'Opacity',
    type: new NumberFieldType({ min: 0, max: 1 }),
    unit: '%',
    displayScale: 100,
    precision: 0,
};
const count: NumberInputDefinition = { label: 'Count', type: new NumberFieldType({ wholeNumber: true }) };
const rotation: NumberInputDefinition = { label: 'Rotation', type: new AngleFieldType(), unit: '°' };
const skew: NumberInputDefinition = {
    label: 'Skew',
    type: new AngleFieldType({ min: -90, max: 90, refuseLimits: true }),
    unit: '°',
};
const scale: NumberInputDefinition = { label: 'Scale', type: new VectorFieldType({ refuseZero: true }) };

describe('ValueInput.parseNumber', () => {
    test('reads a point and a comma as the decimal separator', () => {
        expect(ValueInput.parseNumber('1.5', outlineWidth)).toEqual({ kind: 'value', value: 1.5 });
        expect(ValueInput.parseNumber('1,5', outlineWidth)).toEqual({ kind: 'value', value: 1.5 });
        expect(ValueInput.parseNumber('.5', outlineWidth)).toEqual({ kind: 'value', value: 0.5 });
    });

    test('reads a sign, the minus sign the texts show, and spaces around the number', () => {
        expect(ValueInput.parseNumber(' -12 ', rotation)).toEqual({ kind: 'value', value: -12 });
        expect(ValueInput.parseNumber('−12', rotation)).toEqual({ kind: 'value', value: -12 });
        expect(ValueInput.parseNumber('+12', rotation)).toEqual({ kind: 'value', value: 12 });
    });

    test("drops the field's own unit, with or without a space", () => {
        expect(ValueInput.parseNumber('12px', outlineWidth)).toEqual({ kind: 'value', value: 12 });
        expect(ValueInput.parseNumber('12 px', outlineWidth)).toEqual({ kind: 'value', value: 12 });
        expect(ValueInput.parseNumber('45°', rotation)).toEqual({ kind: 'value', value: 45 });
        expect(ValueInput.parseNumber('2 per s', damping)).toEqual({ kind: 'value', value: 2 });
    });

    test("refuses another field's unit as not a number", () => {
        expect(ValueInput.parseNumber('12 s', outlineWidth)).toEqual({ kind: 'invalid', reason: 'Not a number' });
    });

    test('undoes the display scale: 50 % is stored as 0.5', () => {
        expect(ValueInput.parseNumber('50 %', opacity)).toEqual({ kind: 'value', value: 0.5 });
        expect(ValueInput.parseNumber('50', opacity)).toEqual({ kind: 'value', value: 0.5 });
    });

    test('refuses text that is not a number', () => {
        const notANumber = { kind: 'invalid', reason: 'Not a number' };

        for (const text of ['abc', '1.2.3', '1,5,5', '0x10', 'Infinity', 'NaN', '-', '12 px px', '1/0']) {
            expect(ValueInput.parseNumber(text, outlineWidth)).toEqual(notANumber);
        }
    });

    test('refuses a number past 1e9 either way as too large', () => {
        const tooLarge = { kind: 'invalid', reason: 'Too large' };

        expect(ValueInput.parseNumber('1e10', rotation)).toEqual(tooLarge);
        expect(ValueInput.parseNumber('-2000000000', rotation)).toEqual(tooLarge);
        expect(ValueInput.parseNumber('1e9', rotation)).toEqual({ kind: 'value', value: 1e9 });
    });

    test('clamps past a limit, with a note naming the limit as shown', () => {
        expect(ValueInput.parseNumber('2000', damping)).toEqual({ kind: 'value', value: 1500, note: 'Max is 1500' });
        expect(ValueInput.parseNumber('-3', damping)).toEqual({ kind: 'value', value: 0, note: 'Min is 0' });
        expect(ValueInput.parseNumber('150 %', opacity)).toEqual({ kind: 'value', value: 1, note: 'Max is 100' });
    });

    test('rounds a fraction in a whole-number field', () => {
        expect(ValueInput.parseNumber('2.4', count)).toEqual({ kind: 'value', value: 2 });
        expect(ValueInput.parseNumber('2,5', count)).toEqual({ kind: 'value', value: 3 });
    });

    test('restores the old value when the text is empty', () => {
        expect(ValueInput.parseNumber('', outlineWidth)).toEqual({ kind: 'restore' });
        expect(ValueInput.parseNumber('  ', outlineWidth)).toEqual({ kind: 'restore' });
        expect(ValueInput.parseNumber('px', outlineWidth)).toEqual({ kind: 'restore' });
    });

    test('refuses a scale of 0', () => {
        expect(ValueInput.parseNumber('0', scale)).toEqual({ kind: 'invalid', reason: "Scale can't be 0" });
        expect(ValueInput.parseNumber('0,0', scale)).toEqual({ kind: 'invalid', reason: "Scale can't be 0" });
        expect(ValueInput.parseNumber('-1', scale)).toEqual({ kind: 'value', value: -1 });
    });

    test('refuses a skew of 90° or past it, either way', () => {
        const refused = { kind: 'invalid', reason: 'Skew must be between −90° and 90°' };

        expect(ValueInput.parseNumber('90', skew)).toEqual(refused);
        expect(ValueInput.parseNumber('-90°', skew)).toEqual(refused);
        expect(ValueInput.parseNumber('120', skew)).toEqual(refused);
        expect(ValueInput.parseNumber('89.9', skew)).toEqual({ kind: 'value', value: 89.9 });
    });
});

describe('ValueInput.format', () => {
    test('shows up to 2 decimals, without trailing zeros', () => {
        expect(ValueInput.format(1.23456, outlineWidth)).toBe('1.23');
        expect(ValueInput.format(1.5, outlineWidth)).toBe('1.5');
        expect(ValueInput.format(3, outlineWidth)).toBe('3');
    });

    test("shows the field's decimals and its display scale", () => {
        expect(ValueInput.format(0.555, opacity)).toBe('56');
        expect(ValueInput.format(0.07, opacity)).toBe('7');
    });

    test('never shows -0', () => {
        expect(ValueInput.format(-0.001, rotation)).toBe('0');
    });

    test('shows the full value while focused, without float noise from the display scale', () => {
        expect(ValueInput.formatFull(1.23456, outlineWidth)).toBe('1.23456');
        expect(ValueInput.formatFull(0.1, opacity)).toBe('10');
        expect(ValueInput.formatFull(0.555, opacity)).toBe('55.5');
    });

    test('reads back what it shows', () => {
        const shown = ValueInput.formatFull(-12.75, rotation);

        expect(ValueInput.parseNumber(shown, rotation)).toEqual({ kind: 'value', value: -12.75 });
    });
});
