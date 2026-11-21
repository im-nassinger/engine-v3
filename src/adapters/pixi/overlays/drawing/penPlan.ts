import type { PathPoint, Point } from '../../../../core/geometry/index.ts';

import type { ShownPenPreview } from './DrawingSource.ts';

// A curve is drawn as this many straight steps: smooth on screen at the sizes a path is drawn.
const CURVE_STEPS = 24;

// One of the path's points as the overlay marks it: a sharp point a square, a smooth or separate one a
// circle; filled with the accent colour while it is being placed.
export type PenPointMark = {
    readonly place: Point;
    readonly isRound: boolean;
    readonly isFilled: boolean;
};

// What the pen's preview draws, in level positions, as the level view's v2 table says.
export type PenPlan = {
    // The placed curves, cut into straight steps: the default outline.
    readonly placed: readonly Point[];
    // The curve being made, dashed at 60% until the next click or release places it.
    readonly making: readonly Point[];
    readonly marks: readonly PenPointMark[];
    // The handles of the point being placed, each from its point to its end.
    readonly handles: readonly (readonly [Point, Point])[];
    // The first point, a 12 px ring.
    readonly ring: Point | undefined;
    // A press now, or the one in progress, closes the path: the ring fills at 25%.
    readonly closing: boolean;
    // The ends of the open path the pen was picked with, each a 12 px ring, filled at 25% under the mouse.
    readonly endRings: readonly PenEndRing[];
};

export type PenEndRing = {
    readonly place: Point;
    readonly filled: boolean;
};

export function planPen(pen: ShownPenPreview): PenPlan {
    const { points, next, placing, closing } = pen;
    const first = points[0];
    const last = points.at(-1);
    const endRings = pen.ends.map((end) => ({ place: end.place, filled: end.underMouse }));

    if (first === undefined || last === undefined) {
        const marks = next === undefined ? [] : [{ place: next, isRound: false, isFilled: false }];

        return { placed: [], making: [], marks, handles: [], ring: undefined, closing: false, endRings };
    }

    // While a point is added, the curve to it is the one being made; else the curve to the mouse, or the
    // closing curve back to the first point.
    const isAdding = placing !== undefined && !closing && placing === points.length - 1;
    const placedPoints = isAdding ? points.slice(0, -1) : points;

    return {
        placed: polyline(placedPoints),
        making: makingCurve(pen, isAdding, first, last),
        marks: points.map((point, index) => ({
            place: placeOf(point),
            isRound: point.corner !== 'sharp',
            isFilled: index === placing,
        })),
        handles: handlesOf(placing === undefined ? undefined : points[placing]),
        ring: placeOf(first),
        closing,
        endRings,
    };
}

// Only the place, without the handles.
function placeOf(point: PathPoint): Point {
    return { x: point.x, y: point.y };
}

function makingCurve(pen: ShownPenPreview, isAdding: boolean, first: PathPoint, last: PathPoint) {
    const { points, next, closing } = pen;
    if (closing) return points.length >= 2 ? curvePoints(last, first) : [];
    if (isAdding) {
        const before = points.at(-2);

        return before === undefined ? [] : curvePoints(before, last);
    }
    if (next === undefined) return [];

    return curvePoints(last, { ...next, handleIn: null, handleOut: null, corner: 'sharp' });
}

function handlesOf(point: PathPoint | undefined) {
    if (point === undefined) return [];

    const ends = [point.handleIn, point.handleOut].filter(
        (handle): handle is Point => handle !== null && !isZero(handle),
    );

    const place = placeOf(point);

    return ends.map((handle) => [place, { x: place.x + handle.x, y: place.y + handle.y }] as const);
}

function isZero(handle: Point) {
    return handle.x === 0 && handle.y === 0;
}

// The points through the curves from each point to the next.
function polyline(points: readonly PathPoint[]) {
    const [first] = points;
    if (first === undefined) return [];

    const line: Point[] = [placeOf(first)];
    for (let index = 1; index < points.length; index += 1) {
        const from = points[index - 1];
        const to = points[index];
        if (from === undefined || to === undefined) continue;

        line.push(...curvePoints(from, to).slice(1));
    }

    return line;
}

// A straight segment is its two ends; a curve is cut into CURVE_STEPS straight steps.
function curvePoints(from: PathPoint, to: PathPoint): readonly Point[] {
    if (from.handleOut === null && to.handleIn === null) return [placeOf(from), placeOf(to)];

    const handleOut = from.handleOut ?? { x: 0, y: 0 };
    const handleIn = to.handleIn ?? { x: 0, y: 0 };
    const firstControl = { x: from.x + handleOut.x, y: from.y + handleOut.y };
    const secondControl = { x: to.x + handleIn.x, y: to.y + handleIn.y };

    const steps: Point[] = [];
    for (let step = 0; step <= CURVE_STEPS; step += 1) {
        steps.push(cubicAt(from, firstControl, secondControl, to, step / CURVE_STEPS));
    }

    return steps;
}

function cubicAt(start: Point, firstControl: Point, secondControl: Point, end: Point, t: number): Point {
    const rest = 1 - t;
    const a = rest * rest * rest;
    const b = 3 * rest * rest * t;
    const c = 3 * rest * t * t;
    const d = t * t * t;

    return {
        x: a * start.x + b * firstControl.x + c * secondControl.x + d * end.x,
        y: a * start.y + b * firstControl.y + c * secondControl.y + d * end.y,
    };
}
