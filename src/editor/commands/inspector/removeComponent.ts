import type { ComponentTypeName } from '../../../core/components/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import { RemoveComponentChange } from '../../history/index.ts';
import type { EditOutcome } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

import { holdersOf } from './componentEdits.ts';

// Remove on a card: only that component, from every given entity that has it, as one step labelled
// "Remove BodyComponent". Its partners stay and show their notes. Whether it may be removed is the
// Inspector's rule, given with its reason before this is called.
export function removeComponent(
    openLevel: OpenLevel,
    entityIds: readonly EntityId[],
    componentType: ComponentTypeName,
): EditOutcome {
    const { level, editor } = openLevel;
    const holders = holdersOf(level, entityIds, componentType);
    if (holders.length === 0) return { kind: 'done' };

    const changes = holders.map(
        (held) => new RemoveComponentChange({ entityId: held.entity.id, component: held.component }),
    );

    return editor.edit(`Remove ${componentType}`, (transaction) => {
        for (const change of changes) {
            transaction.apply(change);
        }

        return { kind: 'done' };
    });
}
