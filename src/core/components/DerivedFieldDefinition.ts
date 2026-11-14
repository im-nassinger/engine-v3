import type { FieldType, Unit } from '../fields/index.ts';

// A field the Inspector shows that isn't stored, such as Width and Height, read from the shape's own geometry.
export type DerivedFieldDefinition<Values extends object, T> = {
    readonly key: string;
    readonly label: string;
    readonly type: FieldType<T>;
    readonly description: string;
    readonly unit?: Unit;
    read(values: Values): T;
    // No write: the field is read-only.
    write?(values: Values, value: T): Values;
};
