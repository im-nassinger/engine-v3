import { ShapeComponent, steppedAlong } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';
import type { ValueTarget } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';
import type { CommandOutcome } from '../EditorCommand.ts';
import { skipEntities } from '../shared/skipEntities.ts';
import type { SkipResult } from '../shared/skipEntities.ts';
import { skippedRefusal } from '../shared/skippedRefusal.ts';
import { stepLabel } from '../shared/stepLabel.ts';

export type ResizeAxis = 'x' | 'y';

// The shapes W, A, S and D can resize, or why there are none.
type PlannedResize =
    | { readonly kind: 'planned'; readonly shapes: readonly Entity[]; readonly split: SkipResult }
    | { readonly kind: 'refused'; readonly reason: string };

// W, A, S or D: each selected shape grows by the pixels along its own axis, or shrinks when they are
// negative, changing its ShapeComponent's values and keeping its own centre, never its TransformComponent.
// The World and the camera are skipped with the skip rule's text; entities with no ShapeComponent and
// locked entities are left out, as a nudge leaves locked ones. A shape already at its smallest stays as it
// is. A run of resizes on the same selection, each within a second of the one before, joins into one step.
export function resizeSelection(openLevel: OpenLevel, axis: ResizeAxis, pixels: number): CommandOutcome {
    const { liveEdit, selection } = openLevel;
    if (liveEdit.isActive) return { kind: 'refused', reason: 'Not during a drag' };

    const planned = planResize(openLevel);
    if (planned.kind === 'refused') return planned;

    const resized = planned.shapes.flatMap((entity) => {
        const geometry = steppedAlong(entity.requireComponent(ShapeComponent).get('geometry'), axis, pixels);
        if (geometry === undefined) return [];

        const target: ValueTarget = { entityId: entity.id, schema: ShapeComponent.schema, key: 'geometry' };
        return [{ target, geometry }];
    });
    if (resized.length === 0) {
        const reason = pixels < 0 ? 'Already at its smallest' : 'Nothing here grows that way';
        return { kind: 'refused', reason };
    }

    if (!liveEdit.begin(resized.map((each) => each.target))) return { kind: 'refused', reason: READ_ONLY_REASON };

    for (const { target, geometry } of resized) {
        liveEdit.update(target, geometry);
    }
    liveEdit.commit(stepLabel('Resize', planned.split.allowed), `resize:${selection.ids.join(',')}`);

    return { kind: 'done', skipped: planned.split.skipped };
}

// Why W, A, S and D can't resize the selection, or undefined when they can.
export function resizeRefusal(openLevel: OpenLevel) {
    if (openLevel.liveEdit.isActive) return 'Not during a drag';

    const planned = planResize(openLevel);

    return planned.kind === 'refused' ? planned.reason : undefined;
}

function planResize(openLevel: OpenLevel): PlannedResize {
    const { level, selection } = openLevel;
    const split = skipEntities(level, selection.entities, ['world', 'camera']);
    const refusal = skippedRefusal(split, 'resized');
    if (refusal !== undefined) return { kind: 'refused', reason: refusal };

    const shapes = split.allowed.filter((entity) => entity.getComponent(ShapeComponent) !== undefined);
    if (shapes.length === 0) return { kind: 'refused', reason: 'Only shapes resize with W, A, S and D' };

    const unlocked = shapes.filter((entity) => !entity.isLocked);
    if (unlocked.length === 0) return { kind: 'refused', reason: "Locked entities don't resize" };

    return { kind: 'planned', shapes: unlocked, split: { allowed: unlocked, skipped: split.skipped } };
}
