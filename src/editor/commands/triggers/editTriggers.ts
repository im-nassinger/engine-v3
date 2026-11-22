import { TriggerComponent } from '../../../core/components/index.ts';
import { TriggerFieldType } from '../../../core/fields/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import type { TriggerEdit } from '../../entity-inspector/index.ts';
import type { EditOutcome } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

import { changesToMatch } from '../entity-inspector/componentEdits.ts';
import { problemText } from '../entity-inspector/problemText.ts';

const TRIGGER_TYPE = new TriggerFieldType();

// One edit of an entity's Triggers card as one step, labelled by what changed, such as
// `Change trigger "Touched"`. The list goes through its file form, as every value the Entity inspector
// writes; a list it refuses gives the reason and no step, and an edit that changes nothing makes none.
export function editTriggers(openLevel: OpenLevel, entityId: EntityId, edit: TriggerEdit): EditOutcome {
    const { level, editor } = openLevel;
    const entity = level.requireEntity(entityId);
    const component = entity.requireComponent(TriggerComponent);
    const edited = component.copy();

    const savedTriggers = edit.triggers.map((trigger) => TRIGGER_TYPE.serialize(trigger));
    const written = edited.writeValue('triggers', savedTriggers);
    if (!written.ok) {
        const reason = problemText('Triggers', written.problem);
        return { kind: 'refused', reason };
    }

    const nextWritten = edited.writeValue('nextTriggerId', edit.nextTriggerId);
    if (!nextWritten.ok) throw new Error(`nextTriggerId ${edit.nextTriggerId} was refused.`);

    const changes = changesToMatch({ entity, component }, edited);
    if (changes.length === 0) return { kind: 'done' };

    return editor.edit(edit.label, (transaction) => {
        for (const change of changes) {
            transaction.apply(change);
        }

        return { kind: 'done' };
    });
}
