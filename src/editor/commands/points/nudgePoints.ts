import type { Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';
import type { CommandOutcome } from '../EditorCommand.ts';

import { PointsMove } from './PointsMove.ts';

// An arrow key while editing points: the selected points move by the offset along the level's axes,
// never snapped. A run of nudges on the same shape, each within a second of the one before, joins into
// one step, as the entities' nudges do.
export function nudgePoints(
    openLevel: OpenLevel,
    entity: Entity,
    indexes: readonly number[],
    offset: Point,
): CommandOutcome {
    const move = PointsMove.of(openLevel, entity, indexes);
    if (!(move instanceof PointsMove)) return move;

    const { liveEdit } = openLevel;
    if (!liveEdit.begin(move.targets)) return { kind: 'refused', reason: READ_ONLY_REASON };

    move.moveBy(offset);
    liveEdit.commit(move.label, `nudgePoints:${entity.id}`);

    return { kind: 'done' };
}
