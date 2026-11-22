import type { Variable } from '../../../core/fields/index.ts';
import { MIXED, VariableEdits } from '../../../editor/entity-inspector/index.ts';
import { AddRow } from '../../shared/index.ts';
import type { FieldProps } from '../FieldProps.ts';
import { VariableRow } from './VariableRow/index.ts';
import './VariablesField.css';

// The Variables card's rows: one VariableRow per variable, then Add variable. A rename, a new starting
// number, a remove and an add are each one step; a name already taken or with nothing left is refused
// with its reason as status text.
export function VariablesField({ field, subject, onCommit }: FieldProps) {
    if (field.value === MIXED) {
        return (
            <span className="variables-field" data-mixed="true">
                Mixed
            </span>
        );
    }

    const variables = field.value as readonly Variable[];

    const rename = (index: number, typedName: string) => onCommit(VariableEdits.renamed(variables, index, typedName));
    const setValue = (index: number, value: number) => onCommit(VariableEdits.withValue(variables, index, value));
    const remove = (index: number) => onCommit(VariableEdits.without(variables, index));
    const add = () => onCommit(VariableEdits.withNewVariable(variables));

    const rowProps = { subject, isEnabled: field.isEnabled, onRename: rename, onSetValue: setValue, onRemove: remove };

    return (
        <div className="variables-field" data-mixed="false">
            {variables.map((variable, index) => (
                <VariableRow key={index} variable={variable} index={index} {...rowProps} />
            ))}
            <AddRow label="Add variable" isDisabled={!field.isEnabled} onAdd={add} />
        </div>
    );
}
