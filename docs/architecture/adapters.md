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
| `FileExporter`, `FilePicker` | editor/saving | `FileDownload`, `BrowserFilePicker` | `FakeFiles` |
| `LevelFileImporter` | editor/saving | `ImportWorkerClient` | `DirectImporter` (same code, no worker) |
| `GameRunner` | editor/play | `WorkerGameRunner` | `DirectGameRunner` (the simulation in the same thread) |
| `Clock`, `Timer`, `FrameScheduler` | editor/time | `SystemClock`, `BrowserTimer`, `AnimationFrames` | `FakeClock`, `FakeTimer`, `ManualFrames` |
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
- It applies the tech notes' Box2D facts: sensors get density 0, a Dynamic body with no mass gets 1 kg, chains for lines, joints with an empty end attach to a static ground body, the speed and spin caps (6,000 px/s, 15 turns per second) stay below Box2D's per-step limits.
- Contacts and sensor events (v2) are read with Box2D's event arrays after `step()`, so they are delivered after the physics step, never during it.
- **The tech notes' physics facts were written for Box2D v2.4.** The plan's physics stage rechecks each one against v3.2 and writes the result into the tech notes.

## Rendering

`PixiLevelView` (`adapters/pixi/`) owns a PixiJS renderer and its stage, without an `Application`, and draws a given `Level`: the editor's, or the `PlayMirror` during play.

