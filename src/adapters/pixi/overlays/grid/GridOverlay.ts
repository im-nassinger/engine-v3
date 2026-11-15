import { Graphics } from 'pixi.js';
import type { StrokeStyle } from 'pixi.js';
import { StyleComponent } from '../../../../core/components/index.ts';
import type { Level } from '../../../../core/level/index.ts';
import { gridColourFor } from './gridColour.ts';
import { planGrid } from './GridPlan.ts';
import type { GridLine, GridLineStrength, GridPlan } from './GridPlan.ts';
import type { OverlayScene } from '../OverlayScene.ts';
import { onPixel } from '../screenPixels.ts';

const STRENGTHS: readonly GridLineStrength[] = ['fine', 'step', 'origin'];

const ALPHA_OF: Readonly<Record<GridLineStrength, number>> = {
    fine: 0.07,
    step: 0.13,
    origin: 0.32,
};

function backgroundOf(level: Level | undefined) {
    const style = level?.world.getComponent(StyleComponent);

    return style?.get('fill');
}

function withStrength(lines: readonly GridLine[], strength: GridLineStrength) {
    return lines.filter((line) => line.strength === strength);
}

// The grid over the level: 1 screen px lines every grid step, fainter ones in between when there is room,
// and stronger ones through the origin. It covers the whole view; outside the level the BoundsOverlay dims it.
export class GridOverlay {
    readonly graphics = new Graphics();
    private lastPlan: GridPlan | undefined;

    // The lines drawn last, undefined while the grid is off. For tests.
    get plan() {
        return this.lastPlan;
    }

    update(scene: OverlayScene) {
        this.graphics.clear();
        this.lastPlan = undefined;

        const level = scene.level;
        const isOn = scene.settings.isOn('grid');
        this.graphics.visible = isOn && level !== undefined;
        if (!isOn || level === undefined) return;

        const view = scene.view;
        const plan = planGrid({ visible: view.visibleBounds(), zoom: view.zoom, gridSize: level.editorData.gridSize });
        this.lastPlan = plan;

        const colour = gridColourFor(backgroundOf(level));
        for (const strength of STRENGTHS) {
            const lineCount = this.drawLines(scene, plan, strength);
            if (lineCount === 0) continue;

            const style: StrokeStyle = { color: colour, alpha: ALPHA_OF[strength], width: 1, pixelLine: true };
            this.graphics.stroke(style);
        }
    }

    destroy() {
        this.graphics.destroy();
    }

    // Traces one strength's lines and returns how many there are.
    private drawLines(scene: OverlayScene, plan: GridPlan, strength: GridLineStrength) {
        const view = scene.view;
        const size = view.size;
        const vertical = withStrength(plan.vertical, strength);
        const horizontal = withStrength(plan.horizontal, strength);

        for (const line of vertical) {
            const screenX = onPixel(view.levelToScreen({ x: line.position, y: 0 }).x);
            this.graphics.moveTo(screenX, 0).lineTo(screenX, size.height);
        }

        for (const line of horizontal) {
            const screenY = onPixel(view.levelToScreen({ x: 0, y: line.position }).y);
            this.graphics.moveTo(0, screenY).lineTo(size.width, screenY);
        }

        return vertical.length + horizontal.length;
    }
}
