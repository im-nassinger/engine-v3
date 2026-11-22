import { X } from 'lucide-react';
import { NumberFieldType } from '../../../../core/fields/index.ts';
import type { Variable } from '../../../../core/fields/index.ts';
import type { FieldModel } from '../../../../editor/entity-inspector/index.ts';
import { IconButton } from '../../../shared/index.ts';
import type { FieldSubject } from '../../FieldProps.ts';
import { NumberField } from '../../NumberField/index.ts';
import { useFieldTyping } from '../../typing/useFieldTyping.ts';
import './VariableRow.css';

const STARTING_VALUE_TYPE = new NumberFieldType();

export type VariableRowProps = {
    variable: Variable;
    index: number;
    subject: FieldSubject;
    isEnabled: boolean;
    onRename: (index: number, typedName: string) => void;
    onSetValue: (index: number, value: number) => void;
    onRemove: (index: number) => void;
};

// One variable: its name as the row's label, typed in place, its starting number, and its ×.
export function VariableRow({ variable, index, subject, isEnabled, onRename, onSetValue, onRemove }: VariableRowProps) {
    const { name } = variable;

    const commitName = (typedName: string) => {
        if (typedName !== name) {
            onRename(index, typedName);
        }

        return true;
    };

    const typing = useFieldTyping({ shownText: name, fullText: name, commit: commitName, onRestore: () => {} });
    const commitValue = (value: unknown) => onSetValue(index, value as number);
    const ignore = () => {};

    return (
        <div className="variable-row" data-index={index}>
            <input
                {...typing.inputProps}
                className="name"
                aria-label={`Name of ${name}`}
                spellCheck={false}
                disabled={!isEnabled}
            />
            <span className="value">
                <NumberField
                    field={valueFieldOf(variable, index, isEnabled)}
                    subject={subject}
                    onCommit={commitValue}
                    onCommitAxis={ignore}
                    onCommitEach={ignore}
                />
            </span>
            <IconButton icon={X} label={`Remove ${name}`} look="quiet" onClick={() => onRemove(index)} />
        </div>
    );
}

// The starting number as a field of its own, named after the variable, so its box reads "coins".
function valueFieldOf(variable: Variable, index: number, isEnabled: boolean): FieldModel {
    const definition = {
        key: `variables.${index}.value`,
        label: variable.name,
        type: STARTING_VALUE_TYPE,
        defaultValue: 0,
        changeableInPlay: true,
    };

    return { kind: 'field', definition, value: variable.value, isEnabled, isReadOnly: false };
}
