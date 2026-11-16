# Adapters

## TL;DR

Every detail is reached through **one small contract declared where it is needed** (core or editor), and fulfilled by **one adapter class** in `src/adapters`. The adapters are: Box2D for physics, PixiJS for drawing, IndexedDB, `localStorage` and Web Locks for storage, the keyboard and pointer for input, the system clock, timers and animation frames for time, workers for test play and import, `fflate` for zips, and the browser for files and the clipboard. Lua (v2) and audio (v3) get a contract and a folder when their version comes. Tests swap every adapter for a fake.

## The contracts

| Contract | Declared in | Adapter | Fake for tests |
|---|---|---|---|
| `PhysicsEngine`, `PhysicsWorld` | core/physics | `Box2dPhysicsEngine`, `Box2dPhysicsWorld` | Tests use the real Box2D in Node; `RecordingPhysicsWorld` checks what the builder asked for |
| `LevelViewMount` | ui/level-view-host | `PixiLevelView` | none: tested in a browser |
| `LevelStore` | editor/saving | `IndexedDbLevelStore` | `InMemoryLevelStore` |
| `SettingsStore` | editor/saving | `LocalStorageSettings` | `InMemorySettingsStore` |
| `TabGuard` | editor/saving | `WebLockTabGuard` | `FakeTabGuard` |
| `StoragePersistence` | editor/saving | `BrowserPersistence` (`navigator.storage.persist()`) | `FakePersistence` |
| `ZipCodec` | editor/saving | `FflateZipCodec` | the real one: it is pure |
| `FileExporter`, `FilePicker` | editor/saving | `FileDownload`, `BrowserFilePicker` | `FakeFiles`, `FakeFilePicker` |
| `LevelFileImporter` | editor/saving | `ImportWorkerClient` | `DirectImporter` (same code, no worker) |
| `GameRunner` | editor/play | `WorkerGameRunner` | `DirectGameRunner` (the simulation in the same thread) |
| `Clock`, `Timer`, `FrameScheduler` | editor/time | `SystemClock`, `BrowserTimer`, `AnimationFrames` | `ManualClock`, `ManualTimer`, `ManualFrames` |
| `PageLifecycle` | editor/play | `PageVisibility`, `LeavePrompt` | `FakePageLifecycle` |
| Keyboard and pointer input | none: the adapters call `ShortcutDispatcher` and `ToolController` | `KeyboardInput`, `PointerInput` | tests call the editor classes directly |
| Clipboard | none: the adapter calls the copy, cut and paste commands | `ClipboardBridge` | tests call the codec and commands |
| `ScriptEngine` (v2) | core/simulation | `WasmoonScriptEngine` | |
| `SoundPlayer` (v3) | core/simulation | `WebAudioSoundPlayer` | |

## Physics

```typescript
export type PhysicsEngine = {
    load(): Promise<void>;                          // fetches the wasm once
    createWorld(settings: WorldSettings): PhysicsWorld;
};

export type PhysicsWorld = {
    createBody(definition: BodyDefinition): BodyHandle;            // pose, type, damping, flags
    addSurface(body: BodyHandle, surface: SurfaceDefinition): void; // pieces or chains, density...
    createJoint(definition: JointDefinition): JointHandle;
    setGravity(gravity: Point): void;               // m/s²; wakes every body
    step(): void;                                   // 1/60 s
    readMovedBodies(into: BodyPoses): void;         // only bodies that moved this step
    destroyBody(body: BodyHandle): void;
    destroy(): void;
};
```

