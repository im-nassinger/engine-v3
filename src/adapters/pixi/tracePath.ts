import type { PathGeometry, PathPoint, Point } from '../../core/geometry/index.ts';

// What tracing a path needs of whatever it draws on: a PixiJS Graphics or a 2D canvas.
export type PathPen = {
    moveTo(point: Point): void;
    lineTo(point: Point): void;
    curveTo(firstControl: Point, secondControl: Point, to: Point): void;
    closePath(): void;
};

function traceCurve(pen: PathPen, from: PathPoint, to: PathPoint) {
    const isStraight = from.handleOut === null && to.handleIn === null;
    if (isStraight) {
        pen.lineTo(to);
        return;
    }

    const handleOut = from.handleOut ?? { x: 0, y: 0 };
    const handleIn = to.handleIn ?? { x: 0, y: 0 };
    const firstControl = { x: from.x + handleOut.x, y: from.y + handleOut.y };
    const secondControl = { x: to.x + handleIn.x, y: to.y + handleIn.y };

    pen.curveTo(firstControl, secondControl, to);
}

export function tracePath(pen: PathPen, path: PathGeometry) {
    const first = path.points[0];
    if (first === undefined) return;

    pen.moveTo(first);

    let previous = first;
    for (const point of path.points.slice(1)) {
        traceCurve(pen, previous, point);
        previous = point;
    }

    if (!path.closed) return;

    traceCurve(pen, previous, first);
    pen.closePath();
}
