# Architecture

## TL;DR

How engine-v3 is built: the stack, the five parts of the code and their folders, the model as classes, the editor, React's place, the simulation and test play, the adapters, performance, saving, errors, tests, and a v1 plan in 18 stages. **Approved by the owner on 2026-11-14** after seven review rounds on the [review page](../review.html). Code follows it; a change to it is proposed and approved like any other decision. The core idea: **the game's rules never import a detail.** core and editor hold every rule and are tested without a browser; Box2D, PixiJS, React, storage and the clock sit behind small contracts. Test play runs in a worker from v1, and one data format serves saving, undo, the clipboard and the play copy.

## Reading order

1. [stack.md](stack.md): every package and version
2. [parts-and-folders.md](parts-and-folders.md): the five parts, the import rules, the `src/` tree
3. [core-model/](core-model/README.md): entities, the level, components and fields, geometry
4. [editor/](editor/README.md): undo, selection, tools, the Inspector, the Layers panel, clipboard, shortcuts
5. [ui.md](ui.md): how React reads the core, and how the PixiJS level view fits
6. [simulation.md](simulation.md): ticks, determinism, the game worker, Play and Stop
7. [adapters.md](adapters.md): the contracts and the classes that fulfil them
8. [performance.md](performance.md), [persistence.md](persistence.md), [errors.md](errors.md), [testing.md](testing.md), [tooling.md](tooling.md)
9. [plan.md](../plan.md): the v1 stages

## Files

| File | What it decides |
|---|---|
| [stack.md](stack.md) | Exact versions; TypeScript 6.0 rather than 7; `box2d3-wasm/compat`; what is left out on purpose |
| [parts-and-folders.md](parts-and-folders.md) | core, editor, adapters, ui, app; what may import what; how ESLint and TypeScript enforce it; where tests go |
| [core-model/README.md](core-model/README.md) | The model in one picture and the rules it keeps |
| [core-model/entities-and-level.md](core-model/entities-and-level.md) | `Entity`, `Level`, ids, order, the World and the camera, change signals, derived caches, `EntityData` |
| [core-model/components-and-fields.md](core-model/components-and-fields.md) | Value types, field types, schemas, `Component`, the registry, every v1 component |
| [core-model/geometry.md](core-model/geometry.md) | Units, matrices, bounds, collision pieces, mass, `DeterministicMath` |
| [editor/README.md](editor/README.md) | `EditorSession`, `OpenLevel`, how an edit flows |
| [editor/history.md](editor/history.md) | Changes, edit transactions, 512 history steps, drags |
| [editor/selection-and-tools.md](editor/selection-and-tools.md) | Selection, current group, hit testing, tools, Esc, snapping |
| [editor/inspector-and-layers.md](editor/inspector-and-layers.md) | The Inspector's model, typed values, editor messages, the Layers panel's rows and drops |
| [editor/clipboard-and-shortcuts.md](editor/clipboard-and-shortcuts.md) | Commands, the main menu, keys, the clipboard |
| [ui.md](ui.md) | `useVersion`, the one context, the screen, the level view's mount, panels, styles |
| [simulation.md](simulation.md) | The game worker, pacing, the tick phases, bodies, determinism, the play mirror |
| [adapters.md](adapters.md) | Physics, rendering, storage, input, time, workers, and the places for Lua and audio |
| [performance.md](performance.md) | What v1 builds, what only gets a place, the speed tests |
| [persistence.md](persistence.md) | `level.json`, the reader and writer, the project file, autosave, opening the editor |
| [errors.md](errors.md) | Kinds of problem, where the user sees each, bugs |
| [testing.md](testing.md) | Unit, browser and whole-game tests; the determinism test |
| [tooling.md](tooling.md) | The configs, the scripts, `npm run check`, which tool keeps which rule, the guard tests, CI |
| [plan.md](../plan.md) | The 18 v1 stages, each with the docs it implements |

## The decisions in one table

| Area | Decision |
|---|---|
| Parts | core → editor → adapters and ui → app. core and editor compile without the browser's types. TypeScript, ESLint and dependency-cruiser enforce it, and guard tests check them |
| Model | `Level` owns the tree, `Entity` its components, a schema per component type drives everything generic |
| Ids | Whole numbers, never reused, kept by the play copy |
| Undo | Changes in edit transactions, 512 history steps, drags as one step |
| React | Reads versions through `useSyncExternalStore`; never holds the level; PixiJS draws outside React |
| Simulation | In a game worker from v1, paced by the page, ordered tick phases, Layers panel order everywhere |
| Determinism | One Box2D build, `DeterministicMath`, seeded randomness, stamped inputs, a hash test on x86 and ARM |
| Geometry | One polygon pipeline: what is drawn, hit and collided is the same set of pieces |
| Saving | `level.json` in a zip; IndexedDB for the level, `localStorage` for settings; import in a worker |
| Performance | Caches, culling, drawing on change, a virtual Layers panel in v1; a spatial index only if a test needs it |

Its words for the code are in the [glossary](../glossary.md), under "The code".
