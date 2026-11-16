import { describe, expect, test } from 'vitest';

import { NOTCH_PX, wheelPixels } from './wheelPixels.ts';

describe('wheelPixels', () => {
    test('a notch is the same in pixels, lines or pages', () => {
        expect(wheelPixels(NOTCH_PX, 0, 600)).toBe(NOTCH_PX);
        expect(wheelPixels(3, 1, 600)).toBeCloseTo(NOTCH_PX);
        expect(wheelPixels(1, 2, 600)).toBe(600);
    });
});
