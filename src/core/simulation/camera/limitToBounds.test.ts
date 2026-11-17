import { describe, expect, test } from 'vitest';

import { Bounds } from '../../geometry/index.ts';

import { limitToBounds } from './limitToBounds.ts';

const box = { width: 1920, height: 1080 };
const bounds = new Bounds(-3000, -2000, 3000, 2000);

describe('limitToBounds', () => {
    test('leaves a box well inside the bounds where it is', () => {
        const position = limitToBounds({ x: 100, y: -200 }, box, bounds);

        expect(position).toEqual({ x: 100, y: -200 });
    });

    test('stops a box at the edge it would cross', () => {
        const pastRight = limitToBounds({ x: 2900, y: 0 }, box, bounds);
        const pastTopLeft = limitToBounds({ x: -5000, y: -1900 }, box, bounds);

        expect(pastRight).toEqual({ x: 2040, y: 0 });
        expect(pastTopLeft).toEqual({ x: -2040, y: -1460 });
    });

    test('a box exactly at the edge stays there', () => {
        const position = limitToBounds({ x: 2040, y: 1460 }, box, bounds);

        expect(position).toEqual({ x: 2040, y: 1460 });
    });

    test('centres sideways in a level narrower than the box, and still scrolls up and down', () => {
        const narrow = new Bounds(500, -2000, 1500, 2000);

        const position = limitToBounds({ x: 4000, y: 300 }, box, narrow);
        const nearTop = limitToBounds({ x: 0, y: -1900 }, box, narrow);

        expect(position).toEqual({ x: 1000, y: 300 });
        expect(nearTop).toEqual({ x: 1000, y: -1460 });
    });

    test('centres on a level exactly the size of the box', () => {
        const same = new Bounds(0, 0, 1920, 1080);

        const position = limitToBounds({ x: -50, y: 900 }, box, same);

        expect(position).toEqual({ x: 960, y: 540 });
    });
});
