import type { Bounds, Point } from '../../geometry/index.ts';

import type { CameraBox } from './CameraBox.ts';

// One direction: the box's middle kept where the whole box stays between low and high, or the middle of
// the two when the box doesn't fit.
function limitOnAxis(middle: number, boxSize: number, low: number, high: number) {
    const halfBox = boxSize / 2;
    const fits = boxSize < high - low;

    if (!fits) return (low + high) / 2;
    if (middle - halfBox < low) return low + halfBox;
    if (middle + halfBox > high) return high - halfBox;

    return middle;
}

// The camera's position moved so its box stays inside the level bounds. In a direction where the level
// is smaller than the box, the camera sits on the bounds' middle.
export function limitToBounds(position: Point, box: CameraBox, bounds: Bounds): Point {
    const x = limitOnAxis(position.x, box.width, bounds.left, bounds.right);
    const y = limitOnAxis(position.y, box.height, bounds.top, bounds.bottom);

    return { x, y };
}
