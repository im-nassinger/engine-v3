import type { Point } from '../../geometry/index.ts';
import { DeterministicMath } from '../../math/index.ts';

const TICKS_PER_SECOND = 60;

// After Smoothing seconds the camera has covered this much of the way: an ease never quite arrives,
// so "catching up" is read as 95%, and ln(1 / 0.05) is about 3.
const CATCH_UP_EXPONENT = 3;

// The share of the way to the goal the camera moves each tick. The same share every tick needs no
// speed kept between ticks.
function shareEachTick(smoothingSeconds: number) {
    const smoothingTicks = TICKS_PER_SECOND * smoothingSeconds;
    const remaining = DeterministicMath.exp(-CATCH_UP_EXPONENT / smoothingTicks);

    return 1 - remaining;
}

// One tick of the camera easing towards its goal. A Smoothing of 0 locks it to the goal.
export function smoothTowards(position: Point, goal: Point, smoothingSeconds: number): Point {
    if (smoothingSeconds <= 0) return goal;

    const share = shareEachTick(smoothingSeconds);
    const x = position.x + (goal.x - position.x) * share;
    const y = position.y + (goal.y - position.y) * share;

    return { x, y };
}
