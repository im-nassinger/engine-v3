import { labelName } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { OpenLevel } from '../../session/index.ts';
import type { CommandOutcome } from '../EditorCommand.ts';

import { isPointsRefusal, PointsTarget } from './PointsTarget.ts';

// Delete or Backspace while editing points: the selected points go, as one step. A polygon keeps at least
// 3 points and a line 2; a delete that would leave fewer deletes nothing and says why.
export function deletePoints(openLevel: OpenLevel, entity: Entity, indexes: readonly number[]): CommandOutcome {
    const points = PointsTarget.of(openLevel, entity);
    if (isPointsRefusal(points)) return points;

    const deleted = new Set(indexes);
    const remaining = points.points.filter((_point, index) => !deleted.has(index));
    const deletesNothing = remaining.length === points.points.length;
    if (deletesNothing) return { kind: 'refused', reason: 'No points selected' };

    if (remaining.length < points.minPoints) {
        return { kind: 'refused', reason: `A ${points.kind} keeps at least ${points.minPoints} points` };
    }

    const label = `Delete points of ${labelName(entity)}`;
    points.write(openLevel, remaining, label);

    return { kind: 'done' };
}
