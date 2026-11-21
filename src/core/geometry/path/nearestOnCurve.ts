import type { PathPoint } from '../PathGeometry.ts';
import type { Point } from '../Point.ts';

import { curveBetween, isStraightBetween, pointOnCubic } from './cubicCurve.ts';
import type { CubicCurve } from './cubicCurve.ts';

// The coarse look along the curve, then the halvings around the nearest sample: 64 samples and 30 rounds
// find the share to far below a pixel on any curve a level holds.
const SAMPLE_COUNT = 64;
const REFINE_ROUNDS = 30;

function distanceSquared(curve: CubicCurve, share: number, position: Point) {
    const point = pointOnCubic(curve, share);
    const dx = point.x - position.x;
    const dy = point.y - position.y;

    return dx * dx + dy * dy;
}

// The share of the way along a straight segment, as splitCurve measures it there.
function nearestOnStraight(from: Point, to: Point, position: Point) {
    const segmentX = to.x - from.x;
    const segmentY = to.y - from.y;
    const lengthSquared = segmentX * segmentX + segmentY * segmentY;
    if (lengthSquared === 0) return 0;

    const projection = (position.x - from.x) * segmentX + (position.y - from.y) * segmentY;

    return Math.min(1, Math.max(0, projection / lengthSquared));
}

// The share of the way along the curve from one path point to the next, 0 to 1, whose place is nearest the
// position; on a straight segment, the share of its length. Only + − × ÷, so the same press gives the same
// share on any computer.
export function nearestOnCurve(from: PathPoint, to: PathPoint, position: Point) {
    if (isStraightBetween(from, to)) return nearestOnStraight(from, to, position);

    const curve = curveBetween(from, to);
    let bestShare = 0;
    let bestDistance = Infinity;

    for (let sample = 0; sample <= SAMPLE_COUNT; sample++) {
        const share = sample / SAMPLE_COUNT;
        const distance = distanceSquared(curve, share, position);
        if (distance >= bestDistance) continue;

        bestShare = share;
        bestDistance = distance;
    }

    let step = 1 / SAMPLE_COUNT;
    for (let round = 0; round < REFINE_ROUNDS; round++) {
        step /= 2;
        for (const share of [bestShare - step, bestShare + step]) {
            if (share < 0 || share > 1) continue;

            const distance = distanceSquared(curve, share, position);
            if (distance >= bestDistance) continue;

            bestShare = share;
            bestDistance = distance;
        }
    }

    return bestShare;
}
