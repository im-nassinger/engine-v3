import { ListFieldType } from '../../../core/fields/index.ts';
import type { FieldKind } from '../../../core/fields/index.ts';
import { InputsField } from '../InputsField/index.ts';
import { ITEM_FIELD_COMPONENTS } from '../fieldComponents.ts';
import type { FieldProps } from '../FieldProps.ts';
import { ListField } from '../ListField/index.ts';
import { PathPointsField } from '../PathPointsField/index.ts';
import { ReadOnlyValue } from '../ReadOnlyValue/index.ts';
import { VariablesField } from '../VariablesField/index.ts';

// The control for one field: the field type's component, or the plain value when it is read-only. A list
// of path points has rows of its own, as the design draws a path's Points, and so have the lists of
// variables and of inputs.
export function FieldControl(props: FieldProps) {
    const { field } = props;
    if (field.isReadOnly) return <ReadOnlyValue field={field} />;

    const kind = field.definition.type.kind;
    if (isPathPointList(field)) return <PathPointsField {...props} />;
    if (isListOf(field, 'input')) return <InputsField {...props} />;
    if (isListOf(field, 'variable')) return <VariablesField {...props} />;
    if (kind === 'list') return <ListField {...props} />;

    const Field = ITEM_FIELD_COMPONENTS[kind];
    if (Field === undefined) return null;

    return <Field {...props} />;
}

function isPathPointList(field: FieldProps['field']) {
    return isListOf(field, 'pathPoint');
}

function isListOf(field: FieldProps['field'], itemKind: FieldKind) {
    const type = field.definition.type;
    if (!(type instanceof ListFieldType)) return false;

    return type.itemType.kind === itemKind;
}
