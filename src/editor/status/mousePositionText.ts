import type { Point } from '../../core/geometry/index.ts';

// A minus sign, as the rest of the editor's texts write it, and never "−0".
function wholePixelText(value: number) {
    const rounded = Math.round(value) + 0;
    if (rounded < 0) return `−${String(-rounded)}`;

    return String(rounded);
}

// The status bar's mouse position, in whole level pixels: `120, −40`. Nothing while the mouse is
// outside the level view.
export function mousePositionText(levelPosition: Point | undefined) {
    if (levelPosition === undefined) return '';

    const xText = wholePixelText(levelPosition.x);
    const yText = wholePixelText(levelPosition.y);

    return `${xText}, ${yText}`;
}
