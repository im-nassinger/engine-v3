import type { Graphics, StrokeStyle } from 'pixi.js';
import { DEFAULT_OUTLINE_COLOUR } from '../../../../core/components/index.ts';
import type { Bounds, Point } from '../../../../core/geometry/index.ts';
import { HANDLE_SIZE_PX } from '../../../../editor/tools/index.ts';
import { toPixiColour } from '../../PixiColour.ts';
import { dashedPolyline } from '../dashes.ts';
import { ACCENT, drawHandle } from '../overlayLook.ts';
import { squareAround } from '../screenPixels.ts';

import type { PenPlan } from './penPlan.ts';

const OUTLINE_COLOUR = toPixiColour(DEFAULT_OUTLINE_COLOUR).color;
// The design: the placed segments in the default outline, 2 px, the one being made dashed at 60%.
const PLACED: StrokeStyle = { color: OUTLINE_COLOUR, width: 2, join: 'round', cap: 'round' };
const MAKING: StrokeStyle = { color: OUTLINE_COLOUR, alpha: 0.6, width: 2, cap: 'butt' };
const EDGE_PX = 1.5;
const EDGE: StrokeStyle = { color: ACCENT, width: EDGE_PX };
const HANDLE_LINE: StrokeStyle = { color: ACCENT, width: 1 };
const WHITE = 0xffffff;
// A smooth or separate point is a 9 px circle, a handle's end a 6 px dot.
export const ROUND_POINT_PX = 9;
export const HANDLE_DOT_PX = 6;
// The first point's ring: 12 px, as a polygon's, filling at 25% when a press there closes the path.
const RING_PX = 12;
const RING_WIDTH_PX = 2;
const RING: StrokeStyle = { color: ACCENT, width: RING_WIDTH_PX };
const RING_CLOSING_ALPHA = 0.25;

// What was drawn last, in screen pixels, for tests.
export type DrawnPath = {
    readonly placedPoints: number;
    readonly makingPoints: number;
    readonly squares: readonly Bounds[];
    readonly circles: readonly Bounds[];
    // How many of the points are filled with the accent colour: the one being placed.
    readonly filledPoints: number;
    readonly handleDots: readonly Bounds[];
    readonly ring: Bounds | undefined;
    readonly closing: boolean;
};

type ToScreen = (point: Point) => Point;

// Draws the pen's preview as the level view's v2 table says, in screen pixels, so the marks keep their
// size at any zoom: the curves first, then the handles, the ring and the points on top.
export function drawPenPlan(graphics: Graphics, plan: PenPlan, toScreen: ToScreen): DrawnPath {
    drawCurves(graphics, plan, toScreen);
    const handleDots = drawHandles(graphics, plan, toScreen);
    const ring = drawRing(graphics, plan, toScreen);
    const points = drawPoints(graphics, plan, toScreen);

    return {
        placedPoints: plan.placed.length,
        makingPoints: plan.making.length,
        ...points,
        handleDots,
        ring,
        closing: plan.closing,
    };
}

function drawCurves(graphics: Graphics, plan: PenPlan, toScreen: ToScreen) {
    if (plan.placed.length >= 2) {
        graphics
            .poly(
                plan.placed.map(toScreen).flatMap((point) => [point.x, point.y]),
                false,
            )
            .stroke(PLACED);
    }
    if (plan.making.length >= 2) {
        dashedPolyline(graphics, plan.making.map(toScreen), false);
        graphics.stroke(MAKING);
    }
}

function drawHandles(graphics: Graphics, plan: PenPlan, toScreen: ToScreen) {
    const ends = plan.handles.map(([from, to]) => [toScreen(from), toScreen(to)] as const);
    if (ends.length === 0) return [];

    for (const [from, to] of ends) {
        graphics.moveTo(from.x, from.y).lineTo(to.x, to.y);
    }
    graphics.stroke(HANDLE_LINE);

    return ends.map(([, end]) => {
        graphics
            .circle(end.x, end.y, (HANDLE_DOT_PX - EDGE_PX) / 2)
            .fill(WHITE)
            .stroke(EDGE);

        return squareAround(end, HANDLE_DOT_PX);
    });
}

function drawRing(graphics: Graphics, plan: PenPlan, toScreen: ToScreen) {
    if (plan.ring === undefined) return undefined;

    const centre = toScreen(plan.ring);
    // The 12 px is the ring's outside; the stroke is centred on the circle.
    graphics.circle(centre.x, centre.y, (RING_PX - RING_WIDTH_PX) / 2);
    if (plan.closing) {
        graphics.fill({ color: ACCENT, alpha: RING_CLOSING_ALPHA });
    }
    graphics.stroke(RING);

    return squareAround(centre, RING_PX);
}

function drawPoints(graphics: Graphics, plan: PenPlan, toScreen: ToScreen) {
    const squares: Bounds[] = [];
    const circles: Bounds[] = [];
    let filledPoints = 0;

    for (const mark of plan.marks) {
        const centre = toScreen(mark.place);
        const inside = mark.isFilled ? ACCENT : WHITE;
        if (mark.isFilled) {
            filledPoints += 1;
        }

        if (mark.isRound) {
            graphics
                .circle(centre.x, centre.y, (ROUND_POINT_PX - EDGE_PX) / 2)
                .fill(inside)
                .stroke(EDGE);
            circles.push(squareAround(centre, ROUND_POINT_PX));
        } else {
            const square = squareAround(centre, HANDLE_SIZE_PX);
            drawHandle(graphics, square, inside);
            squares.push(square);
        }
    }

    return { squares, circles, filledPoints };
}
