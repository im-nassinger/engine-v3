import { Container, Graphics } from 'pixi.js';
import { CameraComponent } from '../../../core/components/index.ts';
import { levelBoundsOf } from '../../../core/derived/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { Level } from '../../../core/level/index.ts';
import { FrameLabel, FRAME_LABEL_HEIGHT_PX } from './FrameLabel.ts';
import { isDarkBackground, worldFillOf } from './levelBackground.ts';
import type { OverlayScene } from './OverlayScene.ts';
import { screenRectangleOf } from './screenPixels.ts';

const FRAME_WIDTH_PX = 1.5;
const ON_LIGHT = { color: 0x141c28, alpha: 0.7 };
const ON_DARK = { color: 0xecf0f6, alpha: 0.55 };

// The camera sits directly inside the World, so it is hidden when it or the World is.
function cameraIsHidden(level: Level) {
    return level.camera.isHidden || level.world.isHidden;
}

// Whether the label starts inside the level bounds, over the World's fill, and not on the app's dark colour.
function labelStartsInBounds(level: Level, scene: OverlayScene, frameTopLeft: Point) {
    const start = scene.view.screenToLevel({ x: frameTopLeft.x, y: frameTopLeft.y - FRAME_LABEL_HEIGHT_PX });
    const levelBounds = levelBoundsOf(level);

    return levelBounds !== undefined && levelBounds.contains(start);
}

// The frame of what players will see, 1.5 screen px at any zoom, dark on a light World's fill and light on a
// dark one, with "Camera 1920 × 1080" above its top left corner, coloured for what it starts on. Hidden by its
// View menu switch and with the camera's eye.
export class CameraFrameOverlay {
    readonly container = new Container();
    private readonly frame = new Graphics();
    private readonly label = new FrameLabel('Camera');

    constructor() {
        this.container.addChild(this.frame, this.label.container);
    }

    get isShowing() {
        return this.container.visible;
    }

    get labelText() {
        return this.label.text;
    }

    // The colour the label was drawn in last. For tests.
    get labelColour() {
        return this.label.colour;
    }

    update(scene: OverlayScene) {
        this.frame.clear();

        const level = scene.level;
        const frameBounds = level === undefined ? undefined : scene.caches?.bounds.ownBoundsOf(level.camera);
        const camera = level?.camera.getComponent(CameraComponent);
        const isOn = scene.settings.isOn('cameraFrame');
        const shows = isOn && level !== undefined && !cameraIsHidden(level) && frameBounds !== undefined;

        this.container.visible = shows;
        if (!shows || camera === undefined) return;

        const look = isDarkBackground(worldFillOf(level)) ? ON_DARK : ON_LIGHT;
        const onScreen = screenRectangleOf(frameBounds, scene.view);
        this.frame
            .rect(onScreen.left, onScreen.top, onScreen.width, onScreen.height)
            .stroke({ ...look, width: FRAME_WIDTH_PX, join: 'miter' });

        const size = `${camera.get('width')} × ${camera.get('height')}`;
        const topLeft = { x: onScreen.left, y: onScreen.top };
        const labelLook = labelStartsInBounds(level, scene, topLeft) ? look : ON_DARK;
        this.label.show(size, topLeft, labelLook.color);
    }

    destroy() {
        this.container.destroy({ children: true });
    }
}
