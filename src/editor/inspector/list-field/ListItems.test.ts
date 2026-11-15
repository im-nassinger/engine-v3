import { describe, expect, test } from 'vitest';

import { VectorFieldType } from '../../../core/fields/index.ts';

import { ListItems } from './ListItems.ts';

const vectorType = new VectorFieldType();
const points = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
];

describe('ListItems', () => {
    test('+ adds a copy of the last item at the end, leaving the old list alone', () => {
        const added = ListItems.withCopyOfLast(points, vectorType);

        expect(added).toEqual([...points, { x: 10, y: 10 }]);
        expect(added[3]).not.toBe(points[2]);
        expect(points).toHaveLength(3);
    });

    test('removing a row keeps the others in order', () => {
        const removed = ListItems.without(points, 1, vectorType);

        expect(removed).toEqual([
            { x: 0, y: 0 },
            { x: 10, y: 10 },
        ]);
    });

    test('editing a row replaces only that item', () => {
        const edited = ListItems.withItem(points, 0, { x: -5, y: 0 }, vectorType);

        expect(edited).toEqual([
            { x: -5, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
        ]);
        expect(points[0]).toEqual({ x: 0, y: 0 });
    });
});
