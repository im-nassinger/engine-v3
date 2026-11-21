import { Graphics } from 'pixi.js';
import type { StrokeStyle } from 'pixi.js';
import { levelBoundsOf } from '../../../../core/derived/index.ts';
import type { Bounds } from '../../../../core/geometry/index.ts';
import { gridLookFor } from './gridLook.ts';
import { gridAreaOf, planGrid } from './GridPlan.ts';
import type { GridLine, GridLineStrength, GridPlan } from './GridPlan.ts';
import { worldFillOf } from '../levelBackground.ts';
import type { OverlayScene } from '../OverlayScene.ts';
import { onPixel, screenRectangleOf } from '../screenPixels.ts';

const STRENGTHS: readonly GridLineStrength[] = ['fine', 'step', 'origin'];

function withStrength(lines: readonly GridLine[], strength: GridLineStrength) {
    return lines.filter((line) => line.strength === strength);
}

// The grid over the level, only inside the level bounds: 1 screen px lines every grid step, fainter ones in
// between when there is room, and stronger ones through the origin.
export class GridOverlay {
    readonly graphics = new Graphics();
    private lastPlan: GridPlan | undefined;
    private lastArea: Bounds | undefined;

    // The lines drawn last, undefined while the grid is off or the level bounds are out of view. For tests.
    get plan() {
        return this.lastPlan;
    }

    // The screen rectangle the lines were drawn across last. For tests.
    get area() {
        return this.lastArea;
    }

    update(scene: OverlayScene) {
        this.graphics.clear();
        this.lastPlan = undefined;
        this.lastArea = undefined;

        const level = scene.level;
        const isOn = scene.settings.isOn('grid');
        this.graphics.visible = isOn && level !== undefined;
        if (!isOn || level === undefined) return;

        const view = scene.view;
        const levelBounds = levelBoundsOf(level);
        const area = levelBounds === undefined ? undefined : gridAreaOf(view.visibleBounds(), levelBounds);
        if (area === undefined) return;

        const plan = planGrid({ visible: area, zoom: view.zoom, gridSize: level.editorData.gridSize });
        const onScreen = screenRectangleOf(area, view);
        this.lastPlan = plan;
        this.lastArea = onScreen;

        const look = gridLookFor(worldFillOf(level));
        for (const strength of STRENGTHS) {
            const lineCount = this.drawLines(scene, plan, onScreen, strength);
            if (lineCount === 0) continue;

            const style: StrokeStyle = { color: look.colour, alpha: look.alpha[strength], width: 1, pixelLine: true };
            this.graphics.stroke(style);
        }
    }

    clear() {
        this.graphics.clear();
        this.graphics.visible = false;
        this.lastPlan = undefined;
        this.lastArea = undefined;
    }

    destroy() {
        this.graphics.destroy();
    }

    // Traces one strength's lines and returns how many there are.
    private drawLines(scene: OverlayScene, plan: GridPlan, onScreen: Bounds, strength: GridLineStrength) {
        const view = scene.view;
        const vertical = withStrength(plan.vertical, strength);
        const horizontal = withStrength(plan.horizontal, strength);

        for (const line of vertical) {
            const screenX = onPixel(view.levelToScreen({ x: line.position, y: 0 }).x);
            this.graphics.moveTo(screenX, onScreen.top).lineTo(screenX, onScreen.bottom);
        }

        for (const line of horizontal) {
            const screenY = onPixel(view.levelToScreen({ x: 0, y: line.position }).y);
            this.graphics.moveTo(onScreen.left, screenY).lineTo(onScreen.right, screenY);
        }

        return vertical.length + horizontal.length;
    }
}
