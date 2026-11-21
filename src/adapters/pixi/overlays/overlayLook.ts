import type { Graphics, StrokeStyle } from 'pixi.js';
import type { Bounds } from '../../../core/geometry/index.ts';

// The design's --accent, which draws every selection, handle edge and preview.
export const ACCENT = 0x4f8cff;
export const OVERLAY_FONT = 'JetBrains Mono, monospace';
export const OVERLAY_TEXT_PX = 12;

const HANDLE_FILL = 0xffffff;
const CURVE_HANDLE_LINE: StrokeStyle = { color: ACCENT, width: 1 };
const HANDLE_CORNER_PX = 1.5;
const HANDLE_EDGE_PX = 1.5;
const HANDLE_EDGE: StrokeStyle = { color: ACCENT, width: HANDLE_EDGE_PX };

// A square handle with slightly rounded corners, white inside unless told otherwise.
export function drawHandle(graphics: Graphics, square: Bounds, inside = HANDLE_FILL) {
    graphics
        .roundRect(square.left, square.top, square.width, square.height, HANDLE_CORNER_PX)
        .fill(inside)
        .stroke(HANDLE_EDGE);
}

// A smooth or separate path point: a 9 px circle with the handle's edge, white inside unless told otherwise.
export const ROUND_POINT_PX = 9;

export function drawRoundPoint(
    graphics: Graphics,
    centre: { readonly x: number; readonly y: number },
    inside = HANDLE_FILL,
) {
    graphics
        .circle(centre.x, centre.y, (ROUND_POINT_PX - HANDLE_EDGE_PX) / 2)
        .fill(inside)
        .stroke(HANDLE_EDGE);
}

// A curve handle's end is a 6 px dot.
export const HANDLE_DOT_PX = 6;

type ScreenPoint = { readonly x: number; readonly y: number };

// Curve handles as the level view's v2 table draws them: a 1 px accent line from each point to a 6 px
// white dot with the handle's edge. In screen pixels.
export function drawCurveHandles(graphics: Graphics, handles: readonly (readonly [ScreenPoint, ScreenPoint])[]) {
    if (handles.length === 0) return;

    for (const [from, to] of handles) {
        graphics.moveTo(from.x, from.y).lineTo(to.x, to.y);
    }
    graphics.stroke(CURVE_HANDLE_LINE);

    for (const [, end] of handles) {
        graphics
            .circle(end.x, end.y, (HANDLE_DOT_PX - HANDLE_EDGE_PX) / 2)
            .fill(HANDLE_FILL)
            .stroke(HANDLE_EDGE);
    }
}
