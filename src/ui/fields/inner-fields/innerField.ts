import type { AnyFieldDefinition } from '../../../core/components/index.ts';
import type { FieldType, Unit } from '../../../core/fields/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { FieldModel } from '../../../editor/entity-inspector/index.ts';
import type { FieldProps, FieldSubject } from '../FieldProps.ts';

export type InnerFieldOptions = {
    readonly key: string;
    readonly label: string;
    readonly type: FieldType<unknown>;
    readonly unit?: Unit;
    readonly displayScale?: number;
    readonly precision?: number;
};

// A part of a field shown with another field's control, such as a gradient stop's Place with the number
// field's slider or a path point's Handle in with the vector's: a field of its own, named after the part,
// greyed when its field is.
export function innerFieldOf(field: FieldModel, options: InnerFieldOptions, value: unknown): FieldModel {
    const { key, ...shown } = options;
    const definition: AnyFieldDefinition = {
        ...shown,
        key: `${field.definition.key}.${key}`,
        defaultValue: value,
        changeableInPlay: false,
    };

    return { kind: 'field', definition, value, isEnabled: field.isEnabled, isReadOnly: false };
}

// The props for a part's control, whose every commit becomes the part's new value. A vector's box keeps
// the part's other axis.
export function innerPropsOf(subject: FieldSubject, field: FieldModel, onCommit: (value: unknown) => void): FieldProps {
    return {
        field,
        subject,
        onCommit,
        onCommitAxis: (axis, value) => onCommit({ ...(field.value as Point), [axis]: value }),
        onCommitEach: (valueFor) => onCommit(valueFor(field.value)),
    };
}
