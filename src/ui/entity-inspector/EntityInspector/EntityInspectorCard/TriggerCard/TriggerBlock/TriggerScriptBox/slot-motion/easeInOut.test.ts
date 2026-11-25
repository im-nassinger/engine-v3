import { describe, expect, test } from 'vitest';
import { easeInOut } from './easeInOut.ts';

describe('easeInOut', () => {
    test('starts at 0, ends at 1 and is halfway at the middle', () => {
        expect(easeInOut(0)).toBe(0);
        expect(easeInOut(0.5)).toBe(0.5);
        expect(easeInOut(1)).toBe(1);
    });

    test('is slow at both ends', () => {
        expect(easeInOut(0.1)).toBeLessThan(0.1);
        expect(easeInOut(0.9)).toBeGreaterThan(0.9);
    });
});
