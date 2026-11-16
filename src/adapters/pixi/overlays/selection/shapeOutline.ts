import { ShapeOutlines } from '../../../../core/geometry/index.ts';
import type { Matrix2D, Point, ShapeGeometry } from '../../../../core/geometry/index.ts';

// More points than collision's 32, so a selected circle still looks round when zoomed in.
const CIRCLE_OUTLINE_POINTS = 64;

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
