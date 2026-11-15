// Polygons and helpers shared by the geometry tests.
import type { Point } from '../Point.ts';

function signedDoubleArea(outline: readonly Point[]) {
    let sum = 0;
    let previous = outline.at(-1);

    for (const current of outline) {
        if (previous !== undefined) {
            sum += previous.x * current.y - current.x * previous.y;
        }
        previous = current;
    }

    return sum;
}

export function areaOf(outline: readonly Point[]) {
    return signedDoubleArea(outline) / 2;
}

export function totalArea(outlines: readonly (readonly Point[])[]) {
    let sum = 0;
    for (const outline of outlines) {
        sum += areaOf(outline);
    }

    return sum;
}

// A star drawn in one stroke: each point joins the one two places on, so the stroke crosses itself
// five times around a pentagon in the middle.
export const ONE_STROKE_STAR: Point[] = [
    { x: 0, y: -100 },
    { x: 59, y: 81 },
    { x: -95, y: -31 },
    { x: 95, y: -31 },
    { x: -59, y: 81 },
];

export const FIGURE_OF_EIGHT: Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 100 },
    { x: 100, y: 0 },
    { x: 0, y: 100 },
];

// A whole-number generator, so the test needs no Math.random and gives the same polygons every run.
export function createRandomNumbers(seed: number) {
    let state = seed;

    return () => {
        state = (state * 16807) % 2147483647;

        return state / 2147483647;
    };
}

export function randomPolygon(nextRandom: () => number) {
    const pointCount = 3 + Math.floor(nextRandom() * 15);
    const points: Point[] = [];

    for (let i = 0; i < pointCount; i++) {
        const x = Math.round((nextRandom() - 0.5) * 2000) / 10;
        const y = Math.round((nextRandom() - 0.5) * 2000) / 10;
        points.push({ x, y });
    }

    return points;
}
