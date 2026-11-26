import { Container, Graphics } from 'pixi.js';
import type { StrokeStyle } from 'pixi.js';
import { levelBoundsOf } from '../../../../core/derived/index.ts';
import { FrameLabel } from '../FrameLabel.ts';
import type { OverlayScene } from '../OverlayScene.ts';
import { onPixel, screenRectangleOf } from '../screenPixels.ts';
import { lengthDisplayOf } from '../../../../editor/units/index.ts';

const FRAME_COLOUR = 0xecf0f6;
const EDGE: StrokeStyle = { color: FRAME_COLOUR, alpha: 0.35, width: 1, pixelLine: true };

// The level bounds' 1 px edge and their label, such as "World 20000 × 10000". Nothing is drawn outside them:
// the canvas is clear there, so the app's colour shows, and entities placed outside stay visible. It has no
// View menu switch.
export class BoundsOverlay {
    readonly container = new Container();
    private readonly edge = new Graphics();
    private readonly label = new FrameLabel('World');

    constructor() {
        this.container.addChild(this.edge, this.label.container);
        this.container.visible = false;
    }

    get isShowing() {
        return this.container.visible;
    }

    get labelText() {
        return this.label.text;
    }

    update(scene: OverlayScene) {
        this.clear();

        const level = scene.level;
        if (level === undefined) return;

        const levelBounds = levelBoundsOf(level);
        if (levelBounds === undefined) return;

        const inView = screenRectangleOf(levelBounds, scene.view);
        const left = onPixel(inView.left);
        const top = onPixel(inView.top);
        const right = onPixel(inView.right);
        const bottom = onPixel(inView.bottom);
        this.edge.rect(left, top, right - left, bottom - top).stroke(EDGE);

        const lengths = lengthDisplayOf(scene.settings.lengthUnit, level);
        const size = lengths.sizeText(levelBounds.width, levelBounds.height);
        this.label.show(size, { x: inView.left, y: inView.top }, FRAME_COLOUR);
        this.container.visible = true;
    }

    // Draws nothing, as during play.
    clear() {
        this.edge.clear();
        this.container.visible = false;
    }

    destroy() {
        this.container.destroy({ children: true });
    }
}
