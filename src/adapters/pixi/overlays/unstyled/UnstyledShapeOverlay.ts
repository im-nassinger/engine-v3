import { Graphics } from 'pixi.js';
import type { StrokeStyle } from 'pixi.js';
import type { Point } from '../../../../core/geometry/index.ts';
import { dashedPolyline } from '../dashes.ts';
import type { DashPattern } from '../dashes.ts';
import type { OverlayScene } from '../OverlayScene.ts';
import { planUnstyledShapes } from './planUnstyledShapes.ts';
import type { UnstyledShapePlan } from './planUnstyledShapes.ts';

// The design's look for a shape with no StyleComponent: a 1.5 px dashed edge in #1D2430 at 55% with 6 px
// dashes, a 4% fill, and a small bolt, as in the v3 mockup.
const INK = 0x1d2430;
const EDGE: StrokeStyle = { color: INK, alpha: 0.55, width: 1.5 };
const EDGE_DASHES: DashPattern = { dashPx: 6, gapPx: 4 };
const FILL_ALPHA = 0.04;
// Lucide's bolt on its 24 px grid, drawn at 62%, so about 15 px tall.
const BOLT_SCALE = 0.62;
const BOLT_POINTS: readonly Point[] = [
    { x: 13, y: 3 },
    { x: 8, y: 12 },
    { x: 14, y: 12 },
    { x: 11, y: 21 },
];
const BOLT: StrokeStyle = { color: INK, alpha: 0.7, width: 2.2 * BOLT_SCALE, cap: 'round', join: 'round' };

// Draws every shape with no StyleComponent, such as a trigger, so it can be seen and picked in the editor:
// its edge dashed over a faint fill, and a bolt in its top left corner. Sizes are screen pixels at any zoom.
// Editor only: play draws none of it. Hidden with the shape's eye or a parent's.
export class UnstyledShapeOverlay {
    readonly graphics = new Graphics();
    private shown: readonly UnstyledShapePlan[] = [];

    // The shapes drawn last, for tests.
    get shownShapes() {
        return this.shown;
    }

    update(scene: OverlayScene) {
        this.clear();

        const { level, caches, view } = scene;
        if (level === undefined || caches === undefined) return;

        this.shown = planUnstyledShapes({ level, view, worldMatrices: caches.worldMatrices });
        for (const plan of this.shown) {
            this.drawShape(plan);
        }
    }

    // Draws nothing: play shows none.
    clear() {
        this.graphics.clear();
        this.shown = [];
    }

    destroy() {
        this.graphics.destroy();
    }

    private drawShape(plan: UnstyledShapePlan) {
        const graphics = this.graphics;
        if (plan.isClosed) {
            graphics.poly(plan.points.map((point) => [point.x, point.y]).flat(), true).fill({
                color: INK,
                alpha: FILL_ALPHA,
            });
        }

        dashedPolyline(graphics, plan.points, plan.isClosed, EDGE_DASHES);
        graphics.stroke(EDGE);

        const [first, ...rest] = BOLT_POINTS;
        if (first === undefined) return;

        const place = (point: Point) => ({
            x: plan.bolt.x + point.x * BOLT_SCALE,
            y: plan.bolt.y + point.y * BOLT_SCALE,
        });
        const start = place(first);
        graphics.moveTo(start.x, start.y);
        for (const point of rest) {
            const next = place(point);
            graphics.lineTo(next.x, next.y);
        }
        graphics.stroke(BOLT);
    }
}
