import { Plus } from 'lucide-react';
import { TriggerComponent } from '../../../../../core/components/index.ts';
import type { EntityId } from '../../../../../core/level/index.ts';
import { editTriggers } from '../../../../../editor/commands/index.ts';
import { TriggerCardModel, TriggerEdits } from '../../../../../editor/entity-inspector/index.ts';
import type { CardNote } from '../../../../../editor/entity-inspector/index.ts';
import type { OpenLevel } from '../../../../../editor/session/index.ts';
import { useEditorSession } from '../../../../EditorContext.tsx';
import { Icon } from '../../../../shared/index.ts';
import type { CommitTriggerEdit } from './CommitTriggerEdit.ts';
import { TriggerBlock } from './TriggerBlock/index.ts';
import './TriggerCard.css';

export type TriggerCardProps = {
    openLevel: OpenLevel;
    entityIds: readonly EntityId[];
    // The card's notes; each block shows the ones about its own trigger.
    notes: readonly CardNote[];
};

// The Triggers card's body: one block per trigger, then + Add trigger. Every edit is one step through
// editTriggers; a refused one gives its reason as status text. Triggers are changed one entity at a time.
export function TriggerCard({ openLevel, entityIds, notes }: TriggerCardProps) {
    'use no memo';

    const session = useEditorSession();
    const [entityId] = entityIds;
    if (entityId === undefined || entityIds.length > 1) {
        return (
            <p className="trigger-card" data-several="true">
                Triggers are changed one entity at a time.
            </p>
        );
    }

    const { level, registry } = openLevel;
    const owner = level.requireEntity(entityId);
    const component = owner.requireComponent(TriggerComponent);
    const model = TriggerCardModel.build(component, { owner, level, registry }, notes);

    const commit: CommitTriggerEdit = (makeEdit) => {
        const current = level.requireEntity(entityId).requireComponent(TriggerComponent);
        const edit = makeEdit(current);
        if (edit === undefined) return;

        const outcome = editTriggers(openLevel, entityId, edit);
        if (outcome.kind !== 'refused') return;

        session.status.show(outcome.reason);
    };

    const addTrigger = () => commit((current) => TriggerEdits.added(current));

    return (
        <div className="trigger-card" data-several="false">
            {model.triggers.map((block) => (
                <TriggerBlock key={block.id} openLevel={openLevel} block={block} commit={commit} />
            ))}
            <button type="button" className="add-trigger" onClick={addTrigger}>
                <Icon icon={Plus} size="small" />
                <span>Add trigger</span>
            </button>
        </div>
    );
}
