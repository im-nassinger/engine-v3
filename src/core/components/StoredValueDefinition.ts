import type { ValueType } from '../fields/index.ts';

// A value the Inspector never shows, such as a shape's geometry. It is saved under its key's snake_case,
// and readValue and writeValue reach it like a field, so undo, copy and the reader need nothing new.
export type StoredValueDefinition<Values, Key extends keyof Values> = {
    readonly key: Key;
    readonly type: ValueType<Values[Key]>;
    readonly defaultValue: Values[Key];
};
