import { ListFieldType } from '../../../core/fields/index.ts';
import { ITEM_FIELD_COMPONENTS } from '../fieldComponents.ts';
import type { FieldProps } from '../FieldProps.ts';
import { ListField } from '../ListField/index.ts';
import { PathPointsField } from '../PathPointsField/index.ts';
import { ReadOnlyValue } from '../ReadOnlyValue/index.ts';

// The control for one field: the field type's component, or the plain value when it is read-only. A list
// of path points has rows of its own, as the design draws a path's Points.
export function FieldControl(props: FieldProps) {
    const { field } = props;
    if (field.isReadOnly) return <ReadOnlyValue field={field} />;

    const kind = field.definition.type.kind;
    if (isPathPointList(field)) return <PathPointsField {...props} />;
    if (kind === 'list') return <ListField {...props} />;

    const Field = ITEM_FIELD_COMPONENTS[kind];
    if (Field === undefined) return null;

    return <Field {...props} />;
}

function isPathPointList(field: FieldProps['field']) {
    const type = field.definition.type;
    if (!(type instanceof ListFieldType)) return false;

    return type.itemType.kind === 'pathPoint';
}
