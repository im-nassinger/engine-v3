# The Inspector, editor messages and the Entities panel

## TL;DR

The Inspector and the Entities panel are drawn by React but **decided in `src/editor`**: `InspectorModel` works out which cards and fields to show, with their values or `Mixed`, and turns a typed value into one change; `EntitiesRows` works out the visible rows; `EntitiesDrop` decides where a dragged row lands. **Editor messages** come from small rule classes, one per kind of problem; v1 has the missing-partner rule, the missing-entity rule and the failed save. Everything here reads only the field schemas, so a new component needs no Inspector code.

## InspectorModel

```typescript
export class InspectorModel {
    readonly version: VersionCounter;      // moves when the selection or a shown entity changes

    constructor(openLevel: OpenLevel, registry: ComponentRegistry, viewSettings: ViewSettings);

    get header(): InspectorHeader;         // the name (or "3 entities"), the hide switch (lock from v3)
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
    readonly definition: FieldDefinition<object, never> | DerivedFieldDefinition<object, unknown> | ReadOnlyRow;
    readonly value: unknown | typeof MIXED;
    readonly isEnabled: boolean;           // appliesWhen; greyed values are kept
    readonly isReadOnly: boolean;          // derived without write, or during play
};
```

- **What is shown:** with nothing selected, the World's components, except while the Shape tool is active: then the shape about to be drawn, see [the Shape tool](selection-and-tools.md#the-shape-tool) (owner, 2026-11-15). With one entity, its components. With several, only the components every selected entity has, and a field whose values differ shows `Mixed`.
- **Derived fields** (Width, Height, Radius, Points) and **read-only rows** are read when the card is built, so they update as shapes and density change. A `ReadOnlyRow` is a value the Inspector adds to a card that isn't the component's own: v1 has one, the BodyComponent's Mass, from `BodyMass` in `core/physics`.
- **During play** the same model reads the [`PlayMirror`](../simulation.md#the-page-side) level instead of the editor's, with `isReadOnly` set. That is how the v2 Panels button shows live values without new Inspector code.
- **Add Component** is worked out here, not in the registry: it lists every registered component the entity lacks and can take by hand, with disabled entries and their reason for the others. With several selected, it adds to every one that lacks it.

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
- An **entity field** is filled by dragging an Entities panel row onto it, from a dropdown, or with a picker that waits for a click in the level view (a short-lived tool mode in `ToolController`).

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
| `MissingPartnerRule` | Each component's `partners` in its schema, checked against the entity's components | "Needs a ShapeComponent to draw anything. [Add ShapeComponent]" |
| `MissingEntityRule` | Every entity field | `missing entity` on a joint's B after its entity was deleted |
| Failed save (level-wide, set by saving) | `SaveState` | "Saving in the browser failed. Your work is still here; export it to keep a copy." |

- Rules run only for entities that changed, marked from `LevelUpdate`s and checked once per frame, so 10,000 entities aren't re-checked on every edit.
- v3's tips and the physics and joint warnings are new rule classes added to the list. Each is "its own small rule", as the scope review put it.
- Script errors are never editor messages; they go to the Console (v2).

## The Entities panel

```typescript
export class EntitiesRows {
    readonly version: VersionCounter;      // tree version + folded rows + selection, for the rows' look

    constructor(level: Level, caches: DerivedCaches);
    get rows(): readonly EntitiesRow[];      // only rows whose parents are all unfolded
    indexOf(id: EntityId): number;
    reveal(id: EntityId): number;          // unfolds its parents, returns the row index to scroll to
}

export type EntitiesRow = {
    readonly entityId: EntityId;
    readonly depth: number;
    readonly hasChildren: boolean;
    readonly isFolded: boolean;
    readonly hiddenByParent: boolean;      // the dimmed eye
};

export class EntitiesDrop {
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

## Stage 7's choices

Made under the standing yes (2026-11-15), before building. The [plan](../../plan.md#stage-7-in-steps) has the steps.

- **Stage 7 builds the panel, not what links it to later stages.** Hover outlines between a row and the level view are v3 ([selection](../../requirements/editor/selection.md)), so a hovered row only gets the `--hover` background. Selecting in the level view comes with the Select tool in stage 9; until then "a selection made outside the panel" is one made by a command (Select all, Group, Ungroup), which already reveals its rows. The panel's read-only state during play comes with Play in stage 16, and the lock with v3. *Why: a stage never builds what a later stage owns.*
- **`EntitiesRows` and `RenameRequest` belong to `OpenLevel`**, next to the selection, because both follow one level and New and Import replace them with it. They live in `editor/entities-panel`, which imports only core, so `editor/session` can hold them without a cycle.
- **Folding goes through `EntitiesRows.setFolded`**, which writes `LevelEditorData` and is never a step, as the requirement says. A row with no children has no arrow, and `setFolded` on it does nothing.
- **`rowKind` picks the row's icon** from the entity: the World, the camera, a joint (by its type), a shape (by its kind), a path, then a group for any other entity with children, and a plain entity otherwise. *Why: the requirement gives a row "an icon for its kind", and an entity has no kind field, so the components decide in a fixed order.*
- **Clicking a row never changes the current group** (*proposal*). Group already puts its group where the frontmost row was, and the current group is the level view's idea of where clicks land. *Why: the requirement says selecting from the panel "works at any depth", and nothing more.*
- **Shift+click's range runs from the anchor**, the last row clicked without Shift, to the clicked row, in row order over the visible rows, and replaces the selection. With no anchor, or one no longer visible, Shift+click acts as a click. The selection's own rules then apply: the World goes alone, a parent drops its selected children.
- **The eye works on its own row only**, through `toggleEntityHidden(openLevel, id)`, one step labelled `Hide Square` or `Show Square`, never the whole selection. *Why: Hide or show (Ctrl+Shift+H) is the selection's command; an icon on a row is about that row, as in Figma.* Clicking the eye doesn't select the row.
- **`EntitiesDrop` decides with the row's thirds** (*proposal*): the top third is above the row, the bottom third below, and the middle into it, at its top. Below a row whose subtree ends there, the pointer's indent picks how many levels up the drop lands, as Figma does. Into a folded group lands at its top without unfolding it. Refused: into a dragged row or its children, above the World, and the camera anywhere but directly inside the World. A refused place gives no target and no line.
- **`moveEntities(openLevel, ids, target)` is an edit**, like `renameEntity`, since it needs a target no menu can give. The dragged entities keep their panel order, land side by side from the target's index, each kept in place on screen with `transformUnder`, all in one step labelled `Move Square` or `Move 3 entities`. A move that would go past 256 deep is refused whole: `Groups can be at most 256 deep`. *Why: the requirement says a drop is one step and moving between groups never moves anything on screen.*
- **Dragging a selected row drags the whole selection; dragging one that isn't selected selects it first** and drags it alone. The World's row can't be dragged. A drag starts after 3 px, as in the level view, and Esc cancels it.
- **While dragging, the list scrolls by itself near its top and bottom edges**, faster the closer the pointer (*proposal*). *Why: with 10,000 rows a row's new place is often off screen.*
- **Rename (F2) is a command, `edit.rename`**, in the Edit menu. It is available with one selected entity that isn't the World; otherwise disabled with `Select one entity to rename`, or `The World can't be renamed`. Running it reveals the row and asks `RenameRequest` to open its box; the panel opens it and calls `renameEntity` on Enter. Leaving the box commits like Enter, as the level's name does in the top bar.
- **The row's look redraws on its own entity's version**, the list on `EntitiesRows.version`, so renaming one entity redraws one row. The row height is the `--row` token, 28 px; [performance.md](../performance.md) said 24 px, from before the design's round 8.
- **The 10,000-row tests are browser tests** (Vitest in three browsers), which build the level in the test, not Playwright tests of the page. *Why: the page can't load a level until Import in stage 12, and a way to make one only for tests would ship test code.*
