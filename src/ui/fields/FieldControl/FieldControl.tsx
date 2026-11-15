import type { ComponentType } from 'react';
import type { FieldKind } from '../../../core/fields/index.ts';
import { CheckboxField } from '../CheckboxField/index.ts';
import { ChoiceField } from '../ChoiceField/index.ts';
import { ColourField } from '../ColourField/index.ts';
import type { FieldProps } from '../FieldProps.ts';
import { FillField } from '../FillField/index.ts';
import { NumberField } from '../NumberField/index.ts';
import { ReadOnlyValue } from '../ReadOnlyValue/index.ts';
import { TextField } from '../TextField/index.ts';
import { VectorField } from '../VectorField/index.ts';

// One component per field type. An angle is typed like a number, in degrees. The entity and list fields
// join with the next step; until then their place stays empty.
const FIELD_COMPONENTS: Partial<Record<FieldKind, ComponentType<FieldProps>>> = {
    number: NumberField,
    angle: NumberField,
    text: TextField,
    checkbox: CheckboxField,
    choice: ChoiceField,
    vector: VectorField,
    colour: ColourField,
    fill: FillField,
};

// The control for one field: the field type's component, or the plain value when it is read-only.
export function FieldControl({ field, onCommit, onCommitAxis }: FieldProps) {
    if (field.kind === 'readOnlyRow' || field.isReadOnly) return <ReadOnlyValue field={field} />;

    const Field = FIELD_COMPONENTS[field.definition.type.kind];
    if (Field === undefined) return null;

    return <Field field={field} onCommit={onCommit} onCommitAxis={onCommitAxis} />;
}
