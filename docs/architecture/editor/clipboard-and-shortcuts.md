# Clipboard, commands and shortcuts

## TL;DR

**Every menu entry and shortcut runs an `EditorCommand`** from one `CommandRegistry`: it has an id, a label, a place in the main menu, its shortcuts, an availability with a reason, and `run()`. The main menu is built from the registry, so it is always "the full list of commands" the requirement asks for. **`ShortcutDispatcher`** matches keys to commands by scope (everywhere, editor, level view) and never binds a key the browser owns. **The clipboard carries entities as tagged JSON text**, written and read by the same code as the level file, so a paste is checked like an import and is refused whole when it is bad or too big.

## Commands

```typescript
export type Availability = { enabled: true } | { enabled: false; reason: string };

export type EditorCommand = {
    readonly id: CommandId;                 // 'arrange.group'
    readonly label: string;                 // 'Group'
    readonly menu: MenuPlace;               // { menu: 'Arrange', section: 1, order: 10 }
    readonly shortcuts: readonly string[];  // 'Ctrl+Shift+G', read by KeyChord
    readonly shortcutScope?: ShortcutScope; // 'editor' when missing
    availability(): Availability;           // a disabled button's tooltip shows the reason
    run(): CommandOutcome;
};

export type CommandOutcome =
    | { kind: 'done'; skipped?: readonly SkippedEntity[] }  // "Camera kept" in the status bar
    | { kind: 'refused'; reason: string }                  // "The camera can't be deleted"
    | { kind: 'needsConfirmation'; question: Question; confirm(): CommandOutcome }
    | { kind: 'notice'; notice: Notice };                  // About: a dialog with only OK

export type Question = { title: string; text: string; confirmLabel: string }; // Cancel is the other button
export type Notice = { title: string; text: string };

export class CommandRunner {                // commands/running/: every caller runs commands through it
    readonly dialog: OpenDialog;            // the one dialog on screen; later ones wait behind it
    run(command: EditorCommand): void;      // a disabled command's reason shows as status text
    confirmDialog(): void;                  // the question's go-ahead: confirm(), then its outcome is shown
    closeDialog(): void;                    // Cancel, OK or Esc: changes nothing
}

export class CommandRegistry {
    register(command: EditorCommand): void;
    find(id: CommandId): EditorCommand | undefined;
    menu(name: MenuName): readonly MenuEntry[];
}
```

