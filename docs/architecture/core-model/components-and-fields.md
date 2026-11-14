# Components and fields

## TL;DR

**Each component type declares its fields once, in a `ComponentSchema`** (owner, 2026-11-13). A field names its **field type** (one class per type in the fixed list: number, text, checkbox, choice, colour, vector, angle, entity, and from v2 asset, variable, tags, list), its label, default, unit, range, description, and whether it can change during play. From that one list the Inspector draws the card, the file stores and checks the values, undo records them, copy clones them, and in v2 Lua's `get_attribute` and `set_attribute` and the trigger's Change value find them. A component class holds a typed values record and adds no logic of its own beyond what its values need. Component class names end in `Component`.

## Value types and field types

A **value type** knows how to check, store and compare one kind of value. A **field type** is a value type the Inspector can show. Both are classes, one per kind.

```typescript
export type ParseOutcome<T> = { ok: true; value: T } | { ok: false; problem: string };

export type ValueType<T> = {
    parse(raw: unknown): ParseOutcome<T>;   // untrusted data: a file, the clipboard, a script
    serialize(value: T): JsonValue;
    normalize(value: T): T;                 // clamp to the range, round whole numbers
    clone(value: T): T;
    equals(first: T, second: T): boolean;
};

export type FieldKind =
    | 'number' | 'text' | 'checkbox' | 'choice' | 'colour' | 'vector' | 'angle' | 'entity'
    | 'asset' | 'variable' | 'tags' | 'list';          // the last four come with v2

export type FieldType<T> = ValueType<T> & {
    readonly kind: FieldKind;
};
```

