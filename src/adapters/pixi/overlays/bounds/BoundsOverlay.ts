import { Graphics } from 'pixi.js';
import type { StrokeStyle } from 'pixi.js';
import { levelBoundsOf } from '../../../../core/derived/index.ts';
import type { Bounds } from '../../../../core/geometry/index.ts';
import { dimmedAreas } from './dimmedAreas.ts';
import type { OverlayScene } from '../OverlayScene.ts';
import { onPixel, screenRectangleOf, wholeViewRectangle } from '../screenPixels.ts';

const OUTSIDE_COLOUR = 0x0a1423;
const OUTSIDE_ALPHA = 0.35;
const EDGE: StrokeStyle = { color: OUTSIDE_COLOUR, alpha: 0.5, width: 1, pixelLine: true };

// Dims the view outside the level bounds and draws their 1 px edge. It has no View menu switch: the
// requirements always dim the outside in the editor.
export class BoundsOverlay {
    readonly graphics = new Graphics();
    private dimmed: readonly Bounds[] = [];

    // The screen rectangles dimmed last. For tests.
    get dimmedAreas() {
        return this.dimmed;
    }

    update(scene: OverlayScene) {
        this.graphics.clear();
        this.dimmed = [];

        const level = scene.level;
        if (level === undefined) return;

        const levelBounds = levelBoundsOf(level);
        if (levelBounds === undefined) return;

        const inView = screenRectangleOf(levelBounds, scene.view);
        this.dimmed = dimmedAreas(wholeViewRectangle(scene.view), inView);

        for (const area of this.dimmed) {
            this.graphics.rect(area.left, area.top, area.width, area.height);
        }
        this.graphics.fill({ color: OUTSIDE_COLOUR, alpha: OUTSIDE_ALPHA });

        const left = onPixel(inView.left);
        const top = onPixel(inView.top);
        const right = onPixel(inView.right);
        const bottom = onPixel(inView.bottom);
        this.graphics.rect(left, top, right - left, bottom - top).stroke(EDGE);
    }

    destroy() {
        this.graphics.destroy();
    }
}
