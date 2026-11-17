import { describe, expect, test } from 'vitest';

import { smoothTowards } from './smoothTowards.ts';

describe('smoothTowards', () => {
    test('a Smoothing of 0 locks the camera to the goal', () => {
        const position = smoothTowards({ x: 0, y: 0 }, { x: 500, y: -300 }, 0);

        expect(position).toEqual({ x: 500, y: -300 });
    });

    test('0.3 s of Smoothing is 95% of the way after 18 ticks', () => {
        const goal = { x: 1000, y: -1000 };
        let position = { x: 0, y: 0 };

        for (let tick = 0; tick < 18; tick++) {
            position = smoothTowards(position, goal, 0.3);
        }

        expect(position.x).toBeCloseTo(950, 0);
        expect(position.y).toBeCloseTo(-950, 0);
    });

    test('is short of 95% one tick before', () => {
        const goal = { x: 1000, y: 0 };
        let position = { x: 0, y: 0 };

        for (let tick = 0; tick < 17; tick++) {
            position = smoothTowards(position, goal, 0.3);
        }

        expect(position.x).toBeLessThan(950);
    });

    test('moves the same share of the way each tick', () => {
        const first = smoothTowards({ x: 0, y: 0 }, { x: 100, y: 0 }, 1);
        const second = smoothTowards({ x: 50, y: 0 }, { x: 150, y: 0 }, 1);

        expect(second.x - 50).toBeCloseTo(first.x, 12);
    });

    test('stays still on its goal', () => {
        const position = smoothTowards({ x: 40, y: 60 }, { x: 40, y: 60 }, 5);

        expect(position).toEqual({ x: 40, y: 60 });
    });
});
