import { DeterministicMath } from '../../../core/math/index.ts';
import type { PathGeometry, PathPoint, Point, ShapeGeometry, ShapePiecesResult } from '../../../core/geometry/index.ts';

// The level view draws a circle round, so its hit outline has more points than its collision outline:
// at 128 the edge is off by under 0.03% of the radius.
const CIRCLE_HIT_POINT_COUNT = 128;
// The steps one curved path segment is cut into. v1 only makes straight paths, so this is for v2's pen.
const CURVE_STEP_COUNT = 16;

// Lines and fills in an entity's own space, before its matrix.
export type OwnSpaceOutlines = {
    readonly lines: readonly { readonly points: readonly Point[]; readonly closed: boolean }[];
    readonly fills: readonly (readonly Point[])[];
};

function roundOutline(radius: number) {
    const degreesPerPoint = 360 / CIRCLE_HIT_POINT_COUNT;
    const outline: Point[] = [];

    for (let i = 0; i < CIRCLE_HIT_POINT_COUNT; i++) {
        const angle = DeterministicMath.sinCos(i * degreesPerPoint);
        outline.push({ x: radius * angle.cos, y: radius * angle.sin });
    }

    return outline;
}

function pointOnCurve(from: PathPoint, to: PathPoint, share: number): Point {
    const handleOut = from.handleOut ?? { x: 0, y: 0 };
    const handleIn = to.handleIn ?? { x: 0, y: 0 };
    const rest = 1 - share;
    const fromWeight = rest * rest * rest;
    const firstControlWeight = 3 * rest * rest * share;
    const secondControlWeight = 3 * rest * share * share;
    const toWeight = share * share * share;

    const firstControlX = from.x + handleOut.x;
    const firstControlY = from.y + handleOut.y;
    const secondControlX = to.x + handleIn.x;
    const secondControlY = to.y + handleIn.y;

    const x =
        fromWeight * from.x +
        firstControlWeight * firstControlX +
        secondControlWeight * secondControlX +
        toWeight * to.x;
    const y =
        fromWeight * from.y +
        firstControlWeight * firstControlY +
        secondControlWeight * secondControlY +
        toWeight * to.y;

    return { x, y };
}

function addSegment(points: Point[], from: PathPoint, to: PathPoint) {
    const isStraight = from.handleOut === null && to.handleIn === null;
    if (isStraight) {
        points.push({ x: to.x, y: to.y });
        return;
    }

    for (let step = 1; step <= CURVE_STEP_COUNT; step++) {
        const share = step / CURVE_STEP_COUNT;
        const point = pointOnCurve(from, to, share);
        points.push(point);
    }
}

// The path as straight edges. A closed path's last segment, back to its first point, is included, so the
// closing edge can be a curve too.
function pathPoints(path: PathGeometry) {
    const first = path.points[0];
    if (first === undefined) return [];

    const points: Point[] = [{ x: first.x, y: first.y }];
    let previous = first;

    for (const point of path.points.slice(1)) {
        addSegment(points, previous, point);
        previous = point;
    }

    if (path.closed) {
        addSegment(points, previous, first);
        points.pop();
    }

    return points;
}

export class LocalOutlines {
    static path(path: PathGeometry, filled: boolean): OwnSpaceOutlines {
        const points = pathPoints(path);
        if (points.length < 2) return { lines: [], fills: [] };

        const line = { points, closed: path.closed };
        const canFill = filled && path.closed;
        if (!canFill) return { lines: [line], fills: [] };

        return { lines: [line], fills: [points] };
    }

    // The edge follows what the level view draws: a polygon's own points, so a self-crossing polygon is hit
    // along its crossings, and a rectangle's and a circle's outlines. The fill is the filled outlines.
    static shape(geometry: ShapeGeometry, pieces: ShapePiecesResult, filled: boolean): OwnSpaceOutlines {
        switch (geometry.kind) {
            case 'line':
                return { lines: [{ points: geometry.points, closed: false }], fills: [] };
            case 'circle': {
                const outline = roundOutline(geometry.radius);
                const fills = filled ? [outline] : [];
                return { lines: [{ points: outline, closed: true }], fills };
            }
            case 'polygon': {
                const fills = filled ? pieces.filledOutlines : [];
                return { lines: [{ points: geometry.points, closed: true }], fills };
            }
            case 'rectangle': {
                const lines = pieces.filledOutlines.map((points) => ({ points, closed: true }));
                const fills = filled ? pieces.filledOutlines : [];
                return { lines, fills };
            }
        }
    }
}
