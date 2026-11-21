import type { CubicCurve } from '../path/cubicCurve.ts';
import type { PathGeometry, PathPoint } from '../PathGeometry.ts';
import type { Point } from '../Point.ts';

import { fitCubic, tangentAt } from './fitCubic.ts';
import { subtract, times } from './vectors.ts';

export type CurveFitOptions = {
    readonly closed: boolean;
    // The farthest a dragged point may lie from the path, in the drag's own units.
    readonly tolerance: number;
    readonly maxPoints: number;
};

export type CurveFit = {
    readonly path: PathGeometry;
    // True when the tolerance was doubled until the path fit within maxPoints.
    readonly toleranceRaised: boolean;
};

// A closed loop is first cut in three, so it always has the 3 points a closed path needs.
const CLOSED_PARTS = 3;

// The Pencil's fitting: turns a drag into a few cubic curves, every point smooth. A closed loop runs from
// the last dragged point back to the first. A drag of fewer than 3 different points can't close and is
// fitted open.
export function fitCurves(dragged: readonly Point[], options: CurveFitOptions): CurveFit {
    if (!(options.tolerance > 0)) throw new Error('The tolerance must be above 0.');

    const points = withoutRepeats(dragged);
    if (points.length < 2) throw new Error('A drag needs 2 different points to fit.');

    const closed = options.closed && points.length >= CLOSED_PARTS;
    const fewestPoints = closed ? CLOSED_PARTS : 2;
    let tolerance = options.tolerance;
    let toleranceRaised = false;

    for (;;) {
        const curves = closed ? fitClosed(points, tolerance) : fitOpen(points, tolerance);
        const pathPoints = toPathPoints(curves, closed);
        const fits = pathPoints.length <= options.maxPoints || pathPoints.length <= fewestPoints;
        if (fits) return { path: { closed, points: pathPoints }, toleranceRaised };

        tolerance *= 2;
        toleranceRaised = true;
    }
}

function withoutRepeats(dragged: readonly Point[]) {
    const points: Point[] = [];

    for (const point of dragged) {
        const last = points[points.length - 1];
        const repeated = last !== undefined && last.x === point.x && last.y === point.y;
        if (repeated) continue;

        points.push({ x: point.x, y: point.y });
    }

    return points;
}

function fitOpen(points: readonly Point[], tolerance: number) {
    const last = points.length - 1;
    const startTangent = subtract(points[1] as Point, points[0] as Point);
    const endTangent = subtract(points[last - 1] as Point, points[last] as Point);
    const curves: CubicCurve[] = [];

    fitCubic(points, 0, last, startTangent, endTangent, tolerance * tolerance, curves);

    return curves;
}

function fitClosed(points: readonly Point[], tolerance: number) {
    const count = points.length;
    const first = points[0] as Point;
    const loop = [...points, first];
    const curves: CubicCurve[] = [];

    const ends = [0];
    for (let part = 1; part < CLOSED_PARTS; part++) {
        ends.push(Math.floor((count * part) / CLOSED_PARTS));
    }
    ends.push(count);

    const startTangent = subtract(points[count - 1] as Point, points[1] as Point);
    const tangents = ends.map((index) => {
        if (index === 0 || index === count) return startTangent;
        return tangentAt(loop, index);
    });

    for (let part = 0; part < CLOSED_PARTS; part++) {
        const from = ends[part] as number;
        const to = ends[part + 1] as number;
        const outwards = times(tangents[part] as Point, -1);
        const backwards = tangents[part + 1] as Point;

        fitCubic(loop, from, to, outwards, backwards, tolerance * tolerance, curves);
    }

    return curves;
}

function handleFrom(point: Point, control: Point): Point {
    // Adding 0 turns a -0 into 0, so a handle along an axis compares equal to one typed.
    return { x: control.x - point.x + 0, y: control.y - point.y + 0 };
}

// Each curve's start becomes a point, its handle out reaching the curve's first control and its handle in
// the curve before's second control. An open path also takes the last curve's end, and its ends have no
// handle outside.
function toPathPoints(curves: readonly CubicCurve[], closed: boolean) {
    const pathPoints: PathPoint[] = [];
    const count = curves.length;

    for (let i = 0; i < count; i++) {
        const curve = curves[i] as CubicCurve;
        const isOpenStart = !closed && i === 0;
        let handleIn: Point | null = null;

        if (!isOpenStart) {
            const before = curves[(i - 1 + count) % count] as CubicCurve;
            handleIn = handleFrom(curve.start, before.secondControl);
        }

        const handleOut = handleFrom(curve.start, curve.firstControl);
        pathPoints.push({ x: curve.start.x, y: curve.start.y, handleIn, handleOut, corner: 'smooth' });
    }

    if (!closed) {
        const lastCurve = curves[count - 1] as CubicCurve;
        const end = lastCurve.end;
        const handleIn = handleFrom(end, lastCurve.secondControl);
        pathPoints.push({ x: end.x, y: end.y, handleIn, handleOut: null, corner: 'smooth' });
    }

    return pathPoints;
}
