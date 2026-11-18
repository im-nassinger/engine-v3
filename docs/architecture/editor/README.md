# Editor

## TL;DR

`src/editor` holds every editing rule, with no browser code: undo, selection, the current group, tools, what the Entity inspector and the Entities viewer show, editor messages, the clipboard format, shortcuts and menu commands, plus saving and test play as use cases (described in [persistence.md](../persistence.md) and [simulation.md](../simulation.md)). The root object is **`EditorSession`**. It holds the **`OpenLevel`**: the level open in the editor together with everything that belongs to it (its caches, selection, current group, history and editor messages), which New and Import replace as one piece. Every change to the level goes through an **edit transaction** and becomes one **history step**.

## Files

| File | Covers |
|---|---|
| [history.md](history.md) | Changes, edit transactions, history steps, joining, drags, what is and isn't a step |
| [selection-and-tools.md](selection-and-tools.md) | The selection, the current group, hit testing, the tool contract, the Select and Joint tools, snapping, Esc |
| [drawing-and-points.md](drawing-and-points.md) | The Shape tool, point editing, and stage 10's choices |
| [inspector-and-entities.md](inspector-and-entities.md) | What the Entity inspector shows and how a typed value becomes a change, editor messages, the Entities viewer's rows and drops |
| [clipboard-and-shortcuts.md](clipboard-and-shortcuts.md) | Copy, cut, paste and duplicate, commands and the main menu, shortcuts and keys, and stage 11's choices |

## The objects

```typescript
// As built in stage 5, with the fields later stages add marked.
export class EditorSession {
    readonly view: ViewState;               // pan and zoom of the level view
    readonly viewSettings: ViewSettings;    // grid shown, View menu switches, folded cards
    readonly reader: LevelReader;           // puts removed entities back on undo
    readonly status: StatusText;            // the status bar's left slot
    readonly openLevelChanged: VersionCounter;
    // later: tools (stage 9), saving: none, the composition holds Autosave (stage 12, see persistence.md),
    // play: PlaySession (stage 16, see simulation.md), shortcuts (stage 6)

    constructor(options: EditorSessionOptions);  // level, clock, timer, and optionally viewSettings and reader
    get openLevel(): OpenLevel;
    replaceOpenLevel(level: Level): void;   // New, Import, loading the saved level
}

export class OpenLevel {
    readonly level: Level;
    readonly caches: DerivedCaches;         // world matrices, hidden, bounds, pieces
    readonly selection: Selection;
    readonly currentGroup: CurrentGroup;
    readonly history: History;
    readonly editor: LevelEditor;           // runs edit transactions, see history.md
    readonly messages: EditorMessages;      // see inspector-and-entities.md
    // later: hitTester: HitTester (stage 9)
}

// The commands are built on top of the session, not held by it (see "As built, step 7" below).
const commands: CommandRegistry = createCommandRegistry(session);
```

- **Why `OpenLevel`:** New and Import replace the level, and with it the history, the selection and the current group. Keeping them in one object means replacing one reference, so nothing can point at the old level by mistake.
- `EditorSession` will be built once, in `app/EditorComposition.ts` (stage 6), with every contract (clock, timers, storage, game runner) passed to its constructor. Tests build it with fakes.
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

Made under the standing yes (2026-11-15), before building. The [plan](../../steps/stage-05.md) has the steps.

