import type { Graphics, StrokeStyle } from 'pixi.js';
import type { Bounds } from '../../../core/geometry/index.ts';

// The design's --accent, which draws every selection, handle edge and preview.
export const ACCENT = 0x4f8cff;
export const OVERLAY_FONT = 'JetBrains Mono, monospace';
export const OVERLAY_TEXT_PX = 12;

const HANDLE_FILL = 0xffffff;
const HANDLE_CORNER_PX = 1.5;
const HANDLE_EDGE: StrokeStyle = { color: ACCENT, width: 1.5 };

// A square handle with slightly rounded corners, white inside unless told otherwise.
export function drawHandle(graphics: Graphics, square: Bounds, inside = HANDLE_FILL) {
    graphics
        .roundRect(square.left, square.top, square.width, square.height, HANDLE_CORNER_PX)
        .fill(inside)
        .stroke(HANDLE_EDGE);
}
