import { Bounds } from '../../../core/geometry/index.ts';
import type { ViewState } from '../../../editor/view/index.ts';

// The middle of the screen pixel a position falls in, so a 1 px line covers one row of pixels, not two
// half-lit ones.
export function onPixel(screenPosition: number) {
    return Math.floor(screenPosition) + 0.5;
}

export function screenRectangleOf(levelRectangle: Bounds, view: ViewState) {
    const topLeft = view.levelToScreen({ x: levelRectangle.left, y: levelRectangle.top });
    const bottomRight = view.levelToScreen({ x: levelRectangle.right, y: levelRectangle.bottom });

    return new Bounds(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y);
}

export function wholeViewRectangle(view: ViewState) {
    const size = view.size;

    return new Bounds(0, 0, size.width, size.height);
}
