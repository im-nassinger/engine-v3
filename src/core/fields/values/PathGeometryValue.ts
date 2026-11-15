import type { PathCorner, PathGeometry, PathPoint, Point } from '../../geometry/index.ts';

import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, hasExactlyKeys, isPlainObject, parseFiniteNumber, parsePoint, refuse } from '../rawChecks.ts';
import type { ValueType } from '../ValueType.ts';

const CORNERS: readonly PathCorner[] = ['sharp', 'smooth', 'separate'];
const POINT_KEYS = ['x', 'y', 'handle_in', 'handle_out', 'corner'];
// An open path keeps at least 2 points, a closed one 3, as point editing says.
const MIN_OPEN_POINTS = 2;
const MIN_CLOSED_POINTS = 3;

function parseHandle(raw: unknown): ParseOutcome<Point | null> {
    if (raw === null) return accept(null);

    return parsePoint(raw);
}

function parseCorner(raw: unknown): ParseOutcome<PathCorner> {
    const corner = CORNERS.find((candidate) => candidate === raw);
    if (corner === undefined) return refuse({ reason: 'unknownChoice' });

    return accept(corner);
}

function parsePathPoint(raw: unknown): ParseOutcome<PathPoint> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });
    if (!hasExactlyKeys(raw, POINT_KEYS)) return refuse({ reason: 'wrongType' });

    const parsedX = parseFiniteNumber(raw['x']);
    if (!parsedX.ok) return parsedX;

    const parsedY = parseFiniteNumber(raw['y']);
    if (!parsedY.ok) return parsedY;

    const parsedHandleIn = parseHandle(raw['handle_in']);
    if (!parsedHandleIn.ok) return parsedHandleIn;

    const parsedHandleOut = parseHandle(raw['handle_out']);
    if (!parsedHandleOut.ok) return parsedHandleOut;

    const parsedCorner = parseCorner(raw['corner']);
    if (!parsedCorner.ok) return parsedCorner;

    return accept({
        x: parsedX.value,
        y: parsedY.value,
        handleIn: parsedHandleIn.value,
        handleOut: parsedHandleOut.value,
        corner: parsedCorner.value,
    });
}

function copyHandle(handle: Point | null) {
    if (handle === null) return null;

    return { x: handle.x, y: handle.y };
}

function handlesEqual(first: Point | null, second: Point | null) {
    if (first === null || second === null) return first === second;

    return first.x === second.x && first.y === second.y;
}

function pathPointsEqual(first: PathPoint, second: PathPoint) {
    const samePlace = first.x === second.x && first.y === second.y;
    const sameHandleIn = handlesEqual(first.handleIn, second.handleIn);
    const sameHandleOut = handlesEqual(first.handleOut, second.handleOut);

    return samePlace && sameHandleIn && sameHandleOut && first.corner === second.corner;
}

function clonePathPoint(point: PathPoint): PathPoint {
    const handleIn = copyHandle(point.handleIn);
    const handleOut = copyHandle(point.handleOut);

    return { x: point.x, y: point.y, handleIn, handleOut, corner: point.corner };
}

// The PathComponent's stored path, saved as { closed, points: [{ x, y, handle_in, handle_out, corner }] }.
export class PathGeometryValue implements ValueType<PathGeometry> {
    parse(raw: unknown): ParseOutcome<PathGeometry> {
        if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });
        if (!hasExactlyKeys(raw, ['closed', 'points'])) return refuse({ reason: 'wrongType' });

        const closed = raw['closed'];
        if (typeof closed !== 'boolean') return refuse({ reason: 'wrongType' });

        const rawPoints = raw['points'];
        if (!Array.isArray(rawPoints)) return refuse({ reason: 'wrongType' });

        const minCount = closed ? MIN_CLOSED_POINTS : MIN_OPEN_POINTS;
        if (rawPoints.length < minCount) return refuse({ reason: 'tooFewPoints', minCount });

        const points: PathPoint[] = [];
        for (const rawPoint of rawPoints) {
            const parsed = parsePathPoint(rawPoint);
            if (!parsed.ok) return parsed;

            points.push(parsed.value);
        }

        return accept({ closed, points });
    }

    serialize(value: PathGeometry) {
        const points = value.points.map((point) => ({
            x: point.x,
            y: point.y,
            handle_in: copyHandle(point.handleIn),
            handle_out: copyHandle(point.handleOut),
            corner: point.corner,
        }));

        return { closed: value.closed, points };
    }

    normalize(value: PathGeometry) {
        return value;
    }

    clone(value: PathGeometry): PathGeometry {
        const points = value.points.map(clonePathPoint);

        return { closed: value.closed, points };
    }

    equals(first: PathGeometry, second: PathGeometry) {
        if (first.closed !== second.closed) return false;
        if (first.points.length !== second.points.length) return false;

        return first.points.every((point, index) => {
            const other = second.points[index];
            return other !== undefined && pathPointsEqual(point, other);
        });
    }
}
