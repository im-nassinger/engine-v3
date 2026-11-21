import { MAX_POSITION, MAX_RADIUS, MIN_EDITED_RADIUS, MIN_POSITION } from '../../../core/fields/index.ts';
import type { GradientFill } from '../../../core/fields/index.ts';
import type { Point } from '../../../core/geometry/index.ts';

import type { FillPlacement } from './FillPlacement.ts';

// The handles a gradient is dragged by: a linear one's start and end, a radial one's centre and radius dot.
export type GradientHandleRole = 'start' | 'end' | 'centre' | 'radius';

// Shift keeps a linear gradient's direction to multiples of this, on screen.
const SNAP_DEGREES = 15;
// Positions and the radius land on tenths of a percent, so a saved level stays readable.
const SHARE_STEP = 1000;

// The fill with one handle moved to a level position. A linear end goes where the mouse is, or with
// keepAngle along the nearest 15° from the end not dragged, measured in level positions, which turn and
// zoom the same on screen. The centre moves its radius dot with it; the radius dot sets the radius from its
// distance to the centre, in shares. Positions stay within MIN_POSITION to MAX_POSITION.
export function moveGradientHandle(
    fill: GradientFill,
    role: GradientHandleRole,
    levelPosition: Point,
    placement: FillPlacement,
    keepAngle: boolean,
): GradientFill {
    if (fill.kind === 'linear') {
        if (role === 'start') {
            const start = linearEnd(fill.end, levelPosition, placement, keepAngle);
            return { ...fill, start };
        }
        if (role === 'end') {
            const end = linearEnd(fill.start, levelPosition, placement, keepAngle);
            return { ...fill, end };
        }

        return fill;
    }

    if (role === 'centre') {
        const centre = keptPosition(placement.levelToShare(levelPosition));
        return { ...fill, centre };
    }
    if (role === 'radius') {
        const share = placement.levelToShare(levelPosition);
        const distance = Math.hypot(share.x - fill.centre.x, share.y - fill.centre.y);
        const radius = Math.min(Math.max(onStep(distance), MIN_EDITED_RADIUS), MAX_RADIUS);
        return { ...fill, radius };
    }

    return fill;
}

function linearEnd(fixed: Point, levelPosition: Point, placement: FillPlacement, keepAngle: boolean) {
    const target = keepAngle ? alongSnappedAngle(placement.shareToLevel(fixed), levelPosition) : levelPosition;

    return keptPosition(placement.levelToShare(target));
}

// The point as far from fixed as the mouse, at the nearest multiple of 15° around it.
function alongSnappedAngle(fixed: Point, mouse: Point): Point {
    const dx = mouse.x - fixed.x;
    const dy = mouse.y - fixed.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return mouse;

    const step = (SNAP_DEGREES * Math.PI) / 180;
    const angle = Math.round(Math.atan2(dy, dx) / step) * step;

    return { x: fixed.x + Math.cos(angle) * length, y: fixed.y + Math.sin(angle) * length };
}

function keptPosition(share: Point): Point {
    return { x: keptShare(share.x), y: keptShare(share.y) };
}

function keptShare(share: number) {
    return Math.min(Math.max(onStep(share), MIN_POSITION), MAX_POSITION);
}

// The + 0 turns −0 into 0.
function onStep(share: number) {
    return Math.round(share * SHARE_STEP) / SHARE_STEP + 0;
}
