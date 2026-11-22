import type { EntityId } from './EntityId.ts';
import type { ValueType } from './ValueType.ts';

// 'fill' is the StyleComponent's fill: a colour that can be emptied in v1, with gradients from v2.
// 'pathPoint' is one point of a path, with its curve handles and corner, from v2.
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
    | 'pathPoint'
    | 'asset'
    | 'variable'
    | 'tags'
    | 'input'
    | 'trigger'
    | 'list';

// Where a saved value links to entities. Copying and pasting rewires them, and the missing-entity rule reads
// them, without either knowing the value's shape.
export type EntityLinkMapper = (id: EntityId) => EntityId;

export type FieldType<T> = ValueType<T> & {
    readonly kind: FieldKind;
    // The saved value with each entity link it holds replaced by linkTo's. The data is untrusted: anything
    // not shaped as a link is copied as it is. Only a type whose values can link to entities has it.
    mapEntities?(raw: unknown, linkTo: EntityLinkMapper): unknown;
};
