import type { EntityId } from '../../../core/level/index.ts';
import { EntityChoices } from '../../../editor/entity-inspector/index.ts';
import { useEditorSession } from '../../EditorContext.tsx';
import { useEntityVersion } from '../../hooks/index.ts';
import { MenuButton, useEntityRowDrop } from '../../shared/index.ts';
import type { FieldProps } from '../FieldProps.ts';
import { EntityFieldMenu } from './EntityFieldMenu/index.ts';
import { EntityPickButton } from './EntityPickButton/index.ts';
import './EntityField.css';

// The target's name, None, Mixed or `missing entity`, opening a searchable dropdown of the level's
// entities. A row dropped from the Entities panel, or an entity clicked in the level view after the
// target icon, sets it too. Each is one step.
export function EntityField({ field, subject, onCommit }: FieldProps) {
    // The target's name is read from the same entity object after it is renamed, so the React Compiler
    // must not keep the old one.
    'use no memo';

    const session = useEditorSession();
    const { level } = subject.openLevel;
    const shown = EntityChoices.shown(level, field.value);

    // A rename of the target changes the target, not the entity this card shows, so it redraws on both.
    const targetId = shown.kind === 'entity' ? shown.entityId : 0;
    useEntityVersion(level, targetId);

    const takeEntity = (entityId: EntityId) => {
        const refusal = EntityChoices.refusal(level, subject.entityIds, entityId);
        if (refusal !== undefined) {
            session.status.show(refusal);
            return;
        }

        onCommit(entityId);
    };

    const dropRef = useEntityRowDrop<HTMLSpanElement>(takeEntity);

    const menu = (
        <EntityFieldMenu level={level} ownIds={subject.entityIds} chosenValue={field.value} onChoose={onCommit} />
    );

    return (
        <span className="entity-field" data-shown={shown.kind} ref={dropRef}>
            <MenuButton label={field.definition.label} menu={menu} look="field" isDisabled={!field.isEnabled} hasArrow>
                <span className="chosen">{shown.text}</span>
            </MenuButton>
            <EntityPickButton isDisabled={!field.isEnabled} onPicked={takeEntity} />
        </span>
    );
}
