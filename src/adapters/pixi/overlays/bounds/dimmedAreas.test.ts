import { describe, expect, test } from 'vitest';

import { Bounds } from '../../../../core/geometry/index.ts';

import { dimmedAreas } from './dimmedAreas.ts';

function totalArea(areas: readonly Bounds[]) {
    return areas.reduce((sum, area) => sum + area.width * area.height, 0);
}

describe('dimmedAreas', () => {
    const view = new Bounds(0, 0, 100, 80);

    test('a level inside the view leaves four bands around it, together the outside exactly', () => {
        const level = new Bounds(20, 10, 70, 50);

        const areas = dimmedAreas(view, level);

        expect(areas).toHaveLength(4);
        expect(totalArea(areas)).toBe(100 * 80 - 50 * 40);
    });

    test('a level covering the view dims nothing', () => {
        expect(dimmedAreas(view, new Bounds(-10, -10, 200, 200))).toEqual([]);
    });

    test('a level off to one side dims the whole view', () => {
        expect(dimmedAreas(view, new Bounds(300, 0, 400, 80))).toEqual([view]);
    });

    test('a level past the left edge dims only what is right of it', () => {
        const areas = dimmedAreas(view, new Bounds(-50, -50, 60, 200));

        expect(areas).toEqual([new Bounds(60, 0, 100, 80)]);
    });
});
