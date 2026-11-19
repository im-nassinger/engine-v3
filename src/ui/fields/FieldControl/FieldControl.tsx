import { ITEM_FIELD_COMPONENTS } from '../fieldComponents.ts';
import type { FieldProps } from '../FieldProps.ts';
import { ListField } from '../ListField/index.ts';
import { ReadOnlyValue } from '../ReadOnlyValue/index.ts';

// The control for one field: the field type's component, or the plain value when it is read-only.
export function FieldControl(props: FieldProps) {
    const { field } = props;
    if (field.isReadOnly) return <ReadOnlyValue field={field} />;

    const kind = field.definition.type.kind;
    if (kind === 'list') return <ListField {...props} />;

    const Field = ITEM_FIELD_COMPONENTS[kind];
    if (Field === undefined) return null;

    return <Field {...props} />;
}
