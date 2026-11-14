import type { ValueType } from './ValueType.ts';

// 'fill' is the StyleComponent's fill: a colour that can be emptied in v1, with gradients from v2.
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
    | 'fill'
    | 'asset'
    | 'variable'
    | 'tags'
    | 'list';

export type FieldType<T> = ValueType<T> & {
    readonly kind: FieldKind;
};
