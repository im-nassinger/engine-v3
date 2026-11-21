import type { PathCorner, PathPoint, Point } from '../../geometry/index.ts';

import type { FieldType } from '../FieldType.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, hasExactlyKeys, isPlainObject, parseFiniteNumber, parsePoint, refuse } from '../rawChecks.ts';

const CORNERS: readonly PathCorner[] = ['sharp', 'smooth', 'separate'];
const POINT_KEYS = ['x', 'y', 'handle_in', 'handle_out', 'corner'];

function parseHandle(raw: unknown): ParseOutcome<Point | null> {
    if (raw === null) return accept(null);

    return parsePoint(raw);
}

function parseCorner(raw: unknown): ParseOutcome<PathCorner> {
    const corner = CORNERS.find((candidate) => candidate === raw);
    if (corner === undefined) return refuse({ reason: 'unknownChoice' });

    return accept(corner);
}

function copyHandle(handle: Point | null) {
    if (handle === null) return null;

    return { x: handle.x, y: handle.y };
}

function handlesEqual(first: Point | null, second: Point | null) {
    if (first === null || second === null) return first === second;

    return first.x === second.x && first.y === second.y;
}

// One point of a path, stored as { x, y, handle_in, handle_out, corner }, each handle measured from its
// point or null. Which handles a smooth point needs depends on its place in the path, so the
// PathComponent's Points write gives or drops those; on its own a point only drops a sharp one's handles.
export class PathPointFieldType implements FieldType<PathPoint> {
    readonly kind = 'pathPoint';

    parse(raw: unknown): ParseOutcome<PathPoint> {
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

    serialize(value: PathPoint) {
        return {
            x: value.x,
            y: value.y,
            handle_in: copyHandle(value.handleIn),
            handle_out: copyHandle(value.handleOut),
            corner: value.corner,
        };
    }

    normalize(value: PathPoint): PathPoint {
        if (value.corner !== 'sharp') return value;

        return { x: value.x, y: value.y, handleIn: null, handleOut: null, corner: 'sharp' };
    }

    clone(value: PathPoint): PathPoint {
        const handleIn = copyHandle(value.handleIn);
        const handleOut = copyHandle(value.handleOut);

        return { x: value.x, y: value.y, handleIn, handleOut, corner: value.corner };
    }

    equals(first: PathPoint, second: PathPoint) {
        const samePlace = first.x === second.x && first.y === second.y;
        const sameHandleIn = handlesEqual(first.handleIn, second.handleIn);
        const sameHandleOut = handlesEqual(first.handleOut, second.handleOut);

        return samePlace && sameHandleIn && sameHandleOut && first.corner === second.corner;
    }
}
