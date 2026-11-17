import { READ_ONLY_REASON } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';
import type { CommandOutcome } from '../EditorCommand.ts';
import { skipEntities } from '../shared/skipEntities.ts';
import type { SkipResult } from '../shared/skipEntities.ts';
import { skippedRefusal } from '../shared/skippedRefusal.ts';
import { stepLabel } from '../shared/stepLabel.ts';

import { EntityRotate } from './EntityRotate.ts';
import { ownBox } from './ownBox.ts';

// The turns Z and X make, ready to apply, or why there are none.
type PlannedRotate =
    | { readonly kind: 'planned'; readonly rotates: readonly EntityRotate[]; readonly split: SkipResult }
    | { readonly kind: 'refused'; readonly reason: string };

// Z or X: each selected entity turns by the degrees on screen, clockwise when positive, around the centre
// of its own box as the rotate drag does, or around its origin when it has none. The World and the camera
// are skipped with the skip rule's text, locked entities left out as a nudge leaves them. A run of turns on
// the same selection, each within a second of the one before, joins into one step.
export function rotateSelection(openLevel: OpenLevel, degrees: number): CommandOutcome {
    const { liveEdit, selection } = openLevel;
    if (liveEdit.isActive) return { kind: 'refused', reason: 'Not during a drag' };

    const planned = planRotate(openLevel);
    if (planned.kind === 'refused') return planned;

    const targets = planned.rotates.flatMap((rotate) => rotate.targets);
    if (!liveEdit.begin(targets)) return { kind: 'refused', reason: READ_ONLY_REASON };

    for (const rotate of planned.rotates) {
        rotate.apply(rotate.startRotation + degrees * rotate.screenDirection);
    }
    const label = stepLabel('Rotate', planned.split.allowed);
    liveEdit.commit(label, `rotate:${selection.ids.join(',')}`);

    return { kind: 'done', skipped: planned.split.skipped };
}

// Why Z and X can't turn the selection, or undefined when they can.
export function rotateRefusal(openLevel: OpenLevel) {
    if (openLevel.liveEdit.isActive) return 'Not during a drag';

    const planned = planRotate(openLevel);

    return planned.kind === 'refused' ? planned.reason : undefined;
}

function planRotate(openLevel: OpenLevel): PlannedRotate {
    const { level, selection } = openLevel;
    const split = skipEntities(level, selection.entities, ['world', 'camera']);
    const refusal = skippedRefusal(split, 'rotated');
    if (refusal !== undefined) return { kind: 'refused', reason: refusal };

    const unlocked = split.allowed.filter((entity) => !entity.isLocked);
    if (unlocked.length === 0) return { kind: 'refused', reason: "Locked entities don't rotate" };

    const rotates = unlocked.flatMap((entity) => {
        const centre = ownBox(openLevel, entity)?.centre ?? { x: 0, y: 0 };
        const rotate = EntityRotate.of(openLevel, entity, centre);

        return rotate === undefined ? [] : [rotate];
    });
    if (rotates.length === 0) return { kind: 'refused', reason: 'Nothing here can rotate' };

    return { kind: 'planned', rotates, split: { allowed: unlocked, skipped: split.skipped } };
}
