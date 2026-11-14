# Parts and folders

## TL;DR

The code has five parts. **core** holds the game's rules, **editor** the editing rules, **adapters** the classes that talk to libraries and the browser, **ui** the React panels, and **app** the composition roots that build and connect everything. **Imports point inward only:** app → ui and adapters → editor → core. core never imports editor, and neither of them imports a library that touches the screen, the network, storage or the clock. Two checks enforce this: core and editor compile without the browser's types, and ESLint rules refuse wrong imports and banned calls. Folders are grouped by feature, each module has one `index.ts`, and tests sit next to the file they test.

"Part" is used here instead of "layer", which already means something else in the glossary.

## The five parts

| Part | Folder | What it holds | May import |
|---|---|---|---|
| core | `src/core/` | Entities, components, the level, field types, geometry, deterministic maths, the level data format, the simulation, and the contracts core needs (such as `PhysicsWorld`) | core, and `clipper2-js` (pure computation) |
| editor | `src/editor/` | Undo, selection, tools, what the Inspector and the Layers panel show, editor messages, the clipboard format, shortcuts, saving and test play as use cases, and the contracts they need (such as `LevelStore`, `GameRunner`, `Clock`) | core, editor |
| adapters | `src/adapters/` | One class per contract, built on a library or a browser API: Box2D, PixiJS, IndexedDB, Web Locks, the keyboard and pointer, timers, workers, zips | core, editor, their library |
| ui | `src/ui/` | React components and their CSS. They read editor and core state and call editor commands | core, editor, React. **Never adapters** |
| app | `src/app/` | The composition roots: the editor page, the game worker, the import worker. The only code that knows the concrete classes on both sides | everything |

**What counts as a detail:** React, PixiJS, Box2D, the DOM, browser storage, the clock, timers, `requestAnimationFrame`, workers, the clipboard, file pickers, zips. Each one is reached only through a contract that core or editor declares.

**Why editor is its own part:** the requirements put most of their rules in the editor (what a click selects, what one undo step is, what a paste does). Those rules need testing without a browser exactly like the game's rules, but the game worker must not carry them. So editor sits between core and the details, and core stays small enough to run in the worker.

## The folder tree

```
src/
  app/                 composition roots, one file each
    main.tsx             the editor page: builds every class, renders <EditorShell>
    EditorComposition.ts the object graph of the editor page, built in one place
    game.worker.ts       the game worker: core simulation + Box2D adapter
    import.worker.ts     the import worker: unzips and checks a file
  core/
    events/            Signal, VersionCounter: how classes announce changes
    entities/          Entity, EntityId, Level, EntityIdAllocator, LevelSignals
    fields/            value types, the field types, FieldDefinition, ComponentSchema
    components/        Component, ComponentRegistry, then one folder per component
      TransformComponent/ NameComponent/ ShapeComponent/ PathComponent/ StyleComponent/
      BodyComponent/ SurfaceComponent/ JointComponent/ CameraComponent/ PhysicsWorldComponent/
    geometry/          Matrix2D, Point, Bounds, the polygon pipeline, mass
    math/              DeterministicMath, units (px and metres, degrees and radians)
    derived/           WorldMatrixCache, BoundsCache, HiddenCache
    level-data/        LevelData types, LevelWriter, LevelReader, FormatUpgrader, limits
    physics/           PhysicsWorld contract, PhysicsSceneBuilder (merging), JointEnds
    simulation/        Simulation, the tick phases, BodyPoses, CameraFollow, TickReport
  editor/
    session/           EditorSession (the editor's root object), CurrentGroup
    history/           History, HistoryStep, EditTransaction, changes/
    selection/         Selection
    commands/          EditorCommand, CommandRegistry, then file/ edit/ arrange/ view/ play/
    tools/             Tool, ToolController, EscapeChain, select/ shape/ joint/
    hit-testing/       HitTester, SpatialIndex, LinearSpatialIndex
    snapping/          Snapper, GridSnapper
    view/              ViewState (pan and zoom), ViewSettings
    layers/            LayersRows (the visible rows), LayersDrop (where a drag lands)
    inspector/         InspectorModel, CardModel, FieldModel, ValueInput (typed text)
    messages/          EditorMessages, EditorMessageRule, rules/
    clipboard/         ClipboardCodec, PastePlacement, IdRemapping
    shortcuts/         KeyChord, ShortcutMap, ShortcutDispatcher
    saving/            Autosave, SaveState, ProjectFile, ImportLevel, ExportLevel, contracts
    play/              PlaySession, TickPacer, PlayMirror, Watchdog, GameRunner contract
    status/            StatusText (the status bar's left slot)
    time/              Clock, Timer, FrameScheduler contracts
  adapters/
    pixi/              PixiLevelView, EntityNode, EntityDrawing, overlays/
    box2d/             Box2dPhysicsEngine, Box2dPhysicsWorld, Box2dShapes, Box2dJoints
    storage/           IndexedDbLevelStore, LocalStorageSettings, WebLockTabGuard, BrowserPersistence
    browser/           KeyboardInput, PointerInput, ClipboardBridge, FileDownload, BrowserFilePicker,
                       SystemClock, BrowserTimer, AnimationFrames, PageVisibility, LeavePrompt
    worker/            WorkerGameRunner, GameWorkerHost, ImportWorkerClient, ImportWorkerHost, protocol/
    zip/               FflateZipCodec
  ui/
    EditorContext.tsx  the one React context: hands the editor session to components
    hooks/             useVersion, useSelection, useEntityVersion, useLevelTree
    theme.css          colour and size tokens of the one dark theme
    shell/ top-bar/ status-bar/ toolbar/ main-menu/ tool-options/ level-view-host/
    layers-panel/ inspector/ play-bar/ dialogs/
    fields/            one component per field type: NumberField/, ColourField/, ...
    shared/            Button/, Menu/, Tooltip/, Icon/
tests/
  determinism/         the determinism test and its recorded hashes
  performance/         the speed tests against the requirements' targets
  e2e/                 whole-app tests with Playwright
  levels/              test levels (.editable files) shared by the three above
```