- **Stage 5 builds the editor's rules, not its page.** `CommandRunner`, the menu, `KeyboardInput` and `ShortcutDispatcher` are stage 6's; F2's renaming in place is the Entities viewer's (stage 7); Esc's `EscapeChain` and double-click are stage 9's. `app/startLevelView.ts` and `app/testLevel.ts` stay until stage 6's editor page replaces them. *Why: a stage never builds what a later stage owns.*
- **`EditorSession` starts with what exists:** `commands`, `view`, `viewSettings`, `status`, `openLevel` and `openLevelChanged`. `shortcuts` joins it in stage 6, `tools` in stage 9, `saving` in stage 12 and `play` in stage 16. **`OpenLevel` starts without `messages` (stage 8) and `hitTester` (stage 9).**
- **`DerivedCaches` lives in `core/derived`**, holding the `WorldMatrixCache`, `HiddenCache`, `PiecesCache` and `BoundsCache` built for one level. *Why: the `PlayMirror` (stage 16) needs the same four for its copy, and core can't import the editor.*
- **`Clock` and `Timer` are contracts in `editor/time`**, with `ManualClock` and `ManualTimer` in `editor/time/testing`. `SystemClock` and `BrowserTimer` come with the page's wiring in stage 6.
- **`CurrentGroup` lives in `editor/session`** and `Selection` in `editor/selection`, as [parts-and-folders.md](../parts-and-folders.md) lists them.
- **A removed subtree is read back by `LevelReader.readSubtree(level, data, parent, index)`**, with the same checks as a file. `RemoveEntitiesChange` holds the `EntityData` that `LevelWriter.writeSubtree` gave, and a refusal on revert is a bug, so it throws. *Why: one copy format and one reader, which paste (stage 11) uses too, with its refusals shown.*
- **The changes live in `editor/history/changes/`.** `AddComponentChange` and `RemoveComponentChange` come with the Entity inspector in stage 8, and `LiveEdit` with drags in stage 9.
- **Commands that need a typed value are split.** Renaming an entity and renaming the level are edits, `renameEntity(openLevel, id, text)` and `renameLevel(openLevel, text)`, each returning an `EditOutcome`; the Entities viewer and the top bar call them. The Edit menu's Rename (F2) only starts renaming in the panel, so it comes with stage 7. An entity's name is trimmed; an empty one keeps the old name and makes no step; past 64 characters it is refused. The level's name follows [saving](../../requirements/play-and-save/saving.md).
- **Step labels** name the entity when there is one and count otherwise: `Delete Square`, `Delete 3 entities`, `Group 2 entities`, `Hide Square`, `Rename Square`, `Rename level`. **Undo's status text** is `Undid: Delete Square`, redo's `Redid: Delete Square`; with nothing to undo or redo the command is disabled with the reason `Nothing to undo` or `Nothing to redo` (*proposal*).
- **`outcomeText` in `editor/status`** turns a command's `skipped` and `refused` into the status bar's sentence: `Camera kept`, `World kept`, `World and camera kept`; a refusal's own reason as it is. Stage 6's `CommandRunner` shows it.
- **Delete** skips the World and the camera, removes the selection with every subtree, and **also removes every joint whose A or B is in a removed subtree**, as the requirement says. Joints already inside a removed subtree go with it.
- **Hide or show** hides every selected entity when any of them is shown, and shows them all otherwise (*proposal*), as Figma does. The World is skipped; the camera can be hidden.
- **Select all** selects the current group's direct children, without the World and the camera, and is disabled with nothing to select.
- **Group** skips the World and the camera, puts the new group in the current group at the place of the frontmost selected entity (the one highest in the Entities viewer), with its origin at the centre of the selection's bounds and no rotation, scale 1 and skew 0, and moves the entities into it **in their panel order**, each kept in place on screen with `Matrix2D`. When the selected entities weren't one unbroken run of rows in one group, the draw order changed and the status text says `Draw order changed`. The new group is named by the smallest `EntityNamer`, one more than the highest number already used with the word "Group", in `editor/commands`, which stage 10 extends.
- **Ungroup** works on each selected entity that has children (the World and the camera skipped): its children move to its place in its parent, kept in place on screen and selected, and the group is removed with its components. The status text names what was removed when the group had components other than TransformComponent and NameComponent: `Removed with the group: BodyComponent`. With nothing to ungroup it is disabled.
- **Go into group** is available with one selected entity that has children, the camera included. It enters it and clears the selection, since there is no mouse to pick a child (*proposal*).
- **As built, step 7 (standing yes, 2026-11-15):** `EditorSession` doesn't hold `commands`: `createCommandRegistry(session)` in `editor/commands` builds the registry on top of it, and each command reads `session.openLevel` when it runs, so replacing the open level needs no new registry. *Why: `editor/session` importing `editor/commands`, whose commands take the session, would be an import cycle.* `CommandOutcome`'s `done` carries an optional `text` (`Undid: Delete Square`), which `outcomeText` puts before what was kept: `Undid: Hide Square. Camera kept`. `outcomeText` takes its own `ReportedOutcome` shape, so `editor/status` never imports `editor/commands`. `CommandRegistry.menu(name)` gives the commands themselves, sorted by section then order; stage 6's menu reads label, shortcuts and availability from them. Command ids are `menu.name`: `edit.undo`, `edit.redo`, `edit.selectAll`.
- **As built, step 8 (standing yes, 2026-11-15):** `EditorSession` holds a `reader`, the `LevelReader` that `RemoveEntitiesChange` puts entities back with, the v1 reader unless the options give one. Delete (`edit.delete`, Del and Backspace) and Hide or show (`edit.hideOrShow`, Ctrl+Shift+H) are classes in `commands/edit/`; `renameEntity` and `renameLevel` are functions in `commands/rename/`; `skipEntities` (the skip rule) and `stepLabel` are in `commands/shared/`, and the tests' shared session in `commands/testing/`. Delete finds the attached joints again after each joint it adds, because a removed joint's children can be another joint's end. With nothing left after skipping, a command is disabled with a reason naming what was kept: `The camera can't be deleted`, `The World can't be deleted`, `The World can't be hidden`, or `Nothing selected`. Renaming the World is refused (`The World can't be renamed`), a name past 64 characters too (`A name can be at most 64 characters`, the limit read from the name field), and a level name past 60 (`A level name can be at most 60 characters`, from `Level.maxNameLength`). An empty or unchanged level name keeps the old one with no step, as an entity's does. A rename's step is labelled with the old name: `Rename Square`.
- **As built, step 9 (standing yes, 2026-11-15):** Group (`arrange.group`, Ctrl+G), Ungroup (`arrange.ungroup`, Ctrl+Shift+G) and Go into group (`arrange.goIntoGroup`, Enter) are classes in `commands/arrange/`. **The new group goes into the frontmost selected entity's parent**, which is the current group whenever the selection was made in the level view; a selection made in the Entities viewer at another depth gets its group where its frontmost row was, as the requirement says ("sits where the frontmost selected entity was"). *Why: the current group can be a place none of the selected rows is in, and the requirement names the frontmost row's place.* The new group's id comes from `Level.allocateId()` and its data from `LevelWriter.writeNewEntity`, so `AddEntitiesChange` adds it like any other entity. A member that draws nothing counts as its origin for the centre. Going past `Level.maxDepth` is refused before anything changes: `Groups can be at most 256 deep`. Group's refusals name what was kept (`The World can't be grouped`, `The camera can't be grouped`) or `Nothing selected`. **Ungroup also removes the joints attached to the removed group**, since deleting an entity deletes the joints attached to it ([joints](../../requirements/physics/joints.md)), and the status text lists them by name after the components: `Removed with the group: BodyComponent, Hinge`. A selected entity without children stays selected next to the freed children. Go into group is disabled with `Select one group to go into`. `EntityNamer(level).nextName(word)`, `attachedJoints` (moved out of Delete), `inPanelOrder` and `transformUnder` (keeping an entity in place under a new parent) are in `commands/shared/`.
- **The View commands** call `ViewState` and `ViewSettings` and are never steps. Selection (F) fits the selection's bounds, joints' icons included, or the whole level when nothing is selected; Camera frame fits the camera's frame.
- **As built, step 10 (standing yes, 2026-11-15):** the View commands are classes in `commands/view/`, in three menu sections: the four switches, then Zoom in (`view.zoomIn`, + and Ctrl+=), Zoom out (`view.zoomOut`, - and Ctrl+-) and 100% (`view.zoomTo100`, Shift+0), then Whole level (`view.fitWholeLevel`), Selection (`view.fitSelection`, F) and Camera frame (`view.fitCameraFrame`, Shift+3). **The switches are one `ViewSwitchCommand`** built four times from `VIEW_SWITCH_ENTRIES`: Grid (`view.grid`, G), Joint icons (`view.jointIcons`, Shift+J), Camera frame (`view.cameraFrame`, Shift+C) and Physics view (`view.physicsView`, Shift+P). **Joint icons and Camera frame got Shift+J and Shift+C**, since the requirement says each switch has a shortcut but the shortcut list named none for them; both letters were free. **`EditorCommand` gained an optional `checked()`**, which only a switch has, so stage 6's menu can tick it. Grid snapping (Shift+G) came with `GridSnapper` in stage 9, as a fifth switch. Whole level fits the level bounds (`levelBoundsOf`). **Selection fits the union of each selected entity's subtree bounds; one whose subtree draws nothing counts as its origin**, as in Group. **A single point is only centred, keeping the zoom**, because `ViewState.fit` would zoom to 1000% on an empty group's origin (*proposal*). A joint's bounds hold the point its icon sits on; the icon's 8 screen px reach stays inside the fit's 40 px margin, so fitting needs no zoom-dependent size. Camera frame fits the camera's frame even when the camera is hidden. Zoom in and Zoom out are disabled at the ends of the range with `Already at 1000%` and `Already at 1%` (*proposal*).
