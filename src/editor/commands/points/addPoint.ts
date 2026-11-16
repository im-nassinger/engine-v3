import type { Point } from '../../../core/geometry/index.ts';
import { labelName } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

import { isPointsRefusal, PointsTarget } from './PointsTarget.ts';
import type { PointsRefusal } from './PointsTarget.ts';

export type AddPointOutcome = { readonly kind: 'added'; readonly index: number } | PointsRefusal;

// A double-click on an edge: a new point at the level position, which lies on the edge from point
// `edgeStartIndex` to the next, so the shape doesn't change. One step, `Add a point to Polygon 1`.
export function addPoint(
    openLevel: OpenLevel,
    entity: Entity,
    edgeStartIndex: number,
    levelPosition: Point,
): AddPointOutcome {
    const points = PointsTarget.of(openLevel, entity);
    if (isPointsRefusal(points)) return points;

    const count = points.points.length;
    const isEdge = edgeStartIndex >= 0 && edgeStartIndex < count;
    if (!isEdge) return { kind: 'refused', reason: 'No edge there' };

    if (count >= points.maxPoints) {
        return { kind: 'refused', reason: `A ${points.kind} holds at most 1,000 points` };
    }

    const index = edgeStartIndex + 1;
    const newPoint = points.toOwn(levelPosition);
    const before = points.points.slice(0, index);
    const after = points.points.slice(index);
    const label = `Add a point to ${labelName(entity)}`;
    const isWritten = points.write(openLevel, [...before, newPoint, ...after], label);
    if (!isWritten) return { kind: 'refused', reason: READ_ONLY_REASON };

    return { kind: 'added', index };
}
