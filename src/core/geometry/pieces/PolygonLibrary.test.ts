import { afterEach, describe, expect, test, vi } from 'vitest';

import type { Point } from '../Point.ts';
import { PolygonLibrary } from './PolygonLibrary.ts';
import {
    areaOf,
    createRandomNumbers,
    FIGURE_OF_EIGHT,
    ONE_STROKE_STAR,
    randomPolygon,
} from '../testing/testPolygons.ts';

// The same list as BANNED_MATH_IN_CORE in eslint.config.ts, but for atan2, which is checked apart.
const BANNED_MATH = [
    'sin',
    'cos',
    'tan',
    'asin',
    'acos',
    'atan',
    'sinh',
    'cosh',
    'tanh',
    'asinh',
    'acosh',
    'atanh',
    'exp',
    'expm1',
    'log',
    'log1p',
    'log2',
    'log10',
    'cbrt',
    'pow',
    'hypot',
    'random',
] as const;

afterEach(() => {
    vi.restoreAllMocks();
});

describe('PolygonLibrary.fillEnclosedAreas', () => {
    test('gives a figure-of-eight two outlines', () => {
        const outlines = PolygonLibrary.fillEnclosedAreas(FIGURE_OF_EIGHT);

        const areas = outlines.map(areaOf);

        expect(areas).toEqual([2500, 2500]);
    });

    test('gives a one-stroke star its outline with the middle filled', () => {
        const outlines = PolygonLibrary.fillEnclosedAreas(ONE_STROKE_STAR);

        const pointCounts = outlines.map((outline) => outline.length);
        const [area] = outlines.map(areaOf);

        expect(pointCounts).toEqual([10]);
        // The five tips alone, with the middle empty, would be about 6,200 px².
        expect(area).toBeCloseTo(11238.062, 6);
    });

    test('drops a hole, filling the ring it was cut from', () => {
        const ringWithHole: Point[] = [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
            { x: 0, y: 100 },
            { x: 0, y: 0 },
            { x: 20, y: 20 },
            { x: 20, y: 80 },
            { x: 80, y: 80 },
            { x: 80, y: 20 },
            { x: 20, y: 20 },
        ];

        const outlines = PolygonLibrary.fillEnclosedAreas(ringWithHole);

        const areas = outlines.map(areaOf);

        expect(areas).toEqual([10000]);
    });

    test('turns every outline the positive way, whichever way it was drawn', () => {
        const counterClockwise = [...FIGURE_OF_EIGHT].reverse();

        const outlines = PolygonLibrary.fillEnclosedAreas(counterClockwise);

        for (const outline of outlines) {
            expect(areaOf(outline)).toBeGreaterThan(0);
        }
    });

    test('keeps a thousandth of a pixel', () => {
        const smallTriangle: Point[] = [
            { x: 0.001, y: 0 },
            { x: 10.5, y: 0.25 },
            { x: 0, y: 7.125 },
        ];

        const outlines = PolygonLibrary.fillEnclosedAreas(smallTriangle);
        const points = outlines.flat();

        expect(points).toEqual(expect.arrayContaining(smallTriangle));
    });

    test('gives the same bits twice', () => {
        const nextRandom = createRandomNumbers(7);

        for (let i = 0; i < 200; i++) {
            const polygon = randomPolygon(nextRandom);

            const first = PolygonLibrary.fillEnclosedAreas(polygon);
            const second = PolygonLibrary.fillEnclosedAreas(polygon);

            expect(second).toStrictEqual(first);
        }
    });

    test('reaches no Math function a browser may approximate', () => {
        for (const name of BANNED_MATH) {
            vi.spyOn(Math, name).mockImplementation(() => {
                throw new Error(`Math.${name} was called`);
            });
        }
        const atan2 = vi.spyOn(Math, 'atan2');
        const nextRandom = createRandomNumbers(11);

        for (let i = 0; i < 200; i++) {
            const polygon = randomPolygon(nextRandom);
            PolygonLibrary.fillEnclosedAreas(polygon);
        }

        expect(atan2).not.toHaveBeenCalled();
    });
});
