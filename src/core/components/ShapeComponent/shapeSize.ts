import type { Point, ShapeGeometry } from '../../geometry/index.ts';
import type { ParseOutcome } from '../../fields/index.ts';

type Axis = 'x' | 'y';

function extentAlong(points: readonly Point[], axis: Axis) {
    let lowest = Infinity;
    let highest = -Infinity;

    for (const point of points) {
        const coordinate = point[axis];
        lowest = Math.min(lowest, coordinate);
        highest = Math.max(highest, coordinate);
    }

    return highest - lowest;
}

function sizeAlong(geometry: ShapeGeometry, axis: Axis) {
    if (geometry.kind === 'rectangle' || geometry.kind === 'ellipse') {
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

// A polygon's or line's points move away from or towards the shape's own origin, the way a rectangle,
// centred on it, grows both ways. Points all on one row (or column) can't be spread, so that is refused.
export function resizedAlong(geometry: ShapeGeometry, axis: Axis, newSize: number): ParseOutcome<ShapeGeometry> {
    if (geometry.kind === 'rectangle' || geometry.kind === 'ellipse') {
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
