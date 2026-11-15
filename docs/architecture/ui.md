# React and the core

## TL;DR

**React draws the panels and never holds the level** (owner, 2026-11-13). Every class that owns state has a version number that goes up when it changes. A React component reads a class through **`useVersion`**, a thin wrapper over React's `useSyncExternalStore`, and draws again only when that number moves. There is no state library and no copy of level data in React state. **The level view is drawn by PixiJS**, into one empty `div` that React places behind the panels; a separate class keeps PixiJS in step with the level. Clicks on the level view go to the editor's `ToolController`, never through React. Components follow the owner's rules: one component per folder, its own CSS file scoped under its root class.

## How a component reads core state

```typescript
// ui/hooks/useVersion.ts
export type Versioned = {
    readonly version: number;
    subscribe(listener: () => void): Unsubscribe;
};

export function useVersion(source: Versioned): number {
    const subscribe = (listener: () => void) => source.subscribe(listener);
    const readVersion = () => source.version;

    return useSyncExternalStore(subscribe, readVersion);
}
```

```tsx
// ui/entities-panel/EntitiesRow/EntitiesRow.tsx
export function EntitiesRow({ entityId }: EntitiesRowProps) {
    const session = useEditorSession();
    const { level } = session.openLevel;
    useVersion(level.signals.entityVersions.of(entityId));

    const entity = level.requireEntity(entityId);
    const name = entityName(entity);

    return <div className="entities-row">{name}</div>;
}
```

