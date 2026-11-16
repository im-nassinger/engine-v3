import type { JointType } from '../../components/index.ts';
import type { PathGeometry, PathPoint, Point } from '../../geometry/index.ts';

// The proposal in simulation.md: 8 teeth, each 8 px to one side of the line between the ends.
const SPRING_TEETH = 8;
const SPRING_TOOTH_SIZE_PX = 8;

// A zero-length spring has no direction of its own, so its teeth stand across the x axis.
const ALONG_X = { x: 1, y: 0 };

// The read-only path a Rope or Spring draws between its two ends, in the joint's own space: a straight
// line for a Rope, a zigzag for a Spring. The editor and play both use it, so play starts from the path the
// editor drew.
export function jointPathPoints(type: Exclude<JointType, 'hinge'>, a: Point, b: Point): PathGeometry {
    if (type === 'rope') {
        return { closed: false, points: [sharpPoint(a), sharpPoint(b)] };
    }

    return { closed: false, points: springPoints(a, b) };
}

function springPoints(a: Point, b: Point) {
    const gapX = b.x - a.x;
    const gapY = b.y - a.y;
    const across = acrossDirectionOf(gapX, gapY);
    const points: PathPoint[] = [sharpPoint(a)];

    for (let tooth = 0; tooth < SPRING_TEETH; tooth++) {
        const along = (tooth + 0.5) / SPRING_TEETH;
        let side = SPRING_TOOTH_SIZE_PX;
        if (tooth % 2 === 1) {
            side = -SPRING_TOOTH_SIZE_PX;
        }

        const x = a.x + gapX * along + across.x * side;
        const y = a.y + gapY * along + across.y * side;
        points.push(sharpPoint({ x, y }));
    }

    points.push(sharpPoint(b));

    return points;
}

// One unit to the left of the line from A to B, as seen on screen with y down.
function acrossDirectionOf(gapX: number, gapY: number) {
    // Not Math.hypot, which IEEE 754 doesn't define exactly, so it may differ between browsers.
    const length = Math.sqrt(gapX * gapX + gapY * gapY);

    let direction = ALONG_X;
    if (length > 0) {
        direction = { x: gapX / length, y: gapY / length };
    }

    return { x: direction.y, y: -direction.x };
}

function sharpPoint(point: Point): PathPoint {
    return { x: point.x, y: point.y, handleIn: null, handleOut: null, corner: 'sharp' };
}
