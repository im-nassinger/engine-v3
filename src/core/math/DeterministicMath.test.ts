/* eslint-disable no-restricted-properties -- these tests compare against the browser's Math on purpose. */
import { describe, expect, test } from 'vitest';

import { DeterministicMath } from './DeterministicMath.ts';

const ACCURACY = 1e-12;

function evenlySpaced(from: number, to: number, count: number) {
    const values: number[] = [];
    const step = (to - from) / (count - 1);

    for (let i = 0; i < count; i++) {
        values.push(from + i * step);
    }

    return values;
}

// An odd step, so the samples don't line up with multiples of pi.
const sin = (radians: number) => DeterministicMath.sin(radians);
const cos = (radians: number) => DeterministicMath.cos(radians);

const RADIANS_SAMPLES = evenlySpaced(-1000, 1000, 200_003);
const SMALL_RADIANS_SAMPLES = evenlySpaced(-7, 7, 100_003);
const COORDINATE_SAMPLES = evenlySpaced(-50, 50, 401);
const DEGREE_SAMPLES = evenlySpaced(-3600, 3600, 100_003);

function largestDifference(samples: number[], ours: (value: number) => number, reference: (value: number) => number) {
    let largest = 0;

    for (const sample of samples) {
        const difference = Math.abs(ours(sample) - reference(sample));
        largest = Math.max(largest, difference);
    }

    return largest;
}

describe('DeterministicMath.sin and cos', () => {
    test('are within 1e-12 of Math over the angles the game uses', () => {
        const allSamples = [...RADIANS_SAMPLES, ...SMALL_RADIANS_SAMPLES];

        const sinDifference = largestDifference(allSamples, sin, Math.sin);
        const cosDifference = largestDifference(allSamples, cos, Math.cos);

        expect(sinDifference).toBeLessThan(ACCURACY);
        expect(cosDifference).toBeLessThan(ACCURACY);
    });

    test('keep the sign of zero, like Math', () => {
        expect(DeterministicMath.sin(0)).toBe(0);
        expect(DeterministicMath.sin(-0)).toBe(-0);
        expect(DeterministicMath.cos(0)).toBe(1);
    });

    test('give NaN for infinity and NaN', () => {
        expect(DeterministicMath.sin(Infinity)).toBeNaN();
        expect(DeterministicMath.cos(-Infinity)).toBeNaN();
        expect(DeterministicMath.sin(Number.NaN)).toBeNaN();
    });
});

describe('DeterministicMath.atan2', () => {
    test('is within 1e-12 of Math over a grid of points', () => {
        let largest = 0;

        for (const y of COORDINATE_SAMPLES) {
            for (const x of COORDINATE_SAMPLES) {
                const difference = Math.abs(DeterministicMath.atan2(y, x) - Math.atan2(y, x));
                largest = Math.max(largest, difference);
            }
        }

        expect(largest).toBeLessThan(ACCURACY);
    });

    test('is within 1e-12 of Math for very steep and very flat directions', () => {
        const extremes = [1e-300, 1e-20, 1e-8, 1e8, 1e20, 1e300];

        for (const y of extremes) {
            for (const x of [...extremes, ...extremes.map((value) => -value)]) {
                expect(Math.abs(DeterministicMath.atan2(y, x) - Math.atan2(y, x))).toBeLessThan(ACCURACY);
                expect(Math.abs(DeterministicMath.atan2(-y, x) - Math.atan2(-y, x))).toBeLessThan(ACCURACY);
            }
        }
    });

    test.each([
        [0, 0],
        [-0, 0],
        [0, -0],
        [-0, -0],
        [0, 5],
        [-0, 5],
        [0, -5],
        [-0, -5],
        [5, 0],
        [-5, 0],
        [5, -0],
        [Infinity, Infinity],
        [Infinity, -Infinity],
        [-Infinity, Infinity],
        [-Infinity, -Infinity],
        [5, Infinity],
        [-5, Infinity],
        [5, -Infinity],
        [-5, -Infinity],
        [Infinity, 5],
        [-Infinity, -5],
        [Number.NaN, 1],
        [1, Number.NaN],
    ])('matches Math.atan2(%d, %d) exactly at the edges', (y, x) => {
        expect(DeterministicMath.atan2(y, x)).toBe(Math.atan2(y, x));
    });
});

describe('DeterministicMath.sinCos', () => {
    test('is within 1e-12 of Math over many turns', () => {
        const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

        const sinDifference = largestDifference(
            DEGREE_SAMPLES,
            (degrees) => DeterministicMath.sinCos(degrees).sin,
            (degrees) => Math.sin(toRadians(degrees)),
        );
        const cosDifference = largestDifference(
            DEGREE_SAMPLES,
            (degrees) => DeterministicMath.sinCos(degrees).cos,
            (degrees) => Math.cos(toRadians(degrees)),
        );

        expect(sinDifference).toBeLessThan(ACCURACY);
        expect(cosDifference).toBeLessThan(ACCURACY);
    });

    test.each([
        [0, 0, 1],
        [90, 1, 0],
        [180, 0, -1],
        [270, -1, 0],
        [360, 0, 1],
        [-90, -1, 0],
        [450, 1, 0],
        [-720, 0, 1],
    ])('is exact at %d degrees', (degrees, expectedSin, expectedCos) => {
        expect(DeterministicMath.sinCos(degrees)).toEqual({ sin: expectedSin, cos: expectedCos });
    });

    test('gives NaN for infinity and NaN', () => {
        expect(DeterministicMath.sinCos(Infinity).sin).toBeNaN();
        expect(DeterministicMath.sinCos(Number.NaN).cos).toBeNaN();
    });
});
