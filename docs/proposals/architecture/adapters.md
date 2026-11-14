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

`PixiLevelView` (`adapters/pixi/`) owns the PixiJS `Application` and draws a given `Level`: the editor's, or the `PlayMirror` during play.

| Class | Job |
|---|---|
| `PixiLevelView` | Creates the canvas on `mount`, follows the host's size and `devicePixelRatio`, decides when to draw |
| `LevelDisplay` | One `EntityNode` per entity, nested like the entity tree, so children follow parents and the draw order comes from the tree |
| `EntityNode` | A PixiJS `Container` for the entity (its matrix, its hidden state) and one `Graphics` for what it draws |
| `EntityDrawing` | Builds the `Graphics` content from the ShapeComponent's outlines or the PathComponent, and the StyleComponent. Rebuilt only when one of them changes |
| `overlays/` | `GridOverlay`, `BoundsOverlay` (dims outside the level bounds), `CameraFrameOverlay`, `JointIconOverlay`, `SelectionOverlay` (outlines, handles, the selection box), `ToolPreviewOverlay`, `PhysicsViewOverlay` |

- **Drawing only when something changed.** The PixiJS ticker is off. A dirty flag set by level updates, the selection, the tools' previews, `ViewState` and the play session's frames triggers one render on the next animation frame. An idle editor draws nothing.
- **Drawing order:** the level (back to front), then the grid, then the editor overlays. Overlays live in a container with no zoom, so handles, icons and outlines keep their size on screen.
- **Each entity draws one thing**, text before path before shape, as the requirement says. A shape with no StyleComponent is drawn as a thin outline in the editor and not at all in play.
- **The physics view** draws the collision pieces from `PiecesCache` at each entity's level matrix, in the editor and in play alike (owner, 2026-11-13).
- **During play** the view follows the camera from the tick reports: Fixed size scales the camera's box to fit the window, centred, with black bars. Editor-only drawing (handles, the camera frame, joint icons) is hidden unless a View menu switch shows it.
- **Sharp at any browser zoom:** the renderer's resolution follows `devicePixelRatio` and a `ResizeObserver` on the host, as the tech notes say. Antialiasing is on.
- Culling and batching are described in [performance.md](performance.md).

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
- **No page gestures:** `overscroll-behavior: none` and `touch-action: none` on the editor page, as the Suggested v1 row asks (waiting for the owner).
- **During play** (v2), `KeyboardInput` also feeds held keys to `TickPacer`, which stamps them with the tick they apply to.

## Time

```typescript
export type Clock = { nowMs(): number };
export type Timer = { after(delayMs: number, callback: () => void): Cancel };
export type FrameScheduler = { nextFrame(callback: (timeMs: number) => void): Cancel };
```

The editor never calls `Date.now`, `setTimeout` or `requestAnimationFrame` itself. History joining, the 4-second status text, autosave's 2 and 20 seconds, the pacer and the watchdog all take these contracts, so their tests run on fake time.

## Workers

- `WorkerGameRunner` and `GameWorkerHost` are the two ends of the game worker. `app/game.worker.ts` builds the host with the real `Box2dPhysicsEngine`.
- `ImportWorkerClient` and `ImportWorkerHost` are the two ends of the import worker, which unzips and checks a file away from the page, as the tech notes advise. `app/import.worker.ts` builds it.
- Both protocols are plain data types in `adapters/worker/protocol/`, shared by the two ends. Large arrays are transferred, not copied.

## Lua (v2) and audio (v3)

- **Lua:** `WasmoonScriptEngine` fulfils core's `ScriptEngine`: compile a file once, run it once per entity with a fresh environment, call handlers, and stop a script on an error. It also runs in a second, throwaway worker in the editor to check syntax and read a script's `settings` table, as the tech notes advise. The safe library rules (no `io`, `os`, `load`, frozen library tables, no `__gc` or `__mode`) live in that adapter.
- **Audio:** `WebAudioSoundPlayer` fulfils core's `SoundPlayer`. Whether a sound is still playing is worked out by the simulation from ticks and the file's length, never asked from the real audio, as the tech notes require.
