import { oppositeHandle } from '../../../core/geometry/index.ts';
import type { PathPoint, Point } from '../../../core/geometry/index.ts';
import { labelName } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { OpenLevel } from '../../session/index.ts';

import { isPointsRefusal, PointsTarget } from './PointsTarget.ts';
import type { PointsRefusal } from './PointsTarget.ts';

// A path point's two handles, by the names the path stores them under.
export type HandleSide = 'handleIn' | 'handleOut';

// How a handle's drag places it: Shift keeps it to a multiple of 15° in the path's own space, and
// separate says Alt was held during the drag, so a smooth point turns separate and the handle moves alone.
export type HandleMoveOptions = {
    readonly lockAngle: boolean;
    readonly separate: boolean;
};

const ANGLE_STEP_RADIANS = (15 * Math.PI) / 180;

function otherSide(side: HandleSide): HandleSide {
    return side === 'handleIn' ? 'handleOut' : 'handleIn';
}

// Adding 0 turns a -0 into 0, so a handle along an axis compares equal to one typed.
function angleLocked(handle: Point): Point {
    const length = Math.hypot(handle.x, handle.y);
    if (length === 0) return handle;

    const angle = Math.round(Math.atan2(handle.y, handle.x) / ANGLE_STEP_RADIANS) * ANGLE_STEP_RADIANS;

    return { x: length * Math.cos(angle) + 0, y: length * Math.sin(angle) + 0 };
}

// One handle of a path's point dragged, from the path as it was at the press: a smooth point turns its
// other handle to stay opposite, keeping that one's length; a separate point's handle moves alone. Each
// write goes through LiveEdit, which the caller begins with `targets` first, and commits with `label`:
// `Move a handle of Path 1`.
export class HandleMove {
    readonly label: string;
    private readonly openLevel: OpenLevel;
    private readonly points: PointsTarget;
    private readonly index: number;
    private readonly side: HandleSide;
    private readonly start: PathPoint;

    private constructor(openLevel: OpenLevel, points: PointsTarget, index: number, side: HandleSide, start: PathPoint) {
        this.openLevel = openLevel;
        this.points = points;
        this.index = index;
        this.side = side;
        this.start = start;
        this.label = `Move a handle of ${labelName(points.entity)}`;
    }

    static of(openLevel: OpenLevel, entity: Entity, index: number, side: HandleSide): HandleMove | PointsRefusal {
        const points = PointsTarget.of(openLevel, entity);
        if (isPointsRefusal(points)) return points;
        if (!points.isPath) return { kind: 'refused', reason: "Only a path's points have handles" };

        const start = points.pathPoints[index];
        if (start === undefined || start[side] === null) return { kind: 'refused', reason: 'No handle there' };

        return new HandleMove(openLevel, points, index, side, start);
    }

    get targets() {
        return [this.points.target];
    }

    // Where the handle's end was in the level before the drag.
    get startLevelEnd() {
        const handle = this.start[this.side] ?? { x: 0, y: 0 };

        return this.points.toLevel({ x: this.start.x + handle.x, y: this.start.y + handle.y });
    }

    // The handle's end to this level position.
    moveTo(levelEnd: Point, options: HandleMoveOptions) {
        const point = this.movedPoint(levelEnd, options);
        const moved = this.points.pathPoints.map((other, index) => (index === this.index ? point : other));

        this.openLevel.liveEdit.update(this.points.target, this.points.geometryWith(moved));
    }

    private movedPoint(levelEnd: Point, options: HandleMoveOptions): PathPoint {
        const { start, side } = this;
        const ownEnd = this.points.toOwn(levelEnd);
        const pulled = { x: ownEnd.x - start.x, y: ownEnd.y - start.y };
        const handle = options.lockAngle ? angleLocked(pulled) : pulled;

        const isSeparate = options.separate || start.corner === 'separate';
        const other = start[otherSide(side)];
        const turnsOther = !isSeparate && other !== null;
        const otherHandle = turnsOther ? oppositeHandle(handle, other) : other;
        const corner = isSeparate ? 'separate' : start.corner;

        return { ...start, [side]: handle, [otherSide(side)]: otherHandle, corner };
    }
}
