import type { Input } from '../../../core/fields/index.ts';
import type { KeyCode } from '../../../core/triggers/index.ts';
import { InputEdits, MIXED } from '../../../editor/entity-inspector/index.ts';
import { AddRow } from '../../shared/index.ts';
import type { FieldProps } from '../FieldProps.ts';
import { InputRow } from './InputRow/index.ts';
import './InputsField.css';

// The Inputs card's rows: one InputRow per input, then Add input. A rename, new keys, a remove and an add
// are each one step; a name already taken or with nothing left is refused with its reason as status text.
export function InputsField({ field, onCommit }: FieldProps) {
    if (field.value === MIXED) {
        return (
            <span className="inputs-field" data-mixed="true">
                Mixed
            </span>
        );
    }

    const inputs = field.value as readonly Input[];

    const rename = (index: number, typedName: string) => onCommit(InputEdits.renamed(inputs, index, typedName));
    const setKeys = (index: number, keys: readonly KeyCode[]) => onCommit(InputEdits.withKeys(inputs, index, keys));
    const remove = (index: number) => onCommit(InputEdits.without(inputs, index));
    const add = () => onCommit(InputEdits.withNewInput(inputs));

    const rowProps = { isEnabled: field.isEnabled, onRename: rename, onSetKeys: setKeys, onRemove: remove };

    return (
        <div className="inputs-field" data-mixed="false">
            {inputs.map((input, index) => (
                <InputRow key={index} input={input} index={index} {...rowProps} />
            ))}
            <AddRow label="Add input" isDisabled={!field.isEnabled} onAdd={add} />
        </div>
    );
}
