import type { Point } from '../../../core/geometry/index.ts';
import type { ShapeDrawing } from '../../commands/index.ts';

import { turnedAround } from './previewTurn.ts';

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

// The finished polygon, or a line when finished open, turned by the degrees clockwise. The points stay where
// they were placed: the shape's own points are them turned back, so its own box follows the turn. Its
// position is the middle of that box, and the points are kept around it, so rotating and resizing turn
// around the middle of what was drawn.
export function pointsDrawing(points: readonly Point[], closed: boolean, rotation: number): ShapeDrawing {
    const origin = { x: 0, y: 0 };
    const own = points.map((point) => turnedAround(point, origin, -rotation));
    const xs = own.map((point) => point.x);
    const ys = own.map((point) => point.y);
    const ownMiddle = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
    const around = own.map((point) => ({ x: point.x - ownMiddle.x, y: point.y - ownMiddle.y }));
    const geometry = closed ? { kind: 'polygon' as const, points: around } : { kind: 'line' as const, points: around };

    return { geometry, position: turnedAround(ownMiddle, origin, rotation), rotation };
}

// The placed points turned by the degrees around the middle of the shape they would make at the rotation,
// so the preview turns in place.
export function turnedPoints(points: readonly Point[], rotation: number, degrees: number): readonly Point[] {
    if (points.length === 0) return points;

    const centre = pointsDrawing(points, true, rotation).position;

    return points.map((point) => turnedAround(point, centre, degrees));
}

export function samePoint(a: Point, b: Point) {
    return a.x === b.x && a.y === b.y;
}
