import type { ComponentTypeName } from '../../../../../core/components/index.ts';
import type { EntityId } from '../../../../../core/level/index.ts';
import { setFieldValue } from '../../../../../editor/commands/index.ts';
import type { FieldModel } from '../../../../../editor/inspector/index.ts';
import type { OpenLevel } from '../../../../../editor/session/index.ts';
import { useEditorSession } from '../../../../EditorContext.tsx';
import { FieldControl } from '../../../../fields/index.ts';
import { Tooltip } from '../../../../shared/index.ts';
import './CardField.css';

export type CardFieldProps = {
    openLevel: OpenLevel;
    typeName: ComponentTypeName;
    entityIds: readonly EntityId[];
    field: FieldModel;
};

// One field's row: its label, whose hover shows the description, and the field type's control. A
// committed value is one step on every shown entity; a refused one gives its reason as status text.
export function CardField({ openLevel, typeName, entityIds, field }: CardFieldProps) {
    const session = useEditorSession();
    const { key, label, description } = field.definition;

    const commit = (value: unknown) => {
        const outcome = setFieldValue(openLevel, entityIds, typeName, key, value);
        if (outcome.kind !== 'refused') return;

        session.status.show(outcome.reason);
    };

    return (
        <div className="card-field" data-key={key} data-enabled={field.isEnabled}>
            <Tooltip label={description} isLong>
                <span className="label">{label}</span>
            </Tooltip>
            <span className="control">
                <FieldControl field={field} onCommit={commit} />
            </span>
        </div>
    );
}
