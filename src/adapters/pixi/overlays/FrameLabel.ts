import { Container, Text } from 'pixi.js';
import type { Point } from '../../../core/geometry/index.ts';
import { OVERLAY_FONT, OVERLAY_TEXT_PX } from './overlayLook.ts';

const NAME_ALPHA = 0.92;
const SIZE_ALPHA = 0.6;
const NAME_TO_SIZE_GAP_PX = 10;
// The gap between the label's bottom and the frame's top edge.
const GAP_ABOVE_FRAME_PX = 4;
// How far above the frame the label's top is.
export const FRAME_LABEL_HEIGHT_PX = GAP_ABOVE_FRAME_PX + OVERLAY_TEXT_PX;

function labelPart(text: string, fontWeight: '400' | '600', alpha: number) {
    // Drawn white and tinted, so a new colour doesn't draw the text again.
    const part = new Text({
        text,
        style: { fontFamily: OVERLAY_FONT, fontSize: OVERLAY_TEXT_PX, fontWeight, fill: 0xffffff },
    });
    part.alpha = alpha;
    part.anchor.set(0, 1);

    return part;
}

// A frame's label above its top left corner: the name in bold, a gap, then the size.
export class FrameLabel {
    readonly container = new Container();
    private readonly name: Text;
    private readonly size = labelPart('', '400', SIZE_ALPHA);

    constructor(name: string) {
        this.name = labelPart(name, '600', NAME_ALPHA);
        this.container.addChild(this.name, this.size);
    }

    get text() {
        return `${this.name.text} ${this.size.text}`;
    }

    get colour() {
        return this.name.tint;
    }

    show(size: string, frameTopLeft: Point, colour: number) {
        if (this.size.text !== size) {
            this.size.text = size;
        }
        this.name.tint = colour;
        this.size.tint = colour;
        this.size.x = Math.ceil(this.name.width) + NAME_TO_SIZE_GAP_PX;
        this.container.position.set(Math.round(frameTopLeft.x), Math.round(frameTopLeft.y - GAP_ABOVE_FRAME_PX));
    }
}
