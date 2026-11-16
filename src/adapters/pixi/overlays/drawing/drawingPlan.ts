import { Matrix2D } from '../../../../core/geometry/index.ts';
import type { Point } from '../../../../core/geometry/index.ts';
import { shapeOutline } from '../selection/shapeOutline.ts';

import type { ShownPolygonPreview, ShownShapePreview } from './DrawingSource.ts';

// What the faded preview draws, in level positions. The overlay turns it into screen pixels.
export type DrawingPlan = {
    // The area filled with the default fill at 35%, at least 3 points.
    readonly fill: readonly Point[] | undefined;
    // The outline of a rectangle or circle, or a polygon's placed segments.
    readonly solid: { readonly points: readonly Point[]; readonly isClosed: boolean } | undefined;
    // From the last point to the mouse, and from the mouse back to the first point.
    readonly dashed: readonly (readonly [Point, Point])[];
    // The placed points but the first, each an 8 px handle; before the first click, the next point.
    readonly handles: readonly Point[];
    // The first point, a 12 px ring, since clicking it closes the polygon.
    readonly ring: Point | undefined;
    // A click now closes the polygon.
    readonly closing: boolean;
};

const NOTHING: DrawingPlan = {
    fill: undefined,
    solid: undefined,
    dashed: [],
    handles: [],
    ring: undefined,
    closing: false,
};

export function planDrawing(shape: ShownShapePreview | undefined, polygon: ShownPolygonPreview | undefined) {
    if (polygon !== undefined) return planPolygon(polygon);
    if (shape !== undefined) return planShape(shape);

    return NOTHING;
}

function planShape(shape: ShownShapePreview): DrawingPlan {
    const { geometry, position } = shape.drawing;
    // The shape's own origin sits at position in the group's space.
    const outline = shapeOutline(geometry, shape.toLevel.multiply(new Matrix2D(1, 0, 0, 1, position.x, position.y)));

    return { ...NOTHING, fill: outline.isClosed ? outline.points : undefined, solid: outline };
}

function planPolygon(polygon: ShownPolygonPreview): DrawingPlan {
    const placed = polygon.points.map((point) => polygon.toLevel.apply(point));
    const next = polygon.next === undefined ? undefined : polygon.toLevel.apply(polygon.next);
    const [first] = placed;
    const last = placed[placed.length - 1];

    if (first === undefined || last === undefined) {
        return { ...NOTHING, handles: next === undefined ? [] : [next] };
    }

    const closing = polygon.closing && next !== undefined;
    const dashed: (readonly [Point, Point])[] = [];
    if (next !== undefined) {
        dashed.push([last, next]);
        if (!closing && placed.length >= 2) {
            dashed.push([next, first]);
        }
    }

    const area = closing || next === undefined ? placed : [...placed, next];

    return {
        fill: area.length >= 3 ? area : undefined,
        solid: placed.length >= 2 ? { points: placed, isClosed: false } : undefined,
        dashed,
        handles: placed.slice(1),
        ring: first,
        closing,
    };
}
