import type { Point } from './Point.ts';

// Helpers for a closed outline held as an array of points, where the point after the last is the first.

// Twice the signed area of the triangle a, b, c: positive when the three turn clockwise on screen
// (y down), the same direction as an outline with a positive area.
export function turn(a: Point, b: Point, c: Point) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

export function pointAt(ring: readonly Point[], position: number) {
    const wrapped = (position + ring.length) % ring.length;
    const point = ring[wrapped];
    if (point === undefined) throw new Error(`No point at ${position} in a ring of ${ring.length}.`);

    return point;
}

export function samePlace(first: Point, second: Point) {
    return first.x === second.x && first.y === second.y;
}

// Twice the shoelace area: positive for an outline that turns clockwise on screen.
export function signedDoubleArea(ring: readonly Point[]) {
    let sum = 0;

    for (let position = 0; position < ring.length; position++) {
        const current = pointAt(ring, position);
        const next = pointAt(ring, position + 1);
        sum += current.x * next.y - next.x * current.y;
    }

    return sum;
}

// The same ring, starting at the given position.
export function startingAt(ring: readonly Point[], position: number) {
    const rotated: Point[] = [];

    for (let offset = 0; offset < ring.length; offset++) {
        const point = pointAt(ring, position + offset);
        rotated.push(point);
    }

    return rotated;
}
