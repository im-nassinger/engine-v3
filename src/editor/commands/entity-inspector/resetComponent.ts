import type { ComponentTypeName } from '../../../core/components/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import type { EditOutcome, SetValueChange } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

import { changesToMatch, holdersOf } from './componentEdits.ts';

// Reset to defaults: the fields, not the stored values, so a shape keeps its geometry. One step labelled
// "Reset BodyComponent" over every given entity that has it; fields already at their defaults make none.
export function resetComponent(
    openLevel: OpenLevel,
    entityIds: readonly EntityId[],
    componentType: ComponentTypeName,
): EditOutcome {
    const { level, editor } = openLevel;
    const holders = holdersOf(level, entityIds, componentType);
    const firstHolder = holders[0];
    if (firstHolder === undefined) return { kind: 'done' };

    const hasFields = firstHolder.component.schema.fields.length > 0;
    if (!hasFields) return { kind: 'refused', reason: 'Nothing to reset' };

    const changes: SetValueChange[] = [];
    for (const held of holders) {
        const edited = held.component.copy();
        edited.resetToDefaults();
        const resetChanges = changesToMatch(held, edited);
        changes.push(...resetChanges);
    }

    if (changes.length === 0) return { kind: 'done' };

    return editor.edit(`Reset ${componentType}`, (transaction) => {
        for (const change of changes) {
            transaction.apply(change);
        }

        return { kind: 'done' };
    });
}
