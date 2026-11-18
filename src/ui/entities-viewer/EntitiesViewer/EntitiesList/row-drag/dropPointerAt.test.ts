import { describe, expect, test } from 'vitest';
import { dropPointerAt } from './dropPointerAt.ts';

describe('dropPointerAt', () => {
    test('finds the row and the place in it', () => {
        const pointer = dropPointerAt({ x: 30, y: 30 * 2 + 7.5 }, 5);

        expect(pointer).toEqual({ rowIndex: 2, heightFraction: 0.25, pointerDepth: 1 });
    });

    test('above the first row is its top edge, past the last row its bottom edge', () => {
        expect(dropPointerAt({ x: 0, y: -10 }, 5)).toEqual({ rowIndex: 0, heightFraction: 0, pointerDepth: 0 });
        expect(dropPointerAt({ x: 0, y: 900 }, 5)).toEqual({ rowIndex: 4, heightFraction: 1, pointerDepth: 0 });
    });

    test('the indent gives the depth, never below 0', () => {
        expect(dropPointerAt({ x: 8 + 16 * 3 + 1, y: 0 }, 1)?.pointerDepth).toBe(3);
        expect(dropPointerAt({ x: -40, y: 0 }, 1)?.pointerDepth).toBe(0);
    });

    test('an empty list points nowhere', () => {
        expect(dropPointerAt({ x: 0, y: 0 }, 0)).toBeUndefined();
    });
});
