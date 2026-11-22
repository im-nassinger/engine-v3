import { describe, expect, test } from 'vitest';

import { ListFieldType } from './ListFieldType.ts';
import { NumberFieldType } from './NumberFieldType.ts';
import { VariableFieldType } from './VariableFieldType.ts';
import { VectorFieldType } from './VectorFieldType.ts';

const points = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 0, y: 10 },
];

function pointList() {
    return new ListFieldType({ itemType: new VectorFieldType(), minItems: 2, maxItems: 4 });
}

describe('ListFieldType', () => {
    test('a list of vectors round-trips through serialize and parse', () => {
        const fieldType = pointList();

        const serialized = fieldType.serialize(points);
        const parsed = fieldType.parse(serialized);

        expect(fieldType.kind).toBe('list');
        expect(parsed).toEqual({ ok: true, value: points });
    });

    test('parse refuses anything that is not an array, and the whole list when one item is wrong', () => {
        const fieldType = pointList();
        const wrongType = { ok: false, problem: { reason: 'wrongType' } };

        expect(fieldType.parse({ 0: { x: 0, y: 0 } })).toEqual(wrongType);
        expect(fieldType.parse([{ x: 0, y: 0 }, { x: 1 }])).toEqual(wrongType);
        expect(
            fieldType.parse([
                { x: 0, y: 0 },
                { x: 1, y: NaN },
            ]),
        ).toEqual({
            ok: false,
            problem: { reason: 'notFinite' },
        });
    });

    test('too few or too many items are refused, with the limit', () => {
        const fieldType = pointList();
        const five = [...points, { x: 5, y: 5 }, { x: 6, y: 6 }];

        expect(fieldType.parse([{ x: 0, y: 0 }])).toEqual({
            ok: false,
            problem: { reason: 'tooFewItems', minCount: 2 },
        });
        expect(fieldType.parse(five)).toEqual({ ok: false, problem: { reason: 'tooManyItems', maxCount: 4 } });
    });

    test('without limits, an empty list is accepted', () => {
        const fieldType = new ListFieldType({ itemType: new NumberFieldType() });

        expect(fieldType.parse([])).toEqual({ ok: true, value: [] });
    });

    test('normalize normalizes each item by its own type', () => {
        const fieldType = new ListFieldType({ itemType: new NumberFieldType({ min: 0, max: 10 }) });

        expect(fieldType.normalize([-5, 5, 50])).toEqual([0, 5, 10]);
    });

    test('clone copies deeply, so no item is shared', () => {
        const fieldType = pointList();

        const copy = fieldType.clone(points);

        expect(copy).toEqual(points);
        expect(copy).not.toBe(points);
        expect(copy[0]).not.toBe(points[0]);
    });

    test('equals compares item by item, in order', () => {
        const fieldType = pointList();
        const reversed = [...points].reverse();
        const shorter = points.slice(0, 2);
        const moved = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 0, y: 11 },
        ];

        expect(fieldType.equals(points, fieldType.clone(points))).toBe(true);
        expect(fieldType.equals(points, reversed)).toBe(false);
        expect(fieldType.equals(points, shorter)).toBe(false);
        expect(fieldType.equals(points, moved)).toBe(false);
    });

    test('a list of named items refuses a second item with the same name, once normalized', () => {
        const fieldType = new ListFieldType({ itemType: new VariableFieldType(), itemName: (item) => item.name });

        expect(
            fieldType.parse([
                { name: 'coins', value: 0 },
                { name: 'lives', value: 3 },
            ]).ok,
        ).toBe(true);
        expect(
            fieldType.parse([
                { name: 'coins', value: 0 },
                { name: 'Coins', value: 3 },
            ]),
        ).toEqual({ ok: false, problem: { reason: 'repeatedName', name: 'coins' } });
    });
});
