import { describe, expect, test } from 'vitest';

import { gridSnapStepAt, gridSpacingAt } from './gridSpacing.ts';

describe('gridSpacingAt', () => {
    test('at 100% the default grid has lines every 50 px and fainter ones every 10 px', () => {
        expect(gridSpacingAt(50, 1)).toEqual({ step: 50, fineStep: 10 });
    });

    test('the fainter lines show only when they are at least 8 screen px apart', () => {
        expect(gridSpacingAt(50, 0.8)).toEqual({ step: 50, fineStep: 10 });
        expect(gridSpacingAt(50, 0.79)).toEqual({ step: 50, fineStep: undefined });
    });

    test('zoomed far out, every fifth step is kept so lines stay 8 screen px apart', () => {
        expect(gridSpacingAt(50, 0.1)).toEqual({ step: 250, fineStep: undefined });
        expect(gridSpacingAt(50, 0.01)).toEqual({ step: 1250, fineStep: undefined });
    });

    test('a small grid at a high zoom keeps its own step', () => {
        expect(gridSpacingAt(5, 10)).toEqual({ step: 5, fineStep: 1 });
    });
});

describe('gridSnapStepAt', () => {
    test('snaps to the fainter lines while they are drawn', () => {
        expect(gridSnapStepAt(50, 1)).toBe(10);
    });

    test('snaps to the grid lines once the fainter ones fade', () => {
        expect(gridSnapStepAt(50, 0.5)).toBe(50);
    });

    test('zoomed far out, snaps to the lines still drawn', () => {
        expect(gridSnapStepAt(50, 0.1)).toBe(250);
    });

    test('fainter lines that are not whole pixels apart are left out', () => {
        expect(gridSnapStepAt(7, 10)).toBe(7);
    });
});
