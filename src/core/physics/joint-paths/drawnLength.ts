import type { JointEnds } from '../../geometry/index.ts';

// Length and Rest length's own range in the JointComponent.
const SHORTEST_LENGTH = 1;
const LONGEST_LENGTH = 100_000;

// The gap between a Rope's or Spring's ends, in the joint's own space, kept inside Length's range: what
// Length and Rest length show while Match drawn distance is on, so a typed value starts from it when it is
// turned off. Not Math.hypot, which IEEE 754 doesn't define exactly.
export function drawnLength(ends: JointEnds) {
    const x = ends.b.x - ends.a.x;
    const y = ends.b.y - ends.a.y;
    const gap = Math.sqrt(x * x + y * y);

    return Math.min(LONGEST_LENGTH, Math.max(SHORTEST_LENGTH, gap));
}
