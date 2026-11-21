import type { PathGeometry } from '../PathGeometry.ts';
import type { Point } from '../Point.ts';

export type PointHandles = {
    readonly handleIn: Point | null;
    readonly handleOut: Point | null;
};

// Each handle reaches this share of the way to its neighbour, as Inkscape's.
const HANDLE_SHARE = 1 / 3;

function between(from: Point, to: Point): Point {
    return { x: to.x - from.x, y: to.y - from.y };
}

function lengthOf(vector: Point) {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}

function scaled(vector: Point, length: number): Point {
    const own = lengthOf(vector);
    if (own === 0) return { x: 0, y: 0 };

    // Adding 0 turns a -0 into 0, so a handle along an axis compares equal to one typed.
    return { x: (vector.x / own) * length + 0, y: (vector.y / own) * length + 0 };
}

// The handles of a point turned smooth: on the line from the point before it to the point after, each a third
// of the way to its own neighbour. An end of an open path has one neighbour, so it takes one handle, towards
// it. When the neighbours lie on the same spot, each handle points at its own neighbour instead.
export function smoothHandles(path: PathGeometry, index: number): PointHandles {
    const { points, closed } = path;
    const point = points[index];
    if (point === undefined) throw new Error(`The path has no point ${index}.`);

    const count = points.length;
    const before = index > 0 || closed ? points[(index - 1 + count) % count] : undefined;
    const after = index < count - 1 || closed ? points[(index + 1) % count] : undefined;

    if (before === undefined && after === undefined) return { handleIn: null, handleOut: null };
    if (before === undefined) return { handleIn: null, handleOut: towards(point, after as Point) };
    if (after === undefined) return { handleIn: towards(point, before), handleOut: null };

    const direction = between(before, after);
    if (lengthOf(direction) === 0) return { handleIn: towards(point, before), handleOut: towards(point, after) };

    const inLength = lengthOf(between(point, before)) * HANDLE_SHARE;
    const outLength = lengthOf(between(point, after)) * HANDLE_SHARE;
    const backwards = { x: -direction.x, y: -direction.y };

    return { handleIn: scaled(backwards, inLength), handleOut: scaled(direction, outLength) };
}

function towards(point: Point, neighbour: Point) {
    const toNeighbour = between(point, neighbour);

    return { x: toNeighbour.x * HANDLE_SHARE + 0, y: toNeighbour.y * HANDLE_SHARE + 0 };
}

// A smooth point's other handle, turned to the opposite side of the one that moved and keeping its own
// length. A handle of length 0 gives no direction, so the other stays as it was.
export function oppositeHandle(moved: Point, other: Point): Point {
    if (lengthOf(moved) === 0) return other;

    const backwards = { x: -moved.x, y: -moved.y };

    return scaled(backwards, lengthOf(other));
}
