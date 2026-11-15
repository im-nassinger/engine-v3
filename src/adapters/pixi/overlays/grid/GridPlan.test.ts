import { describe, expect, test } from 'vitest';

import { Bounds } from '../../../../core/geometry/index.ts';

import { gridSpacingAt, planGrid } from './GridPlan.ts';

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

describe('planGrid', () => {
    test('lines cover the visible rectangle, with the origin, the steps and the fainter lines apart', () => {
        const plan = planGrid({ visible: new Bounds(-20, -5, 60, 5), zoom: 1, gridSize: 50 });

        const vertical = plan.vertical.map((line) => [line.position, line.strength]);
        expect(vertical).toEqual([
            [-20, 'fine'],
            [-10, 'fine'],
            [0, 'origin'],
            [10, 'fine'],
            [20, 'fine'],
            [30, 'fine'],
            [40, 'fine'],
            [50, 'step'],
            [60, 'fine'],
        ]);
        expect(plan.horizontal).toEqual([{ position: 0, strength: 'origin' }]);
    });

    test('without the fainter lines every line is a step', () => {
        const plan = planGrid({ visible: new Bounds(1, 0, 101, 0), zoom: 0.5, gridSize: 50 });

        expect(plan.vertical).toEqual([
            { position: 50, strength: 'step' },
            { position: 100, strength: 'step' },
        ]);
    });

    test('the number of lines stays bounded by the view at any zoom', () => {
        const viewWidthPx = 2000;
        const zoom = 0.01;
        const visible = new Bounds(0, 0, viewWidthPx / zoom, 0);

        const plan = planGrid({ visible, zoom, gridSize: 5 });

        expect(plan.vertical.length).toBeLessThanOrEqual(viewWidthPx / 8 + 1);
    });
});
