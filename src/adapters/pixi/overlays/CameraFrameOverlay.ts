import { Container, Graphics, Text } from 'pixi.js';
import type { StrokeStyle } from 'pixi.js';
import { CameraComponent } from '../../../core/components/index.ts';
import type { Level } from '../../../core/entities/index.ts';
import type { OverlayScene } from './OverlayScene.ts';
import { screenRectangleOf } from './screenPixels.ts';

const FRAME_COLOUR = 0x141c28;
const FRAME_ALPHA = 0.7;
const FRAME: StrokeStyle = { color: FRAME_COLOUR, alpha: FRAME_ALPHA, width: 1.5, join: 'miter' };
// The gap between the label's baseline area and the frame's top edge.
const LABEL_GAP_PX = 4;

export function cameraLabelOf(camera: CameraComponent) {
    return `Camera ${camera.get('width')} × ${camera.get('height')}`;
}

// The camera sits directly inside the World, so it is hidden when it or the World is.
function cameraIsHidden(level: Level) {
    return level.camera.isHidden || level.world.isHidden;
}

// The frame of what players will see, 1.5 screen px at any zoom, with "Camera 1920 × 1080" above its top
// left corner. Hidden by its View menu switch and with the camera's eye.
export class CameraFrameOverlay {
    readonly container = new Container();
    private readonly frame = new Graphics();
    private readonly label = new Text({
        text: '',
        style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fill: FRAME_COLOUR },
    });

    constructor() {
        this.label.alpha = FRAME_ALPHA;
        this.label.anchor.set(0, 1);
        this.container.addChild(this.frame, this.label);
    }

    get isShowing() {
        return this.container.visible;
    }

    get labelText() {
        return this.label.text;
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

        const onScreen = screenRectangleOf(frameBounds, scene.view);
        this.frame.rect(onScreen.left, onScreen.top, onScreen.width, onScreen.height).stroke(FRAME);

        const text = cameraLabelOf(camera);
        if (this.label.text !== text) {
            this.label.text = text;
        }
        this.label.position.set(Math.round(onScreen.left), Math.round(onScreen.top - LABEL_GAP_PX));
    }

    destroy() {
        this.container.destroy({ children: true });
    }
}
