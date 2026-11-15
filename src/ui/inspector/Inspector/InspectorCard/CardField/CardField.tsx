import type { ComponentTypeName } from '../../../../../core/components/index.ts';
import type { EntityId } from '../../../../../core/level/index.ts';
import type { EditOutcome } from '../../../../../editor/history/index.ts';
import { setFieldValue, setVectorAxis } from '../../../../../editor/commands/index.ts';
import type { Axis } from '../../../../../editor/commands/index.ts';
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

    const showRefusal = (outcome: EditOutcome) => {
        if (outcome.kind !== 'refused') return;

        session.status.show(outcome.reason);
    };

    const commit = (value: unknown) => {
        const outcome = setFieldValue(openLevel, entityIds, typeName, key, value);
        showRefusal(outcome);
    };

    const commitAxis = (axis: Axis, value: number) => {
        const outcome = setVectorAxis(openLevel, entityIds, typeName, key, axis, value);
        showRefusal(outcome);
    };

    const subject = { openLevel, typeName, entityIds };

    return (
        <div className="card-field" data-key={key} data-enabled={field.isEnabled}>
            <Tooltip label={description} isLong>
                <span className="label">{label}</span>
            </Tooltip>
            <span className="control">
                <FieldControl field={field} subject={subject} onCommit={commit} onCommitAxis={commitAxis} />
            </span>
        </div>
    );
}
