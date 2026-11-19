import { describe, expect, test } from 'vitest';
import { Bounds } from '../../../core/geometry/index.ts';
import { minimapFit, viewRectangle } from './minimapFit.ts';

const NEW_LEVEL = new Bounds(-10_000, -5_000, 10_000, 5_000);
const PICTURE = { width: 200, height: 100 };
const SMALLEST = 4;

describe('minimapFit', () => {
    test("a level of the picture's shape fills it", () => {
        expect(minimapFit(NEW_LEVEL, PICTURE)).toEqual({ scale: 0.01, left: 0, top: 0, width: 200, height: 100 });
    });

    test('a square level is centred, with room on both sides', () => {
        const square = new Bounds(-4_000, -4_000, 4_000, 4_000);

        expect(minimapFit(square, PICTURE)).toEqual({ scale: 0.0125, left: 50, top: 0, width: 100, height: 100 });
    });
});

describe('viewRectangle', () => {
    const fit = minimapFit(NEW_LEVEL, PICTURE);

    test('places what the view shows on the picture', () => {
        const visible = new Bounds(-1_000, -500, 1_000, 500);

        expect(viewRectangle(fit, NEW_LEVEL, visible, SMALLEST)).toEqual({ left: 90, top: 45, width: 20, height: 10 });
    });

    test('stops at the level bounds when the view shows more', () => {
        const visible = new Bounds(-20_000, -20_000, 20_000, 20_000);

        expect(viewRectangle(fit, NEW_LEVEL, visible, SMALLEST)).toEqual({ left: 0, top: 0, width: 200, height: 100 });
    });

    test('is never smaller than the smallest size, keeping its middle', () => {
        const visible = new Bounds(-10, -10, 10, 10);

        expect(viewRectangle(fit, NEW_LEVEL, visible, SMALLEST)).toEqual({ left: 98, top: 48, width: 4, height: 4 });
    });

    test("a small view at the level's corner stays inside the picture", () => {
        const visible = new Bounds(-10_000, -5_000, -9_990, -4_990);

        expect(viewRectangle(fit, NEW_LEVEL, visible, SMALLEST)).toEqual({ left: 0, top: 0, width: 4, height: 4 });
    });

    test('is nothing when the view shows none of the level', () => {
        const visible = new Bounds(20_000, 20_000, 21_000, 21_000);

        expect(viewRectangle(fit, NEW_LEVEL, visible, SMALLEST)).toBeUndefined();
    });
});
