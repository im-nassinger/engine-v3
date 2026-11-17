import type { Point, ShapeGeometry } from '../../geometry/index.ts';
import type { ParseOutcome } from '../../fields/index.ts';

type Axis = 'x' | 'y';

// A rectangle is at least 1 px each side, a circle at least 1 px across. A size stops at 200,000 px,
// LevelLimits' maxLevelSize: no shape needs to be bigger than the largest level.
export const MIN_SHAPE_SIZE = 1;
export const MAX_SHAPE_SIZE = 200_000;

function rangeAlong(points: readonly Point[], axis: Axis) {
    let lowest = Infinity;
    let highest = -Infinity;

    for (const point of points) {
        const coordinate = point[axis];
        lowest = Math.min(lowest, coordinate);
        highest = Math.max(highest, coordinate);
    }

    return { lowest, highest };
}

function extentAlong(points: readonly Point[], axis: Axis) {
    const { lowest, highest } = rangeAlong(points, axis);

    return highest - lowest;
}

function sizeAlong(geometry: ShapeGeometry, axis: Axis) {
    if (geometry.kind === 'circle') return geometry.radius * 2;

    if (geometry.kind === 'rectangle') {
        if (axis === 'x') return geometry.width;

        return geometry.height;
    }

    return extentAlong(geometry.points, axis);
}

export function widthOf(geometry: ShapeGeometry) {
    return sizeAlong(geometry, 'x');
}

export function heightOf(geometry: ShapeGeometry) {
    return sizeAlong(geometry, 'y');
}

// 0 on every kind but a circle, where the Radius field is hidden.
export function radiusOf(geometry: ShapeGeometry) {
    if (geometry.kind !== 'circle') return 0;

    return geometry.radius;
}

// A polygon's or line's points move away from or towards the shape's own origin, the way a rectangle,
// centred on it, grows both ways. Points all on one row (or column) can't be spread, so that is refused.
// A circle stays round: either size becomes its diameter.
export function resizedAlong(geometry: ShapeGeometry, axis: Axis, newSize: number): ParseOutcome<ShapeGeometry> {
    if (geometry.kind === 'circle') return { ok: true, value: { kind: 'circle', radius: newSize / 2 } };

    if (geometry.kind === 'rectangle') {
        if (axis === 'x') return { ok: true, value: { ...geometry, width: newSize } };

        return { ok: true, value: { ...geometry, height: newSize } };
    }

    const currentSize = extentAlong(geometry.points, axis);
    if (currentSize === 0) return { ok: false, problem: { reason: 'flatShape' } };

    const factor = newSize / currentSize;
    const points = geometry.points.map((point) => {
        if (axis === 'x') return { x: point.x * factor, y: point.y };

        return { x: point.x, y: point.y * factor };
    });

    return { ok: true, value: { kind: geometry.kind, points } };
}

// W, A, S and D: the shape grows by the step along one of its own axes, or shrinks when the step is
// negative, and keeps its own centre. A rectangle changes that side, a circle its radius by half the step
// whichever the axis, a polygon or line spreads its points from its bounds' centre. Sizes stop at
// MIN_SHAPE_SIZE and MAX_SHAPE_SIZE, or where they already are past them. undefined when nothing changes,
// as on a flat line's thin axis or a shape already at its smallest.
export function steppedAlong(geometry: ShapeGeometry, axis: Axis, step: number): ShapeGeometry | undefined {
    const size = sizeAlong(geometry, axis);
    if (size === 0) return undefined;

    const lowest = Math.min(MIN_SHAPE_SIZE, size);
    const highest = Math.max(MAX_SHAPE_SIZE, size);
    const newSize = Math.min(highest, Math.max(lowest, size + step));
    if (newSize === size) return undefined;

    if (geometry.kind === 'circle') return { kind: 'circle', radius: newSize / 2 };
    if (geometry.kind === 'rectangle') {
        return axis === 'x' ? { ...geometry, width: newSize } : { ...geometry, height: newSize };
    }

    const { lowest: start, highest: end } = rangeAlong(geometry.points, axis);
    const centre = (start + end) / 2;
    // Multiplied before divided, so whole sizes give whole points where they can.
    const points = geometry.points.map((point) => ({
        ...point,
        [axis]: centre + ((point[axis] - centre) * newSize) / size,
    }));

    return { kind: geometry.kind, points };
}