| Class | Job |
|---|---|
| `PixiLevelView` | Creates the canvas on `mount`, follows the host's size and `devicePixelRatio`, decides when to draw |
| `LevelDisplay` | One `EntityNode` per entity, nested like the entity tree, so children follow parents and the draw order comes from the tree |
| `EntityNode` | A PixiJS `Container` for the entity (its matrix, its hidden state) and one `Graphics` for what it draws |
| `EntityDrawing` | Builds the `Graphics` content from the ShapeComponent's outlines or the PathComponent, and the StyleComponent. Rebuilt only when one of them changes |
| `overlays/` | `GridOverlay`, `BoundsOverlay` (dims outside the World's rectangle), `CameraFrameOverlay`, `JointIconOverlay`, `SelectionOverlay` (outlines, handles, the selection box), `ToolPreviewOverlay`, `PhysicsViewOverlay` |

- **Drawing only when something changed.** There is no PixiJS ticker: no `Application` is made. A dirty flag set by level updates, the selection, the tools' previews, `ViewState` and the play session's frames triggers one render on the next animation frame. An idle editor draws nothing.
- **Drawing order:** the level (back to front), then the grid, then the editor overlays. Overlays live in a container with no zoom, so handles, icons and outlines keep their size on screen.
- **Each entity draws one thing**, text before path before shape, as the requirement says. A shape with no StyleComponent is drawn as a thin outline in the editor and not at all in play.
- **The physics view** draws the collision pieces from `PiecesCache` at each entity's level matrix, in the editor and in play alike (owner, 2026-11-13).
- **During play** the view follows the camera from the tick reports: Fixed size scales the camera's box to fit the window, centred, with black bars. Editor-only drawing (handles, the camera frame, joint icons) is hidden unless a View menu switch shows it.
- **Sharp at any browser zoom:** the renderer's resolution follows `devicePixelRatio` and a `ResizeObserver` on the host, as the tech notes say. Antialiasing is on.
- Culling and batching are described in [performance.md](performance.md).

### Stage 4's choices

Made under the standing yes (2026-11-14), before building. The [plan](../plan.md#stage-4-in-steps) has the steps.

- **Stage 4 builds what later stages call, not their inputs.** The wheel, Space and middle-drag panning come with `PointerInput` (stage 9); F and the Zoom menu are commands (stages 5 and 6); the `Back to level` button is ui (stage 6); remembering the view in the browser is `LocalStorageSettings` (stage 12); `SelectionOverlay` is stage 9's and `ToolPreviewOverlay` stage 10's. *Why: a stage never builds what a later stage owns.*
- **`PixiLevelView` is given the level, its caches, `ViewState`, `ViewSettings` and a `FrameScheduler`**, not the `EditorSession`, which stage 5 builds. `show(level, caches)` swaps the level, for New, Import and the `PlayMirror`.
- **`ViewState` holds the level position at the middle of the view, the zoom and the view's size** in CSS pixels, which `PixiLevelView` sets on each resize. Zoom 1 is 100%: one level pixel per CSS pixel; the renderer's resolution covers `devicePixelRatio`. *Why: keeping the middle means resizing the window keeps the level where it was.*
- **Fitting a rectangle** (F, the whole level, the camera frame) zooms so it fills the view less 40 screen px on each side, within 1% to 1000%, and centres it. Nothing to fit leaves the view alone.
- **`ViewState` as built** (`editor/view`, standing yes, 2026-11-14): `levelToScreen`, `screenToLevel` and `matrix()` convert positions; `panBy` takes screen pixels; `zoomAt(screenPoint, zoom)` keeps the point under the mouse still; `zoomIn` and `zoomOut` double and halve the zoom about the middle (*proposal*: the steps the wheel uses come with `PointerInput` in stage 9); `fit(bounds)` fits a rectangle, and one with no width or height fits along its other side, so a single point zooms to 1000%; `setPanLimit(worldRectangle)` sets the pan limit and pulls the middle inside it; `holdsNothing(contents)` says when `Back to level` is due. Its `version` moves only on a real change.
- **`ViewSettings` as built:** the four View menu switches, `grid`, `jointIcons`, `cameraFrame` and `physicsView`, with `isOn`, `set` and `toggle`. A new editor starts with the physics view off and the other three on (*proposal*), because the physics view draws over everything. Folded cards join it with the Inspector in stage 8.
- **`PixiLevelView` as built** (`adapters/pixi`, standing yes, 2026-11-14): `PixiLevelView.create(parts)` is async, because PixiJS starts its renderer asynchronously, so `mount(host)` stays a plain call that only places the canvas. It makes a renderer with `autoDetectRenderer`, not an `Application`, so there is no ticker to switch off. *Why: an `Application` only adds the ticker and a resize plugin, and the view does both itself.* It asks for WebGL, then the canvas renderer, and skips WebGPU (*proposal*). *Why: WebGL works in all three browsers the tests run, so one path is tested.* `markDirty()` asks the `FrameScheduler` for one frame, and changes before it draw once. The resolution comes from a `PixelRatioSource`, which `DevicePixelRatio` in `adapters/browser` fulfils with a media query on the current ratio, so browser zoom and a move to another screen are seen. The level sits in a layer that takes `ViewState.matrix()`; the overlays will sit beside it, unzoomed. `renderCount` counts draws for the tests.
- **The time contracts as built** (`editor/time`): `FrameScheduler` and `Cancel` only, with `ManualFrames` in `editor/time/testing`. `Clock` and `Timer` come with the first code that needs them.
- **The pan limit:** the view's middle stays inside the World's rectangle grown on every side by its larger side. **The view holds nothing** when it doesn't overlap the World's subtree bounds. *Why: "well outside the level" with one rule that scales with the level.*
- **Shapes are filled from the polygon pipeline's filled outlines**, the same `PiecesCache` result physics uses, and their outline is drawn along the shape's own points, with round joins. So a self-crossing polygon fills as it collides, and an ellipse is the same 32 points it collides with. *Why: collision always matches what you see.* Paths are drawn as PixiJS curves.
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

- **`KeyboardInput`** listens on the window in the capture phase, not passive. It builds a `KeyboardInputData` (code, key, modifiers, AltGr state, repeat), asks `ShortcutDispatcher`, and stops the browser's default only when the editor used the key. It tracks which part of the page has focus (`FocusPlace`) from `focusin`. On `blur` it releases every held key.
- **`PointerInput`** listens on the canvas, converts positions with `ViewState`, captures the pointer during a drag, cancels a drag when the window loses focus, and turns the wheel into zoom (Ctrl+wheel too, for pinch) and Shift+wheel into a sideways pan. It stops the middle button's autoscroll.
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

- **Lua:** `WasmoonScriptEngine` fulfils core's `ScriptEngine`: compile a file once, run it once per entity with a fresh environment, call handlers, and stop a script on an error. It also runs in a second, throwaway worker in the editor to check syntax and read a script's `settings` table, as the tech notes advise. The safe library rules (no `io`, `os`, `load`, frozen library tables, no `__gc` or `__mode`) live in that adapter.
- **Audio:** `WebAudioSoundPlayer` fulfils core's `SoundPlayer`. Whether a sound is still playing is worked out by the simulation from ticks and the file's length, never asked from the real audio, as the tech notes require.
