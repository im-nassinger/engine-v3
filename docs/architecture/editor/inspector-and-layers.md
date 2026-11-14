# The Inspector, editor messages and the Layers panel

## TL;DR

The Inspector and the Layers panel are drawn by React but **decided in `src/editor`**: `InspectorModel` works out which cards and fields to show, with their values or `Mixed`, and turns a typed value into one change; `LayersRows` works out the visible rows; `LayersDrop` decides where a dragged row lands. **Editor messages** come from small rule classes, one per kind of problem; v1 has the missing-partner rule, the missing-entity rule and the failed save. Everything here reads only the field schemas, so a new component needs no Inspector code.

## InspectorModel

```typescript
export class InspectorModel {
    readonly version: VersionCounter;      // moves when the selection or a shown entity changes

    constructor(openLevel: OpenLevel, registry: ComponentRegistry, viewSettings: ViewSettings);

    get header(): InspectorHeader;         // the name (or "3 entities"), hide and lock switches
    get cards(): readonly CardModel[];     // in the fixed card order
    get addableComponents(): readonly AddableComponent[];   // the Add Component menu
    get isReadOnly(): boolean;             // during play
}

export type CardModel = {
    readonly typeName: ComponentTypeName;
    readonly isFolded: boolean;            // remembered per component type, in the browser
    readonly fields: readonly FieldModel[];
    readonly notes: readonly EditorMessage[];   // partner notes and warnings on this card
    readonly canRemove: Availability;      // disabled with a reason for TransformComponent and others
};

export type FieldModel = {
    readonly definition: FieldDefinition<object, never> | DerivedFieldDefinition<unknown>;
    readonly value: unknown | typeof MIXED;
    readonly isEnabled: boolean;           // appliesWhen; greyed values are kept
    readonly isReadOnly: boolean;          // derived without write, or during play
};
```

- **What is shown:** with nothing selected, the World's components. With one entity, its components. With several, only the components every selected entity has, and a field whose values differ shows `Mixed`.
- **Mass and other derived fields** are read when the card is built, so they update as shapes and density change.
- **During play** the same model reads the [`PlayMirror`](../simulation.md#the-page-side) level instead of the editor's, with `isReadOnly` set. That is how the v2 Panels button shows live values without new Inspector code.
- **Add Component** lists every registered component the entity lacks and can take by hand, with disabled entries and their reason for the others. With several selected, it adds to every one that lacks it.

## Typing a value

`ValueInput` turns typed text into a value, following the requirement's table. It sits in `src/editor/inspector/` so the rules are tested without React.

```typescript
export class ValueInput {
    static parseNumber(text: string, definition: NumberFieldDefinition): ValueInputResult;
    static format(value: number, definition: NumberFieldDefinition): string;   // up to 2 decimals
}

export type ValueInputResult =
    | { kind: 'value'; value: number; note?: string }   // note: "Max is 1500" after clamping
    | { kind: 'restore' }                              // empty text: back to the old value
    | { kind: 'clear' }                                // empty text in a field that can be emptied
    | { kind: 'invalid'; reason: string };             // red outline, Enter does nothing
```

- `1.5` and `1,5` are both decimals. A unit suffix (`px`, `°`, `%`, `px/s`, `s`) may be typed and is dropped. A display scale is undone (`50 %` is stored as 0.5). Whole-number fields round. Scale 0 is refused with "Scale can't be 0".
- **Commit** (Enter, Tab, clicking away) runs `SetValuesCommand` on every selected entity with that component, as one step labelled with the field, such as `Change Linear damping`. A value that didn't change makes no step.
- **Ctrl+Z in a field:** while the field's text differs from the committed value, the field's own text undo handles it. The React field component checks this and only lets the key reach the shortcut dispatcher when the text is unchanged.
- Colour, choice, checkbox, vector, angle and entity fields commit on each pick. One drag in the colour picker is one step, through `LiveEdit`.
- An **entity field** is filled by dragging a Layers row onto it, from a dropdown, or with a picker that waits for a click in the level view (a short-lived tool mode in `ToolController`).

## Editor messages

```typescript
export type EditorMessage = {
    readonly kind: 'warning' | 'tip';
    readonly entityId: EntityId | undefined;       // undefined for level-wide messages
    readonly componentType: ComponentTypeName | undefined;
    readonly text: string;
    readonly fix: MessageFix | undefined;          // { label: 'Add ShapeComponent', commandId, args }
};

export type EditorMessageRule = {
    check(entity: Entity, level: Level): readonly EditorMessage[];
};

export class EditorMessages {
    readonly version: VersionCounter;

    constructor(level: Level, rules: readonly EditorMessageRule[], frames: FrameScheduler);
    forEntity(id: EntityId): readonly EditorMessage[];
    all(): readonly EditorMessage[];               // the status bar's count and list
    setLevelWide(source: string, messages: readonly EditorMessage[]): void;   // the failed save
}
```

| v1 rule | Reads | Example |
|---|---|---|
| `MissingPartnerRule` | Each component's `partners` in its schema | "Needs a ShapeComponent to draw anything. [Add ShapeComponent]" |
| `MissingEntityRule` | Every entity field | `missing entity` on a joint's B after its entity was deleted |
| Failed save (level-wide, set by saving) | `SaveState` | "Saving in the browser failed. Your work is still here; export it to keep a copy." |

- Rules run only for entities that changed, marked from `LevelUpdate`s and checked once per frame, so 10,000 entities aren't re-checked on every edit.
- v3's tips and the physics and joint warnings are new rule classes added to the list. Each is "its own small rule", as the scope review put it.
- Script errors are never editor messages; they go to the Console (v2).

## The Layers panel

```typescript
export class LayersRows {
    readonly version: VersionCounter;      // tree version + folded rows + selection, for the rows' look

    constructor(level: Level, caches: DerivedCaches);
    get rows(): readonly LayersRow[];      // only rows whose parents are all unfolded
    indexOf(id: EntityId): number;
    reveal(id: EntityId): number;          // unfolds its parents, returns the row index to scroll to
}

export type LayersRow = {
    readonly entityId: EntityId;
    readonly depth: number;
    readonly hasChildren: boolean;
    readonly isFolded: boolean;
    readonly hiddenByParent: boolean;      // the dimmed eye
};

export class LayersDrop {
    target(rowIndex: number, offsetInRow: number, pointerX: number): DropTarget | undefined;
}

export type DropTarget = {
    readonly parentId: EntityId;
    readonly index: number;
    readonly lineRow: number;              // where the line is drawn
    readonly lineDepth: number;            // its indent shows the depth
};
```

- **Rows are a flat list built by a pre-order walk that skips folded children**, cached until the tree or the folded rows change. The React panel draws only the visible rows (see [ui.md](../ui.md)), so its cost doesn't grow with the level.
- **The row's look** (name, icon, eye, lock) reads the entity directly and redraws on that entity's own version, never on the whole list's.
- **Dropping** is refused into the row itself or its children, above the World, and anywhere but directly inside the World for the camera. A drop runs `MoveEntitiesCommand`, one step, which keeps each moved entity in place on screen.
- **Clicks:** click selects one row, Ctrl+click toggles, Shift+click selects the range between the last clicked row and this one in row order. F2 or a double-click on the name renames. The eye runs `SetHiddenCommand`; the camera's eye works like every other (Q2, owner 2026-11-13).
- **Folding** is stored in `LevelEditorData` and saved in the project file, but never a step. Selecting in the level view calls `reveal`.