- **A component subscribes to the smallest thing it shows:** an Entities panel row to its entity's version, the Inspector to `InspectorModel.version`, the top bar's Undo button to `History.version`. Dragging one crate wakes its row and its card, not the panel.
- **The version is the snapshot.** The component then reads current values straight from the class. React never stores a copy that could fall behind.
- **Changes go the other way through commands:** a button calls `session.commands.find(id).run()`, a field calls its `FieldModel`'s commit. Components never change a core class directly.
- Pure display state (a menu being open, a hovered button, a field's uncommitted text) stays in React state, because nothing outside the component needs it.

## The one context

```tsx
// ui/EditorContext.tsx
export const EditorContext = createContext<EditorSession | undefined>(undefined);

export function useEditorSession() {
    const session = useContext(EditorContext);
    if (!session) throw new Error('useEditorSession needs an EditorContext provider');

    return session;
}
```

- `app/main.tsx` builds the `EditorSession` and renders `<EditorContext value={session}><EditorShell /></EditorContext>` once.
- **The `OpenLevel` can change** (New, Import). Components that read it subscribe to `session.openLevelChanged`, so they redraw against the new level.
- ui imports types and classes from core and editor, never from adapters. The PixiJS view reaches ui only as a small contract (below), which the adapter fulfils without importing ui.

## The screen

```
┌ TopBar ────────────────────────────────────────────────────┐
├──┬──────────────┬──────────────────────────┬──────────────┤
│T │ Inspector    │                          │ EntitiesPanel  │
│o │              │   LevelViewHost          │              │
│o │              │   (PixiJS canvas, fills  │              │
│l │              │    the whole window,     │              │
│b │              │    behind everything)    │              │
├──┴──────────────┴──────────────────────────┴──────────────┤
└ StatusBar ────────────────────────────────────────────────┘
```

- `EditorShell` lays out the panels in fixed places, with the starting sizes from the requirements as CSS tokens in `theme.css`.
- **`LevelViewHost` fills the whole window under the panels**, as the requirement says ("the level view fills the whole window, with the panels on top"). The panels sit above it; the browser's own stacking keeps clicks on a panel away from the canvas.
- During play, `EditorShell` hides every panel and bar and shows `PlayBar`, reading `PlaySession.version`.

## The level view and React

```typescript
// The contract ui needs, declared in ui/level-view-host/LevelViewMount.ts
export type LevelViewMount = {
    mount(host: HTMLElement): void;   // creates or moves the canvas into the host
    unmount(): void;
};
```

```tsx
export function LevelViewHost() {
    const levelView = useLevelViewMount();
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        levelView.mount(host);

        return () => levelView.unmount();
    }, [levelView]);

    return <div className="level-view-host" ref={hostRef} />;
}
```

- **React mounts the box once and never renders inside it.** The `PixiLevelView` adapter owns the canvas, listens to level updates, the selection, the tools' previews and `ViewState`, and draws only when one of them moved. See [adapters.md](adapters.md#rendering).
- **Pointer input** on the canvas goes from the `PointerInput` adapter to the `ToolController`. React isn't involved, so dragging never re-renders a component.
- The level view gets the keyboard focus back when Enter commits a field, as the requirement says, through a `focusLevelView()` call on the same mount.

## The panels

| Component | Reads | Notes |
|---|---|---|
| `TopBar` | `History`, `SaveState`, `ViewSettings`, `PlaySession`, the level's name | The main menu is built from `CommandRegistry.menu()` |
| `Toolbar` | `ToolController` | Three buttons in v1 |
| `ToolOptions` | The active tool | The options strip over the level view's top left |
| `EntitiesPanel` | `EntitiesRows` | Virtual list, below |
| `Inspector` | `InspectorModel` | One `Card` per card model, one field component per field type |
| `StatusBar` | `ToolController`, the mouse position, `Selection`, `EditorMessages`, `StatusText` | |
| `PlayBar` | `PlaySession` | Stop, Pause, Step |
| `Dialogs` | Questions from commands (`needsConfirmation`), import refusals | One dialog at a time |

**Fields:** `ui/fields/` has one component per field type (`NumberField`, `TextField`, `CheckboxField`, `ChoiceField`, `ColourField`, `VectorField`, `AngleField`, `EntityField`). `Card` picks the component from `FieldModel.definition.type.kind` through a lookup table, so a new field type adds one entry and one component. `NumberField` uses `ValueInput` from the editor for parsing and formatting.

**The Entities panel** uses `@tanstack/react-virtual` with a fixed row height, the row design token (28 px, see [design](../design/README.md)), so only the rows on screen exist. Drag and drop is the panel's own pointer handling: it asks `EntitiesDrop` for the target on each move and draws the line it returns. The tech notes warn that virtual lists and drag and drop break together, so the plan builds both at once and tests them at 10,000 rows.

## Styles

- **One dark theme.** Colours, sizes and spacing are CSS custom properties in `ui/theme.css`, the only global CSS file.
- Every component's CSS has one top-level selector, its root class in kebab-case (`.entities-row`), with everything else nested inside.
- No component styles another component's inside. A child that should look different gets a prop.

## Speed

- The React Compiler memoises components, so a parent redrawing doesn't redraw unchanged children.
- Nothing in React runs per frame. Drags, pans and test play only redraw the PixiJS canvas, the moving entity's row and card, and the status bar's mouse position (which is throttled to one update per frame).

## Stage 6's choices

Made under the standing yes (2026-11-15), before building. The [plan](../plan.md#stage-6-in-steps) has the steps.

- **Stage 6 builds the frame, not what fills it.** The top bar leaves the save state (stage 12), Play (stage 16) and the grid snapping switch (stage 9) out; the toolbar shows only Select, active, until the tools come (stages 9, 10 and 14); the status bar shows the status text and the selection, and the mouse position and the editor messages' count come with stages 9 and 8; the Entities panel and the Inspector are empty boxes in their places until stages 7 and 8. *Why: a stage never builds what a later stage owns, and a button that does nothing would be a lie.*
- **The main menu lists what the registry has**, so it grows as stages register commands. Its submenus come in the order File, Edit, Arrange, View, Play, Tools, Help, and an empty one isn't shown. A switch shows a tick from `checked()`, a disabled entry its reason in a tooltip, and every entry its first shortcut at the right. *Why: the requirement makes the menu "the full list of commands", which only holds if the menu is built from the registry.*
- **Help has only About in v1.** Keyboard shortcuts belongs to the searchable shortcut list, which is v2; in v1 the main menu already lists every shortcut ([workspace](../requirements/editor/workspace.md)). About is a command (`help.about`) that opens a notice naming the game, its file format version and its physics version. **The Help button** at the top bar's right end opens the same Help submenu.
- **`CommandOutcome` gains `{ kind: 'notice'; notice: { title; text } }`**, a dialog with only OK, for About. *Why: the runner, not the command, decides what is shown, as [errors.md](errors.md) asks.*
- **`CommandRunner` lives in `editor/commands`** with `OpenDialog`, the one open question or notice with its `VersionCounter`. A command that asks while a dialog is open waits behind it, so there is one dialog at a time. Confirming calls `confirm()` and runs its outcome through the runner again; cancelling changes nothing. Every caller (menu, buttons, `ShortcutDispatcher`) runs commands through it. *As built (step 3, standing yes, 2026-11-15):* the runner and `OpenDialog` are in `commands/running/`, About in `commands/help/`. `run(command)` checks `availability()` first and shows a disabled command's reason as status text without running it, the same as a refusal, so a shortcut for a greyed entry still says why. A done outcome with nothing to say leaves the status text alone. The UI calls `confirmDialog()` for a question's go-ahead button and `closeDialog()` for Cancel, OK and Esc. A `Question` has a `title`, a `text` and a `confirmLabel` (the go-ahead button's word, `Replace`); the other button is always Cancel. A confirmed question may ask again, and its question opens next. About's notice reads `engine-v3`, `Level file format version 1` and `Physics version 1 (Box2D 3.2)` on three lines, under the title `About engine-v3`.
- **A shortcut's scope is on the command:** `EditorCommand` gains an optional `shortcutScope`, `'editor'` when missing. *Why: every v1 command has one scope for all its keys, and the requirements give scopes per command.* `ShortcutMap` collects them from the registry and is checked in a unit test against the requirement's keys the editor never uses and for two commands sharing a chord in one scope. *As built (step 2):* `ShortcutMap.fromRegistry` throws on a shared chord, and `ShortcutScope` sits beside `EditorCommand`; see [clipboard-and-shortcuts.md](editor/clipboard-and-shortcuts.md#keys).
- **`ShortcutDispatcher` starts without tools and Esc:** its constructor takes the registry and the runner; `ToolController` and `EscapeChain` join it in stage 9. Until then Esc only closes an open menu or dialog, which the menu and dialog components do themselves. A held key's repeat runs a command again only for the zoom keys (*proposal*), so holding Ctrl+Z doesn't undo 30 steps a second. *As built (step 4, standing yes, 2026-11-15):* the constructor takes the registry, the runner and the `KeyboardPlatform`, which `KeyboardInput` finds and the composition root passes in, and builds its own `ShortcutMap`. `EditorCommand` gains an optional `repeatsWhileHeld`, set only on Zoom in and Zoom out; another command's repeat is still used (its default stopped) but doesn't run. When a press matches in several scopes the narrowest wins: level view, then editor, then everywhere. A level view key also needs the keyboard outside a text field and the code editor, so Tab in a field stays the field's. While a dialog is open no key reaches a command, and every key is left to the dialog. `handleKeyUp` comes with the tools in stage 9, the only thing that needs it.
- **Focus places come from the page:** `KeyboardInput` reads the nearest `data-focus-place` attribute of the focused element (`level`, `panel`), and any `input`, `textarea` or editable element counts as `textField`. The mouse over the level view is the nearest `data-focus-place="level"` under the last pointer move. *Why: the adapter needs no reference to any component, and a new panel only sets the attribute.*
- **On a Mac,** found from `navigator.platform` by `KeyboardInput`, Cmd counts as Ctrl and the menu shows `Cmd` and `Option` instead of `Ctrl` and `Alt`, spelled out, as the rest of the editor's text is.
- **Icons are `lucide-react`** 1.73.0, imported one icon at a time through `ui/shared/Icon`, which sets the 16 px size and 1.6 px stroke from [controls.md](../design/controls.md). *Why: the open outline set the owner named, with React components that bundle only what is used.*
- **JetBrains Mono comes from `@fontsource/jetbrains-mono`** 5.3.0, weights 400, 500 and 600 imported in `ui/theme.css`, so Vite bundles the files with the game. The editor first draws after `document.fonts.ready`.
- **`theme.css` has every token of [tokens.md](../design/tokens.md)** with its name, and is imported once by `app/main.tsx`.
- **The composition root is `app/EditorComposition.ts`**: it builds `SystemClock`, `BrowserTimer`, the `EditorSession` on `Level.createNew()`, the registry, the runner, the `ShortcutDispatcher`, `PixiLevelView` and `KeyboardInput`, and fits the view to the camera frame, as the requirement asks of a new level. Loading the saved level replaces `Level.createNew()` in stage 12. **`PixiLevelView` fulfils `LevelViewMount` itself** and follows `session.openLevelChanged`, so New and Import (stage 12) need nothing more.
- **The level's name in the top bar** is a text box looking like text until clicked; Enter commits through `renameLevel`, Esc reverts, and leaving the box commits like Enter (*proposal*). A refusal shows as status text and the box goes back to the name. **The browser tab title** is the level's name followed by ` - engine-v3`; the `*` for unsaved changes comes with `SaveState` in stage 12.
- **Undo and Redo's tooltips** name the step (`Undo: Delete Square`) from `History.undoLabel` and `redoLabel`, or give the disabled reason.
- **The zoom** shows the percentage rounded to a whole number. Clicking it opens a menu with a box to type a percentage (clamped to 1 to 1000, about the view's middle) and the six zoom commands from the registry.
- **Error boundaries** wrap each panel and bar: the top bar, the toolbar, the Inspector, the Entities panel, the status bar and the dialogs, each showing "This panel hit a problem. Your level is safe." with a Reload button.
- **No page gestures:** the page doesn't scroll (`overflow: hidden` on the root), `overscroll-behavior: none` stops bounce and swipe-back, `touch-action: none` sits on the level view, and `KeyboardInput` stops the default of Alt pressed alone. The middle button's autoscroll is stopped by `PointerInput` in stage 9, which owns the canvas's pointer.
