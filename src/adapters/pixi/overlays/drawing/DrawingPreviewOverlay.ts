import { Graphics } from 'pixi.js';
import type { StrokeStyle } from 'pixi.js';
import { DEFAULT_FILL_COLOUR, DEFAULT_OUTLINE_COLOUR } from '../../../../core/components/index.ts';
import type { Bounds, Point } from '../../../../core/geometry/index.ts';
import { HANDLE_SIZE_PX } from '../../../../editor/tools/index.ts';
import { toPixiColour } from '../../PixiColour.ts';
import { dashedLine } from '../dashes.ts';
import { ACCENT, drawHandle } from '../overlayLook.ts';
import type { OverlayScene } from '../OverlayScene.ts';
import { squareAround } from '../screenPixels.ts';

import { planDrawing } from './drawingPlan.ts';
import { drawPenPlan } from './drawPenPlan.ts';
import type { DrawnPath } from './drawPenPlan.ts';
import type { DrawingPlan } from './drawingPlan.ts';
import type { DrawingSource } from './DrawingSource.ts';

const FILL = { color: toPixiColour(DEFAULT_FILL_COLOUR).color, alpha: 0.35 };
const OUTLINE_COLOUR = toPixiColour(DEFAULT_OUTLINE_COLOUR).color;
// The outline of a new shape, 1.5 screen px at any zoom (proposal).
const SOLID: StrokeStyle = { color: OUTLINE_COLOUR, width: 1.5, join: 'round', cap: 'round' };
const DASHED: StrokeStyle = { color: OUTLINE_COLOUR, alpha: 0.6, width: 1.5, cap: 'butt' };
const RING_WIDTH_PX = 2;
const RING: StrokeStyle = { color: ACCENT, width: RING_WIDTH_PX };
// The design: the first point is a 12 px ring.
export const FIRST_POINT_RING_PX = 12;

// What was drawn last, in screen pixels, for tests.
export type DrawnDrawing = {
    readonly filled: boolean;
    readonly solidPoints: number;
    readonly dashedSegments: number;
    readonly handles: readonly Bounds[];
    readonly ring: Bounds | undefined;
    // The ring is filled: a click now closes the polygon.
    readonly closing: boolean;
    // The pen's path being drawn.
    readonly path: DrawnPath | undefined;
};

const NOTHING_DRAWN: DrawnDrawing = {
    filled: false,
    solidPoints: 0,
    dashedSegments: 0,
    handles: [],
    ring: undefined,
    closing: false,
    path: undefined,
};

// The Shape tool's faded preview and the pen's path, as the level view's colours say. The Shape tool's is
// the default fill at 35%, the placed outline solid, the segments to the mouse and back to the first point
// dashed at 60%, the placed points as 8 px handles and the first one as a 12 px ring; the pen's is
// drawPenPlan's. Drawn in screen pixels, so it keeps its size at any zoom.
export class DrawingPreviewOverlay {
    readonly graphics = new Graphics();
    private shown: DrawnDrawing = NOTHING_DRAWN;

    get drawn() {
        return this.shown;
    }

    update(scene: OverlayScene, source: DrawingSource | undefined) {
        this.graphics.clear();
        this.shown = NOTHING_DRAWN;
        if (source === undefined) return;

        const plan = planDrawing(source.shape, source.polygon, source.pen);
        const toScreen = (point: Point) => scene.view.levelToScreen(point);

        this.shown = {
            filled: this.drawFill(plan, toScreen),
            solidPoints: this.drawSolid(plan, toScreen),
            dashedSegments: this.drawDashed(plan, toScreen),
            handles: this.drawHandles(plan, toScreen),
            ring: this.drawRing(plan, toScreen),
            closing: plan.closing,
            path: plan.path === undefined ? undefined : drawPenPlan(this.graphics, plan.path, toScreen),
        };
    }

    destroy() {
        this.graphics.destroy();
    }

    private drawFill(plan: DrawingPlan, toScreen: (point: Point) => Point) {
        if (plan.fill === undefined) return false;

        this.graphics
            .poly(
                plan.fill.map(toScreen).flatMap((point) => [point.x, point.y]),
                true,
            )
            .fill(FILL);

        return true;
    }

    private drawSolid(plan: DrawingPlan, toScreen: (point: Point) => Point) {
        if (plan.solid === undefined) return 0;

        const onScreen = plan.solid.points.map(toScreen);
        this.graphics
            .poly(
                onScreen.flatMap((point) => [point.x, point.y]),
                plan.solid.isClosed,
            )
            .stroke(SOLID);

        return onScreen.length;
    }

    private drawDashed(plan: DrawingPlan, toScreen: (point: Point) => Point) {
        if (plan.dashed.length === 0) return 0;

        for (const [from, to] of plan.dashed) {
            dashedLine(this.graphics, toScreen(from), toScreen(to));
        }
        this.graphics.stroke(DASHED);

        return plan.dashed.length;
    }

    private drawHandles(plan: DrawingPlan, toScreen: (point: Point) => Point) {
        const squares = plan.handles.map((point) => squareAround(toScreen(point), HANDLE_SIZE_PX));

        for (const square of squares) {
            drawHandle(this.graphics, square);
        }

        return squares;
    }

    // White inside, or filled with the accent colour when a click there closes the polygon.
    private drawRing(plan: DrawingPlan, toScreen: (point: Point) => Point) {
        if (plan.ring === undefined) return undefined;

        const centre = toScreen(plan.ring);
        // The 12 px is the ring's outside; the stroke is centred on the circle.
        const radius = (FIRST_POINT_RING_PX - RING_WIDTH_PX) / 2;
        this.graphics
            .circle(centre.x, centre.y, radius)
            .fill(plan.closing ? ACCENT : 0xffffff)
            .stroke(RING);

        return squareAround(centre, FIRST_POINT_RING_PX);
    }
}
