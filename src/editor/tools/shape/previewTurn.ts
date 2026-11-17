import { Matrix2D } from '../../../core/geometry/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { ToolKey } from '../Tool.ts';

import { typedLetter } from './typedLetter.ts';

// As the Z and X commands turn a selection: 1° a press, 10° with Shift.
const SMALL_TURN_DEGREES = 1;
const LARGE_TURN_DEGREES = 10;

// The degrees Z or X turns the preview by, clockwise on screen when positive, or undefined for any other key.
// Z sits left of X, so it turns counter-clockwise. Ctrl+Z and Ctrl+X stay Undo and Cut, and Alt is left
// alone.
export function previewTurnOf(key: ToolKey): number | undefined {
    if (key.ctrl || key.alt) return undefined;

    const sign = signOf(typedLetter(key));
    if (sign === undefined) return undefined;

    return sign * (key.shift ? LARGE_TURN_DEGREES : SMALL_TURN_DEGREES);
}

// The point turned by the degrees around the centre, clockwise on screen when positive.
export function turnedAround(point: Point, centre: Point, degrees: number): Point {
    const offset = rotationBy(degrees).apply({ x: point.x - centre.x, y: point.y - centre.y });

    return { x: centre.x + offset.x, y: centre.y + offset.y };
}

// A turn of the degrees around the origin, as a TransformComponent's Rotation turns its entity.
export function rotationBy(degrees: number) {
    return Matrix2D.fromTransform({ position: { x: 0, y: 0 }, rotation: degrees, scale: { x: 1, y: 1 }, skew: 0 });
}

function signOf(letter: string | undefined) {
    if (letter === 'Z') return -1;
    if (letter === 'X') return 1;

    return undefined;
}
