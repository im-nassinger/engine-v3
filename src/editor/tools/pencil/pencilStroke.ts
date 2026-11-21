import type { Matrix2D, Point } from '../../../core/geometry/index.ts';

// The Pencil's smoothness, as the kinds menu names it.
export type PencilSmoothness = 'low' | 'medium' | 'high';

// How far a dragged point may lie from the fitted path, in screen px (proposal).
export const SMOOTHNESS_TOLERANCE_PX: Readonly<Record<PencilSmoothness, number>> = {
    low: 1.5,
    medium: 4,
    high: 10,
};

// A release this close to the press, in screen px, closes the path.
export const CLOSE_PX = 12;

// A dragged point closer than this to the last one kept, in screen px, is skipped.
export const SKIP_PX = 1;

// The level positions and the current group's own space, both ways.
export type GroupSpace = {
    readonly toLevel: Matrix2D;
    readonly toGroup: Matrix2D;
};

export function distance(from: Point, to: Point) {
    return Math.hypot(to.x - from.x, to.y - from.y);
}

// The dragged points without the last ones inside the closing ring, so the loop's end doesn't double back
// over its start. The start itself is kept.
export function withoutClosingTail(points: readonly Point[], start: Point, closeDistance: number) {
    let end = points.length;
    while (end > 1) {
        const last = points[end - 1];
        if (last === undefined || distance(last, start) > closeDistance) break;

        end -= 1;
    }

    return points.slice(0, end);
}

// How many level units one unit of the group's own space is, on average: the square root of the matrix's
// area scale, so a group scaled unevenly gets the tolerance of its average stretch.
export function averageStretch(matrix: Matrix2D) {
    return Math.sqrt(Math.abs(matrix.determinant()));
}
