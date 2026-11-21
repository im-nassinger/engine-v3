import type { PathPoint } from '../PathGeometry.ts';
import type { Point } from '../Point.ts';

// A curve's four control points, from one path point to the next: a missing handle sits on its point.
export type CubicCurve = {
    readonly start: Point;
    readonly firstControl: Point;
    readonly secondControl: Point;
    readonly end: Point;
};

export function curveBetween(from: PathPoint, to: PathPoint): CubicCurve {
    const handleOut = from.handleOut ?? { x: 0, y: 0 };
    const handleIn = to.handleIn ?? { x: 0, y: 0 };

    return {
        start: { x: from.x, y: from.y },
        firstControl: { x: from.x + handleOut.x, y: from.y + handleOut.y },
        secondControl: { x: to.x + handleIn.x, y: to.y + handleIn.y },
        end: { x: to.x, y: to.y },
    };
}

// A segment with no handle on either side is straight.
export function isStraightBetween(from: PathPoint, to: PathPoint) {
    return from.handleOut === null && to.handleIn === null;
}

export function lerp(from: Point, to: Point, share: number): Point {
    return { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share };
}

// The place on the curve at a share of the way from 0 to 1, by de Casteljau's method.
export function pointOnCubic(curve: CubicCurve, share: number): Point {
    const { start, firstControl, secondControl, end } = curve;
    const a = lerp(start, firstControl, share);
    const b = lerp(firstControl, secondControl, share);
    const c = lerp(secondControl, end, share);

    return lerp(lerp(a, b, share), lerp(b, c, share), share);
}
