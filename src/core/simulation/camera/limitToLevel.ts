import { levelBoundsOf } from '../../derived/index.ts';
import type { Point } from '../../geometry/index.ts';
import type { Level } from '../../level/index.ts';

import type { CameraBox } from './CameraBox.ts';
import { limitToBounds } from './limitToBounds.ts';

// limitToBounds with the play copy's level bounds. A World without its rectangle has no bounds to keep
// to, which only a hand-made test level can have.
export function limitToLevel(position: Point, box: CameraBox, level: Level) {
    const bounds = levelBoundsOf(level);
    if (bounds === undefined) return position;

    return limitToBounds(position, box, bounds);
}
