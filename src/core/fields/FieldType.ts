import type { ValueType } from './ValueType.ts';

// The last four come with v2.
export type FieldKind =
    | 'number'
    | 'text'
    | 'checkbox'
    | 'choice'
    | 'colour'
    | 'vector'
    | 'angle'
    | 'entity'
    | 'asset'
    | 'variable'
    | 'tags'
    | 'list';

export type FieldType<T> = ValueType<T> & {
    readonly kind: FieldKind;
};
