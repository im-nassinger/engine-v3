import { useEffect, useRef } from 'react';
import type { ComponentTypeName } from '../../../../../core/components/index.ts';
import type { EntityId } from '../../../../../core/level/index.ts';
import type { EditOutcome } from '../../../../../editor/history/index.ts';
import { FieldSlide, setFieldValue, setVectorAxis } from '../../../../../editor/commands/index.ts';
import type { Axis } from '../../../../../editor/commands/index.ts';
import type { FieldModel } from '../../../../../editor/entity-inspector/index.ts';
import type { OpenLevel } from '../../../../../editor/session/index.ts';
import { useEditorSession } from '../../../../EditorContext.tsx';
import { FieldControl } from '../../../../fields/index.ts';
import type { FieldSlideHandlers } from '../../../../fields/index.ts';
import { Tooltip } from '../../../../shared/index.ts';
import './CardField.css';

export type CardFieldProps = {
    openLevel: OpenLevel;
    typeName: ComponentTypeName;
    entityIds: readonly EntityId[];
    field: FieldModel;
};

// One field's row: its label, whose hover shows the description if it has one, and the field type's control. A
// committed value is one step on every shown entity; a refused one gives its reason as status text. A
// slider changes the level while dragged and makes its one step when let go.
export function CardField({ openLevel, typeName, entityIds, field }: CardFieldProps) {
    const session = useEditorSession();
    const { key, label, description } = field.definition;
    // The drag in progress, begun by the slider's first move.
    const slideRef = useRef<FieldSlide | undefined>(undefined);

    useEffect(() => {
        return () => slideRef.current?.cancel();
    }, []);

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

    const startedSlide = () => {
        if (slideRef.current === undefined) {
            slideRef.current = new FieldSlide({ openLevel, entityIds, componentType: typeName, key });
        }

        return slideRef.current;
    };

    const slide: FieldSlideHandlers = {
        slideTo: (value) => startedSlide().slideTo(value),
        release: (value) => {
            const outcome = startedSlide().release(value);
            slideRef.current = undefined;
            showRefusal(outcome);
        },
    };

    const subject = { openLevel, typeName, entityIds };
    const labelText = <span className="label">{label}</span>;

    return (
        <div className="card-field" data-key={key} data-enabled={field.isEnabled}>
            {description === undefined ? (
                labelText
            ) : (
                <Tooltip label={description} isLong>
                    {labelText}
                </Tooltip>
            )}
            <span className="control">
                <FieldControl
                    field={field}
                    subject={subject}
                    onCommit={commit}
                    onCommitAxis={commitAxis}
                    slide={slide}
                />
            </span>
        </div>
    );
}
