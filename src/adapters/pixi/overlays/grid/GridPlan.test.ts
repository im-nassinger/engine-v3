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
    test('lines cover the visible rectangle every grid size, with the origin apart', () => {
        const plan = planGrid({ visible: new Bounds(-60, -5, 110, 5), zoom: 1, gridSize: 50 });

        const vertical = plan.vertical.map((line) => [line.position, line.strength]);
        expect(vertical).toEqual([
            [-50, 'step'],
            [0, 'origin'],
            [50, 'step'],
            [100, 'step'],
        ]);
        expect(plan.horizontal).toEqual([{ position: 0, strength: 'origin' }]);
    });

    test('the number of lines stays bounded by the view at any zoom', () => {
        const viewWidthPx = 2000;
        const zoom = 0.01;
        const visible = new Bounds(0, 0, viewWidthPx / zoom, 0);

        const plan = planGrid({ visible, zoom, gridSize: 5 });

        expect(plan.vertical.length).toBeLessThanOrEqual(viewWidthPx / 8 + 1);
    });
});
