import type { FieldType } from './FieldType.ts';
import type { Unit } from './Unit.ts';

export type FieldDefinition<Values, Key extends keyof Values> = {
    // The camelCase of the label, such as linearDamping. The Lua attribute and the file key are its snake_case.
    readonly key: Key;
    readonly label: string;
    readonly type: FieldType<Values[Key]>;
    readonly defaultValue: Values[Key];
    // Shown when hovering the label.
    readonly description: string;
    readonly unit?: Unit;
    // Opacity is stored 0 to 1 and shown 0 to 100 %.
    readonly displayScale?: number;
    // Decimals shown, 2 when not given.
    readonly precision?: number;
    // What Lua and Change value may set.
    readonly changeableInPlay: boolean;
    // Greyed when false, with the value kept.
    readonly appliesWhen?: (values: Values) => boolean;
};
