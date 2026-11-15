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

- **What is shown:** with nothing selected, the World's components. While the Shape tool is active the Inspector is hidden, see [the Shape tool](selection-and-tools.md#the-shape-tool) (owner, 2026-11-15). With one entity, its components. With several, only the components every selected entity has, and a field whose values differ shows `Mixed`.
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

- **Stage 7 builds the panel, not what links it to later stages.** Hover outlines between a row and the level view are v3 ([selection](../../requirements/editor/selection.md)), so a hovered row only gets the `--hover` background. Selecting in the level view comes with the Select tool in stage 9; until then "a selection made outside the panel" is one made by a command (Select all, Group, Ungroup) or an undo, which reveals its rows the same way. The panel's read-only state during play comes with Play in stage 16, and the lock with v3. *Why: a stage never builds what a later stage owns.*
- **`EntitiesRows` and `RenameRequest` belong to `OpenLevel`**, next to the selection, because both follow one level and New and Import replace them with it. They live in `editor/entities-panel`, which imports only core, so `editor/session` can hold them without a cycle.
- **Folding goes through `EntitiesRows.setFolded`**, which writes `LevelEditorData` and is never a step, as the requirement says. A row with no children has no arrow, and `setFolded` on it does nothing.
- **`rowKind` picks the row's icon** from the entity: the World, the camera, a joint (by its type), a shape (by its kind), a path, then a group for any other entity with children, and a plain entity otherwise. *Why: the requirement gives a row "an icon for its kind", and an entity has no kind field, so the components decide in a fixed order.*
- **Clicking a row never changes the current group** (*proposal*). Group already puts its group where the frontmost row was, and the current group is the level view's idea of where clicks land. *Why: the requirement says selecting from the panel "works at any depth", and nothing more.*
- **Shift+click's range runs from the anchor**, the last row clicked without Shift, to the clicked row, in row order over the visible rows, and replaces the selection. Ctrl+click moves the anchor too, as in a file explorer *(standing yes, 2026-11-15)*. With no anchor, or one no longer visible, Shift+click acts as a click. `RowClicks` keeps the anchor and is held by `OpenLevel`, like `EntitiesRows`. The selection's own rules then apply: the World goes alone, a parent drops its selected children.
- **The eye works on its own row only**, through `toggleEntityHidden(openLevel, id)`, one step labelled `Hide Square` or `Show Square`, never the whole selection. *Why: Hide or show (Ctrl+Shift+H) is the selection's command; an icon on a row is about that row, as in Figma.* Clicking the eye doesn't select the row.
- **`EntitiesDrop` decides with the row's thirds** (*proposal*): the top third is above the row, the bottom third below, and the middle into it, at its top. Below a row whose subtree ends there, the pointer's indent picks how many levels up the drop lands, as Figma does. Into a folded group lands at its top without unfolding it. Refused: into a dragged row or its children, above the World, and the camera anywhere but directly inside the World. A refused place gives no target and no line. Any entity can be dropped into, not only a group, since every entity can hold children; below the World, or below an unfolded row with children, lands into it at its top. `EntitiesDrop` is built from the level and `EntitiesRows`, holds no state, and gives the target's index among the parent's children as they are before the move, the dragged ones included, so `moveEntities` makes the adjustment. *(standing yes, 2026-11-15)*
- **`moveEntities(openLevel, ids, target)` is an edit**, like `renameEntity`, since it needs a target no menu can give. The dragged entities keep their panel order, land side by side from the target's index, each kept in place on screen with `transformUnder`, all in one step labelled `Move Square` or `Move 3 entities`. A move that would go past 256 deep is refused whole: `Groups can be at most 256 deep`. It takes a plain tree place, `{ parentId, index }`, which a `DropTarget` is, so commands don't import the panel. A dragged entity inside another dragged one moves with it, the moved entities are selected afterwards, and it also refuses on its own what `EntitiesDrop` refuses: `The World can't be moved`, `The camera stays directly in the World`, `An entity can't go inside itself` *(standing yes, 2026-11-15)*. *Why: the requirement says a drop is one step and moving between groups never moves anything on screen.*
- **Dragging a selected row drags the whole selection; dragging one that isn't selected selects it first** and drags it alone. The World's row can't be dragged. A drag starts after 3 px, as in the level view, and Esc cancels it.
- **While dragging, the list scrolls by itself near its top and bottom edges**, faster the closer the pointer (*proposal*). *Why: with 10,000 rows a row's new place is often off screen.*
- **Rename (F2) is a command, `edit.rename`**, in the Edit menu. It is available with one selected entity that isn't the World; otherwise disabled with `Select one entity to rename`, or `The World can't be renamed`. Running it reveals the row and asks `RenameRequest` to open its box; the panel opens it and calls `renameEntity` on Enter. Leaving the box commits like Enter, as the level's name does in the top bar. `RenameRequest` holds one entity id and a version that moves with each ask, even a second ask for the same entity, so F2 twice opens the box again; the panel clears it once the box is open. Rename sits in the Edit menu between Select all and Hide or show, and is never a step *(standing yes, 2026-11-15)*.
- **The row's look redraws on its own entity's version**, the list on `EntitiesRows.version`, so renaming one entity redraws one row. The row height is the `--row` token, 28 px; [performance.md](../performance.md) said 24 px, from before the design's round 8.
- **The panel's parts** (*as built, step 8*): `EntitiesPanel` holds the `Entities` heading and `EntitiesList`, the virtual list from `@tanstack/react-virtual`, which builds only the rows on screen plus 8 on each side; `EntitiesListRow` is one row, named so to stay apart from the `EntitiesRow` data it shows. The list is a `tree` and each row a `treeitem` with its level, selected and expanded state. **The kind icons** are Lucide's: World `Globe`, camera `Video`, hinge `CircleDot`, rope `Cable`, spring `Waves`, rectangle `Square`, circle `Circle`, polygon `Pentagon`, line `Slash`, path `Spline`, group `Folder`, a plain entity `Box`. Cmd+click is Ctrl+click on a Mac, as in the keys. **The list and the row opt out of the React Compiler**: the virtualizer is one object that changes inside, and a row reads its name and eye from the same entity object after it changed, so the compiler would keep old values *(standing yes, 2026-11-15)*.
- **Renaming in place** (*as built, step 9*): `RowNameBox` replaces the row's name while it is renamed, an `Entity name` box with the old name selected. Enter or leaving the box calls `renameEntity`, and a refused name shows its reason as status text; Esc closes it with no step. `EntitiesList` holds which row is renamed: a double-click on a name opens that row's box, and an ask from `RenameRequest` scrolls its row into view first, so the row exists to hold the box, then clears the ask. A double-click on the World's name opens nothing and shows `The World can't be renamed`, as Rename does. A box scrolled out of the list closes without renaming, because its row no longer exists *(standing yes, 2026-11-15)*. *Why: the World's reason is the one Rename gives; keeping a scrolled-away row alive only for its box would undo the virtual list.*
- **Dragging rows** (*as built, step 10*): `RowDrag`, in the list's `row-drag/` folder, follows one press from the button going down to the drop, listening on the window, so the drag goes on when the pressed row scrolls out of the virtual list and stops existing. A press on the fold arrow, the eye or the name box never starts one. `dropPointerAt` turns the pointer into a `DropPointer` (above the first row is its top edge, past the last its bottom edge), and `DropLine` draws the target under its row at the target's indent. Past 3 px the drag begins; the release calls `moveEntities`, and a refused move shows its reason as status text. The browser's click after a release, or after Esc, is swallowed, so it doesn't select the row under the pointer. **Scrolling near the edges** starts 40 px from the list's top or bottom and grows to 20 px a frame on the edge or past it. **The keys still reach the editor during a drag**, since `KeyboardInput` listens first, so Ctrl+Z isn't ignored yet as [inspector-and-undo.md](../../requirements/editor/inspector-and-undo.md) asks; until stage 9's `PointerInput` tells the dispatcher a button is held, any change to the rows during a drag ends it as Esc does *(standing yes, 2026-11-15)*. *Why: the rows the drag points at may be gone after an undo, and a drop computed on them would move the wrong entities.*
- **Reveal** (*as built, step 11*): `SelectionReveal`, in `entities-panel/reveal/` and held by `OpenLevel`, follows the selection. A selection made outside the panel, by a command or an undo, unfolds the parents of **every** selected entity, so none is selected out of sight, and asks the panel to scroll the **newest** one's row into view; the panel clears the ask. A selection the panel makes itself goes through `fromPanel`: a click's row is already on screen, and a drop into a folded group must leave it folded, as chosen above. The list scrolls in an effect after the render that gave the virtualizer the new row count, since unfolding adds rows it doesn't know yet; F2's rename scrolls the same way. **The panel paints its first rows 21 to 42 ms after mounting at 10,000 entities** in Chromium, Firefox and WebKit on the owner's laptop, under the 0.2 s target *(standing yes, 2026-11-15)*. *Why: the requirement unfolds the groups above a row selected in the level view; the Select tool comes in stage 9, and it will select through the same `Selection`, so it needs nothing more.*
- **The 10,000-row tests are browser tests** (Vitest in three browsers), which build the level in the test, not Playwright tests of the page. *Why: the page can't load a level until Import in stage 12, and a way to make one only for tests would ship test code.*

