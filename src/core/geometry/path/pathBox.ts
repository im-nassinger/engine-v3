import { Bounds } from '../Bounds.ts';
import type { PathGeometry, PathPoint } from '../PathGeometry.ts';
import type { Point } from '../Point.ts';

// Where a curve's speed along one axis is 0 between its ends, for a cubic from start through its two
// controls to its end: the roots in (0, 1) of the derivative, a quadratic.
function turningTimes(start: number, firstControl: number, secondControl: number, end: number) {
    const a = 3 * (-start + 3 * firstControl - 3 * secondControl + end);
    const b = 6 * (start - 2 * firstControl + secondControl);
    const c = 3 * (firstControl - start);

    const roots = a === 0 ? linearRoots(b, c) : quadraticRoots(a, b, c);

    return roots.filter((time) => time > 0 && time < 1);
}

function linearRoots(b: number, c: number) {
    if (b === 0) return [];

    return [-c / b];
}

function quadraticRoots(a: number, b: number, c: number) {
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return [];

    const root = Math.sqrt(discriminant);
    return [(-b + root) / (2 * a), (-b - root) / (2 * a)];
}

function pointOnCurve(start: Point, firstControl: Point, secondControl: Point, end: Point, time: number): Point {
    const rest = 1 - time;
    const startShare = rest * rest * rest;
    const firstShare = 3 * rest * rest * time;
    const secondShare = 3 * rest * time * time;
    const endShare = time * time * time;

    return {
        x: startShare * start.x + firstShare * firstControl.x + secondShare * secondControl.x + endShare * end.x,
        y: startShare * start.y + firstShare * firstControl.y + secondShare * secondControl.y + endShare * end.y,
    };
}

// The points of a curve that reach farthest out: its turning points along x and y. Its ends are counted
// with the path's points.
function curveExtremes(from: PathPoint, to: PathPoint): Point[] {
    const isStraight = from.handleOut === null && to.handleIn === null;
    if (isStraight) return [];

    const handleOut = from.handleOut ?? { x: 0, y: 0 };
    const handleIn = to.handleIn ?? { x: 0, y: 0 };
    const firstControl = { x: from.x + handleOut.x, y: from.y + handleOut.y };
    const secondControl = { x: to.x + handleIn.x, y: to.y + handleIn.y };

    const times = [
        ...turningTimes(from.x, firstControl.x, secondControl.x, to.x),
        ...turningTimes(from.y, firstControl.y, secondControl.y, to.y),
    ];

    return times.map((time) => pointOnCurve(from, firstControl, secondControl, to, time));
}

// The box of the curve a path draws, exactly: not its handles, which a curve rarely reaches. A closed
// path counts its closing curve. undefined for a path with no points.
export function pathBox(path: PathGeometry) {
    const points: Point[] = [...path.points];

    path.points.forEach((point, index) => {
        const next = path.points[index + 1] ?? (path.closed ? path.points[0] : undefined);
        if (next === undefined) return;

        points.push(...curveExtremes(point, next));
    });

    return Bounds.around(points);
}
