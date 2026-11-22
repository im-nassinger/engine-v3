import { Graphics } from 'pixi.js';
import type { StrokeStyle } from 'pixi.js';
import type { Point } from '../../../../core/geometry/index.ts';
import { dashedPolyline } from '../dashes.ts';
import type { DashPattern } from '../dashes.ts';
import type { OverlayScene } from '../OverlayScene.ts';
import { planUnstyledShapes } from './planUnstyledShapes.ts';
import type { UnstyledShapePlan } from './planUnstyledShapes.ts';

// The look for a shape with no StyleComponent: a 1.5 px dashed edge in #1D2430 at 55% with 6 px dashes, a
// 4% fill, and a faint filled bolt in its middle that scales with the shape and the zoom (owner, 2026-11-22).
const INK = 0x1d2430;
const EDGE: StrokeStyle = { color: INK, alpha: 0.55, width: 1.5 };
const EDGE_DASHES: DashPattern = { dashPx: 6, gapPx: 4 };
const FILL_ALPHA = 0.04;
const BOLT_ALPHA = 0.14;
// A bolt on a 24 px grid, its middle at 12, 12 and 20 tall.
const BOLT_GRID_CENTRE = 12;
const BOLT_GRID_HEIGHT = 20;
const BOLT_POINTS: readonly Point[] = [
    { x: 14, y: 2 },
    { x: 4, y: 14 },
    { x: 11, y: 14 },
    { x: 10, y: 22 },
    { x: 20, y: 10 },
    { x: 13, y: 10 },
];

// Draws every shape with no StyleComponent, such as a trigger, so it can be seen and picked in the editor:
// its edge dashed over a faint fill, and a faint bolt in its middle. The edge's sizes are screen pixels at
// any zoom; the bolt is sized from the shape on screen.
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

        if (plan.bolt === undefined) return;

        const { centre, heightPx } = plan.bolt;
        const scale = heightPx / BOLT_GRID_HEIGHT;
        const boltPoints = BOLT_POINTS.flatMap((point) => [
            centre.x + (point.x - BOLT_GRID_CENTRE) * scale,
            centre.y + (point.y - BOLT_GRID_CENTRE) * scale,
        ]);
        graphics.poly(boltPoints, true).fill({ color: INK, alpha: BOLT_ALPHA });
    }
}
