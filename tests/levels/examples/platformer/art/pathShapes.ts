import type { PathGeometry, PathPoint, Point } from '../../../../../src/core/geometry/index.ts';

// Closed curved paths for the example level's art, in the flat, outline-free look of the owner's
// reference. Every point is smooth unless named sharp; a smooth point's handles follow its neighbours
// (Catmull-Rom), which draws a soft round outline through the points.
const CURVE_TENSION = 6;

export type OutlinePoint = Point & { readonly sharp?: boolean };

function rounded(value: number) {
    return Math.round(value * 100) / 100;
}

export function smoothClosedPath(outline: readonly OutlinePoint[]): PathGeometry {
    const points: PathPoint[] = outline.map((point, index) => {
        const before = outline[(index + outline.length - 1) % outline.length] ?? point;
        const after = outline[(index + 1) % outline.length] ?? point;
        const x = rounded(point.x);
        const y = rounded(point.y);

        if (point.sharp === true) {
            return { x, y, handleIn: null, handleOut: null, corner: 'sharp' };
        }

        const handleX = rounded((after.x - before.x) / CURVE_TENSION);
        const handleY = rounded((after.y - before.y) / CURVE_TENSION);

        return {
            x,
            y,
            handleIn: { x: -handleX, y: -handleY },
            handleOut: { x: handleX, y: handleY },
            corner: 'smooth',
        };
    });

    return { closed: true, points };
}

// Points round a centre: an ellipse when `roundness` is 2, squarer above it.
export function roundOutline(centre: Point, radiusX: number, radiusY: number, roundness = 2, count = 12) {
    const outline: Point[] = [];

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * 2 * Math.PI;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const stretchX = Math.sign(cos) * Math.abs(cos) ** (2 / roundness);
        const stretchY = Math.sign(sin) * Math.abs(sin) ** (2 / roundness);
        outline.push({ x: centre.x + radiusX * stretchX, y: centre.y + radiusY * stretchY });
    }

    return outline;
}

export function ellipsePath(centre: Point, radiusX: number, radiusY: number) {
    const outline = roundOutline(centre, radiusX, radiusY, 2, 8);

    return smoothClosedPath(outline);
}

// A smile: two sharp corners joined by a round lower curve and a shallower upper one.
export function smilePath(centre: Point, width: number, depth: number): PathGeometry {
    const half = width / 2;
    const roundness = half * 0.6;
    const innerDepth = depth * 0.35;

    return {
        closed: true,
        points: [
            { x: rounded(centre.x - half), y: rounded(centre.y), handleIn: null, handleOut: null, corner: 'sharp' },
            curvePoint(centre.x, centre.y + depth, roundness),
            { x: rounded(centre.x + half), y: rounded(centre.y), handleIn: null, handleOut: null, corner: 'sharp' },
            curvePoint(centre.x, centre.y + innerDepth, -roundness * 0.8),
        ],
    };
}

// A smooth point whose handles lie flat, reaching `reach` to the right (to the left when negative).
function curvePoint(x: number, y: number, reach: number): PathPoint {
    const handle = rounded(reach);

    return {
        x: rounded(x),
        y: rounded(y),
        handleIn: { x: -handle, y: 0 },
        handleOut: { x: handle, y: 0 },
        corner: 'smooth',
    };
}

export function mirroredPath(path: PathGeometry): PathGeometry {
    const points = path.points.map((point) => {
        const handleIn = point.handleIn === null ? null : { x: -point.handleIn.x, y: point.handleIn.y };
        const handleOut = point.handleOut === null ? null : { x: -point.handleOut.x, y: point.handleOut.y };

        return { ...point, x: -point.x, handleIn, handleOut };
    });

    return { closed: path.closed, points };
}

// Turns points round a centre by an angle in radians, clockwise on screen since y grows downwards.
export function turnedOutline<T extends Point>(outline: readonly T[], centre: Point, angle: number): T[] {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return outline.map((point) => {
        const x = point.x - centre.x;
        const y = point.y - centre.y;

        return { ...point, x: centre.x + x * cos - y * sin, y: centre.y + x * sin + y * cos };
    });
}

// An ellipse turned by an angle in radians.
export function turnedEllipsePath(centre: Point, radiusX: number, radiusY: number, angle: number) {
    return smoothClosedPath(turnedOutline(roundOutline(centre, radiusX, radiusY, 2, 8), centre, angle));
}

// A leaf: round at its middle, pointed at both ends, from its base along an angle (0 points up).
export function leafPath(base: Point, length: number, width: number, angle: number) {
    const outline: OutlinePoint[] = [
        { x: 0, y: 0, sharp: true },
        { x: width / 2, y: -length * 0.45 },
        { x: 0, y: -length, sharp: true },
        { x: -width / 2, y: -length * 0.45 },
    ];
    const placed = outline.map((point) => ({ ...point, x: point.x + base.x, y: point.y + base.y }));

    return smoothClosedPath(turnedOutline(placed, base, angle));
}

// A closed outline of sharp corners, for crisp flat shapes such as teeth, claws and roofs.
export function sharpPath(points: readonly Point[]): PathGeometry {
    return smoothClosedPath(points.map((point) => ({ ...point, sharp: true })));
}
