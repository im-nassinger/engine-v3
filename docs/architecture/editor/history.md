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
- A `RemoveEntitiesChange` keeps the whole subtree as `EntityData`, the same shape as the file, and its revert reads it back with `Level.restoreEntity`. One copy format, tested by every save.
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
    constructor(level: Level, history: History, selection: Selection, currentGroup: CurrentGroup);

    edit(label: string, work: (transaction: EditTransaction) => EditOutcome): EditOutcome;
    recordApplied(label: string, changes: readonly LevelChange[], joinKey?: string): void;  // drags, nudges
}

export type EditOutcome =
    | { kind: 'done'; selectAfter?: readonly EntityId[]; skipped?: readonly SkippedEntity[] }
    | { kind: 'refused'; reason: RefusalReason };
```

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
    record(step: HistoryStep): void;        // clears redo, drops the oldest past 512
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