- One class per command, grouped by menu: `commands/file/`, `edit/`, `arrange/`, `view/`, `play/`, `help/`. `CommandRunner` and `OpenDialog` are in `commands/running/`. Each takes what it needs through its constructor (the session's `OpenLevel`, the clipboard, the saving coordinator).
- **The skip rule** from the requirements is shared: a command filters out the entities that don't allow it, returns them as `skipped`, and is disabled only when nothing would be left. The status text says what was skipped.
- `needsConfirmation` covers the requirement's questions: "Replace the open level?" before New and Import, and the warning before a move that changes which body an entity belongs to. The UI shows the question and calls `confirm()`.

| Menu | v1 commands |
|---|---|
| File | New, Import (Ctrl+O), Export (Ctrl+S) |
| Edit | Undo, Redo, Cut, Copy, Paste, Duplicate, Delete, Select all, Rename (F2), Hide or show (Ctrl+Shift+H) |
| Arrange | Group (Ctrl+G), Ungroup (Ctrl+Shift+G), Go into group (Enter) |
| View | Grid (G), Grid snapping (Shift+G), Joint icons, Camera frame, Physics view (Shift+P), Zoom in, Zoom out, 100% (Shift+0), Whole level, Selection (F), Camera frame (Shift+3) |
| Play | Play or Stop (Ctrl+Enter), Pause (F8), Step (F9) |
| Tools | Select (1), Shape (4), Joint (6) |
| Help | Keyboard shortcuts, About |

## Keys

```typescript
export class KeyChord {
    static parse(text: string): KeyChord;          // 'Ctrl+Shift+G', 'Shift+3', '?'
    matches(press: KeyPress): boolean;
    sameKeysAs(other: KeyChord): boolean;
    text(platform: KeyboardPlatform): string;       // 'Cmd+Shift+Z' on a Mac
}

export class KeyPress {
    static fromKeyboard(input: KeyboardInputData, platform: KeyboardPlatform): KeyPress | undefined;
}

export class ShortcutMap {
    static fromRegistry(registry: CommandRegistry): ShortcutMap;  // throws on a chord shared in one scope
    matching(press: KeyPress): readonly Shortcut[];
    firstFor(commandId: CommandId): Shortcut | undefined;
}

export type ShortcutScope = 'everywhere' | 'editor' | 'levelView';   // in editor/commands, on EditorCommand
export type FocusPlace = 'level' | 'panel' | 'textField' | 'codeEditor';

export class ShortcutDispatcher {
    constructor(registry: CommandRegistry, runner: CommandRunner, platform: KeyboardPlatform, tools: ToolController, escape: EscapeChain);   // tools and escape from stage 9
    handleKeyDown(input: KeyboardInputData, focus: FocusPlace, pointerOverLevelView: boolean): boolean;
    handleKeyUp(input: KeyboardInputData): void;
}
```

**As built (stage 6, step 2, standing yes, 2026-11-15):**

- **A command's shortcuts stay text** (`readonly shortcuts: readonly string[]`), written as the requirement writes them, and `ShortcutMap` parses them once. *Why: a command file reads like the requirement's table, and a typo fails the map's test instead of hiding in a constructor.* `ShortcutScope` lives in `editor/commands` beside `EditorCommand`, because `editor/shortcuts` imports the registry and the other way round would be a circle.
- **A press and a chord are two classes:** `KeyChord` is what a shortcut asks for, `KeyPress` what the keyboard gave. `KeyPress.fromKeyboard` reads Cmd as Ctrl on a Mac and returns `undefined` when AltGr is down, so a symbol typed with AltGr is never a shortcut. The modifier no shortcut uses (the Windows key, or Control on a Mac) is kept, and a press holding it matches nothing.
- **Shift is ignored for a symbol** (`+`, `-`, `=`, `?`), because it is already in the typed character: `+` is Shift+= on a US layout and a key of its own on a German one. `Shift+?` is refused when parsed. Digits match on the number row and the numpad.
- **A letter falls back to its physical key** when the layout types no Latin letter there: Cyrillic, Greek, or Option on a Mac.
- **`ShortcutDispatcher` (step 4)** takes the registry, the `CommandRunner` and the `KeyboardPlatform` until the tools and `EscapeChain` join it in stage 9, along with `handleKeyUp`. `FocusPlace` has its own file. A used key always returns true, even when its command is disabled (the runner shows why) or when it is a held key's repeat that doesn't run again; only Zoom in and Zoom out have `repeatsWhileHeld`. The narrowest matching scope wins (level view, editor, everywhere); a level view key is left to a text field; and with a dialog open every key returns false.
- **The recorded key data** for US, ABNT2, German, Russian and a Mac is in `editor/shortcuts/testing/recordedKeys.ts`; the browser's keys are in `browserKeys.ts`, from the requirement's table.

- **Matching** follows the tech notes: digits (and Shift+digit) by the physical key, `?` and `+` by the typed character, letters by the typed letter so Ctrl+Z stays on Z in every layout, falling back to the physical key when the layout types no Latin letter. On a Mac, Cmd is Ctrl and Option is Alt.
- **Scopes:** "everywhere" works even while typing (Ctrl+Enter, Ctrl+S, Esc, F8, F9). "editor" is skipped while the focus is in a text field or the code editor. "levelView" needs the mouse over the level view.
- **Ctrl+Alt is refused when the browser reports AltGr**, and no shortcut other than the two the requirement names uses Ctrl+Alt.
- **A test checks the shortcut map** against the requirement's list of keys the editor never uses (Ctrl+N, Ctrl+W, Ctrl+0, F5 and the rest).
- The browser adapter `KeyboardInput` listens once on the window, early and not passive, calls `handleKeyDown`, and stops the browser's default only when it returns true. It also releases every held key when the window loses focus, so keys never stick.
- The tool keys (Shift, Alt, Ctrl held during a drag, Enter and Backspace while drawing) go to the active tool first.

## The clipboard

```typescript
export class ClipboardCodec {
    constructor(writer: LevelWriter, reader: LevelReader);
    encode(entities: readonly Entity[], level: Level, sourceToken: string): string;
    decode(text: string): ClipboardDecodeResult;   // checked like an import
}

export type ClipboardDecodeResult =
    | { kind: 'entities'; fragment: EntityFragment }
    | { kind: 'notOurs' }                          // "Nothing to paste" in v1
    | { kind: 'refused'; reason: string };         // damaged, newer version, over a limit
```

The text is JSON with a tag, as the tech notes suggest:

```json
{
  "engine-v3": "entities",
  "formatVersion": 1,
  "physicsVersion": 1,
  "sourceToken": "k3x9...",
  "box": { "left": 1160, "top": 620, "right": 1240, "bottom": 660 },
  "entities": [ { "id": 41, "hidden": false, "locked": false, "components": { "...": {} }, "children": [] } ]
}
```

- **Copy and cut** use the browser's `copy` and `cut` events when they come from the keyboard, which need no permission. The menu entries use the asynchronous clipboard API to write, which browsers allow on a click.
- **Paste** uses the `paste` event from the keyboard. The menu entry reads with the asynchronous API, which may ask for permission; if it is refused, the editor pastes its own last copy, kept in memory.
- **Only the selection is copied**, with the selection's rule that a parent brings its children. A joint is copied only when the joint itself is selected.
- **`IdRemapping`** gives every pasted entity a new id and rewires entity fields that point inside the pasted set. A field pointing outside it keeps the original id when the paste comes from the same open level (same `sourceToken`) and that entity still exists, and becomes missing otherwise. The token is made when a level is opened and is never saved, so after a reload, New or Import, links to outside entities become missing (owner, 2026-11-13).
- **`PastePlacement`** centres the pasted set on the mouse when it is over the level view, otherwise on the view's centre, snaps it to the grid when snapping is on, and puts it in the current group, on top, selected.
- **Duplicate** skips the clipboard: it copies each selected entity in place, directly above its original in the same group, and selects the copies.
- **A paste over a limit** (100,000 entities, 256 deep) is refused whole, naming the limit. Pasted data is untrusted: it goes through `LevelReader` with every import check.

## Stage 11's choices

Made under the standing yes (2026-11-16), before building. The [plan](../../plan.md#stage-11-in-steps) has the steps.

- **The commands live in a new `editor/commands/clipboard/`**: `CutCommand`, `CopyCommand`, `PasteCommand` and `DuplicateCommand`, in the Edit menu's second section before Delete (orders 10 to 40), with Ctrl+X, Ctrl+C, Ctrl+V and Ctrl+D. `ClipboardCodec`, `IdRemapping`, `PastePlacement` and `EditorClipboard` are in `editor/clipboard/`, as [parts-and-folders.md](../parts-and-folders.md) places them. *Why: the commands are what the menu and the keys run, the rest is the clipboard's own rules, and each folder keeps one job.*
- **What is copied:** the selection, without the World and the camera (the skip rule), and without any entity inside another selected one, since its parent brings it. The roots keep panel order. Joints come only when selected, as the requirement says, so a crate copied with its hinge unselected pastes without the hinge.
- **Each copied root's TransformComponent is written as if its parent were the World**: from its level matrix, decomposed, so a child of a rotated, skewed group copies as it looks on screen. On paste the roots are put in the current group's space with the same maths as moving between groups in place (`transformUnder`). *Why: a paste can land in any group, so the text must not depend on where the copy came from.*
- **The clipboard's `box`** is the copied set's level box (`BoundsCache`), whose middle `PastePlacement` moves to the mouse or the view's centre. (Step 4 changed this from a `centre`, below.)
- **Grid snapping on paste** moves the set so its box's top left lands on the nearest grid point, after centring (*proposal*). *Why: a drawn shape's corners snap to the grid, so a pasted copy of it lines up with the others; snapping the centre would put grid-sized shapes half a step off.*
- **The token:** `OpenLevel.sourceToken` comes from a token maker the session is given (`crypto.randomUUID` in `app`), made each time a level is opened, never saved. *Why: `editor` can't reach the browser's random numbers, and a test needs a known token.*
- **`IdRemapping`'s links pointing outside the pasted set:** from the same opening, the original id is kept, whether its entity still exists or was deleted (it then reads `missing entity`, and undo of the delete brings the link back, since ids are never reused in a session). From another opening, the field gets a fresh id from the level's allocator that no entity has, so it reads `missing entity`. *Why: the requirement says such a link becomes missing; keeping the old number could point at an unrelated entity in this level, and `null` would read as none instead of missing.*
- **`LevelReader.checkSubtree`** runs every check `readSubtree` runs, against the level and the parent the paste goes into, without changing anything. The paste checks first and only then builds its `AddEntitiesChange`, whose `SubtreeCopy` treats a refusal as a bug. *Why: a paste is refused whole, before the level changes, with the reader's own reason.*
- **Decoding:** a text that isn't JSON, or JSON without the `"engine-v3": "entities"` tag, is `notOurs`, and v1 answers it with `Nothing to paste`. A tagged text with a newer format or physics version, unknown keys or damaged entities is `refused`, with the status text `The pasted entities can't be read: <the reader's reason>`. A limit names itself: `A level holds at most 100,000 entities`, `Groups can be at most 256 deep`, `A polygon holds at most 1,000 points` (*proposal*, the texts the editor already uses).
- **`EditorClipboard`** holds the last copy's text in memory for the session and the `SystemClipboard` contract (`writeText`, `readText`) for the menu entries. **The menu's Paste is asynchronous:** `PasteCommand.run()` starts the read and returns `done`; the paste happens when the text arrives, and if the read is refused it pastes the last copy instead. Copy and Cut put the text in memory at once and write the system clipboard without waiting.
- **The keys come through the browser's events:** `ShortcutDispatcher` returns false for Ctrl+C, Ctrl+X and Ctrl+V, so the browser goes on to send `copy`, `cut` and `paste`, which `ClipboardBridge` answers outside text fields by running the commands with the event's data and stopping the default. The commands still list those shortcuts, so the menu shows them. Ctrl+D is an ordinary shortcut, since no event comes with it. *Why: the events need no permission, as the tech notes say.*
- **Cut is one step** `Cut 3 entities`: it copies, then deletes as Delete does, attached joints included, even though they were not copied. *Why: Cut is Copy and Delete, and Delete's rule is the requirement's.*
- **Duplicate** puts each copied root at its original's own index in the same group, so it sits directly above it in the panel and is drawn on top, and selects the copies. Links inside the duplicated set are rewired and links outside it kept, through `IdRemapping` with the open level's own token.
- **Pasting or duplicating inside a locked group is refused** with `This group is locked`, as drawing is, though locking is v3.
- **The steps read** `Paste Crate`, `Paste 3 entities`, `Duplicate 3 entities`, `Cut 3 entities`, through `stepLabel` as Delete's do.

**As built, step 2 (standing yes, 2026-11-16):**

- **`ClipboardCodec` takes only the `LevelWriter`**, and `encode(entities, source)` takes a `CopySource` (`level`, `caches`, `sourceToken`), which an `OpenLevel` is. *Why: encoding needs the level matrices and the boxes, and decoding checks only the text's own shape; the entities inside are checked by `LevelReader` against the level and group they are pasted into (step 3), since only then are the ids in use and the depth known.*
- **`decode`'s refusal carries the reader's `ReadRefusal`**, not a sentence: `{ kind: 'refused', refusal }`. *Why: the limits and the damaged text each get their own status text, which the paste writes, as `editor/saving` writes the file's.* A version above the game's is `newerVersion`, a missing or unknown key, a bad source token or box, and an empty or missing entity list are `damaged`.
- **`copiedRoots(level, entities)`** is its own function in `editor/clipboard/codec/`, so the commands can tell what is left before they encode; `encode` throws when nothing is. The fragment's `entities` stay `unknown` until the paste reads them.
- **The token maker** is `TokenMaker` in `editor/session`; `EditorSession` counts `opening-1`, `opening-2` when none is given, which only tests rely on, and `EditorComposition` passes `crypto.randomUUID`.
- **A root that draws nothing counts as its origin** for the box, as it does for Group's.

**As built, step 3 (standing yes, 2026-11-16):**

- **`IdRemapping.remap(fragment, target)`** in `editor/clipboard/remapping/` takes a `PasteTarget` (`level`, `sourceToken`), which an `OpenLevel` is, and gives the entities ready for `LevelReader`, leaving the fragment as it was. New ids come from `Level.allocateId`, parents first in panel order, and are used up even when the paste is refused. *Why: ids are never reused in a session, so a refused paste wasting a few is harmless.*
- **It works on the raw data, before the reader checks it**, and passes anything not shaped as an entity on as it is, so the reader refuses it with its own reason. *Why: the reader stays the only code that checks data, and remapping first lets it check the ids the level will really get.*
- **Only fields of the `entity` kind are rewired**, found through the registry's schemas, so a v2 component with an entity field needs nothing here. Two links to the same outside entity from another opening get the same fresh id. A `null` link stays empty.
- **`LevelReader.checkSubtree(level, raw, parent)`** gives a `ReadCheck` (`{ ok: true }` or the refusal) by running `readSubtree`'s reading and checks without building.

**As built, step 4 (standing yes, 2026-11-16):**

- **The clipboard text holds the set's `box`** (`left`, `top`, `right`, `bottom`), not its `centre`. *Why: snapping the box's top left to the grid needs the box, and its middle is the centre.* A box with a missing or extra side, a side that isn't a finite number, or a right left of its left is `damaged`.
- **`PastePlacement`** in `editor/clipboard/placement/` takes the box, the destination and the grid size (undefined with snapping off) and gives the `offset`; `placeRoot` turns a root's copied values into values inside the current group from the World's and the group's level matrices. `PastePlacement.destinationOf(mouse, viewMiddle)` picks the mouse when it is over the level view. *Why: the maths is the paste's own, so it doesn't reach into `editor/commands` for `transformUnder`.*
- **`readRootTransform` and `withRootTransform`** read and replace a root's TransformComponent in its data; the codec writes its root's TransformComponent as if its parent were the World through the same `withRootTransform`.
- **`pasteEntities(openLevel, tools, fragment, spot)`** in `editor/commands/clipboard/` is the paste edit, as `createShape` is the Shape tool's: remap, `checkSubtree`, place, then one `AddEntitiesChange` at index 0 of the current group, the roots selected. The command (step 5) passes the `PasteSpot` (destination and grid size). The step names a single root from its data's NameComponent, `Entity` when it has none.
- **`pasteRefusalText`** writes the status text: the three limits with the reader's own number (`A level holds at most 100,000 entities`), `The pasted entities can't be read: they come from a newer version of the game`, and `...: they are damaged` for anything else. *Why: the reader's damaged detail is for developers, never shown.*

**As built, step 5 (standing yes, 2026-11-16):**

- **`EditorClipboard`** in `editor/clipboard/memory/` beside its `SystemClipboard` contract: `keep(text)` holds the last copy and writes the system clipboard without waiting, ignoring a refused write; `read()` gives the system's text, or the last copy when the read is refused or there is no system clipboard. Plain text from another program is read as it is and gives `Nothing to paste`; only a refused read falls back. *Why: the fallback is for a browser that says no, not for overriding what the person copied elsewhere.*
- **`CutCommand`, `CopyCommand` and `PasteCommand`** take the session and `ClipboardParts` (the `EditorClipboard` and a `MouseOverView`, which the page's `MousePosition` is). `createCommandRegistry(session, parts?)` builds a memory-only clipboard and a mouse never over the view when none are given, as in tests. Copy and Cut expose `copy()` and `cut()` and Paste `pasteText(text)` and `readAndPaste()`, so step 7's `ClipboardBridge` can pass the event's text without going through the menu's asynchronous read.
- **The refusals** come from one `skippedRefusal(split, pastParticiple)`, shared with Delete: `The World can't be copied`, `The camera can't be cut`, `Nothing selected`. Paste is always enabled, since what the clipboard holds is known only once it is read.
- **Cut and Delete share `removeEntities`** in `commands/shared/`, so Cut removes attached joints exactly as Delete does.
- **The menu's Paste shows its outcome itself** through the session's `StatusText` when the text arrives, since `run()` has already returned `done` to the `CommandRunner`.
- **The page passes `navigator.clipboard`** to `EditorClipboard` when the browser has one; step 7 adds the events.

**As built, step 6 (standing yes, 2026-11-16):**

- **`DuplicateCommand`** in `editor/commands/clipboard/` writes the copied roots with `LevelWriter.writeSubtree` as they are, with no TransformComponent rewritten, since each copy stays in its original's group. `IdRemapping.remap` takes a `RemapSource` (the `sourceToken` and the `entities`), which a fragment is, so Duplicate remaps the whole set at once with the open level's own token without making a box it doesn't need.
- **One `AddEntitiesChange` per root**, put at its original's index read just before, so the copy sits directly above it even when several roots share a group. Each root is checked with `checkSubtree` against the level as the earlier copies left it, so the entity limit counts them all, and a refusal rolls back the copies already in. *Why: the roots can be in different groups, and one change puts its roots side by side in one place.*
- **Ctrl+D works everywhere**, also while typing in a text field, as the requirement's table says ("Everywhere except the code editor"). The code editor is v2, so v2 gives the shortcut a scope that leaves it out. *Why: the dispatcher's scopes have no "everywhere but the code editor" yet, and v1 has no code editor.*
- **Its refusals** are the skip rule's (`The World can't be duplicated`), `This group is locked`, and the paste's limit texts through `pasteRefusalText`.

**As built, step 7 (standing yes, 2026-11-16):**

- **Cut, Copy and Paste carry `shortcutsAsBrowserEvents`**, a field of `EditorCommand`, and `ShortcutDispatcher` returns false for a shortcut whose command has it, so the browser sends its event. *Why: a flag on the command keeps the dispatcher free of command ids, and the menu still shows the shortcuts.*
- **`ClipboardEvents`** in `editor/commands/clipboard/` takes the registry and the `CommandRunner`, finds the three commands in it, and gives `copy()` and `cut()` the text for the event (undefined when nothing was copied) and `paste(text)`. Their outcomes are shown through `CommandRunner.showOutcome`, as a key's would be. While a dialog is open it does nothing and the event is the browser's, as the dispatcher ignores keys then.
- **`ClipboardBridge`** in `adapters/browser/clipboard/` listens on the window in the capture phase, like `KeyboardInput`, and leaves the events to the browser when `focusPlaceOf` says a text field or the code editor has the keyboard. It stops the default only when the editor used the event: a refused copy or cut (the World alone, nothing selected) shows its reason and lets the browser copy whatever text is selected on the page.
- **The menu entries' asynchronous clipboard and the mouse position for paste** were already wired in step 5 (`navigator.clipboard` and `MousePosition`); `EditorComposition` now also connects the bridge.
- **The browser tests give a made-up event its `DataTransfer` directly**, since Firefox copies the data handed to an event's constructor and keeps a made-up paste's data unreadable. Real events are readable and writable in all three browsers.

**As built, step 8 (standing yes, 2026-11-16):**

- **The Playwright tests press the real keys** (`ControlOrMeta+C`, `X`, `V`, `D`): all three browsers send real `copy`, `cut` and `paste` events, and a copy's text comes back on the next paste, so no test makes up an event. *Why: it proves the dispatcher really leaves the keys to the browser.*
- **Plain and damaged text reach the clipboard as a person's would:** typed into a text field the test adds, selected and copied with the keys, which a text field leaves to the browser. The damaged text is valid JSON with the tag and the two versions but no entities, so it is `refused` rather than `notOurs`.
