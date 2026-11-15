import type { ComponentType } from 'react';
import type { FieldKind } from '../../../core/fields/index.ts';
import { CheckboxField } from '../CheckboxField/index.ts';
import { ChoiceField } from '../ChoiceField/index.ts';
import type { FieldProps } from '../FieldProps.ts';
import { NumberField } from '../NumberField/index.ts';
import { ReadOnlyValue } from '../ReadOnlyValue/index.ts';
import { TextField } from '../TextField/index.ts';

// One component per field type. An angle is typed like a number, in degrees. The vector, colour, fill,
// entity and list fields join with the next steps; until then their place stays empty.
const FIELD_COMPONENTS: Partial<Record<FieldKind, ComponentType<FieldProps>>> = {
    number: NumberField,
    angle: NumberField,
    text: TextField,
    checkbox: CheckboxField,
    choice: ChoiceField,
};

// The control for one field: the field type's component, or the plain value when it is read-only.
export function FieldControl({ field, onCommit }: FieldProps) {
    if (field.kind === 'readOnlyRow' || field.isReadOnly) return <ReadOnlyValue field={field} />;

    const Field = FIELD_COMPONENTS[field.definition.type.kind];
    if (Field === undefined) return null;

    return <Field field={field} onCommit={onCommit} />;
}