Each component folder is named exactly like its class, as the owner's React rules do for components, and holds the class, its values type and its schema (for example `BodyComponent/BodyComponent.ts`, `BodyValues.ts`, `bodySchema.ts`). v2 adds `TriggerComponent/`, `ScriptComponent/`, `VariablesComponent/`, `InputComponent/`, `TextComponent/` and `TagsComponent/` beside them, and nothing else in `core` changes shape. ui's folders follow the owner's component rules: one component per folder, its child components as subfolders.

## Rules for what goes where

| Question | Answer |
|---|---|
| Does it decide something about the level, an entity or a run? | `core` |
| Does it decide something about editing (a click, a step, a paste)? | `editor` |
| Does it touch a library, the browser or the clock? | `adapters`, behind a contract from core or editor |
| Is it React? | `ui`. Logic in a component that isn't about display moves into `editor` |
| Does it construct concrete classes? | `app`, nowhere else |
| A helper used by one module? | Inside that module, until a second module needs it |
| A contract? | In the module that needs it, never in the module that implements it |
| A test fake for a contract? | In a `testing/` folder of the module that declares the contract, such as `editor/time/testing/FakeClock.ts` |
| A new folder grows past about 15 files with different jobs? | Split it into subfolders by area, each with its own `index.ts` |

## Modules and their public entry

- Each folder directly under a part (`core/geometry`, `editor/history`) is a **module** with one `index.ts`. Other modules import only from that `index.ts`, never from a file deep inside.
- Inside a module, files import each other directly, with the `.ts` extension.
- No import cycles. If two modules need each other, the shared piece moves to a third module, or one side declares a contract.
- One public class per file, named exactly like the file. Named exports only.

## How the rules are enforced

| Check | Catches |
|---|---|
| TypeScript: `src/core` and `src/editor` compile with `lib: ["ES2023"]` and no `DOM` | Any use of `window`, `document`, `HTMLElement`, `localStorage` or `setTimeout` in the rules |
| ESLint `no-restricted-imports`, configured per part | An import pointing outward, such as core → editor, editor → adapters or ui → adapters; any library import in core except `clipper2-js`; deep imports past another module's `index.ts` across parts |
| ESLint `no-restricted-properties` in `src/core` | `Math.random`, `Math.sin`, `Math.cos`, `Math.tan`, `Math.atan2`, `Math.exp`, `Math.log`, `Math.pow`, `Math.hypot`, `Date.now`. They may differ between computers or break determinism. `DeterministicMath` replaces them |
| ESLint `no-restricted-syntax` in `src/core` | `new Date()`, and `for ... in`, whose order over numeric and text keys differs from the order they were added |
| A test in `core/components` | Every schema is valid: keys match labels, attribute names are unique, defaults sit in their range |

The ESLint rule for imports, in short:

```typescript
// eslint.config.ts (part of it)
{
    files: ['src/core/**'],
    rules: {
        'no-restricted-imports': ['error', {
            patterns: [
                { group: ['**/editor/**', '**/adapters/**', '**/ui/**', '**/app/**'], message: 'core imports only core.' },
                { regex: '^(?!clipper2-js$)[a-z@]', message: 'core imports no library except clipper2-js.' },
            ],
        }],
    },
},
```

## Where tests go

- **Next to the file they test** (owner, 2026-11-13): `Level.ts` and `Level.test.ts` in the same folder.
- Tests that need a real browser end in `.browser.test.ts`. They run in Vitest's browser mode. The fast tests (`*.test.ts`) run in Node with no browser.
- Tests of the whole game live in `tests/`: the determinism test, the speed tests and the whole-app tests. See [testing.md](testing.md).
