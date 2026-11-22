import { ShapeOutlines, curveBetween, pointOnCubic } from '../../../../core/geometry/index.ts';
import type { CubicCurve, Matrix2D, PathGeometry, Point, ShapeGeometry } from '../../../../core/geometry/index.ts';

// More points than collision's 32, so a selected circle still looks round when zoomed in.
const CIRCLE_OUTLINE_POINTS = 64;
// A path's curve is cut into straight pieces about this long on screen, so it looks smooth at any zoom
// without a 2,000-point path costing tens of thousands of points when zoomed out.
const CURVE_PIECE_PX = 6;
const MAX_PIECES_PER_CURVE = 32;

export type ShapeOutline = {
    // In level positions.
    readonly points: readonly Point[];
    // A line is open; every other kind joins its last point to the first.
    readonly isClosed: boolean;
};

function circlePoints(radius: number) {
    const points: Point[] = [];

    for (let i = 0; i < CIRCLE_OUTLINE_POINTS; i++) {
        const angle = (i / CIRCLE_OUTLINE_POINTS) * 2 * Math.PI;
        points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }

    return points;
}

function ownPoints(geometry: ShapeGeometry): readonly Point[] {
    switch (geometry.kind) {
        case 'rectangle':
            return ShapeOutlines.rectangle(geometry.width, geometry.height);
        case 'circle':
            return circlePoints(geometry.radius);
        case 'polygon':
        case 'line':
            return geometry.points;
    }
}

// The real shape's edge, its outline width left out, at the entity's level matrix.
export function shapeOutline(geometry: ShapeGeometry, levelMatrix: Matrix2D): ShapeOutline {
    const points = ownPoints(geometry).map((point) => levelMatrix.apply(point));

    return { points, isClosed: geometry.kind !== 'line' };
}

function distance(from: Point, to: Point) {
    return Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
}

// A curve is never longer than its control points' polygon, so that sets how many pieces it needs.
function piecesOf(curve: CubicCurve, zoom: number) {
    const { start, firstControl, secondControl, end } = curve;
    const longest =
        distance(start, firstControl) + distance(firstControl, secondControl) + distance(secondControl, end);

    return Math.min(MAX_PIECES_PER_CURVE, Math.max(1, Math.ceil((longest * zoom) / CURVE_PIECE_PX)));
}

// The curve a path draws, at the entity's level matrix, cut into straight pieces for the zoom. A cubic
// under a matrix is the cubic of the moved control points, so the curve is cut after moving them.
export function pathOutline(path: PathGeometry, levelMatrix: Matrix2D, zoom: number): ShapeOutline {
    const [first] = path.points;
    if (first === undefined) return { points: [], isClosed: path.closed };

    const points: Point[] = [levelMatrix.apply(first)];

    path.points.forEach((point, index) => {
        const next = path.points[index + 1] ?? (path.closed ? path.points[0] : undefined);
        if (next === undefined) return;

        const own = curveBetween(point, next);
        const curve = {
            start: levelMatrix.apply(own.start),
            firstControl: levelMatrix.apply(own.firstControl),
            secondControl: levelMatrix.apply(own.secondControl),
            end: levelMatrix.apply(own.end),
        };
        const isStraight = point.handleOut === null && next.handleIn === null;
        const pieces = isStraight ? 1 : piecesOf(curve, zoom);

        for (let piece = 1; piece <= pieces; piece++) {
            points.push(pointOnCubic(curve, piece / pieces));
        }
    });

    // The closing curve already came back to the first point.
    if (path.closed) {
        points.pop();
    }

    return { points, isClosed: path.closed };
}
