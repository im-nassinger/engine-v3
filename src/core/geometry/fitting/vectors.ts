import type { Point } from '../Point.ts';

// Only + − × ÷ and Math.sqrt, so a fit gives the same path on any computer.

export function add(a: Point, b: Point): Point {
    return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a: Point, b: Point): Point {
    return { x: a.x - b.x, y: a.y - b.y };
}

export function times(vector: Point, factor: number): Point {
    return { x: vector.x * factor, y: vector.y * factor };
}

export function dot(a: Point, b: Point) {
    return a.x * b.x + a.y * b.y;
}

export function distanceSquared(a: Point, b: Point) {
    const difference = subtract(a, b);

    return dot(difference, difference);
}

export function distance(a: Point, b: Point) {
    return Math.sqrt(distanceSquared(a, b));
}

// A vector of length 0 has no direction, so it stays 0.
export function withLength(vector: Point, length: number): Point {
    const own = Math.sqrt(dot(vector, vector));
    if (own === 0) return { x: 0, y: 0 };

    return times(vector, length / own);
}
