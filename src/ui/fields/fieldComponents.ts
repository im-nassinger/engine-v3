import type { ComponentType } from 'react';
import type { FieldKind } from '../../core/fields/index.ts';
import { CheckboxField } from './CheckboxField/index.ts';
import { ChoiceField } from './ChoiceField/index.ts';
import { ColourField } from './ColourField/index.ts';
import { EntityField } from './EntityField/index.ts';
import type { FieldProps } from './FieldProps.ts';
import { FillField } from './FillField/index.ts';
import { NumberField } from './NumberField/index.ts';
import { TextField } from './TextField/index.ts';
import { VectorField } from './VectorField/index.ts';

// One component per field type but the list, which shows each of its items with one of these. An
// angle is typed like a number, in degrees. v1 has no list of lists.
export const ITEM_FIELD_COMPONENTS: Partial<Record<FieldKind, ComponentType<FieldProps>>> = {
    number: NumberField,
    angle: NumberField,
    text: TextField,
    checkbox: CheckboxField,
    choice: ChoiceField,
    vector: VectorField,
    colour: ColourField,
    fill: FillField,
    entity: EntityField,
};
