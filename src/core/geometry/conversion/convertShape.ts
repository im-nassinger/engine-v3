import { Bounds } from '../Bounds.ts';
import { ShapeOutlines } from '../pieces/ShapeOutlines.ts';
import type { Point } from '../Point.ts';
import type { ShapeGeometry, ShapeKind } from '../ShapeGeometry.ts';

// The same limits as the stored geometry's: a rectangle at least 1 px each side, a circle 1 px across.
const MIN_SIDE = 1;
const MIN_RADIUS = MIN_SIDE / 2;
const MIN_POLYGON_POINTS = 3;

// offset is in the shape's own space: where the new shape's origin goes, measured from the old one's, so
// that the new shape's bounds have the old one's centre. A rectangle and a circle are always centred on
// their origin, but a polygon's or line's points needn't be.
export type ShapeConversion = {
    readonly geometry: ShapeGeometry;
    readonly offset: Point;
};

// Geometry can't import core/fields, which imports it, so a refusal gives the smallest count it needed
// and the component turns that into its reason.
export type ShapeConversionOutcome =
    { readonly ok: true; readonly value: ShapeConversion } | { readonly ok: false; readonly minPointCount: number };

const NO_OFFSET: Point = { x: 0, y: 0 };

function outlineOf(geometry: ShapeGeometry): readonly Point[] {
    if (geometry.kind === 'rectangle') return ShapeOutlines.rectangle(geometry.width, geometry.height);
    if (geometry.kind === 'circle') return ShapeOutlines.circle(geometry.radius);

    return geometry.points;
}

// Adding 0 turns a -0 into 0, so a centred shape's offset is exactly the origin.
function centreOf(points: readonly Point[]): Point {
    const bounds = Bounds.around(points);
    if (bounds === undefined) return NO_OFFSET;

    const centre = bounds.centre;
    return { x: centre.x + 0, y: centre.y + 0 };
}

function toRectangle(geometry: ShapeGeometry): ShapeConversion {
    if (geometry.kind === 'circle') {
        const side = geometry.radius * 2;
        return { geometry: { kind: 'rectangle', width: side, height: side }, offset: NO_OFFSET };
    }

    const points = outlineOf(geometry);
    const bounds = Bounds.around(points);
    const width = Math.max(bounds?.width ?? 0, MIN_SIDE);
    const height = Math.max(bounds?.height ?? 0, MIN_SIDE);
    const offset = centreOf(points);

    return { geometry: { kind: 'rectangle', width, height }, offset };
}

function toCircle(geometry: ShapeGeometry): ShapeConversion {
    const points = outlineOf(geometry);
    const bounds = Bounds.around(points);
    const width = bounds?.width ?? 0;
    const height = bounds?.height ?? 0;
    const smallerSide = Math.min(width, height);
    const radius = Math.max(smallerSide / 2, MIN_RADIUS);
    const offset = centreOf(points);

    return { geometry: { kind: 'circle', radius }, offset };
}

function copyOf(points: readonly Point[]) {
    return points.map((point) => ({ x: point.x, y: point.y }));
}

function toPolygon(geometry: ShapeGeometry): ShapeConversionOutcome {
    const outline = outlineOf(geometry);
    if (outline.length < MIN_POLYGON_POINTS) {
        return { ok: false, minPointCount: MIN_POLYGON_POINTS };
    }

    const points = copyOf(outline);
    return { ok: true, value: { geometry: { kind: 'polygon', points }, offset: NO_OFFSET } };
}

// A rectangle's line starts and ends at its first corner, so all four sides are drawn.
function toLine(geometry: ShapeGeometry): ShapeConversion {
    const outline = outlineOf(geometry);
    const points = copyOf(outline);

    if (geometry.kind === 'rectangle') {
        const firstCorner = points[0];
        if (firstCorner !== undefined) {
            points.push({ x: firstCorner.x, y: firstCorner.y });
        }
    }

    return { geometry: { kind: 'line', points }, offset: NO_OFFSET };
}

// A shape's geometry as another kind, by the table in "Changing a shape's kind". Only a line with fewer
// than 3 points is refused, as a polygon. The same kind gives the geometry back unchanged.
export function convertShape(geometry: ShapeGeometry, kind: ShapeKind): ShapeConversionOutcome {
    if (geometry.kind === kind) return { ok: true, value: { geometry, offset: NO_OFFSET } };

    switch (kind) {
        case 'rectangle':
            return { ok: true, value: toRectangle(geometry) };
        case 'circle':
            return { ok: true, value: toCircle(geometry) };
        case 'polygon':
            return toPolygon(geometry);
        case 'line':
            return { ok: true, value: toLine(geometry) };
    }
}
