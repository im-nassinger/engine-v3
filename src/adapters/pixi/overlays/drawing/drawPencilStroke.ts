import type { Graphics, StrokeStyle } from 'pixi.js';
import type { Bounds, Point } from '../../../../core/geometry/index.ts';
import { ACCENT } from '../overlayLook.ts';

import type { ShownPencilStroke } from './DrawingSource.ts';
import { drawRing } from './drawPenPlan.ts';

// The design: a 2 px accent line with round joins, exactly as dragged.
const LINE: StrokeStyle = { color: ACCENT, width: 2, join: 'round', cap: 'round' };

// What was drawn last, in screen pixels, for tests.
export type DrawnStroke = {
    readonly points: number;
    readonly ring: Bounds;
    readonly closing: boolean;
};

// The Pencil's stroke and its start's ring, which fills when a release would close the path.
export function drawPencilStroke(
    graphics: Graphics,
    stroke: ShownPencilStroke,
    toScreen: (point: Point) => Point,
): DrawnStroke | undefined {
    const onScreen = stroke.points.map(toScreen);
    const [start] = onScreen;
    if (start === undefined) return undefined;

    graphics
        .poly(
            onScreen.flatMap((point) => [point.x, point.y]),
            false,
        )
        .stroke(LINE);
    const ring = drawRing(graphics, start, stroke.closing);

    return { points: onScreen.length, ring, closing: stroke.closing };
}
