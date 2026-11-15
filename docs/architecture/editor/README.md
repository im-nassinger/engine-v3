# Editor

## TL;DR

`src/editor` holds every editing rule, with no browser code: undo, selection, the current group, tools, what the Inspector and the Entities panel show, editor messages, the clipboard format, shortcuts and menu commands, plus saving and test play as use cases (described in [persistence.md](../persistence.md) and [simulation.md](../simulation.md)). The root object is **`EditorSession`**. It holds the **`OpenLevel`**: the level open in the editor together with everything that belongs to it (its caches, selection, current group, history and editor messages), which New and Import replace as one piece. Every change to the level goes through an **edit transaction** and becomes one **history step**.

## Files

| File | Covers |
|---|---|
| [history.md](history.md) | Changes, edit transactions, history steps, joining, drags, what is and isn't a step |
| [selection-and-tools.md](selection-and-tools.md) | The selection, the current group, hit testing, the tool contract, the Select, Shape and Joint tools, snapping, Esc |
| [inspector-and-entities.md](inspector-and-entities.md) | What the Inspector shows and how a typed value becomes a change, editor messages, the Entities panel's rows and drops |
| [clipboard-and-shortcuts.md](clipboard-and-shortcuts.md) | Copy, cut, paste and duplicate, commands and the main menu, shortcuts and keys |

## The objects

```typescript
export class EditorSession {
    readonly commands: CommandRegistry;
    readonly tools: ToolController;
    readonly view: ViewState;               // pan and zoom of the level view
    readonly viewSettings: ViewSettings;    // grid shown, View menu switches, folded cards
    readonly saving: SaveCoordinator;       // see persistence.md
    readonly play: PlaySession;             // see simulation.md
    readonly status: StatusText;            // the status bar's left slot
    readonly shortcuts: ShortcutDispatcher;
    readonly openLevelChanged: VersionCounter;

    get openLevel(): OpenLevel;
    replaceOpenLevel(level: Level): void;   // New, Import, loading the saved level
}

export class OpenLevel {
    readonly level: Level;
    readonly caches: DerivedCaches;         // world matrices, hidden, bounds, pieces
    readonly selection: Selection;
    readonly currentGroup: CurrentGroup;
    readonly history: History;
    readonly messages: EditorMessages;
    readonly hitTester: HitTester;
    readonly editor: LevelEditor;           // runs edit transactions, see history.md
}
```

