import type { Point } from './Point.ts';
import { pointAt, turn } from './Ring.ts';

// Points closer than this are merged. It is Box2D's linear slop, 0.005 m, in pixels: Box2D welds
// such points itself, so keeping them would only make pieces Box2D changes.
const MERGE_DISTANCE = 0.25;
const MERGE_DISTANCE_SQUARED = MERGE_DISTANCE * MERGE_DISTANCE;

// A point this close to the straight line between its neighbours counts as on it. Whole-number
// rounding in the polygon library moves points by up to half a thousandth of a pixel, which would
// otherwise leave corners that are straight in all but name.
const STRAIGHT_DISTANCE = 0.01;
const STRAIGHT_DISTANCE_SQUARED = STRAIGHT_DISTANCE * STRAIGHT_DISTANCE;

function isClose(first: Point, second: Point) {
    const dx = second.x - first.x;
    const dy = second.y - first.y;

    return dx * dx + dy * dy < MERGE_DISTANCE_SQUARED;
}

// The point's distance from the line through its neighbours is |turn| / |next - previous|, compared
// squared so no square root is needed. Neighbours in the same place make a spike, which holds no area.
function isStraight(previous: Point, current: Point, next: Point) {
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const neighbourDistanceSquared = dx * dx + dy * dy;
    if (neighbourDistanceSquared === 0) return true;

    const doubleArea = turn(previous, current, next);
    const doubleAreaSquared = doubleArea * doubleArea;

    return doubleAreaSquared < STRAIGHT_DISTANCE_SQUARED * neighbourDistanceSquared;
}

function mergeClosePoints(outline: readonly Point[]) {
    const kept: Point[] = [];

    for (const point of outline) {
        const last = kept.at(-1);
        if (last !== undefined && isClose(last, point)) continue;

        kept.push(point);
    }

    while (kept.length > 1) {
        const first = pointAt(kept, 0);
        const last = pointAt(kept, -1);
        if (!isClose(last, first)) break;

        kept.pop();
    }

    return kept;
}

function findStraightPosition(ring: readonly Point[]) {
    for (let position = 0; position < ring.length; position++) {
        const previous = pointAt(ring, position - 1);
        const current = pointAt(ring, position);
        const next = pointAt(ring, position + 1);
        if (isStraight(previous, current, next)) return position;
    }

    return undefined;
}

// Step 1 of the polygon pipeline, also used on the outlines and pieces later steps make. It uses only
// + - x and comparisons, so every computer gives the same points.
export class OutlineCleaning {
    static clean(outline: readonly Point[]) {
        const ring = mergeClosePoints(outline);

        while (ring.length >= 3) {
            const straightPosition = findStraightPosition(ring);
            if (straightPosition === undefined) break;

            ring.splice(straightPosition, 1);
        }

        if (ring.length < 3) return [];

        return ring;
    }
}
