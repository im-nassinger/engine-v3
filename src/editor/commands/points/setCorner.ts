import { oppositeHandle, smoothHandles } from '../../../core/geometry/index.ts';
import type { PathCorner, PathGeometry, PathPoint } from '../../../core/geometry/index.ts';
import { labelName } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';
import type { CommandOutcome } from '../EditorCommand.ts';

import { isPointsRefusal, PointsTarget } from './PointsTarget.ts';

// A path point with another corner: sharp drops its handles; a sharp point turned smooth or separate takes
// smoothHandles; a separate point turned smooth turns its handle out opposite its handle in.
function withCorner(path: PathGeometry, index: number, point: PathPoint, corner: PathCorner): PathPoint {
    if (corner === 'sharp') return { ...point, handleIn: null, handleOut: null, corner };
    if (point.corner === 'sharp') return { ...point, ...smoothHandles(path, index), corner };

    const { handleIn, handleOut } = point;
    const linesUp = corner === 'smooth' && handleIn !== null && handleOut !== null;
    if (!linesUp) return { ...point, corner };

    return { ...point, handleOut: oppositeHandle(handleIn, handleOut), corner };
}

// A double-click on a path's point switches it between sharp and smooth: one step,
// `Change a point of Path 1`. A point that already has the corner makes no step.
export function setCorner(openLevel: OpenLevel, entity: Entity, index: number, corner: PathCorner): CommandOutcome {
    const points = PointsTarget.of(openLevel, entity);
    if (isPointsRefusal(points)) return points;
    if (!points.isPath) return { kind: 'refused', reason: "Only a path's points have corners" };

    const point = points.pathPoints[index];
    if (point === undefined) return { kind: 'refused', reason: 'No point there' };
    if (point.corner === corner) return { kind: 'done' };

    const path = { closed: points.closed, points: points.pathPoints };
    const changed = points.pathPoints.map((other, otherIndex) =>
        otherIndex === index ? withCorner(path, index, point, corner) : other,
    );
    const label = `Change a point of ${labelName(entity)}`;
    if (!points.write(openLevel, changed, label)) return { kind: 'refused', reason: READ_ONLY_REASON };

    return { kind: 'done' };
}