- **Why `OpenLevel`:** New and Import replace the level, and with it the history, the selection and the current group. Keeping them in one object means replacing one reference, so nothing can point at the old level by mistake.
- `EditorSession` is built once, in `app/EditorComposition.ts`, with every contract (clock, timers, storage, game runner) passed to its constructor. Tests build it with fakes.
- During test play the editor's `OpenLevel` is left alone. The page's copy of the running level is the `PlayMirror`, see [simulation.md](../simulation.md#the-page-side).

## How a user's edit flows

```
key, click or panel  ->  EditorCommand.run()        (editor/commands)
                     ->  LevelEditor.edit(label, work)
                           work applies LevelChanges through an EditTransaction
                     ->  History records one HistoryStep
                     ->  Level raises LevelUpdates
                     ->  caches mark themselves, React panels and the PixiJS view redraw
                     ->  Autosave notices levelVersion moved and schedules a save
```

Tools follow the same path when they finish: the Shape tool's release runs a command that creates the shape.

## Stage 5's choices

Made under the standing yes (2026-11-15), before building. The [plan](../../plan.md#stage-5-in-steps) has the steps.

- **Stage 5 builds the editor's rules, not its page.** `CommandRunner`, the menu, `KeyboardInput` and `ShortcutDispatcher` are stage 6's; F2's renaming in place is the Entities panel's (stage 7); Esc's `EscapeChain` and double-click are stage 9's. `app/startLevelView.ts` and `app/testLevel.ts` stay until stage 6's editor page replaces them. *Why: a stage never builds what a later stage owns.*
- **`EditorSession` starts with what exists:** `commands`, `view`, `viewSettings`, `status`, `openLevel` and `openLevelChanged`. `shortcuts` joins it in stage 6, `tools` in stage 9, `saving` in stage 12 and `play` in stage 16. **`OpenLevel` starts without `messages` (stage 8) and `hitTester` (stage 9).**
- **`DerivedCaches` lives in `core/derived`**, holding the `WorldMatrixCache`, `HiddenCache`, `PiecesCache` and `BoundsCache` built for one level. *Why: the `PlayMirror` (stage 16) needs the same four for its copy, and core can't import the editor.*
- **`Clock` and `Timer` are contracts in `editor/time`**, with `ManualClock` and `ManualTimer` in `editor/time/testing`. `SystemClock` and `BrowserTimer` come with the page's wiring in stage 6.
- **`CurrentGroup` lives in `editor/session`** and `Selection` in `editor/selection`, as [parts-and-folders.md](../parts-and-folders.md) lists them.
- **A removed subtree is read back by `LevelReader.readSubtree(level, data, parent, index)`**, with the same checks as a file. `RemoveEntitiesChange` holds the `EntityData` that `LevelWriter.writeSubtree` gave, and a refusal on revert is a bug, so it throws. *Why: one copy format and one reader, which paste (stage 11) uses too, with its refusals shown.*
- **The changes live in `editor/history/changes/`.** `AddComponentChange` and `RemoveComponentChange` come with the Inspector in stage 8, and `LiveEdit` with drags in stage 9.
- **Commands that need a typed value are split.** Renaming an entity and renaming the level are edits, `renameEntity(openLevel, id, text)` and `renameLevel(openLevel, text)`, each returning an `EditOutcome`; the Entities panel and the top bar call them. The Edit menu's Rename (F2) only starts renaming in the panel, so it comes with stage 7. An entity's name is trimmed; an empty one keeps the old name and makes no step; past 64 characters it is refused. The level's name follows [saving](../../requirements/play-and-save/saving.md).
- **Step labels** name the entity when there is one and count otherwise: `Delete Square`, `Delete 3 entities`, `Group 2 entities`, `Hide Square`, `Rename Square`, `Rename level`. **Undo's status text** is `Undid: Delete Square`, redo's `Redid: Delete Square`; with nothing to undo or redo the command is disabled with the reason `Nothing to undo` or `Nothing to redo` (*proposal*).
- **`outcomeText` in `editor/status`** turns a command's `skipped` and `refused` into the status bar's sentence: `Camera kept`, `World kept`, `World and camera kept`; a refusal's own reason as it is. Stage 6's `CommandRunner` shows it.
- **Delete** skips the World and the camera, removes the selection with every subtree, and **also removes every joint whose A or B is in a removed subtree**, as the requirement says. Joints already inside a removed subtree go with it.
- **Hide or show** hides every selected entity when any of them is shown, and shows them all otherwise (*proposal*), as Figma does. The World is skipped; the camera can be hidden.
- **Select all** selects the current group's direct children, without the World and the camera, and is disabled with nothing to select.
- **Group** skips the World and the camera, puts the new group in the current group at the place of the frontmost selected entity (the one highest in the Entities panel), with its origin at the centre of the selection's bounds and no rotation, scale 1 and skew 0, and moves the entities into it **in their panel order**, each kept in place on screen with `Matrix2D`. When the selected entities weren't one unbroken run of rows in one group, the draw order changed and the status text says `Draw order changed`. The new group is named by the smallest `EntityNamer`, one more than the highest number already used with the word "Group", in `editor/commands`, which stage 10 extends.
- **Ungroup** works on each selected entity that has children (the World and the camera skipped): its children move to its place in its parent, kept in place on screen and selected, and the group is removed with its components. The status text names what was removed when the group had components other than TransformComponent and NameComponent: `Removed with the group: BodyComponent`. With nothing to ungroup it is disabled.
- **Go into group** is available with one selected entity that has children, the camera included. It enters it and clears the selection, since there is no mouse to pick a child (*proposal*).
- **As built, step 7 (standing yes, 2026-11-15):** `EditorSession` doesn't hold `commands`: `createCommandRegistry(session)` in `editor/commands` builds the registry on top of it, and each command reads `session.openLevel` when it runs, so replacing the open level needs no new registry. *Why: `editor/session` importing `editor/commands`, whose commands take the session, would be an import cycle.* `CommandOutcome`'s `done` carries an optional `text` (`Undid: Delete Square`), which `outcomeText` puts before what was kept: `Undid: Hide Square. Camera kept`. `outcomeText` takes its own `ReportedOutcome` shape, so `editor/status` never imports `editor/commands`. `CommandRegistry.menu(name)` gives the commands themselves, sorted by section then order; stage 6's menu reads label, shortcuts and availability from them. Command ids are `menu.name`: `edit.undo`, `edit.redo`, `edit.selectAll`.
- **The View commands** call `ViewState` and `ViewSettings` and are never steps. Selection (F) fits the selection's bounds, joints' icons included, or the whole level when nothing is selected; Camera frame fits the camera's frame.
