import type { Entity } from '../../../core/level/index.ts';
import { RemoveEntitiesChange } from '../../history/index.ts';
import type { EditOutcome, SkippedEntity } from '../../history/index.ts';
import type { EditorSession } from '../../session/index.ts';

import { attachedJoints } from './attachedJoints.ts';

// Delete's rule, shared with Cut: removes the entities with everything inside them and every joint attached
// to them, in one step, leaving nothing selected. Each change reads its entity's place just before it is
// removed, so undo puts them back in order.
export function removeEntities(
    session: EditorSession,
    label: string,
    entities: readonly Entity[],
    skipped: readonly SkippedEntity[],
): EditOutcome {
    const { level, editor } = session.openLevel;
    const joints = attachedJoints(level, entities);
    const roots = [...entities, ...joints];

    return editor.edit(label, (transaction) => {
        for (const root of roots) {
            const change = RemoveEntitiesChange.ofEntity(session.reader, root);
            transaction.apply(change);
        }

        return { kind: 'done', selectAfter: [], skipped };
    });
}
