import { Graphics } from 'pixi.js';
import type { StrokeStyle } from 'pixi.js';
import type { Bounds } from '../../../../core/geometry/index.ts';
import { toPixiColour } from '../../PixiColour.ts';
import { dashedPolyline } from '../dashes.ts';
import type { OverlayScene } from '../OverlayScene.ts';
import { squareAround } from '../screenPixels.ts';

import type { GradientSource } from './GradientSource.ts';
import { planGradientHandles } from './planGradientHandles.ts';
import type { GradientHandlesPlan, PlannedDot } from './planGradientHandles.ts';

const WHITE = 0xffffff;
const DARK = 0x1d2430;
// The design: a 1.5 px white line over a 3.5 px dark one at 60%, so it shows on any colour.
const LINE_UNDER: StrokeStyle = { color: DARK, alpha: 0.6, width: 3.5, cap: 'round' };
const LINE: StrokeStyle = { color: WHITE, width: 1.5, cap: 'round' };
const EDGE: StrokeStyle = { color: WHITE, width: 1.5, cap: 'butt' };
// Each end a 14 px dot with a 2 px white edge and a thin dark ring; each stop a 7 px dot.
const END_DOT_PX = 14;
const END_EDGE = { color: WHITE, width: 2 };
const END_RING_WIDTH_PX = 1;
const END_RING: StrokeStyle = { color: DARK, alpha: 0.6, width: END_RING_WIDTH_PX };
const STOP_DOT_PX = 7;
const STOP_EDGE = { color: WHITE, width: 1.5 };

// What was drawn last, in screen pixels, for tests.
export type DrawnGradientHandles = {
    // The two handles' dots, the start or centre first.
    readonly ends: readonly Bounds[];
    readonly stops: number;
    readonly edge: boolean;
};

const NOTHING_DRAWN: DrawnGradientHandles = { ends: [], stops: 0, edge: false };

// The one selected entity's gradient handles, as the level view's colours say, over the selection and in
// screen pixels, so they keep their size at any zoom. A dot shows its colour without its see-through part,
// so a see-through stop's dot can still be found.
export class GradientHandleOverlay {
    readonly graphics = new Graphics();
    private shown: DrawnGradientHandles = NOTHING_DRAWN;

    get drawn() {
        return this.shown;
    }

    update(scene: OverlayScene, source: GradientSource | undefined) {
        this.graphics.clear();
        this.shown = NOTHING_DRAWN;

        const gradient = source?.gradient;
        if (gradient === undefined) return;

        const plan = planGradientHandles(gradient, scene.view);
        const edge = this.drawEdge(plan);
        this.drawLine(plan);
        for (const stop of plan.stops) {
            this.drawDot(stop, STOP_DOT_PX, STOP_EDGE);
        }
        const ends = plan.ends.map((end) => this.drawEnd(end));

        this.shown = { ends, stops: plan.stops.length, edge };
    }

    destroy() {
        this.graphics.destroy();
    }

    private drawEdge(plan: GradientHandlesPlan) {
        if (plan.edge === undefined) return false;

        dashedPolyline(this.graphics, plan.edge, true);
        this.graphics.stroke(EDGE);

        return true;
    }

    private drawLine(plan: GradientHandlesPlan) {
        const [from, to] = plan.line;
        this.graphics.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke(LINE_UNDER);
        this.graphics.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke(LINE);
    }

    private drawEnd(end: PlannedDot) {
        const { x, y } = end.centre;
        this.graphics.circle(x, y, END_DOT_PX / 2 + END_RING_WIDTH_PX / 2).stroke(END_RING);
        this.drawDot(end, END_DOT_PX, END_EDGE);

        return squareAround(end.centre, END_DOT_PX);
    }

    // The size is the dot's outside, edge included; the stroke is centred on the circle.
    private drawDot(dot: PlannedDot, size: number, edge: StrokeStyle & { readonly width: number }) {
        const radius = (size - edge.width) / 2;
        const colour = toPixiColour(dot.colour).color;
        this.graphics.circle(dot.centre.x, dot.centre.y, radius).fill(colour).stroke(edge);
    }
}
