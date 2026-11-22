import { describe, expect, test } from 'vitest';

import { Bounds } from '../../../../core/geometry/index.ts';

import { gridAreaOf, planGrid } from './GridPlan.ts';

describe('gridAreaOf', () => {
    const levelBounds = new Bounds(-100, -50, 100, 50);

    test('a view larger than the level bounds keeps only the bounds', () => {
        expect(gridAreaOf(new Bounds(-500, -500, 500, 500), levelBounds)).toEqual(levelBounds);
    });

    test('a view across one corner keeps the part they share', () => {
        expect(gridAreaOf(new Bounds(50, 20, 300, 300), levelBounds)).toEqual(new Bounds(50, 20, 100, 50));
    });

    test('a view that misses the level bounds has no grid', () => {
        expect(gridAreaOf(new Bounds(200, 200, 300, 300), levelBounds)).toBeUndefined();
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
