import type { Matrix2D, PathPoint, Point } from '../../../core/geometry/index.ts';

import { angleLocked } from '../shape/polygonDrawing.ts';

// The level positions and the current group's own space, both ways.
export type GroupSpace = {
    readonly toLevel: Matrix2D;
    readonly toGroup: Matrix2D;
};

// The points placed so far, in the space the first point was placed in.
export type PathInProgress = {
    readonly points: readonly PathPoint[];
    readonly space: GroupSpace;
};

const ORIGIN: Point = { x: 0, y: 0 };

export function sharpPoint(place: Point): PathPoint {
    return { x: place.x, y: place.y, handleIn: null, handleOut: null, corner: 'sharp' };
}

export function between(from: Point, to: Point): Point {
    return { x: to.x - from.x, y: to.y - from.y };
}

export function plus(point: Point, vector: Point): Point {
    return { x: point.x + vector.x, y: point.y + vector.y };
}

// Adding 0 turns a -0 into 0, so a mirrored handle along an axis compares equal to one typed.
export function mirrored(handle: Point): Point {
    return { x: -handle.x + 0, y: -handle.y + 0 };
}

export function isZero(handle: Point | null) {
    return handle === null || (handle.x === 0 && handle.y === 0);
}

// The handle from the point to the mouse, with Shift at a multiple of 15°, keeping its length.
export function draggedHandle(anchor: Point, mouse: Point, shift: boolean): Point {
    const handle = between(anchor, mouse);

    return shift ? angleLocked(ORIGIN, handle) : handle;
}

// A point and its handles in level positions, the handles still measured from the point.
export function pointToLevel(point: PathPoint, toLevel: Matrix2D): PathPoint {
    const place = toLevel.apply(point);
    const handleToLevel = (handle: Point | null) =>
        handle === null ? null : between(place, toLevel.apply(plus(point, handle)));

    return { ...point, ...place, handleIn: handleToLevel(point.handleIn), handleOut: handleToLevel(point.handleOut) };
}

// An open path has no handle before its first point and none after its last.
export function withOpenEnds(points: readonly PathPoint[]): readonly PathPoint[] {
    const last = points.length - 1;

    return points.map((point, index) => ({
        ...point,
        handleIn: index === 0 ? null : point.handleIn,
        handleOut: index === last ? null : point.handleOut,
    }));
}
