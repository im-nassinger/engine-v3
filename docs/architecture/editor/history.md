# Undo and history

## TL;DR

Every edit to the level is a **change**: a small object that can apply itself and revert itself (the Command pattern). A command collects its changes in an **edit transaction**, which applies them at once and reverts all of them if the command fails halfway, so a command is all or nothing. The finished set becomes one **history step** with a label, and the selection and current group before and after it. The **`History`** keeps **512 steps** (owner, 2026-11-13), joins arrow-key runs, and is lost on reload. Drags change values live without history and record one step on release.

## Changes

```typescript
export type LevelChange = {
    apply(level: Level): void;
    revert(level: Level): void;
};
```

Changes point at entities by id, never by object, because undo of a delete creates new `Entity` objects with the old ids. The set of change classes is closed and small:

| Change | Holds | Used by |
|---|---|---|
| `AddEntitiesChange` | `EntityData` of each subtree, the parent id and index | Create, paste, duplicate, group (the new group) |
| `RemoveEntitiesChange` | The same, read before removing | Delete, cut, ungroup (the group) |
| `MoveEntityChange` | Old and new parent and index, old and new TransformComponent values | Reorder, move into a group, group, ungroup |
| `SetValueChange` | Entity id, component type, key, old value, new value (both cloned) | Inspector edits, drags, nudges, resizing |
| `AddComponentChange`, `RemoveComponentChange` | The component's values | Add Component, Remove |
| `SetSwitchChange` | Entity id, `hidden` or `locked`, old and new | The eye and the lock |
| `RenameLevelChange` | Old and new name | The top bar |

- **As built (standing yes, 2026-11-15):** a change writes a value back through its file form, the value type's `serialize` then the component's `writeValue`, the one path that parses every value type, entity links and paths included. A change refused on apply or revert was built wrong, so it throws instead of returning an outcome; the command checked the edit before building it. `MoveEntityChange` moves first and then writes all four TransformComponent values.
- A `RemoveEntitiesChange` keeps the whole subtree as `EntityData`, the same shape as the file, and its revert reads it back with `LevelReader.readSubtree`, which uses `Level.restoreEntity`. One copy format, tested by every save.
- **As built (standing yes, 2026-11-15):** `AddEntitiesChange` and `RemoveEntitiesChange` share a `SubtreeCopy`: the `EntityData` list (cloned through JSON text), the place of its first root, and the `LevelReader` given to them. Putting reads the list back; taking removes each root by id. `RemoveEntitiesChange.ofEntity(reader, entity)` writes one entity's subtree and its place before it is removed, so Delete makes **one change per removed subtree**, removed bottom row first, and undo puts each back at its own index. *Why: one place per change can't put back siblings that weren't side by side.*
- New change classes come with new kinds of data in v2 (files in the Assets panel, script edits). The tech notes' byte limit on history only matters once files exist; `History` measures each step's size from v2 on.

## Edit transactions

```typescript
export class EditTransaction {
    constructor(level: Level);
    apply(change: LevelChange): void;       // applies now and remembers it
    get isEmpty(): boolean;
    rollback(): void;                       // reverts everything, newest first
    takeChanges(): readonly LevelChange[];
}

export class LevelEditor {
    constructor(options: { level: Level; history: History; selection: EditedSelection; currentGroup: EditedGroup });

    edit(label: string, work: (transaction: EditTransaction) => EditOutcome): EditOutcome;
    recordApplied(label: string, changes: readonly LevelChange[], joinKey?: string): void;  // drags, nudges
    undo(): HistoryStep | undefined;        // also puts back the selection and group from before
    redo(): HistoryStep | undefined;        // and from after
}

export type EditOutcome =
    | { kind: 'done'; selectAfter?: readonly EntityId[]; skipped?: readonly SkippedEntity[] }
    | { kind: 'refused'; reason: string };

export type SkippedEntity = { id: EntityId; kind: 'world' | 'camera' };
```

- **As built (standing yes, 2026-11-15):** `EditedSelection` (`ids`, `replace`) and `EditedGroup` (`path`, `restore`) are the shapes `LevelEditor` needs of `Selection` and `CurrentGroup`, declared in `editor/history`, so history imports neither module. *Why: `editor/session` builds on history (the `EditorSession`), and a module circle is refused by dependency-cruiser.* A refusal's `reason` is the status bar's sentence itself, written by the command, as `CommandOutcome`'s is. `SkippedEntity` says which kind was kept, for `outcomeText`'s `Camera kept`.
- **As built (standing yes, 2026-11-15):** `LevelEditor` has `undo` and `redo`, which call `History` and then put back the step's current group, then its selection, leaving out ids no longer in the level. A refused or throwing command also puts back the selection and group from before, since a rolled-back removal had dropped the entity from the selection. `selectAfter` is applied before the step is recorded, so the step's `selectionAfter` is what redo selects.

- `edit` remembers the selection and current group, runs `work`, and:
  - on `done` with changes: records one step, then applies `selectAfter`;
  - on `done` with no changes: records nothing (the requirement: "a command that changes nothing makes no step");
  - on `refused`, or if `work` throws: rolls the transaction back, so the level is exactly as before. A thrown error is then rethrown.
