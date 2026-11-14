import type { FieldType, ParseOutcome, Unit } from '../fields/index.ts';

// A field the Inspector shows that isn't stored, such as Width and Height, read from the shape's own geometry.
export type DerivedFieldDefinition<Values extends object, T> = {
    readonly key: string;
    readonly label: string;
    readonly type: FieldType<T>;
    readonly description: string;
    readonly unit?: Unit;
    read(values: Values): T;
    // Hidden when false: a rectangle has no Points row.
    appliesWhen?(values: Values): boolean;
    // The stored values that change, or a reason it can't be written. No write: the field is read-only.
    write?(values: Values, value: T): ParseOutcome<Partial<Values>>;
};

// Checks a derived field against its own value type, then widens it for the schema's list, which holds
// derived fields of different types. Generic code reaches them only through the field type, which parses
// untrusted values before write sees them.
export function derivedField<Values extends object, T>(definition: DerivedFieldDefinition<Values, T>) {
    return definition as unknown as DerivedFieldDefinition<Values, unknown>;
}
