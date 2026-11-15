import type { Bounds, Point } from '../../../../core/geometry/index.ts';

import type { FrameHandle, HandleSide } from '../frame/FrameHandle.ts';

// A handle dragged to a point, all in the entity's own space.
export type ResizeDrag = {
    readonly handle: FrameHandle;
    readonly box: Bounds;
    // Where the handle is now.
    readonly handleAt: Point;
    // Alt, or the World, which never moves.
    readonly fromCentre: boolean;
    // Shift, or a circle, which stays round.
    readonly proportional: boolean;
};

// The stretch along each of the entity's own axes, negative when mirrored, and the point that stays put.
export type Stretch = {
    readonly factor: Point;
    readonly anchor: Point;
};

type AxisStretch = { readonly factor: number; readonly anchor: number };

// How far the box stretches so the handle lands on handleAt: the opposite side or corner stays put, or the
// centre with fromCentre. Kept proportional, every axis takes the larger stretch, mirrored where the handle
// crossed over, and a side handle stretches the other axis from its centre.
export function resizeFactor(drag: ResizeDrag): Stretch {
    const { box, handle, handleAt, fromCentre } = drag;
    const centre = box.centre;
    const x = stretchAlong(handle.x, centre.x, box.width / 2, handleAt.x, fromCentre);
    const y = stretchAlong(handle.y, centre.y, box.height / 2, handleAt.y, fromCentre);
    if (!drag.proportional) return { factor: { x: x.factor, y: y.factor }, anchor: { x: x.anchor, y: y.anchor } };

    const larger = Math.max(handle.x === 0 ? 0 : Math.abs(x.factor), handle.y === 0 ? 0 : Math.abs(y.factor));
    const factor = {
        x: handle.x === 0 ? larger : Math.sign(x.factor || 1) * larger,
        y: handle.y === 0 ? larger : Math.sign(y.factor || 1) * larger,
    };

    return { factor, anchor: { x: x.anchor, y: y.anchor } };
}

// An axis the handle doesn't move keeps its size and stretches from the centre if at all. A box with no
// size along the axis can't be stretched by dragging.
function stretchAlong(
    side: HandleSide,
    centre: number,
    half: number,
    handleAt: number,
    fromCentre: boolean,
): AxisStretch {
    if (side === 0) return { factor: 1, anchor: centre };

    const anchor = fromCentre ? centre : centre - side * half;
    const startReach = centre + side * half - anchor;
    if (startReach === 0) return { factor: 1, anchor };

    return { factor: (handleAt - anchor) / startReach, anchor };
}