- Changes are applied as they are added, so later code in the same command sees the level as it now is (for example, Group adds the group and then moves entities into it).
- **Limits are checked before any change** where possible (a paste over 100,000 entities is refused whole), and by rollback otherwise.

## History

```typescript
export class History {
    static readonly stepLimit = 512;

    readonly version: VersionCounter;

    constructor(clock: Clock);
    record(step: NewHistoryStep): void;     // stamps the time, clears redo, drops the oldest past 512
    undo(level: Level): HistoryStep | undefined;
    redo(level: Level): HistoryStep | undefined;
    get undoLabel(): string | undefined;    // "Move 3 entities", for the tooltip and the status text
    get redoLabel(): string | undefined;
    clear(): void;
}

export type HistoryStep = {
    readonly label: string;
    readonly changes: readonly LevelChange[];
    readonly selectionBefore: readonly EntityId[];
    readonly selectionAfter: readonly EntityId[];
    readonly groupPathBefore: readonly EntityId[];   // from the World down to the current group
    readonly groupPathAfter: readonly EntityId[];
    readonly joinKey: string | undefined;
    readonly recordedAtMs: number;
};
```

- **Undo restores the selection and the current group.** The group is stored as a path, so if that group no longer exists the editor lands in the nearest one above it that does, as the requirement says.
- **Joining:** a step with the same `joinKey` as the last one, recorded within 1 second of it, joins it instead of making a new step. The arrow keys use the key `nudge:` plus the selected ids, so a run of nudges is one step, and selecting something else starts a new one. Joined `SetValueChange`s on the same value keep the first old value and the last new value.
- **As built (standing yes, 2026-11-15):** `record` takes a `NewHistoryStep`, the step without `recordedAtMs`, and stamps it from the `Clock`. Only the step recorded last can be joined: after an undo or redo, a step with the same key starts a new one. A joined step keeps the first step's selection and group before, and takes the rest from the newest, its time included, so a run keeps joining while each step comes within a second of the one before. `SetValueChange`s are merged (`joinedWith`) only when both steps hold nothing but value edits; otherwise the changes are kept in order, because a move between two edits of a value would be reverted in the wrong order. `undoCount` and `redoCount` are there for tests and the menu.
- Undo never moves the view. If the undone change is off screen, the status text still says `Undid: Move 3 entities`.
- Undo and Redo are off during test play; the commands' availability says so.

## Drags and live edits

A drag changes values every frame but must be one step.

```typescript
export class LiveEdit {
    constructor(level: Level, editor: LevelEditor);
    begin(targets: readonly ValueTarget[]): void;      // remembers the starting values
    update(target: ValueTarget, value: unknown): void; // writes the value now, no history
    commit(label: string): void;                       // one step from start values to current values
    cancel(): void;                                    // Esc: writes the start values back
}
```

- Moving, resizing, rotating, dragging points and scrubbing a field (v3) all use `LiveEdit`.
- `commit` builds `SetValueChange`s from the remembered start values to the current values and calls `LevelEditor.recordApplied`, because the values are already in place.
- Ctrl+Z is ignored while a mouse button is held in a drag, and losing window focus cancels the drag, as the requirements say.
- **As built (standing yes, 2026-11-15):** a `ValueTarget` is `{ entityId, schema, key }`, like a `SetValueChange`'s. `OpenLevel` owns one `LiveEdit`. `update` writes through the file form like the changes do and returns the `ParseOutcome`: a refused value keeps the last good one and the drag goes on, so a tool needs no checks of its own. `commit` leaves out values back where they started, so a drag that ends where it began makes no step. `cancel` returns whether there was a drag, for `EscapeChain`. A second `begin`, or an `update` of a value not begun, throws. While `isActive`, Undo and Redo are disabled with the reason `Not during a drag`. *Why: the requirement's "ignored" is kept by the commands' availability, so the menu shows it too and no key code needs to know about drags.*

## What is and isn't a step

The requirement's table is kept exactly. In code terms:

| Is a step: goes through `LevelEditor` | Isn't a step: changes its owner directly |
|---|---|
| Create, delete, paste, duplicate, group, ungroup, reorder, move between groups | `Selection`, `CurrentGroup` |
| A committed Inspector value, a whole drag, a nudge run | `ViewState`, `ViewSettings` (grid shown, View menu switches, folded cards) |
| Add or remove a component, hide, lock, rename an entity, rename the level | `ToolController` (tool, tool lock), panel sizes |
| World settings, the grid size | Folded Entities panel rows: saved in the file through `LevelEditorData`, but never a step |

- **The grid size** is saved in the project file, and changing it is a step (owner, 2026-11-13). Showing or hiding the grid is a view setting, so it isn't.
- **Text being typed** in a field isn't a step until it is committed. While a field has uncommitted text, Ctrl+Z belongs to the field (the browser's own text undo), see [inspector-and-entities.md](inspector-and-entities.md).
- **During an unfinished drawing**, Ctrl+Z removes the last point. The Shape tool handles it before the shortcut reaches History.
