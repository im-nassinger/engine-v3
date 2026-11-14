# Editor

## TL;DR

`src/editor` holds every editing rule, with no browser code: undo, selection, the current group, tools, what the Inspector and the Layers panel show, editor messages, the clipboard format, shortcuts and menu commands, plus saving and test play as use cases (described in [persistence.md](../persistence.md) and [simulation.md](../simulation.md)). The root object is **`EditorSession`**. It holds the **`OpenLevel`**: the level open in the editor together with everything that belongs to it (its caches, selection, current group, history and editor messages), which New and Import replace as one piece. Every change to the level goes through an **edit transaction** and becomes one **history step**.

## Files

| File | Covers |
|---|---|
| [history.md](history.md) | Changes, edit transactions, history steps, joining, drags, what is and isn't a step |
| [selection-and-tools.md](selection-and-tools.md) | The selection, the current group, hit testing, the tool contract, the Select, Shape and Joint tools, snapping, Esc |
| [inspector-and-layers.md](inspector-and-layers.md) | What the Inspector shows and how a typed value becomes a change, editor messages, the Layers panel's rows and drops |
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
