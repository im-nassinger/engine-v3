import { labelName } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';
import type { CommandOutcome } from '../EditorCommand.ts';

import { isPointsRefusal, PointsTarget } from './PointsTarget.ts';

// Delete or Backspace while editing points: the selected points go, as one step. A polygon keeps at least
// 3 points, a line and an open path 2, and a closed path 3; a delete that would leave fewer deletes nothing and says why.
export function deletePoints(openLevel: OpenLevel, entity: Entity, indexes: readonly number[]): CommandOutcome {
    const points = PointsTarget.of(openLevel, entity);
    if (isPointsRefusal(points)) return points;

    const deleted = new Set(indexes);
    const remaining = points.points.filter((_point, index) => !deleted.has(index));
    const deletesNothing = remaining.length === points.points.length;
    if (deletesNothing) return { kind: 'refused', reason: 'No points selected' };

    if (remaining.length < points.minPoints) {
        return { kind: 'refused', reason: points.minPointsReason };
    }

    const label = `Delete points of ${labelName(entity)}`;
    if (!points.write(openLevel, remaining, label)) return { kind: 'refused', reason: READ_ONLY_REASON };

    return { kind: 'done' };
}
