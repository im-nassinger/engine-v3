import { Plus } from 'lucide-react';
import { useState } from 'react';
import { TriggerComponent } from '../../../../../core/components/index.ts';
import type { EntityId } from '../../../../../core/level/index.ts';
import { editTriggers } from '../../../../../editor/commands/index.ts';
import { TriggerCardModel, TriggerEdits } from '../../../../../editor/entity-inspector/index.ts';
import type { CardNote } from '../../../../../editor/entity-inspector/index.ts';
import type { OpenLevel } from '../../../../../editor/session/index.ts';
import { useEditorSession } from '../../../../EditorContext.tsx';
import { useLengthDisplay } from '../../../../hooks/index.ts';
import { Icon } from '../../../../shared/index.ts';
import type { CommitTriggerEdit } from './CommitTriggerEdit.ts';
import { TriggerBlock } from './TriggerBlock/index.ts';
import { TriggerWindow } from './TriggerWindow/index.ts';
import './TriggerCard.css';

export type TriggerCardProps = {
    openLevel: OpenLevel;
    entityIds: readonly EntityId[];
    // The card's notes; each block shows the ones about its own trigger.
    notes: readonly CardNote[];
};

// The Triggers card's body: one block per trigger, then + Add trigger. Every edit is one step through
// editTriggers; a refused one gives its reason as status text. Triggers are changed one entity at a time.
// A trigger's `…` menu can open it in a wider window over the editor (owner, 2026-11-26), which closes when
// the trigger is gone.
export function TriggerCard({ openLevel, entityIds, notes }: TriggerCardProps) {
    'use no memo';

    const [windowTriggerId, setWindowTriggerId] = useState<number | undefined>(undefined);
    const session = useEditorSession();
    const lengths = useLengthDisplay();
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
    const model = TriggerCardModel.build(component, { owner, level, registry }, notes, lengths);

    const commit: CommitTriggerEdit = (makeEdit) => {
        const current = level.requireEntity(entityId).requireComponent(TriggerComponent);
        const edit = makeEdit(current);
        if (edit === undefined) return;

        const outcome = editTriggers(openLevel, entityId, edit);
        if (outcome.kind !== 'refused') return;

        session.status.show(outcome.reason);
    };

    const addTrigger = () => commit((current) => TriggerEdits.added(current));
    const triggerCount = model.triggers.length;
    const windowBlock = model.triggers.find((block) => block.id === windowTriggerId);
    const closeWindow = () => setWindowTriggerId(undefined);

    return (
        <div className="trigger-card" data-several="false">
            {model.triggers.map((block) => (
                <TriggerBlock
                    key={block.id}
                    openLevel={openLevel}
                    block={block}
                    triggerCount={triggerCount}
                    commit={commit}
                    onOpenWindow={() => setWindowTriggerId(block.id)}
                />
            ))}
            <button type="button" className="add-trigger" onClick={addTrigger}>
                <Icon icon={Plus} size="small" />
                <span>Add trigger</span>
            </button>
            {windowBlock !== undefined && (
                <TriggerWindow onClose={closeWindow}>
                    <TriggerBlock
                        openLevel={openLevel}
                        block={windowBlock}
                        triggerCount={triggerCount}
                        commit={commit}
                    />
                </TriggerWindow>
            )}
        </div>
    );
}
