import { area, FillRule, union } from 'clipper2-ts';
import type { Path64, Paths64 } from 'clipper2-ts';

import type { Point } from '../Point.ts';

// Clipper2 works in whole numbers. Scaling pixels by 1,000 keeps a thousandth of a pixel, far below
// the 0.25 px at which points are merged anyway.
const WHOLE_NUMBERS_PER_PIXEL = 1000;

// Adding 0 turns -0 into 0, so the same outline never comes back with a different sign bit.
function withoutNegativeZero(value: number) {
    return value + 0;
}

function toWholeNumbers(outline: readonly Point[]): Path64 {
    return outline.map((point) => {
        const x = Math.round(point.x * WHOLE_NUMBERS_PER_PIXEL);
        const y = Math.round(point.y * WHOLE_NUMBERS_PER_PIXEL);

        return { x, y };
    });
}

function toPixels(path: Path64): Point[] {
    return path.map((point) => {
        const x = withoutNegativeZero(point.x / WHOLE_NUMBERS_PER_PIXEL);
        const y = withoutNegativeZero(point.y / WHOLE_NUMBERS_PER_PIXEL);

        return { x, y };
    });
}

// Clipper2 returns outer outlines with a positive area and holes with a negative one.
function outerOutlinesOnly(paths: Paths64) {
    return paths.filter((path) => area(path) > 0);
}

// The only file that imports the polygon library, so swapping it changes one file. It uses only the
// whole-number functions (Paths64), never the D ones, which call Math.pow.
export class PolygonLibrary {
    // Cuts a polygon that may cross itself at its crossings and fills every area it encloses:
    // a figure-of-eight gives two outlines, a star drawn in one stroke its outline with the middle
    // filled. Holes are dropped, because a polygon fills every enclosed area. Each outline comes back
    // with a positive area by the shoelace formula, which is clockwise on screen with y down.
    static fillEnclosedAreas(outline: readonly Point[]) {
        const path = toWholeNumbers(outline);
        const cutAtCrossings = union([path], FillRule.NonZero);
        const outers = outerOutlinesOnly(cutAtCrossings);

        // A second union merges an outline lying inside a dropped hole into the outline around it.
        const merged = union(outers, FillRule.NonZero);
        const filled = outerOutlinesOnly(merged);

        return filled.map(toPixels);
    }
}
