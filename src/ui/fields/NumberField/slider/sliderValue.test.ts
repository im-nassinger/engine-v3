import { describe, expect, test } from 'vitest';
import { filledShareOf, sliderValueAt } from './sliderValue.ts';

const RANGE = { min: 0, max: 100 };

describe('sliderValueAt', () => {
    test('the left edge is the minimum and the right edge the maximum', () => {
        expect(sliderValueAt(10, 10, 200, RANGE, 0.01)).toBe(0);
        expect(sliderValueAt(210, 10, 200, RANGE, 0.01)).toBe(100);
        expect(sliderValueAt(110, 10, 200, RANGE, 0.01)).toBe(50);
    });

    test('a pointer past either edge stays at the limit', () => {
        expect(sliderValueAt(-50, 10, 200, RANGE, 0.01)).toBe(0);
        expect(sliderValueAt(900, 10, 200, RANGE, 0.01)).toBe(100);
    });

    test('lands on the step, with no more decimals than it', () => {
        expect(sliderValueAt(33, 0, 100, RANGE, 1)).toBe(33);
        expect(sliderValueAt(33.3, 0, 100, { min: 0, max: 1 }, 0.01)).toBe(0.33);
        expect(sliderValueAt(70, 0, 100, { min: -1, max: 1 }, 0.1)).toBe(0.4);
    });
});

describe('filledShareOf', () => {
    test('is the value’s place between the limits, and nothing when Mixed', () => {
        expect(filledShareOf(25, RANGE)).toBe(0.25);
        expect(filledShareOf(150, RANGE)).toBe(1);
        expect(filledShareOf(undefined, RANGE)).toBe(0);
    });
});
