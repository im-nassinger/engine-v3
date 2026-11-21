import { nearestOnCurve, splitCurve } from '../../../core/geometry/index.ts';
import type { PathPoint, Point } from '../../../core/geometry/index.ts';
import { labelName } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

import { isPointsRefusal, PointsTarget } from './PointsTarget.ts';
import type { PointsRefusal } from './PointsTarget.ts';

export type AddPointOutcome = { readonly kind: 'added'; readonly index: number } | PointsRefusal;

// A curve is cut a little inside its ends at most, so the new point never lies on its neighbour and its
// handles always point somewhere.
const MIN_SHARE = 0.001;

// A double-click on an edge: a new point at the level position, which lies on the edge from point
// `edgeStartIndex` to the next, so the shape doesn't change. On a path's curve the new point comes from
// splitCurve at the nearest place, so the curve's look doesn't change either. One step,
// `Add a point to Polygon 1`.
export function addPoint(
    openLevel: OpenLevel,
    entity: Entity,
    edgeStartIndex: number,
    levelPosition: Point,
): AddPointOutcome {
    const points = PointsTarget.of(openLevel, entity);
    if (isPointsRefusal(points)) return points;

    const count = points.points.length;
    const edgeCount = points.closed ? count : count - 1;
    const isEdge = edgeStartIndex >= 0 && edgeStartIndex < edgeCount;
    if (!isEdge) return { kind: 'refused', reason: 'No edge there' };

    if (count >= points.maxPoints) return { kind: 'refused', reason: points.maxPointsReason };

    const ownPosition = points.toOwn(levelPosition);
    const withPoint = points.isPath
        ? splitPathAt(points.pathPoints, edgeStartIndex, ownPosition)
        : insertAt(points.points, edgeStartIndex + 1, ownPosition);
    const label = `Add a point to ${labelName(entity)}`;
    const isWritten = points.write(openLevel, withPoint, label);
    if (!isWritten) return { kind: 'refused', reason: READ_ONLY_REASON };

    return { kind: 'added', index: edgeStartIndex + 1 };
}

function insertAt<T>(items: readonly T[], index: number, item: T) {
    return [...items.slice(0, index), item, ...items.slice(index)];
}

// The new point goes after point `startIndex`, and the curve's two ends take the shortened handles.
function splitPathAt(points: readonly PathPoint[], startIndex: number, ownPosition: Point) {
    const endIndex = (startIndex + 1) % points.length;
    const from = points[startIndex];
    const to = points[endIndex];
    if (from === undefined || to === undefined) throw new Error(`The path has no edge ${startIndex}.`);

    const nearest = nearestOnCurve(from, to, ownPosition);
    const share = Math.min(1 - MIN_SHARE, Math.max(MIN_SHARE, nearest));
    const split = splitCurve(from, to, share);

    const ends = points.map((point, index) => {
        if (index === startIndex) return split.from;
        if (index === endIndex) return split.to;

        return point;
    });

    return insertAt(ends, startIndex + 1, split.added);
}
