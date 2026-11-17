import type { Point } from '../../geometry/index.ts';

import type { CameraBox } from './CameraBox.ts';

// The target is kept at least this share of the box's size from its edge.
const SAFETY_MARGIN_SHARE = 0.1;

// One direction: the camera's middle pulled so the target is no nearer the box's edge than the margin.
function keepOnAxis(middle: number, boxSize: number, target: number) {
    const furthestFromMiddle = boxSize / 2 - boxSize * SAFETY_MARGIN_SHARE;
    const lowest = target - furthestFromMiddle;
    const highest = target + furthestFromMiddle;

    if (middle < lowest) return lowest;
    if (middle > highest) return highest;

    return middle;
}

// The camera's position pulled so the target stays inside the safety margin. A target far away is pulled
// to the margin's edge in one tick, which is the cut the camera requirement asks for.
export function keepInSafetyMargin(position: Point, box: CameraBox, target: Point): Point {
    const x = keepOnAxis(position.x, box.width, target.x);
    const y = keepOnAxis(position.y, box.height, target.y);

    return { x, y };
}
