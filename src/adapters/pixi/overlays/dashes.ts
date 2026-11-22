import type { Graphics } from 'pixi.js';
import type { Point } from '../../../core/geometry/index.ts';

const DASH_PX = 4;
const DASH_GAP_PX = 3;

// How long each dash and each gap between them is, in screen pixels.
export type DashPattern = {
    readonly dashPx: number;
    readonly gapPx: number;
};

const OVERLAY_DASHES: DashPattern = { dashPx: DASH_PX, gapPx: DASH_GAP_PX };

// Adds a dashed line in screen pixels to the graphics' path. The caller strokes it.
export function dashedLine(graphics: Graphics, from: Point, to: Point) {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length === 0) return;

    const along = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
    for (let start = 0; start < length; start += DASH_PX + DASH_GAP_PX) {
        const end = Math.min(start + DASH_PX, length);
        graphics.moveTo(from.x + along.x * start, from.y + along.y * start);
        graphics.lineTo(from.x + along.x * end, from.y + along.y * end);
    }
}

// Adds a dashed line through the screen points to the graphics' path, the dashes running on from one
// segment to the next, so a curve cut into short segments still dashes evenly. The caller strokes it.
export function dashedPolyline(
    graphics: Graphics,
    points: readonly Point[],
    isClosed: boolean,
    pattern: DashPattern = OVERLAY_DASHES,
) {
    const first = points[0];
    if (first === undefined) return;

    const { dashPx } = pattern;
    const ends = isClosed ? [...points, first] : points;
    const period = dashPx + pattern.gapPx;
    // How far into the current dash and gap the walk is.
    let phase = 0;

    for (let index = 1; index < ends.length; index += 1) {
        const from = ends[index - 1];
        const to = ends[index];
        if (from === undefined || to === undefined) continue;

        const length = Math.hypot(to.x - from.x, to.y - from.y);
        if (length === 0) continue;

        const along = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
        let walked = 0;
        while (walked < length) {
            const inDash = phase < dashPx;
            const step = Math.min((inDash ? dashPx : period) - phase, length - walked);
            if (inDash) {
                graphics.moveTo(from.x + along.x * walked, from.y + along.y * walked);
                graphics.lineTo(from.x + along.x * (walked + step), from.y + along.y * (walked + step));
            }
            walked += step;
            phase = (phase + step) % period;
        }
    }
}
