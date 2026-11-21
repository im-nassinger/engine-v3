import type { PathPoint } from '../PathGeometry.ts';
import type { Point } from '../Point.ts';

import { curveBetween, isStraightBetween, lerp } from './cubicCurve.ts';

// The two path points a curve runs between, after a point was added on it, and the new point.
export type CurveSplit = {
    readonly from: PathPoint;
    readonly added: PathPoint;
    readonly to: PathPoint;
};

function handleFrom(point: Point, control: Point): Point {
    // Adding 0 turns a -0 into 0, so a handle along an axis compares equal to one typed.
    return { x: control.x - point.x + 0, y: control.y - point.y + 0 };
}

// Cuts the curve from one path point to the next at a share of the way along it, by de Casteljau's method,
// so the two curves left draw exactly the one before. The new point is smooth, its two handles on one line;
// the neighbours' handles shorten to match, and a missing one stays missing. On a straight segment the new
// point is sharp, the share measured along its length, and the neighbours don't change.
export function splitCurve(from: PathPoint, to: PathPoint, share: number): CurveSplit {
    const curve = curveBetween(from, to);

    if (isStraightBetween(from, to)) {
        const place = lerp(curve.start, curve.end, share);
        const added: PathPoint = { x: place.x, y: place.y, handleIn: null, handleOut: null, corner: 'sharp' };
        return { from, added, to };
    }

    const a = lerp(curve.start, curve.firstControl, share);
    const b = lerp(curve.firstControl, curve.secondControl, share);
    const c = lerp(curve.secondControl, curve.end, share);
    const d = lerp(a, b, share);
    const e = lerp(b, c, share);
    const place = lerp(d, e, share);

    const newFrom = { ...from, handleOut: from.handleOut === null ? null : handleFrom(from, a) };
    const newTo = { ...to, handleIn: to.handleIn === null ? null : handleFrom(to, c) };
    const added: PathPoint = {
        x: place.x,
        y: place.y,
        handleIn: handleFrom(place, d),
        handleOut: handleFrom(place, e),
        corner: 'smooth',
    };

    return { from: newFrom, added, to: newTo };
}