| Field type class | Value | Options | v1 uses it for |
|---|---|---|---|
| `NumberFieldType` | `number` | `min`, `max`, `wholeNumber` | Densities, dampings, sizes, speeds |
| `TextFieldType` | `string` | `maxLength`, `trimmed` | The name (64 characters) |
| `CheckboxFieldType` | `boolean` | | Sensor, Bullet, Motor |
| `ChoiceFieldType<T extends string>` | one of a union | the options and their labels | Body type, joint type, gravity direction |
| `ColourFieldType` | `#RRGGBBAA` text | `canBeEmpty` | Outline colour; the fill in v1 |
| `VectorFieldType` | `{ x, y }` | `min`, `max`, `refuseZero` | Position, scale (scale can't be 0) |
| `AngleFieldType` | degrees | `min`, `max` | Rotation, hinge limits |
| `EntityFieldType` | `EntityId \| null` | | Joint A and B, the camera's follow target |

- **The fixed list is v1, but each field type is built when the first component needs it.** v1 builds the eight above. Asset, variable, tags and list come with the v2 components that use them, and the fill field type comes with gradients (owner, 2026-11-13).
- **The fill in v1** (owner, 2026-11-13): the StyleComponent's fill uses `SolidFillFieldType`, which the Inspector shows as a colour field that can be emptied, but whose value is already the tagged value `{ kind: 'none' } | { kind: 'solid', colour }`. In v2 it is replaced by `FillFieldType` (kind `'fill'`) with the same stored shape plus gradients, and in v3 images. Saved levels never change.
- **An entity field is stored as `{ "entity": 12 }`**, not a bare number, so a later "follow by tag" (open question 15) can store `{ "tag": "player" }` beside it without changing saved levels.
- Internal value types, never shown as fields, use the same `ValueType` contract: `ShapeGeometryValue`, `PathGeometryValue`, `JointEndsValue`.

## Field definitions

```typescript
export type Unit = 'px' | '°' | '%' | 'px/s' | '°/s' | 's' | 'kg' | 'm/s²' | 'per s';

export type FieldDefinition<Values, Key extends keyof Values> = {
    readonly key: Key;                       // camelCase of the label: linearDamping
    readonly label: string;                  // "Linear damping". The Lua attribute is its snake_case
    readonly type: FieldType<Values[Key]>;
    readonly defaultValue: Values[Key];
    readonly description: string;            // shown when hovering the label
    readonly unit?: Unit;
    readonly displayScale?: number;          // opacity is stored 0 to 1 and shown 0 to 100 %
    readonly precision?: number;             // decimals shown, 2 when not given
    readonly changeableInPlay: boolean;      // what Lua and Change value may set
    readonly appliesWhen?: (values: Values) => boolean;   // greyed when false, value kept
};

export type DerivedFieldDefinition<T> = {
    readonly key: string;
    readonly label: string;
    readonly type: FieldType<T>;
    readonly description: string;
    readonly unit?: Unit;
    read(entity: Entity): T;                 // Mass reads the body's merged shapes
    write?(entity: Entity, value: T): void;  // Width and Height rescale the points. No write: read-only
};
```

- **The tech notes' field metadata** (unit, display scale, precision, slider range, description, menu section) is all here. The slider shows when the field type has both a `min` and a `max`, as the requirement says. The menu section belongs to the component, below.
- **The attribute name is the label in snake_case**, as the Lua API rules say: "Linear damping" is `linear_damping`. It is also the key in `level.json`, so the file, Lua and the Inspector use one name.
- **A test checks every schema**: each key is the camelCase of its label, no two attributes in a component clash, and each default sits in its range. Because the file key comes from the label, renaming a label makes this test fail, which forces a conscious choice: Lua's API never changes once shipped.

## ComponentSchema and Component

```typescript
export type PartnerRule = {
    readonly partner: ComponentTypeName;              // 'ShapeComponent'
    readonly isMissing: (entity: Entity) => boolean;
    readonly noteText: string;                        // "Needs a ShapeComponent to draw anything."
};

export class ComponentSchema<Values extends object> {
    readonly typeName: ComponentTypeName;             // 'BodyComponent'
    readonly cardOrder: number;                       // the fixed order of cards
    readonly hasCard: boolean;                        // false for NameComponent: the header edits it
    readonly addMenuSection: string;                  // 'Physics'
    readonly addableByHand: boolean;                  // false for TransformComponent, CameraComponent, the World's
    readonly fields: readonly FieldDefinition<Values, keyof Values>[];
    readonly derivedFields: readonly DerivedFieldDefinition<unknown>[];
    readonly storedValues: readonly StoredValueDefinition<Values, keyof Values>[];  // not shown
    readonly partners: readonly PartnerRule[];

    defaults(): Values;
    findField(key: string): FieldDefinition<Values, keyof Values> | undefined;
    findFieldByAttribute(attribute: string): FieldDefinition<Values, keyof Values> | undefined;
}

export abstract class Component<Values extends object = object> {
    readonly schema: ComponentSchema<Values>;
    private values: Values;
    private owner: Entity | undefined;                // set when added to an entity

    protected constructor(schema: ComponentSchema<Values>, values: Values);

    get<Key extends keyof Values>(key: Key): Values[Key];
    set<Key extends keyof Values>(key: Key, value: Values[Key]): Values[Key];  // normalizes, signals if changed

    readValue(key: string): unknown;                  // by key, for generic code: the Inspector, undo
    writeValue(key: string, raw: unknown): ParseOutcome<unknown>;  // parsed through the field type

    copy(): Component<Values>;
    resetToDefaults(): void;
}

export type ComponentClass<T extends Component> = {
    readonly schema: ComponentSchema<object>;
    new (values?: never): T;
};
```

- Code that knows the component uses the typed `get` and `set` (`body.get('gravityScale')`). Generic code (the Inspector, undo, the reader, Lua) uses `readValue` and `writeValue` by key, which go through the same field type.
- `set` returns the value actually stored, after clamping, so the Inspector can show "Max is 1500" when it differs from what was typed.
- **Partner notes come from the schema** (Q5 and Q6, owner 2026-11-13): a component lists the partners it needs and when they are missing. The editor's `MissingPartnerRule` turns them into editor messages with an [Add ...] button. Removing a component removes only that one, so the cards left behind show their notes.
- **Every note reads "Needs a X to Y. [Add X]"** (owner, 2026-11-13), with Y written per partner in the schema: "to draw anything" for a StyleComponent, "to collide" for a SurfaceComponent and a BodyComponent.

A component class is short. Example:

```typescript
export type BodyType = 'static' | 'dynamic' | 'kinematic';

export type BodyValues = {
    type: BodyType;
    gravityScale: number;
    linearDamping: number;
    angularDamping: number;
    fixedRotation: boolean;
    bullet: boolean;
    merge: boolean;
};

export class BodyComponent extends Component<BodyValues> {
    static readonly schema = bodySchema;              // declared in bodySchema.ts

    constructor(values: BodyValues = bodySchema.defaults()) {
        super(bodySchema, values);
    }
}
```

## The registry

```typescript
export class ComponentRegistry {
    register(componentClass: ComponentClass<Component>): void;
    find(typeName: string): ComponentClass<Component> | undefined;
    inCardOrder(): readonly ComponentClass<Component>[];
    addableTo(entity: Entity): readonly ComponentClass<Component>[];   // the Add Component menu
    indexOf(typeName: string): number;                                 // fixed, for component ids in Lua
}

export function createV1Registry(): ComponentRegistry;
```

- The reader finds a component by its type name in the file, the Add Component menu lists what the entity lacks, and v2 registers its components into the same registry. Nothing else changes when a component type is added.

## The v1 components

| Component | Card | Fields (label: type, range, default) | Stored, not shown | Partners |
|---|---|---|---|---|
| TransformComponent | 1 | Position: vector px. Rotation: angle °. Scale: vector, not 0, (1, 1). Skew: angle ° | | |
| NameComponent | none | Name: text, 1 to 64, trimmed, filled automatically | | |
| ShapeComponent | 2 | Kind: choice, read-only. Width, Height: derived px, at least 1. Points: derived, read-only | The geometry: rectangle and ellipse sizes, or polygon and line points (up to 1,000) | |
| PathComponent | 3 | Points: derived, read-only. v1 only has the read-only path a Rope or Spring keeps | The path's points and handles | |
| StyleComponent | 5 | Fill: colour that can be emptied, `#4A90D9`. Outline colour: colour, `#1F3552`. Outline width: number px, 0 to 200, 2. Opacity: number, 0 to 1 shown as %, 1 | | ShapeComponent or PathComponent: "Needs a ShapeComponent to draw anything." |
| BodyComponent | 6 | Type: choice. Gravity scale, Linear damping, Angular damping, Fixed rotation, Bullet: as in [bodies](../../requirements/physics/bodies.md). Merge: checkbox, on. Mass: derived kg, read-only | | SurfaceComponent, only when the entity has a ShapeComponent and no SurfaceComponent |
| SurfaceComponent | 7 | Density 0 to 100, 1. Friction 0 to 5, 0.3. Restitution 0 to 2, 0. Sensor: checkbox | | ShapeComponent |
| JointComponent | 8 | Type: choice Hinge, Rope, Spring. A, B: entity. Let connected objects collide. Hinge: Limit rotation, Min angle, Max angle, Motor, Motor speed, Motor strength, Resistance. Rope: Match drawn distance, Length. Spring: Match drawn distance, Rest length, Stiffness, Damping. Ranges and defaults as in [joints](../../requirements/physics/joints.md) | The two ends, in the joint's own space | |
| CameraComponent | 9 | Width, Height: number px, 1920 × 1080. Follow: entity. Smoothing: number s | Mode, `fixedSize` until v3 | |
| PhysicsWorldComponent | World | Gravity strength: number m/s², 0 to 100, 9.8. Gravity direction: choice Down, Up, Left, Right, Custom. Gravity angle: angle, applies when Custom. Walls: checkbox, off (all four edges of the level bounds walls, or all open) | | |

- Every setting of every joint type is stored, whatever the current type, so switching type in v3 keeps them, as the joints rules ask.
- **Merge** is a checkbox on the BodyComponent, on by default (owner, 2026-11-13).
- **The TagsComponent is v2** (owner, 2026-11-13): nothing in v1 reads tags.
- **The World has a ShapeComponent and a StyleComponent** (owner, 2026-11-13). The rectangle's width and height are the level bounds, 20000 × 10000 by default; the fill is the background colour. Both are World components: they can't be removed, and the shape's kind is always rectangle. The World can't take a BodyComponent or a SurfaceComponent: the Add Component menu shows them disabled, with the reason. The rectangle is centred on the level's origin, and a resize changes both opposite edges by the same amount, so the centre never moves (owner, 2026-11-13).

## v2 and v3 seams

| Later need | Where it plugs in | Changes to v1 code |
|---|---|---|
| TriggerComponent, ScriptComponent, VariablesComponent, InputComponent, TextComponent, TagsComponent (v2) | New component folders, registered in the registry | None |
| Script settings shown as fields (v2) | A script's `settings` table becomes `FieldDefinition`s built at run time from the same field types | None |
| `get_attribute`, `set_attribute`, Change value (v2) | `schema.findFieldByAttribute`, `writeValue`, guarded by `changeableInPlay` | None |
| Gradients, images as fills (v2, v3) | `FillFieldType` replaces `SolidFillFieldType` on StyleComponent | One line in the StyleComponent schema |
| Linked copies (v3) | AssetComponent, and the Inspector's read-only mode, which play already uses | None in the model |
| Component presets (Later) | A preset is a saved values record, applied with `writeValue` | None |
