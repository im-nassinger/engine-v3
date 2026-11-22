import { X } from 'lucide-react';
import {
    CheckboxFieldType,
    ChoiceFieldType,
    MAX_STRING_VARIABLE_LENGTH,
    NumberFieldType,
    startingValueOf,
    TextFieldType,
    variableTypeOf,
} from '../../../../core/fields/index.ts';
import type { FieldType, Variable, VariableType, VariableValue } from '../../../../core/fields/index.ts';
import type { FieldModel } from '../../../../editor/entity-inspector/index.ts';
import { IconButton } from '../../../shared/index.ts';
import { CheckboxField } from '../../CheckboxField/index.ts';
import { ChoiceField } from '../../ChoiceField/index.ts';
import type { FieldProps, FieldSubject } from '../../FieldProps.ts';
import { NumberField } from '../../NumberField/index.ts';
import { TextField } from '../../TextField/index.ts';
import { useFieldTyping } from '../../typing/useFieldTyping.ts';
import './VariableRow.css';

const TYPE_CHOICE = new ChoiceFieldType<VariableType>([
    { value: 'number', label: 'Number' },
    { value: 'string', label: 'String' },
    { value: 'boolean', label: 'Boolean' },
]);

const VALUE_TYPES: Readonly<Record<VariableType, FieldType<VariableValue>>> = {
    number: new NumberFieldType(),
    string: new TextFieldType({ maxLength: MAX_STRING_VARIABLE_LENGTH }),
    boolean: new CheckboxFieldType(),
};

export type VariableRowProps = {
    variable: Variable;
    index: number;
    subject: FieldSubject;
    isEnabled: boolean;
    onRename: (index: number, typedName: string) => void;
    onSetType: (index: number, type: VariableType) => void;
    onSetValue: (index: number, value: VariableValue) => void;
    onRemove: (index: number) => void;
};

// One variable: its name as the row's label, typed in place, its type menu, its starting value (a number
// field, a text field or a switch, by its type) and its ×.
export function VariableRow(props: VariableRowProps) {
    const { variable, index, subject, isEnabled, onRename, onSetType, onSetValue, onRemove } = props;
    const { name } = variable;
    const type = variableTypeOf(variable.value);

    const commitName = (typedName: string) => {
        if (typedName !== name) {
            onRename(index, typedName);
        }

        return true;
    };

    const typing = useFieldTyping({ shownText: name, fullText: name, commit: commitName, onRestore: () => {} });
    const commitType = (chosen: unknown) => onSetType(index, chosen as VariableType);
    const commitValue = (value: unknown) => onSetValue(index, value as VariableValue);
    const ignore = () => {};
    const sharedProps = { subject, onCommitAxis: ignore, onCommitEach: ignore };

    return (
        <div className="variable-row" data-index={index} data-type={type}>
            <input
                {...typing.inputProps}
                className="name"
                aria-label={`Name of ${name}`}
                title={name}
                spellCheck={false}
                disabled={!isEnabled}
            />
            <span className="type">
                <ChoiceField field={typeFieldOf(variable, index, isEnabled)} onCommit={commitType} {...sharedProps} />
            </span>
            <span className="value">
                <VariableValueField
                    field={valueFieldOf(variable, index, isEnabled)}
                    onCommit={commitValue}
                    {...sharedProps}
                />
            </span>
            <IconButton icon={X} label={`Remove ${name}`} look="quiet" onClick={() => onRemove(index)} />
        </div>
    );
}

// The starting value's own field, by the variable's type.
function VariableValueField(props: FieldProps) {
    const type = variableTypeOf(props.field.value as VariableValue);
    if (type === 'string') return <TextField {...props} />;
    if (type === 'boolean') return <CheckboxField {...props} />;

    return <NumberField {...props} />;
}

// The type menu as a field of its own, so its button reads "Type of coins".
function typeFieldOf(variable: Variable, index: number, isEnabled: boolean): FieldModel {
    const definition = {
        key: `variables.${index}.type`,
        label: `Type of ${variable.name}`,
        type: TYPE_CHOICE,
        defaultValue: 'number',
        changeableInPlay: false,
    };

    return { kind: 'field', definition, value: variableTypeOf(variable.value), isEnabled, isReadOnly: false };
}

// The starting value as a field of its own, named after the variable, so its box reads "coins".
function valueFieldOf(variable: Variable, index: number, isEnabled: boolean): FieldModel {
    const type = variableTypeOf(variable.value);
    const definition = {
        key: `variables.${index}.value`,
        label: variable.name,
        type: VALUE_TYPES[type],
        defaultValue: startingValueOf(type),
        changeableInPlay: true,
        placeholder: type === 'string' ? 'Text' : undefined,
    };

    return { kind: 'field', definition, value: variable.value, isEnabled, isReadOnly: false };
}
