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
    readonly shortcuts: readonly KeyChord[];
    availability(): Availability;           // a disabled button's tooltip shows the reason
    run(): CommandOutcome;
};

export type CommandOutcome =
    | { kind: 'done'; skipped?: readonly SkippedEntity[] }  // "Camera kept" in the status bar
    | { kind: 'refused'; reason: string }                  // "The camera can't be deleted"
    | { kind: 'needsConfirmation'; question: Question; confirm(): CommandOutcome };

export class CommandRegistry {
    register(command: EditorCommand): void;
    find(id: CommandId): EditorCommand | undefined;
    menu(name: MenuName): readonly MenuEntry[];
}
```

- One class per command, grouped by menu: `commands/file/`, `edit/`, `arrange/`, `view/`, `play/`. Each takes what it needs through its constructor (the session's `OpenLevel`, the clipboard, the saving coordinator).
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
    static parse(text: string): KeyChord;   // 'Ctrl+Shift+G', 'Shift+3', '?'
    static fromKeyboard(input: KeyboardInputData): KeyChord;
    matches(other: KeyChord): boolean;
}

export type ShortcutScope = 'everywhere' | 'editor' | 'levelView';
export type FocusPlace = 'level' | 'panel' | 'textField' | 'codeEditor';

export class ShortcutDispatcher {
    constructor(registry: CommandRegistry, tools: ToolController, escape: EscapeChain);
    handleKeyDown(input: KeyboardInputData, focus: FocusPlace, pointerOverLevelView: boolean): boolean;
    handleKeyUp(input: KeyboardInputData): void;
}
```

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
  "centre": { "x": 1200, "y": 640 },
  "entities": [ { "id": 41, "parent": null, "components": { "...": {} } } ]
}
```

- **Copy and cut** use the browser's `copy` and `cut` events when they come from the keyboard, which need no permission. The menu entries use the asynchronous clipboard API to write, which browsers allow on a click.
- **Paste** uses the `paste` event from the keyboard. The menu entry reads with the asynchronous API, which may ask for permission; if it is refused, the editor pastes its own last copy, kept in memory.
- **Only the selection is copied**, with the selection's rule that a parent brings its children. A joint is copied only when the joint itself is selected.
- **`IdRemapping`** gives every pasted entity a new id and rewires entity fields that point inside the pasted set. A field pointing outside it keeps the original id when the paste comes from the same open level (same `sourceToken`) and that entity still exists, and becomes missing otherwise. The token is made when a level is opened and is never saved, so after a reload links to outside entities become missing ([open question A7](../open-questions.md)).
- **`PastePlacement`** centres the pasted set on the mouse when it is over the level view, otherwise on the view's centre, snaps it to the grid when snapping is on, and puts it in the current group, on top, selected.
- **Duplicate** skips the clipboard: it copies each selected entity in place, directly above its original in the same group, and selects the copies.
- **A paste over a limit** (100,000 entities, 256 deep) is refused whole, naming the limit. Pasted data is untrusted: it goes through `LevelReader` with every import check.