## Stage 8's choices

Made under the standing yes (2026-11-15), before building. The [plan](../../plan.md#stage-8-in-steps) has the steps.

- **Stage 8 builds the Inspector, not what links it to later stages.** The entity field's picker that waits for a click in the level view needs stage 9's `ToolController`, so it comes then; stage 8 builds the dropdown and dropping a row. The read-only state during play comes with stage 16, the lock with v3, and the failed save's message with stage 12, which calls `setLevelWide`. *Why: a stage never builds what a later stage owns.*
- **Card folds are kept in memory until stage 12.** `CardFolds` holds one switch per component type behind a small `FoldStore` contract; stage 12's `LocalStorageSettings` fulfils it, so the folds then survive a reload, as the requirement says. Folding is never a step.
- **The Inspector's writes are edits, not commands**, like `renameEntity` and `moveEntities`, since each takes values no menu can give: `setFieldValue(openLevel, ids, typeName, key, value)` (the "`SetValuesCommand`" above), `addComponent`, `removeComponent` and `resetComponent`. Each works on every given entity that has (or, for Add, lacks) the component, as one step labelled `Change Linear damping`, `Add BodyComponent`, `Remove BodyComponent` or `Reset BodyComponent`. A derived field goes through its `write`; a refused write gives its reason as status text and no step. `AddComponentChange` and `RemoveComponentChange` keep the removed component's values, cloned, so undo gives them back exactly.
- **Reset to defaults resets the fields, not the stored values**, so a shape keeps its geometry and a path its points. A card with no field of its own (the ShapeComponent, whose fields are all derived) has Reset disabled with `Nothing to reset`. *Why: resetting a crate's shape to a 100 px square would be a surprise the menu entry doesn't announce.*
- **Add Component and Remove give their reasons** (*proposal*). Never listed: the TransformComponent and the NameComponent (every entity has them), the PathComponent (v1 makes one only with a Rope or Spring). Listed but disabled: the JointComponent, `Only the Joint tool adds a joint`; the CameraComponent, `A level has one camera`; the PhysicsWorldComponent, `Only the World has one`; on the World, the BodyComponent and the SurfaceComponent, `The World is never solid`. Remove is disabled on the TransformComponent (`Every entity has a TransformComponent`), the camera's CameraComponent and the World's own components (`The camera needs it`, `The World needs it`), and a JointComponent (`Delete the joint to remove it`). With several selected, an entry is disabled when any selected entity refuses it, with that reason, and a component every one already has isn't listed.
- **Changing Kind keeps the shape in place:** `convertShape` gives the new geometry and the offset from the old bounds' centre to the new one's, and the edit moves the TransformComponent's Position by that offset through its matrix, both in one step labelled `Change Kind`. *Why: a polygon's bounds needn't be centred on its origin, but a rectangle and a circle always are.*
- **Mass needs which shapes merge, so stage 8 builds the smallest `mergesInto(entity, level)` in `core/physics`**: the nearest entity above with a BodyComponent, skipping groups without one, unless the entity's own Merge is unticked. Stage 13's `BodyMembership` uses it rather than having its own. Mass shows only on a Dynamic body, as [bodies](../../requirements/physics/bodies.md) says. A merged entity's own BodyComponent fields are greyed, all but Merge, with their values kept.
- **`ValueInput`'s texts** (*proposal*): `Not a number` for text that can't be read, `Too large` past 1e9 either way (v1 has no arithmetic, so dividing by zero can't be typed until v3), `Max is 1500` and `Min is 0` for 2 seconds after clamping. A slider commits once, when it is let go; stage 9's `LiveEdit` makes it change the level while dragging.
- **The colour field uses the browser's own picker**, `input type="color"`, committing on its `change` event, so one pick is one step whatever the dragging inside it. A code typed in the box commits like a number. An empty fill has a None switch beside the swatch. *Why: a picker of the game's own is the v3 polish; the browser's commits once, so it needs no `LiveEdit`.*
- **The list field's +** adds a copy of the last item, at the end; each row has a remove button. Past `minItems` or `maxItems` the change is refused with `Points needs at least 3` or `Points holds at most 1000`. The list's folded state is kept per field type and key, in memory, like a card's. *Why: a copy of the last point is always valid and is where the user is already looking.*
- **The PathComponent's Points stays a read-only count in v1.** The path point field type comes with v2's pen; a list without it would have nothing to show each point with. This is the closest fix to [components-and-fields.md](../core-model/components-and-fields.md)'s "list of path points, read-only in v1".
- **The entity field's dropdown** is searchable and lists the level's entities by name in panel order, up to the first 50 that match the search, without the field's own entity, the World or the camera. A dropped Entities panel row sets it the same way. Both are one step.
- **The editor messages' count** sits at the right of the status bar, `2 warnings`, hidden at none; clicking it opens a menu listing them, and picking one selects its entity. `EditorMessages` belongs to `OpenLevel`, like the selection, because it follows one level. The rules run on the next frame from `FrameScheduler` after a `LevelUpdate`, only for the entities it names.
- **`InspectorModel` belongs to `OpenLevel`**, built with the registry, and its `version` moves with the selection, the shown entities' versions, the messages for them and the folds. The Inspector redraws per card: each `Card` reads its own `CardModel`, so typing in one card redraws that card.
- **`RowKindIcon` moves to `ui/shared`**, since the Inspector's header shows the same kind icon as the Entities panel row.
- *As built (step 2, standing yes, 2026-11-15):* `ListFieldType` in `core/fields/field-types/` parses, normalizes, clones, serializes and compares through its item type, and refuses a list past its limits as `tooFewItems` or `tooManyItems` with the limit, so the editor can write `Points needs at least 3`. One field type can't hold two minimums, so the ShapeComponent's Points takes 2 to 1,000 vectors and its write refuses a polygon under 3 with the same reason. Reading Points gives a copy of the points. Its hover text became `Its points, in pixels in the shape's own space. Double-click the shape to edit them.`, since round 9's text described a count.
- *As built (step 3, standing yes, 2026-11-15):* `convertShape(geometry, kind)` in `core/geometry/conversion/` gives the new geometry and the `offset`, in the shape's own space, from the old origin to where the new one goes, so the new bounds keep the old centre. It can't import `core/fields`, which imports geometry, so a line of 2 points refused as a polygon gives `minPointCount: 3`, and Kind's `write` turns it into `tooFewPoints`. Kind's `write` changes only the geometry: step 6's edit moves the TransformComponent by the offset. **A flat line keeps the smallest sizes**: as a rectangle it is 1 px tall, as a circle 1 px across, rather than refused. *Why: changing kind never fails for a line that already exists, and the stored geometry has the same limits.* The rectangle's and circle's outlines moved from `ShapePieces` to `ShapeOutlines`, so the 32 points a circle becomes are the ones it collides with. Kind's hover text became `What the shape is. Changing it keeps its place and size.`, since it is no longer only set when drawn.
