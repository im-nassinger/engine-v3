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
// ui/layers-panel/LayersRow/LayersRow.tsx
export function LayersRow({ entityId }: LayersRowProps) {
    const session = useEditorSession();
    const { level } = session.openLevel;
    useVersion(level.signals.entityVersions.of(entityId));

    const entity = level.requireEntity(entityId);
    const name = entityName(entity);

    return <div className="layers-row">{name}</div>;
}
```

- **A component subscribes to the smallest thing it shows:** a Layers row to its entity's version, the Inspector to `InspectorModel.version`, the top bar's Undo button to `History.version`. Dragging one crate wakes its row and its card, not the panel.
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
│T │ Inspector    │                          │ LayersPanel  │
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
| `LayersPanel` | `LayersRows` | Virtual list, below |
| `Inspector` | `InspectorModel` | One `Card` per card model, one field component per field type |
| `StatusBar` | `ToolController`, the mouse position, `Selection`, `EditorMessages`, `StatusText` | |
| `PlayBar` | `PlaySession` | Stop, Pause, Step |
| `Dialogs` | Questions from commands (`needsConfirmation`), import refusals | One dialog at a time |

**Fields:** `ui/fields/` has one component per field type (`NumberField`, `TextField`, `CheckboxField`, `ChoiceField`, `ColourField`, `VectorField`, `AngleField`, `EntityField`). `Card` picks the component from `FieldModel.definition.type.kind` through a lookup table, so a new field type adds one entry and one component. `NumberField` uses `ValueInput` from the editor for parsing and formatting.

**The Layers panel** uses `@tanstack/react-virtual` with a fixed row height, the row design token (28 px, see [design](../design/README.md)), so only the rows on screen exist. Drag and drop is the panel's own pointer handling: it asks `LayersDrop` for the target on each move and draws the line it returns. The tech notes warn that virtual lists and drag and drop break together, so the plan builds both at once and tests them at 10,000 rows.

## Styles

- **One dark theme.** Colours, sizes and spacing are CSS custom properties in `ui/theme.css`, the only global CSS file.
- Every component's CSS has one top-level selector, its root class in kebab-case (`.layers-row`), with everything else nested inside.
- No component styles another component's inside. A child that should look different gets a prop.

## Speed

- The React Compiler memoises components, so a parent redrawing doesn't redraw unchanged children.
- Nothing in React runs per frame. Drags, pans and test play only redraw the PixiJS canvas, the moving entity's row and card, and the status bar's mouse position (which is throttled to one update per frame).
