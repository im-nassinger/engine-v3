import type { Point } from '../../../core/geometry/index.ts';
import type { ShapeDrawing } from '../../commands/index.ts';

// Shift turns the segment from the last point to a multiple of this.
export const ANGLE_STEP_DEGREES = 15;

const RADIANS_PER_STEP = (ANGLE_STEP_DEGREES * Math.PI) / 180;

// The mouse moved round the last point to the nearest multiple of 15°, at the same distance.
export function angleLocked(from: Point, to: Point): Point {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return to;

    const angle = Math.round(Math.atan2(dy, dx) / RADIANS_PER_STEP) * RADIANS_PER_STEP;

    return { x: from.x + length * Math.cos(angle), y: from.y + length * Math.sin(angle) };
}

// The finished polygon, or a line when finished open. Its position is the middle of the points' box,
// and the points are kept around it, so rotating and resizing turn around the middle of what was drawn.
export function pointsDrawing(points: readonly Point[], closed: boolean): ShapeDrawing {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const middle = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
    const around = points.map((point) => ({ x: point.x - middle.x, y: point.y - middle.y }));
    const geometry = closed ? { kind: 'polygon' as const, points: around } : { kind: 'line' as const, points: around };

    return { geometry, position: middle };
}

export function samePoint(a: Point, b: Point) {
    return a.x === b.x && a.y === b.y;
}
