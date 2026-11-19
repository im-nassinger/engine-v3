import { steppedAlong } from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { ToolKey } from '../Tool.ts';

import type { BoxKind, BoxSize } from './boxDrawing.ts';
import { placedDrawing } from './boxDrawing.ts';
import { pointsDrawing } from './polygonDrawing.ts';
import { turnedAround } from './previewTurn.ts';
import { typedLetter } from './typedLetter.ts';

// One of the preview's own axes and how many pixels it grows along it, shrinking when negative.
export type PreviewStep = {
    readonly axis: 'x' | 'y';
    readonly pixels: number;
};

// As W, A, S and D resize a selection: 1 px a press, one grid step with Shift (owner, 2026-11-19).
const SMALL_STEP_PX = 1;

const STEPS: Readonly<Record<string, PreviewStep>> = {
    D: { axis: 'x', pixels: 1 },
    A: { axis: 'x', pixels: -1 },
    W: { axis: 'y', pixels: 1 },
    S: { axis: 'y', pixels: -1 },
};

// The step W, A, S or D sizes the preview by: D wider, A narrower, W taller, S shorter, Shift by the level's
// grid size. Ctrl+A and Ctrl+S keep their own commands, and Alt is left alone.
export function previewStepOf(key: ToolKey, gridSize: number): PreviewStep | undefined {
    if (key.ctrl || key.alt) return undefined;

    const letter = typedLetter(key);
    const step = letter === undefined ? undefined : STEPS[letter];
    if (step === undefined) return undefined;

    return { axis: step.axis, pixels: step.pixels * (key.shift ? gridSize : SMALL_STEP_PX) };
}

// The size a click places after the step, as W, A, S and D resize a shape: a rectangle changes that side, a
// circle its width across by the step whichever the axis, stopping at 1 px. undefined when nothing changes.
export function steppedBoxSize(kind: BoxKind, size: BoxSize, step: PreviewStep): BoxSize | undefined {
    const origin = { x: 0, y: 0 };
    const geometry = steppedAlong(placedDrawing(kind, size, origin, 0).geometry, step.axis, step.pixels);
    if (geometry === undefined) return undefined;
    if (geometry.kind === 'circle') return { width: geometry.radius * 2, height: geometry.radius * 2 };
    if (geometry.kind === 'rectangle') return { width: geometry.width, height: geometry.height };

    return undefined;
}

// A polygon's placed points spread out from the middle of the shape they would make, or pulled in, along that
// shape's own axes, so a turned preview grows along its own sides. undefined when nothing changes, as with a
// single point or on a flat line's thin side.
export function steppedPoints(points: readonly Point[], rotation: number, step: PreviewStep) {
    if (points.length === 0) return undefined;

    const drawing = pointsDrawing(points, true, rotation);
    const geometry = steppedAlong(drawing.geometry, step.axis, step.pixels);
    if (geometry === undefined || geometry.kind !== 'polygon') return undefined;

    // The shape's own points put back where the drawing stands, turned by the rotation around its middle.
    const middle = drawing.position;

    return geometry.points.map((point) =>
        turnedAround({ x: middle.x + point.x, y: middle.y + point.y }, middle, rotation),
    );
}