- **Everything in the definitions is in pixels and degrees.** `Box2dPhysicsWorld` converts to metres and radians (50 px per metre), and is the only code that does.
- It imports `box2d3-wasm/compat` only, see [stack.md](stack.md).
- Handles are the adapter's own numbers, mapped to Box2D ids inside it. Box2D's user data holds the entity id, so contacts (v2) can name entities.
- It applies the tech notes' Box2D facts: sensors get density 0, a Dynamic body with no mass gets 1 kg, two-sided segments for lines, joints with an empty end attach to a static ground body, the speed cap of 6,000 px/s is Box2D's `maximumLinearSpeed`, and the spin cap of 7.5 turns per second is Box2D 3.2's own 45° a step.
- Contacts and sensor events (v2) are read with Box2D's event arrays after `step()`, so they are delivered after the physics step, never during it.
- **As built in stage 13 step 2** (standing yes, 2026-11-16): the contracts live in `core/physics/contracts/`. A `BodyHandle` is a plain number, the index of the body in creation order. `BodyDefinition` holds the body's entity, its type, position, angle and the BodyComponent's settings. **Gravity stays in m/s²**, in `WorldSettings` and `setGravity`, like the World's Gravity field, and y points down in Box2D too, so nothing flips. `BodyPoses` keeps every body's latest pose by its entity and the list of bodies that moved in the last step; the caller clears that list before each step. One step is 1/60 s in 4 sub-steps, Box2D's recommended count. A Dynamic body gets 1 kg when it is created, until surfaces give it mass (step 3). Rotations are built and read with `DeterministicMath`, not Box2D's approximate `b2MakeRot`. `addSurface` and `createJoint` join the contract with the steps that build them. *Why: the contract only holds what is built and tested, and the [tech notes](../tech-notes.md#physics-and-joints) say why each Box2D detail is handled as it is.*
- **As built in stage 13 step 3** (standing yes, 2026-11-16): `addSurface(body, SurfaceDefinition)` takes one entity's surface: its entity, its pieces in the body's space and the SurfaceComponent's four values. A `SurfacePiece` is a circle with its centre, a convex polygon, or a line, one of `LineChains`' chains, which the adapter adds as one segment per edge. Polygons go through Box2D's `b2ComputeHull`, so their point order doesn't matter, and one whose hull has under 3 points is skipped. After each surface, a Dynamic body left with no mass gets 1 kg again, with no rotational inertia, so it can't spin, as [bodies.md](../requirements/physics/bodies.md) warns. `velocityOf(body)` gives px/s and °/s, for `stateHash` in step 7. `setVelocity` is on `Box2dPhysicsWorld` only, for the tests, until scripts (v2) need it in the contract. **Spin isn't clamped by the game:** Box2D 3.2 holds it to 45° a step, 7.5 turns per second, below the 15 the requirement first said, so the requirement and the motor speed range follow Box2D. *Why: a clamp at 15 could never act, and a lower cap of our own would add a rule Box2D already keeps.*
- **The tech notes' physics facts were written for Box2D v2.4.** The plan's physics stage rechecks each one against v3.2 and writes the result into the tech notes.

## Rendering

`PixiLevelView` (`adapters/pixi/`) owns a PixiJS renderer and its stage, without an `Application`, and draws a given `Level`: the editor's, or the `PlayMirror` during play.

| Class | Job |
|---|---|
| `PixiLevelView` | Creates the canvas on `mount`, follows the host's size and `devicePixelRatio`, decides when to draw |
| `LevelDisplay` | One `EntityNode` per entity, nested like the entity tree, so children follow parents and the draw order comes from the tree |
| `EntityNode` | A PixiJS `Container` for the entity (its matrix, its hidden state) and one `Graphics` for what it draws |
| `EntityDrawing` | Builds the `Graphics` content from the ShapeComponent's outlines or the PathComponent, and the StyleComponent. Rebuilt only when one of them changes |
| `overlays/` | `grid/` holds `GridOverlay`, `bounds/` holds `BoundsOverlay` (dims outside the World's rectangle), `selection/` holds `SelectionOverlay` with `planSelection` and `SelectionSource` (outlines, handles, the selection box, the readout), `drawing/` holds `DrawingPreviewOverlay` with `planDrawing` (the Shape tool's preview, stage 10). Beside them: `CameraFrameOverlay`, `JointIconOverlay`, `PhysicsViewOverlay` |

- **Drawing only when something changed.** There is no PixiJS ticker: no `Application` is made. A dirty flag set by level updates, the selection, the tools' previews, `ViewState` and the play session's frames triggers one render on the next animation frame. An idle editor draws nothing.
- **Drawing order:** the level (back to front), then the grid, then the editor overlays. Overlays live in a container with no zoom, so handles, icons and outlines keep their size on screen.
- **Each entity draws one thing**, text before path before shape, as the requirement says. A shape with no StyleComponent is drawn as a thin outline in the editor and not at all in play.
- **The physics view** draws the collision pieces from `PiecesCache` at each entity's level matrix, in the editor and in play alike (owner, 2026-11-13).
- **During play** the view follows the camera from the tick reports: Fixed size scales the camera's box to fit the window, centred, with black bars. Editor-only drawing (handles, the camera frame, joint icons) is hidden unless a View menu switch shows it.
- **Sharp at any browser zoom:** the renderer's resolution follows `devicePixelRatio` and a `ResizeObserver` on the host, as the tech notes say. Antialiasing is on.
- Culling and batching are described in [performance.md](performance.md).

### Stage 4's choices

Made under the standing yes (2026-11-14), before building, and the "as built" entries while building (2026-11-14 and 15). The [plan](../plan.md#stage-4-in-steps) has the steps.

- **Stage 4 builds what later stages call, not their inputs.** The wheel, Space and middle-drag panning come with `PointerInput` (stage 9); F and the Zoom menu are commands (stages 5 and 6); the `Back to level` button is ui (stage 6, moved to stage 9 with panning: see [ui.md](ui.md#stage-6s-choices)); remembering the view in the browser is `LocalStorageSettings` (stage 12); `SelectionOverlay` is stage 9's and `DrawingPreviewOverlay` stage 10's. *Why: a stage never builds what a later stage owns.*
- **`PixiLevelView` is given the level, its caches, `ViewState`, `ViewSettings` and a `FrameScheduler`**, not the `EditorSession`, which stage 5 builds. `show(level, caches)` swaps the level, for New, Import and the `PlayMirror`.
- **`ViewState` holds the level position at the middle of the view, the zoom and the view's size** in CSS pixels, which `PixiLevelView` sets on each resize. Zoom 1 is 100%: one level pixel per CSS pixel; the renderer's resolution covers `devicePixelRatio`. *Why: keeping the middle means resizing the window keeps the level where it was.*
- **Fitting a rectangle** (F, the whole level, the camera frame) zooms so it fills the view less 40 screen px on each side, within 1% to 1000%, and centres it. Nothing to fit leaves the view alone.
- **`ViewState` as built** (`editor/view`, standing yes, 2026-11-14): `levelToScreen`, `screenToLevel` and `matrix()` convert positions; `panBy` takes screen pixels; `zoomAt(screenPoint, zoom)` keeps the point under the mouse still; `zoomIn` and `zoomOut` double and halve the zoom about the middle (*proposal*: the steps the wheel uses come with `PointerInput` in stage 9); `fit(bounds)` fits a rectangle, and one with no width or height fits along its other side, so a single point zooms to 1000%; `setPanLimit(worldRectangle)` sets the pan limit and pulls the middle inside it; `holdsNothing(contents)` says when `Back to level` is due. Its `version` moves only on a real change.
- **`ViewSettings` as built:** the four View menu switches, `grid`, `jointIcons`, `cameraFrame` and `physicsView`, with `isOn`, `set` and `toggle`. A new editor starts with the physics view off and the other three on (*proposal*), because the physics view draws over everything. Folded cards join it with the Inspector in stage 8.
- **`PixiLevelView` as built** (`adapters/pixi`, standing yes, 2026-11-14): `PixiLevelView.create(parts)` is async, because PixiJS starts its renderer asynchronously, so `mount(host)` stays a plain call that only places the canvas. It makes a renderer with `autoDetectRenderer`, not an `Application`, so there is no ticker to switch off. *Why: an `Application` only adds the ticker and a resize plugin, and the view does both itself.* It asks for WebGL, then the canvas renderer, and skips WebGPU (*proposal*). *Why: WebGL works in all three browsers the tests run, so one path is tested.* `markDirty()` asks the `FrameScheduler` for one frame, and changes before it draw once. The resolution comes from a `PixelRatioSource`, which `DevicePixelRatio` in `adapters/browser` fulfils with a media query on the current ratio, so browser zoom and a move to another screen are seen. The level sits in a layer that takes `ViewState.matrix()`; the overlays will sit beside it, unzoomed. `renderCount` counts draws for the tests.
- **`LevelDisplay`, `EntityNode` and `EntityDrawing` as built** (`adapters/pixi`, standing yes, 2026-11-14): `PixiLevelView.show(level, caches)` makes a `LevelDisplay`, which builds one `EntityNode` per entity and follows `LevelSignals.updated`. An `EntityNode` is a `Container` with the entity's own matrix (from its TransformComponent, so PixiJS multiplies the parents'), `visible` from its own eye, a layer for its children's nodes with the top row last, and one `Graphics`. **An entity draws in front of its children, and the World behind them**, because the draw order is the panel order backwards with the World first. *Why: that is what `Level.entitiesInDrawOrder` says.* A TransformComponent change sets only the matrix; a ShapeComponent, PathComponent or StyleComponent change marks the drawing, and the marked drawings are rebuilt just before the next render, so a drag that changes a style many times between frames rebuilds once. Opacity is the `Graphics`' alpha, so it doesn't fade the children. Outlines get **round caps** as well as round joins, so a line's ends stay within half its width too, as `BoundsCache` counts. Whether a shape without a StyleComponent shows its thin line is an `EntityDrawingOptions` given to `PixiLevelView`: on in the editor, off in play. Until stage 5's `DerivedCaches`, the display is given only `PiecesCache` and `BoundsCache` (`LevelDisplayCaches`). `drawingBuildCount` counts rebuilt drawings for the tests.
- **Culling as built** (`adapters/pixi`, standing yes, 2026-11-14): every render, after rebuilding marked drawings, `LevelDisplay.cull(area)` walks the tree from the World. A node whose subtree bounds miss the area gets `renderable = false` and its subtree isn't visited; otherwise its `Graphics` is `renderable` only when its own bounds meet the area. Hidden subtrees aren't visited, since showing one is a change that renders and culls again. `PixiLevelView` grows `ViewState.visibleBounds()` by 2 screen px, so the 1 px line of an unstyled shape, which `BoundsCache` doesn't count, isn't cut at the edge. *Why: culling every render needs no tracking of what moved, and with the caches warm it costs one bounds check per node that is on screen or next to it.* **Changed in stage 9** (standing yes, 2026-11-16): while the visible area stays the same, only the entities whose components changed are culled again, with their subtrees and parents; see [performance.md](performance.md#targets-and-their-tests). *Why: walking 10,000 entities took 4 ms of a drag frame's 16.7.*
- **The grid, bounds and camera frame overlays as built** (`adapters/pixi/overlays`, standing yes, 2026-11-14): they sit in front of the level layer, unzoomed, and draw in screen pixels, so they keep their size at any zoom. Every render redraws them, after culling, like culling itself. **The grid is drawn over the level** (*proposal*). *Why: the World's fill, drawn first inside the level layer, is the background, so the grid can't sit between it and the entities without splitting the World's drawing; at 7% to 32% the lines stay faint over shapes.* `GridPlan` works out the lines: the step is the grid size, **times five as often as needed to keep lines 8 screen px apart**, and the fainter lines split a step in five, shown only when 8 screen px apart. *Why: the requirement says lines fade when too close; dropping to every fifth line keeps the count bounded by the view's size at 1% zoom.* So the fainter lines are every 10 px for the default 50 px grid, and a fifth of any other size. Lines are counted from the origin as whole numbers, and sit on the middle of a screen pixel. A World with no fill shows the light page behind the canvas, so it counts as a light background. **`BoundsOverlay` has no switch:** the View menu has none for it, and the requirement always dims the outside. It dims up to four rectangles that never overlap, and draws the 1 px edge. The level bounds come from `levelBoundsOf(level)` in `core/derived`, the World's rectangle centred on the origin, which `ViewState`'s pan limit and fitting the whole level will use too. **`CameraFrameOverlay` hides with the camera's eye** (and the World's), and reads the frame from `BoundsCache`; its label is a PixiJS `Text` in JetBrains Mono, changed only when the size does. `PixiLevelView` also listens to the shown level's `levelVersion`, so a new grid size or camera size draws again, and to `ViewSettings`. `overlays` exposes the three for tests.
- **The joint icons and the physics view as built** (`adapters/pixi/overlays`, standing yes, 2026-11-14): both sit over the other overlays, unzoomed, and redraw every render; the icons are on top so a joint stays clickable over the physics view. **A joint's own bounds** in `BoundsCache` are the point at its position, joined with its path's bounds for a Rope or Spring, so the drawn path isn't culled. `JointIconOverlay` reads each joint's position from the `WorldMatrixCache`, skips joints off screen, and **hides an icon with the joint's eye or a hidden parent's** (*proposal*). *Why: a hidden entity draws nothing in the editor; the joint still works in play.* `PhysicsViewOverlay` draws **every entity with a ShapeComponent and a SurfaceComponent**, hidden or see-through, because a surface with no body is Static and still collides. It draws the cached pieces at the entity's level matrix in screen pixels; a circle on a matrix that scales unevenly or skews is drawn as its 32-point polygon, as the play copy gives it to Box2D; a line draws its `LineChains`; **with Walls on, the World's rectangle draws its four edges** (*proposal*). Shapes whose own bounds miss the view are left out. So `LevelDisplayCaches` now holds the `WorldMatrixCache` too, and the overlays get all three caches.
- **The page's wiring as built** (`app`, standing yes, 2026-11-15): `main.tsx` keeps the React heading and calls `startLevelView(host, level)`, which builds `ViewState` with the level's pan limit, `ViewSettings`, `AnimationFrames`, `DevicePixelRatio`, the three caches and a `PixiLevelView`, then mounts it in `#level-view` and shows the level at 100% on the origin. The level is `buildTestLevel()` in `app/testLevel.ts`: a square in a colour nothing else uses, an ellipse, a see-through one-stroke star, a turned group's bar and a shape with no StyleComponent. *Why: stage 5's `EditorSession` owns the level, its caches and the view, so stage 4 adds only what draws one; both files go when the editor page replaces them.* *Both went in stage 6 step 7, replaced by `app/EditorComposition.ts` and the `EditorShell`; see [ui.md](ui.md#stage-6s-choices).* The Playwright test reads colours from a screenshot of the canvas, decoded in the page, because a WebGL canvas can't be read back after it is shown, and samples off the grid's lines.
- **The time contracts as built** (`editor/time`): `FrameScheduler`, `Clock`, `Timer` and `Cancel`, with `ManualFrames`, `ManualClock` and `ManualTimer` in `editor/time/testing`. `Clock` and `Timer` came in stage 5 with `StatusText`. **A `ManualTimer` moves its own `ManualClock`**, which a test can hand to the code under test too, so a `Clock` and a `Timer` read the same fake time; `advance` runs each callback due at its own time, earliest first, and two due at once in the order they were asked for (standing yes, 2026-11-15). *Why: history joining and autosave read both, and their tests need one time.*
- **The pan limit:** the view's middle stays inside the World's rectangle grown on every side by its larger side. **The view holds nothing** when it doesn't overlap the World's subtree bounds. *Why: "well outside the level" with one rule that scales with the level.*
- **Shapes are filled from the polygon pipeline's filled outlines**, the same `PiecesCache` result physics uses, and their outline is drawn along the shape's own points, with round joins. So a self-crossing polygon fills as it collides. *Why: collision always matches what you see.* Paths are drawn as PixiJS curves.
- **A circle is drawn as a true circle**, stretched by its node's matrix, so a circle scaled unevenly shows as a smooth ellipse in the editor, while the physics view shows the 32-point polygon it collides with (standing yes, 2026-11-15). *Why: a drawing is built in the entity's own space and rebuilt only when its ShapeComponent or StyleComponent changes; drawing the 32 points would make it depend on every parent's TransformComponent too. The two differ by under 0.5% of the radius.*
- **A shape with no StyleComponent** is drawn in the editor as a 1 screen px line, `#1D2430` at 60% (*proposal*), with PixiJS's `pixelLine`, so it stays thin at any zoom.
- **Hiding** sets the `EntityNode`'s `visible`, and PixiJS hides its children with it, which is what `HiddenCache` says. The World is drawn like any entity, first, so its fill is the background.
- **A joint's own bounds are the single point at its position.** Hit testing and F add the icon's 7 screen px around it at the current zoom. *Why: the icon keeps its size on screen, so its size in level pixels depends on the zoom, which `BoundsCache` doesn't know.*
- **Joint icons** sit at the joint's position: Hinge is the design's circle with a dot, Rope the circle with a short upright line, Spring the circle with a small zigzag (*proposal*).
- **The grid's dark background** is one whose brightness, 0.299 R + 0.587 G + 0.114 B, is under half, as [the level view's colours](../design/level-view.md) say.

## Storage

| Adapter | Uses | Notes |
|---|---|---|
| `IndexedDbLevelStore` | `idb` on IndexedDB database `engine-v3`, store `level` | One record, written in one transaction with `durability: 'strict'`. All or nothing |
| `LocalStorageSettings` | `localStorage`, key `engine-v3/settings` | Small editor settings, read before the first draw. Every read and write is wrapped, and a failure falls back to defaults |
| `WebLockTabGuard` | `navigator.locks.request('engine-v3/level', { ifAvailable: true })` | Held for the page's life. No lock means another tab has the level: this one is read-only |
| `BrowserPersistence` | `navigator.storage.persist()` | Asked once, after the first successful save |

Details of what is saved and when are in [persistence.md](persistence.md). Storage errors become `SaveState` failures, never silent, see [errors.md](errors.md).

## Input

- **`KeyboardInput`** listens on the window in the capture phase, not passive. It builds a `KeyboardInputData` (code, key, modifiers, AltGr state, repeat), asks `ShortcutDispatcher`, and stops the browser's default only when the editor used the key. It reads which part of the page has focus (`FocusPlace`) from the focused element when the key goes down, and whether the mouse is over the level view from `pointerover`. On the window's `blur` it releases every held key. *As built (stage 6, step 5, standing yes, 2026-11-15):* reading `document.activeElement` at key down replaces tracking `focusin`, because it can't fall out of step with the page. An element's own blur also reaches the capturing listener, so only a blur whose target is the window releases the keys. The held keys are kept (`isHeld(code)`) for the tools of stage 9; nothing reads them yet.
- **`PointerInput`** listens on the canvas, converts positions with `ViewState`, captures the pointer during a drag, cancels a drag when the window loses focus, and turns the wheel into zoom (Ctrl+wheel too, for pinch) and Shift+wheel into a sideways pan. It stops the middle button's autoscroll. *As built (stage 9, step 12):* see [selection-and-tools.md](editor/selection-and-tools.md#stage-9s-choices); `KeyboardInput` passes key ups to the dispatcher from then on.
- **No page gestures:** `overscroll-behavior: none` and `touch-action: none` on the editor page, as the workspace's small features ask.
- **During play** (v2), `KeyboardInput` also feeds held keys to `TickPacer`, which stamps them with the tick they apply to.

## Time

```typescript
export type Clock = { nowMs(): number };
export type Timer = { after(delayMs: number, callback: () => void): Cancel };
export type FrameScheduler = { nextFrame(callback: (timeMs: number) => void): Cancel };
```

The editor never calls `Date.now`, `setTimeout` or `requestAnimationFrame` itself. History joining, the 4-second status text, autosave's 2 and 20 seconds, the pacer and the watchdog all take these contracts, so their tests run on fake time.

## Workers

- `WorkerGameRunner` and `GameWorkerHost` are the two ends of the game worker. `app/workers/game.worker.ts` builds the host with the real `Box2dPhysicsEngine`.
- `ImportWorkerClient` and `ImportWorkerHost` are the two ends of the import worker, which unzips and checks a file away from the page, as the tech notes advise. `app/workers/import.worker.ts` builds it.
- Both protocols are plain data types in `adapters/worker/protocol/`, shared by the two ends. Large arrays are transferred, not copied.

## Lua (v2) and audio (v3)

- **Lua:** `WasmoonScriptEngine` fulfils core's `ScriptEngine`: compile a file once, run it once per entity with a fresh environment, call handlers, and stop a script on an error. It also runs in a second, throwaway worker in the editor to check syntax and read a script's `variables` table, as the tech notes advise. The safe library rules (no `io`, `os`, `load`, frozen library tables, no `__gc` or `__mode`) live in that adapter.
- **Audio:** `WebAudioSoundPlayer` fulfils core's `SoundPlayer`. Whether a sound is still playing is worked out by the simulation from ticks and the file's length, never asked from the real audio, as the tech notes require.
