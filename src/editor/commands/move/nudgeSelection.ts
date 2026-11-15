import type { Point } from '../../../core/geometry/index.ts';
import type { OpenLevel } from '../../session/index.ts';
import type { CommandOutcome } from '../EditorCommand.ts';

import { SelectionMove } from './SelectionMove.ts';

// An arrow key: the selection moves by the offset along the level's axes, never snapped. A run of
// nudges on the same selection, each within a second of the one before, joins into one step.
export function nudgeSelection(openLevel: OpenLevel, offset: Point): CommandOutcome {
    const { liveEdit, selection } = openLevel;
    if (liveEdit.isActive) return { kind: 'refused', reason: 'Not during a drag' };

    const move = SelectionMove.ofSelection(openLevel);
    if (!(move instanceof SelectionMove)) return move;

    liveEdit.begin(move.targets);
    move.moveBy(offset);
    liveEdit.commit(move.label, `nudge:${selection.ids.join(',')}`);

    return { kind: 'done' };
}
