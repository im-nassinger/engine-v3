# Components and fields

## TL;DR

**Each component type declares its fields once, in a `ComponentSchema`** (owner, 2026-11-13). A field names its **field type** (one class per type in the fixed list: number, text, checkbox, choice, colour, vector, angle, entity, fill, list, path point from v2, and later tags, variable, asset), its label, default, unit, range, description, and whether it can change during play. From that one list the Entity inspector draws the card, the file stores and checks the values, undo records them, copy clones them, and in v5 Lua's `get_attribute` and `set_attribute` and the trigger's Change value find them. A component class holds a typed values record and adds no logic of its own beyond what its values need. Component class names end in `Component`. **Imports go one way, entities → components → fields → events:** a component never imports `Entity`, and a schema never reads one.

## Value types and field types

A **value type** knows how to check, store and compare one kind of value. A **field type** is a value type the Entity inspector can show. Both are classes, one per kind.

```typescript
export type ParseProblem =                  // reasons, never sentences: the editor writes those
    | { reason: 'wrongType' } | { reason: 'notFinite' } | { reason: 'zero' }
    | { reason: 'outsideLimits'; min: number; max: number }
    | { reason: 'unknownChoice' } | { reason: 'badColour' } | { reason: 'badEntityId' };

export type ParseOutcome<T> = { ok: true; value: T } | { ok: false; problem: ParseProblem };

export type ValueType<T> = {
    parse(raw: unknown): ParseOutcome<T>;   // untrusted data: a file, the clipboard, a script. Checks the shape only
    serialize(value: T): JsonValue;
    normalize(value: T): T;                 // clamp to the range, round whole numbers
    clone(value: T): T;
    equals(first: T, second: T): boolean;
};

export type FieldKind =
    | 'number' | 'text' | 'checkbox' | 'choice' | 'colour' | 'vector' | 'angle' | 'entity' | 'fill' | 'list'
    | 'pathPoint'                                       // v2
    | 'asset' | 'variable' | 'tags' | 'input' | 'trigger';  // v3 (triggers.md); asset in v5

export type FieldType<T> = ValueType<T> & {
    readonly kind: FieldKind;
    mapEntities?(raw: unknown, linkTo: EntityLinkMapper): unknown;  // v3: where a saved value links to entities
};
```

