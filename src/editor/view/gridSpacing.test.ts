import { describe, expect, test } from 'vitest';

import { gridStepAt } from './gridSpacing.ts';

describe('gridStepAt', () => {
    test('is the grid size while its lines are at least 8 screen px apart', () => {
        expect(gridStepAt(50, 1)).toBe(50);
        expect(gridStepAt(50, 0.16)).toBe(50);
        expect(gridStepAt(100, 1)).toBe(100);
    });

    test('zoomed far out, every fifth line is kept so lines stay 8 screen px apart', () => {
        expect(gridStepAt(50, 0.1)).toBe(250);
        expect(gridStepAt(50, 0.01)).toBe(1250);
    });

    test('a small grid at a high zoom keeps its own step', () => {
        expect(gridStepAt(5, 10)).toBe(5);
    });
});
