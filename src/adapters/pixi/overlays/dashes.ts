import type { Graphics } from 'pixi.js';
import type { Point } from '../../../core/geometry/index.ts';

const DASH_PX = 4;
const DASH_GAP_PX = 3;

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