| Field type class | Value | Options | v1 uses it for |
|---|---|---|---|
| `NumberFieldType` | `number` | `min`, `max`, `wholeNumber` | Densities, dampings, sizes, speeds |
| `TextFieldType` | `string` | `minLength`, `maxLength`, `trimmed` | The name (1 to 64 characters) |
| `CheckboxFieldType` | `boolean` | | Sensor, Bullet, Motor |
| `ChoiceFieldType<T extends string>` | one of a union | the options and their labels | Body type, joint type, shape kind |
| `ColourFieldType` | `#RRGGBBAA` text | | Outline colour |
| `VectorFieldType` | `{ x, y }` | `min`, `max`, `refuseZero` | Position, scale (scale can't be 0) |
| `AngleFieldType` | degrees | `min`, `max`, `refuseLimits` | Rotation, hinge limits, skew (refuses −90° and 90°) |
| `EntityFieldType` | `EntityId \| null` | | Joint A and B, the camera's follow target |
| `FillFieldType` (v2, replacing v1's `SolidFillFieldType`) | a `Fill`: none, a solid colour, or a linear or radial gradient, see [the fill](#the-fill-v2) | | The StyleComponent's fill |
| `PathPointFieldType` (v2) | a `PathPoint`: `{ x, y, handle_in, handle_out, corner }`, see [paths](#paths-v2) | | A path's Points, as list items |
| `ListFieldType<T>` | `T[]` | the item's field type, `minItems`, `maxItems` | A polygon's or line's Points, a list of vectors (owner, 2026-11-15) |

- **`parse` checks the shape, `normalize` clamps** (as built, 2026-11-14): `parse` refuses the wrong type, a number that isn't finite, an unknown choice, a colour not written `#RRGGBBAA`, and the two values a field refuses (`refuseZero`, `refuseLimits`). A value out of range parses, and `normalize` clamps it, which is what import does with a joint limit past its range. A field that refuses its limits never clamps. `ParseProblem` is a code with data, not the sentence the first draft had, because [core returns reasons, never sentences](../errors.md#where-the-sentences-come-from).
- **A colour** is read in either case and stored uppercase, so two equal colours compare equal. **A text's length** counts characters (code points), so a character outside the basic plane is never cut in half. **A vector** is geometry's `Point`; `refuseZero` refuses 0 in x or in y, since either makes a matrix that can't be inverted. `JsonValue` is declared in `core/fields` with `EntityId`.
- **`ColourFieldType` has no `canBeEmpty`** (as built, 2026-11-14): the only colour that can be emptied is the fill, which has its own field type, so nothing needs it.
- **The fixed list is v1, but each field type is built when the first component needs it.** v1 built ten; v2 replaced v1's solid fill with `FillFieldType` and added `PathPointFieldType` with the Bézier pen. Asset, variable and tags come with the later components that use them. List moved to v1 for Points (owner, 2026-11-15).
- **The fill's stored shape was chosen in v1** (owner, 2026-11-13): v1's `SolidFillFieldType` already stored the tagged value `{ kind: 'none' } | { kind: 'solid', colour }`, with the kind `'fill'` (stage 2, standing yes, 2026-11-14), so v2's `FillFieldType` took the kind over and only added the gradients. Saved levels never changed. Images as fills are Later.
- **An entity field is stored as `{ "entity": 12 }`**, not a bare number, so a later "follow by tag" (open question 15) can store `{ "tag": "player" }` beside it without changing saved levels.
- Internal value types, never shown as fields, use the same `ValueType` contract: `ShapeGeometryValue`, `PathGeometryValue`, `JointEndsValue`. They hold the stored values below.

## The fill (v2)

```typescript
export type ColourStop = { readonly colour: string; readonly place: number };   // place 0 to 1, shown as %
export type Fill =
    | { readonly kind: 'none' }
    | { readonly kind: 'solid'; readonly colour: string }
    | { readonly kind: 'linear'; readonly stops: readonly ColourStop[]; readonly start: Point; readonly end: Point }
    | { readonly kind: 'radial'; readonly stops: readonly ColourStop[]; readonly centre: Point; readonly radius: number };
```

`Fill` and its rules live in `core/fields/fill/`, `FillFieldType` in `core/fields/field-types/`. Built in v2 (standing yes, 2026-11-20 and 2026-11-21, listed in [decisions.md](../../decisions.md)).

- **Stored as** `{ "kind": "linear", "stops": [{ "colour": "#4A90D9FF", "place": 0 }, …], "start": { "x": 0, "y": 0.5 }, "end": { "x": 1, "y": 0.5 } }`, and radial with `centre` and `radius`. `none` and `solid` are stored as in v1, so no level is upgraded.
- **Positions are shares of the entity's box**, 0 to 1, and may go past it (−10 to 11, so a handle dragged off the shape still makes sense). **The box is the geometry, the outline left out** (`fillBoxOf` in `core/derived/`): a rectangle's sides, a circle's square, a polygon's points' box, a path's curve exactly (`pathBox`). *Why the geometry: it is what Width and Height measure, so an outline width never moves a gradient.*
- **A radial gradient's radius is a share of the box's width along x and of its height along y**, so in a box that isn't square it is an ellipse, and 0.5 touches every side. *Why: a share of one side alone would spill out of a long shape or leave it half filled; Figma stretches it the same way.*
- **`parse` refuses** 1 or more than 8 stops, a place outside 0 to 1, a radius of 0 or less or above 21 (the farthest a radius dot can go), and a position outside −10 to 11. **`normalize` sorts the stops by place**, keeping the order of equal places, so the list always reads left to right.
- **`switchFillKind`** holds the requirement's rules for changing kind: Solid to a gradient makes two stops, the colour and the same colour fully see-through, at 0% and 100%; Linear and Radial swap and keep the stops; a gradient to Solid keeps its first stop's colour; None to anything starts from the default fill, `#4A90D9`. **A new linear gradient runs left to right across the middle**, (0, 0.5) to (1, 0.5), **and a new radial one sits in the middle with a radius of 0.5**, so both fill the shape at once and their handles are easy to grab.
- **`colourAt`, `withStopAt` and `withStopAdded`** (`gradientStops.ts`) give the colour already at a place and add a stop with it, so adding a stop never changes the look; the bar's stops land on whole percents.
- **`mixedColour(fill)`** gives one colour for a gradient: its stops mixed, each weighted by how much of the bar it covers. The minimap and `levelBackground`'s dark test use it, so a sky gradient on the World still picks a grid colour.
- **A gradient counts as filled** for hit testing, as a solid colour does, whatever its see-through stops.

## Field definitions

```typescript
export type Unit = 'px' | '°' | '%' | 'px/s' | '°/s' | 's' | 'kg' | 'm/s²' | 'per s';

export type FieldDefinition<Values, Key extends keyof Values> = {
    readonly key: Key;                       // camelCase of the label: linearDamping
    readonly label: string;                  // "Linear damping". The Lua attribute is its snake_case
    readonly type: FieldType<Values[Key]>;
    readonly defaultValue: Values[Key];
    readonly description?: string;           // shown when hovering the label; none when the label says enough
    readonly unit?: Unit;
    readonly displayScale?: number;          // opacity is stored 0 to 1 and shown 0 to 100 %
    readonly precision?: number;             // decimals shown, 2 when not given
    readonly changeableInPlay: boolean;      // what Lua and Change value may set
    readonly appliesWhen?: (values: Values) => boolean;   // greyed when false, value kept
};

```

- **The tech notes' field metadata** (unit, display scale, precision, slider range, description, menu section) is all here. The slider shows when the field type has both a `min` and a `max`, as the requirement says. The menu section belongs to the component, below.
- **The attribute name is the label in snake_case**, as the Lua API rules say: "Linear damping" is `linear_damping`. It is also the key in `level.json`, so the file, Lua and the Entity inspector use one name.
- **A test checks every schema**: each key is the camelCase of its label, no two attributes in a component clash, and each default sits in its range. Because the file key comes from the label, renaming a label makes this test fail, which forces a conscious choice: Lua's API never changes once shipped.

## ComponentSchema and Component

`ComponentSchema`, `PartnerRule` and `DerivedFieldDefinition` live in `core/components`, beside `Component`. `core/fields` holds only the value types, the field types, `FieldDefinition` and `EntityId`, and knows nothing about entities.

```typescript
export type PartnerRule = {
    readonly partner: ComponentTypeName;              // 'SurfaceComponent': the one the note's button adds
    readonly alsoSatisfiedBy?: readonly ComponentTypeName[];  // others that end the note too
    readonly onlyWith?: ComponentTypeName;            // 'ShapeComponent': the note shows only when the entity has it
    readonly noteText: string;                        // "Needs a Surface to collide."
};

export type DerivedFieldDefinition<Values extends object, T> = {
    readonly key: string;
    readonly label: string;
    readonly type: FieldType<T>;
    readonly description: string;
    readonly unit?: Unit;
    read(values: Values): T;                          // Width and Height read the shape's own geometry
    appliesWhen?(values: Values): boolean;            // hidden when false: a rectangle has no Points row
    write?(values: Values, value: T): ParseOutcome<Partial<Values>>;  // they rescale the points. No write: read-only
};

export type StoredValueDefinition<Values, Key extends keyof Values> = {
    readonly key: Key;                                // 'geometry'; saved under its snake_case
    readonly type: ValueType<Values[Key]>;
    readonly defaultValue: Values[Key];
};

export class ComponentSchema<Values extends object> {
    readonly typeName: ComponentTypeName;             // 'BodyComponent'
    readonly cardOrder: number;                       // the fixed order of cards
    readonly hasCard: boolean;                        // false for NameComponent: the header edits it
    readonly addMenuSection: string;                  // 'Physics'
    readonly addableByHand: boolean;                  // false for TransformComponent, CameraComponent, the World's
    readonly fields: readonly FieldDefinition<Values, keyof Values>[];
    readonly derivedFields: readonly DerivedFieldDefinition<Values, unknown>[];
    readonly storedValues: readonly StoredValueDefinition<Values, keyof Values>[];  // not shown
    readonly partners: readonly PartnerRule[];

    defaults(): Values;
    findField(key: string): FieldDefinition<Values, keyof Values> | undefined;
    findFieldByAttribute(attribute: string): FieldDefinition<Values, keyof Values> | undefined;
}

export abstract class Component<Values extends object = object> {
    readonly schema: ComponentSchema<Values>;
    readonly changed: Signal<ComponentChange>;        // { component, key }: the holding entity listens
    private values: Values;

    protected constructor(schema: ComponentSchema<Values>, values: Values);

    get<Key extends keyof Values>(key: Key): Values[Key];
    set<Key extends keyof Values>(key: Key, value: Values[Key]): Values[Key];  // normalizes, signals if changed

    readValue(key: string): unknown;                  // by key, for generic code: the Entity inspector, undo
    writeValue(key: string, raw: unknown): ParseOutcome<unknown>;  // parsed through the field type

    copy(): Component<Values>;
    resetToDefaults(): void;
}

export type ComponentClass<T extends Component> = {
    readonly schema: ComponentSchema<object>;
    new (values?: never): T;
};
```

- **As built (2026-11-14), five details differ from the code above:**
  - **Generic code holds an `AnyComponent`**, not a `Component`: a plain contract with the schema, `changed`, `readValue`, `writeValue`, `copy` and `resetToDefaults`, which every `Component<Values>` implements. TypeScript can't widen `Component<BodyValues>` to one type for all components, because a schema typed by its own keys never widens to all keys. `Entity`'s map, `ComponentChange` and the registry use `AnyComponent`.
  - **`Values extends ComponentValues`** (`Record<string, unknown>`), not `object`, so a values `type` widens to that contract. A values `interface` doesn't, so values are always a `type`.
  - **`addMenuSection` is optional:** the TransformComponent and the NameComponent are on every entity, so the Add Component menu never lists them.
  - **`ComponentClass<T extends AnyComponent>`** has `schema: AnyComponentSchema` and `new (...args: never[]): T`. Test components for code that holds components are in `core/components/testing/`.
  - **`derivedField(...)`** checks a derived field against its own type, then widens it for the schema's list.
- Code that knows the component uses the typed `get` and `set` (`body.get('gravityScale')`). Generic code (the Entity inspector, undo, the reader, Lua) uses `readValue` and `writeValue` by key, which go through the same field type.
- `set` returns the value actually stored, after clamping, so the Entity inspector can show "Max is 1500" when it differs from what was typed.
- **A component never knows which entity holds it.** `set` and `writeValue` raise the component's own `changed` signal. `Entity.addComponent` subscribes to it and turns it into the level's `valueChanged` update, and `removeComponent` unsubscribes.
- **Partner notes come from the schema** (Q5 and Q6, owner 2026-11-13): a component lists, as plain data, the partners it needs and when they are needed. The editor's `MissingPartnerRule` turns them into editor messages with an [Add ...] button. Removing a component removes only that one, so the cards left behind show their notes.
- **Every note reads "Needs a X to Y. [Add X]"** (owner, 2026-11-13), with Y written per partner in the schema: "to draw anything" for a StyleComponent, "to collide" for a SurfaceComponent and a BodyComponent.
- **`alsoSatisfiedBy`** (stage 2, standing yes, 2026-11-14): the StyleComponent's note shows only when the entity has neither a ShapeComponent nor a PathComponent, so its rule names ShapeComponent as `partner` (what the button adds) and PathComponent in `alsoSatisfiedBy`. v6 adds the TextComponent to the list. *Why: one `partner` can't say "either of two".*

## Stored values

**A stored value is a value the Entity inspector never shows** (stage 2, standing yes, 2026-11-14): a `key`, a `ValueType` and a default, listed in the schema's `storedValues`. It is saved under its key's snake_case like a field, and `readValue` and `writeValue` reach it the same way, so undo, copy and the reader need nothing new. *Why: the docs named `StoredValueDefinition` but never described it, and a field's way of saving and checking already does everything a hidden value needs.*

| Component | Stored value | Value type | Holds |
|---|---|---|---|
| ShapeComponent | `geometry` | `ShapeGeometryValue` | The kind and what that kind needs (below) |
| PathComponent | `path` | `PathGeometryValue` | `closed` and the points with their handles (below) |
| JointComponent | `ends` | `JointEndsValue` | `{ a: { x, y }, b: { x, y } }`, the two ends in the joint's own space |
| CameraComponent | `mode` | a choice | `fixedSize` until Later |

**A shape's kind and size are one stored value** (stage 2, standing yes, 2026-11-14):

```json
"ShapeComponent": { "geometry": { "kind": "rectangle", "width": 200, "height": 100 } }
"ShapeComponent": { "geometry": { "kind": "line", "points": [{ "x": 0, "y": 0 }, { "x": 300, "y": 40 }] } }
```

- A rectangle holds `width` and `height`, at least 1 px each (smaller is clamped). A circle holds only `radius`, at least 0.5 px, so it is at least 1 px across (owner, 2026-11-15: there is no ellipse kind; an ellipse is a circle scaled unevenly). A polygon holds at least 3 points and a line at least 2, and nothing else. The 1,000-point limit is the reader's, from `LevelLimits`.
- **Kind, Width, Height, Radius and Points are derived fields** read from it. **Points is a list of vectors** (owner, 2026-11-15), hidden on a rectangle or circle; writing it replaces the points, at least 3 on a polygon and 2 on a line, up to 1,000. Width and Height are only on a rectangle (owner, 2026-11-16, built in stage 18 step 7), Radius only on a circle. *As built (stage 7 step 2, standing yes, 2026-11-15):* a Width or Height written to a circle becomes its diameter, so code that resizes any shape keeps a circle round, and writing Radius on another kind throws, since only a mistake in the code can reach a hidden field. Until stage 18, typing a Width or Height on a polygon or line rescaled its points along that axis; now writing either on any kind but a rectangle throws, like Radius.
- **Kind can be written** (owner, 2026-11-15): writing it replaces the geometry with the new kind's, keeping its place and size, by the table in [changing a shape's kind](../../requirements/drawing.md#changing-a-shapes-kind--v1). A line with fewer than 3 points refuses to become a polygon, with a reason.
- *Why: kept apart, a file could say `rectangle` beside a list of points, and every reader of the shape would have to check that they agree. One value makes a rectangle with points impossible.*

### Paths (v2)

**A path stores what the pen needs** (stage 2, standing yes, 2026-11-14): `{ "closed": false, "points": [{ "x", "y", "handle_in", "handle_out", "corner" }] }`. A handle is a point measured from its own point, or `null`; `corner` is `sharp`, `smooth` or `separate` (smooth with handles that move separately), as [point editing](../../requirements/drawing.md#point-editing--v1) names them. *Why: if v1 had stored bare points, v2's curves would have changed saved files.* The PathComponent isn't in the Add Component menu: a path comes from the pen, the Pencil, or a Rope or Spring.

- **`PathPointFieldType`** (kind `'pathPoint'`) parses, stores, clones and compares one point. A sharp point's handles are `null`; a smooth or separate point keeps both, except that an open path's first point has no `handle_in` and its last no `handle_out`.
- **Points is a derived `ListFieldType<PathPoint>`**, 2 to 2,000 items (`LevelLimits.maxPathPoints`), writable since v2. Its write refuses a closed path under 3 points, as the ShapeComponent's refuses a polygon. **On a Rope's or Spring's path it is read-only**, the way the World's Kind is, since the joint rewrites that path every time an end moves.
- **What "smooth" keeps** (standing yes, 2026-11-20): a smooth point's two handles stay on one line through the point, each keeping its own length; moving one turns the other to the opposite side. *Why: this is how Illustrator and Figma keep a smooth point, and the Pencil's curves need handles of different lengths.*
- **The curve maths** is in `core/geometry/path/`: `pathBox` (a path's exact box), `splitCurve` (de Casteljau's method, so a split keeps the look), `nearestOnCurve` (the share of a curve or straight segment nearest a point) and `smoothHandles` (the handles a point turned smooth gets, see [drawing-and-points.md](../editor/drawing-and-points.md#point-editing-on-paths-v2)). `fitCurves`, the Pencil's fitting, is in `core/geometry/fitting/`.

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
    indexOf(typeName: string): number;                                 // fixed, for component ids in Lua
}

export function createV1Registry(): ComponentRegistry;
```

- **As built (2026-11-14):** the registry holds `ComponentClass<AnyComponent>`, refuses a type registered twice, and has `all()`, the classes in the order they were registered, which the schema tests run over. **`indexOf` is that order**, and an unknown name throws. `createV1Registry` registers the ten v1 components in a fixed order, and new types only ever go at the end, so a component id in Lua never changes. *Why: the index must be the same in every run and every version, and the order of registration is the one order nothing else moves (standing yes, 2026-11-14).*
- The reader finds a component by its type name in the file, the Entity inspector's Add Component menu lists what the entity lacks (see [the Entity inspector](../editor/inspector-and-entities.md)), and each later version registers its components into the same registry. Nothing else changes when a component type is added.

## The v1 components

| Component | Card | Fields (label: type, range, default) | Stored, not shown | Partners |
|---|---|---|---|---|
| TransformComponent | 1 | Position: vector px. Rotation: angle °. Scale: vector, not 0, (1, 1). Skew: angle °, strictly between −90° and 90° | | |
| NameComponent | none | Name: text, 1 to 64, trimmed, filled automatically. `Entity` when missing from a file; `parse` refuses an empty name, counted after trimming (owner, 2026-11-14) | | |
| ShapeComponent | 2 | Kind: choice, derived, writable, converts the geometry. Width, Height: derived px, at least 1, only on a rectangle. Radius: derived px, at least 0.5, only on a circle. Points: derived list of vectors, only on a polygon or line | `geometry`: a rectangle's size, a circle's radius, or polygon and line points (up to 1,000) | |
| PathComponent | 3 | Points: derived list of path points, 2 to 2,000, writable, read-only on a Rope's or Spring's path | `path`: closed, the points and handles | |
| StyleComponent | 5 | Fill: `FillFieldType`, none, a solid colour or a gradient, `#4A90D9`. Outline colour: colour, `#1F3552`. Outline width: number px, 0 to 200, 2. Scale outline: checkbox, off. Opacity: number, 0 to 1 shown as %, 1 | | ShapeComponent, also satisfied by a PathComponent: "Needs a ShapeComponent to draw anything." |
| BodyComponent | 6 | Type: choice. Gravity scale, Linear damping, Angular damping, Fixed rotation, Bullet: as in [bodies](../../requirements/physics/bodies.md). Merge: checkbox, on. The card also shows a read-only Mass, see below | | SurfaceComponent, only when the entity has a ShapeComponent and no SurfaceComponent |
| SurfaceComponent | 7 | Density 0 to 100, 1. Friction 0 to 5, 0.3. Restitution 0 to 2, 0. Sensor: checkbox | | ShapeComponent |
| JointComponent | 8 | Type: choice Hinge, Rope, Spring. A, B: entity. Let connected objects collide. Hinge: Limit rotation, Min angle, Max angle, Motor, Motor speed, Motor strength, Resistance. Rope: Match drawn distance, Length. Spring: Match drawn distance, Rest length, Stiffness, Damping. Ranges and defaults as in [joints](../../requirements/physics/joints.md) | `ends`: the two ends, in the joint's own space | |
| CameraComponent | 9 | Width, Height: number px, 160 to 7,680, 1920 × 1080. Follow: entity, empty. Smoothing: number s, 0 to 5, 0.3. Not in the Add Component menu | `mode`: `fixedSize` until Later | |
| PhysicsWorldComponent | 10, World only | Gravity: vector m/s², each axis −100 to 100, 0, 9.8 (owner, 2026-11-15). Walls: checkbox, off (all four edges of the level bounds walls, or all open). Pixels per metre (v4): number px/m, 1 to 1,000, default 100, not changeable during play (key `pixelsPerMetre`, saved as `pixels_per_metre`) | | |

- **Mass isn't a field of the BodyComponent**, because it adds up the shapes of other entities merged into the body. `BodyMass.of(entity, caches)` in `core/physics`, which knows which shapes merge, works it out from [geometry](geometry.md#mass), and the Entity inspector shows it as a row at the end of the BodyComponent's card. **A typed Mass sets density** (owner, 2026-11-19): `densitiesForMass(body, mass, caches)` in `core/physics/mass` gives each of the body's surfaces (`BodyMass.surfacesOf`) the density that makes the body weigh that much, keeping their ratios, or refuses with `noArea` or `tooDense`; `setBodyMass` in `editor/commands` makes the one undo step `Change Mass`.
- Every setting of every joint type is stored, whatever the current type, so switching type later keeps them, as the joints rules ask.
- **Which camera and world values change during play** (standing yes, 2026-11-14): Follow and Smoothing do, because the later Change value sets them, and so does Gravity, as the World's rules say. The camera's width and height and Walls don't.
- **The PhysicsWorldComponent's card comes last, at 10** (standing yes, 2026-11-14), after the World's ShapeComponent and StyleComponent, so the bounds and the background read first.
- **Merge** is a checkbox on the BodyComponent, on by default (owner, 2026-11-13).
- **Which values change during play** (owner, 2026-11-14): the TransformComponent's position and rotation; not its scale or skew, and not the name. **The hover descriptions** of these five fields are in the [Entity inspector's requirements](../../requirements/editor/inspector-and-undo.md#cards-for-the-selection--v1).
- **A new level names its World `World` and its camera `Camera`**, the names the round 9 cards used.
- **The TagsComponent is v3** (owner, 2026-11-20): nothing reads tags before triggers.
- **The World has a ShapeComponent and a StyleComponent** (owner, 2026-11-13). The rectangle's width and height are the level bounds, 20000 × 10000 by default (owner, 2026-11-18, see [world.md](../../requirements/physics/world.md)); the fill is the background colour. Both are World components: they can't be removed, and the shape's kind is always rectangle. The World can't take a BodyComponent or a SurfaceComponent: the Add Component menu shows them disabled, with the reason. The rectangle is centred on the level's origin, and a resize changes both opposite edges by the same amount, so the centre never moves (owner, 2026-11-13).

## Seams for later versions

| Later need | Where it plugs in | Changes to v1 code |
|---|---|---|
| TagsComponent, VariablesComponent, InputComponent, TriggerComponent (v3, built: [triggers.md](triggers.md)), ScriptComponent (v5), TextComponent (v6) | New component folders, registered in the registry | None; copying gained `mapEntities` for links inside a value |
| Variables of nine types on any entity (v4 and v5) | Each variable on a VariablesComponent is drawn with its type's field type, limits included. A script's `variables` table is only read to offer [Add variables] | None |
| `get_attribute`, `set_attribute`, Change value (v3) | `schema.findFieldByAttribute`, `writeValue`, guarded by `changeableInPlay` | None |
| Images as fills (Later) | One more kind of `Fill` in `FillFieldType`, as v2 added the gradients by replacing `SolidFillFieldType` | None outside `core/fields/fill` and the fill's drawing and editor |
| Linked copies (Later) | AssetComponent, and the Entity inspector's read-only mode, which play already uses | None in the model |
| Component presets (Later) | A preset is a saved values record, applied with `writeValue` | None |
