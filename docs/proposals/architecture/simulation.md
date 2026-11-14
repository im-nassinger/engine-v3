# The simulation and test play

## TL;DR

**Test play runs in a game worker from v1** (owner, 2026-11-13), because the requirement "the game runs separately from the editor" is v1. **Play makes its play copy the way saving does:** the editor writes the level as `LevelData`, the worker reads it into its own `Level` and builds a `Simulation`. **The page sets the pace:** a `TickPacer` on the editor page decides how many ticks are due (60 per second), sends them with the keys held for each tick, and waits for the worker's tick report before asking again, so a slow computer slows the game instead of skipping, and a hidden tab pauses it. The page keeps its own copy of the running level, the `PlayMirror`, updated from tick reports and drawn between ticks. A `Watchdog` ends a run whose worker stops answering. The simulation is one class with an ordered list of tick phases, which v2 extends with events, triggers and scripts.

## The pieces

```
Editor page                                         Game worker
──────────────────────────────────────              ─────────────────────────────────
PlaySession  (state: idle, starting,                GameWorkerHost
              playing, paused, ended)                 LevelReader -> Level (the play copy)
  TickPacer  (how many ticks are due)                 Simulation
  Watchdog   (is the worker answering?)                 PhysicsWorld (Box2D adapter)
  PlayMirror (the page's copy, drawn)                   tick phases
  GameRunner contract ─── requests ──────────────>    
                      <── tick reports ───────────  TickReport
```

| Class | Part | Job |
|---|---|---|
| `PlaySession` | editor/play | The Play, Stop, Pause and Step rules, the run's state, what the Play bar shows |
| `TickPacer` | editor/play | Ticks due from the frame clock. At most one batch in flight |
| `Watchdog` | editor/play | Notices a worker that stopped answering |
| `PlayMirror` | editor/play | The page's `Level` for drawing and (v2) live values |
| `GameRunner` | editor/play, contract | Start, run ticks, stop. Fulfilled by `WorkerGameRunner` |
| `Simulation` | core/simulation | One run: the play copy, the physics world, the tick phases |
| `GameWorkerHost` | adapters/worker | Turns requests into `Simulation` calls inside the worker |

## Play, Stop, Pause, Step

1. **Play:** the UI first commits any half-typed field. `PlaySession` asks saving to save now (the requirement saves on Play), writes the open level with `LevelWriter.write()`, and sends `{ start, levelData, clockTimeMs }` to the worker. The seed is added in v2.
2. The worker reads the data into a new `Level` with the same `LevelReader` as an import, builds the `Simulation`, and answers `started`. The page builds the `PlayMirror` from the same data, switches the level view to it, and hides the panels.
3. **Running:** each frame, `TickPacer` asks for the ticks due; `WorkerGameRunner` posts `{ runTicks, count, inputsPerTick }`; the worker runs them and posts one `TickReport` back; `PlayMirror` applies it.
4. **Pause** just stops asking. **Step** asks for exactly one tick, with the inputs held at that moment, so "hold right, press Step" works.
5. **Stop** is instant: the page drops the mirror and its drawing, shows the editor's level again (it was never touched), restores the view, the tool, the current group and the panels, and tells the worker to drop its run. The worker stays loaded for the next Play.

- **The editor's level is never touched during play**, and Undo and Redo are off, so "test play never changes the level or its history" holds by construction.
- **The first Play is fast** because the editor page creates the worker and loads Box2D's wasm when it opens, and keeps one spare worker ready, as the tech notes advise.

## Pacing and time

```typescript
export class TickPacer {
    static readonly ticksPerSecond = 60;
    static readonly maxBatch = 4;             // ticks per request
    static readonly maxBacklogSeconds = 0.25; // a longer stall is dropped, not raced through

    constructor(clock: Clock);
    start(): void;
    ticksDue(): number;                       // 0 while a batch is in flight
    batchSent(count: number): void;
    reportReceived(): void;
    pause(): void;
    resume(): void;
    get interpolation(): number;              // 0 to 1: how far between the last two ticks to draw
}
```

- **The tick never changes.** Pause, the v3 speed menu and a player slowing the game only change how often ticks are asked for. The level's time counts ticks, so it stays exact.
- **A slow computer slows the game** because at most one batch is in flight and the backlog is capped, as the requirement says.
- **Switching tabs pauses the game:** `PageVisibility` tells `PlaySession`, which pauses and releases every held key. Clicking a panel during test play releases the inputs and keeps the game running.
- **Drawing between ticks:** the mirror keeps each moved body's last two poses, and the renderer draws at `interpolation`. A body that teleported, spawned or just started gets a snap flag and is drawn at its new pose with no streak.

## The worker boundary

Requests from the page and reports from the worker are plain data, defined once in `adapters/worker/protocol/`:

| Request | Answer |
|---|---|
| `prepare` (on editor open: load wasm) | `ready` |
| `start { levelData, clockTimeMs }` | `started`, or `failed { reason }` |
| `runTicks { count, inputsPerTick }` | `TickReport` |
| `stop` | none |

```typescript
export type TickReport = {
    readonly lastTick: number;
    readonly poses: Float64Array;             // per moved body: entity id, x, y, angle, snap flag
    readonly removed: readonly EntityId[];    // past an open edge of the level bounds
    readonly camera: { x: number; y: number };
    // v2: spawned entities, changed values, Console lines, the run's end
};
```

- `poses` is a transferable buffer, so no copy is made. Only bodies Box2D reports as moved are in it.
- **A crash or a hang ends the run, not the editor.** `Watchdog` shows "The game isn't responding" after 2 seconds without a report and, after 5, terminates the worker, ends the run with a message, and starts a fresh worker. It ignores time when the tab was hidden or the page asleep (a frame gap far longer than the wait), as the tech notes warn.
- In v2, scripts run in the same worker, so an endless loop in Lua is exactly this case: "scripts can't freeze the editor" holds without new code.

## The Simulation

```typescript
export class Simulation {
    constructor(level: Level, physics: PhysicsWorld, start: RunStart, phases: readonly TickPhase[]);

    get tick(): number;
    runTick(inputs: TickInputs): void;
    takeReport(): TickReport;
    stateHash(): string;                      // for the determinism test
}

export type TickPhase = {
    run(tick: TickContext): void;
};
```

v1 phases, in order:

| Phase | Does |
|---|---|
| `InputPhase` | Records the tick's inputs. Nothing reads them in v1 |
| `PhysicsPhase` | One Box2D step of 1/60 s, then reads the moved bodies into `BodyPoses` |
| `JointPathPhase` | Moves each Rope and Spring's read-only path to its two ends |
| `LevelBoundsPhase` | Marks entities fully outside an open edge, once they have been inside |
| `CameraPhase` | Follows the target with smoothing, stops at the bounds |
| `EndOfTickPhase` | Removes marked entities, writes the report |

- **v2 adds phases, not code paths:** `EventPhase` (keys, timers, level start, touches from the physics step), `TriggerPhase` and `ScriptPhase` (in Layers panel order), a `CustomEventQueue` shared by triggers and scripts with the chain limit of 32, `SpawnPhase` and the run's end in `EndOfTickPhase`. The order follows the requirements: touches are delivered after the physics step, destroys and spawns at the end of the tick.
- **The Lua host** is a contract in core, `ScriptEngine`, fulfilled in v2 by `adapters/lua/WasmoonScriptEngine`. The Lua API functions call a `GameApi` class in core, which uses the same schemas (`findFieldByAttribute`, `changeableInPlay`) as the Inspector.
- **Restart** (v2) builds a new `Simulation` from the same `LevelData` with a fresh physics world, Lua state, id counter and seed, as the tech notes advise. Nothing is reset in place.

## Bodies and their entities

- **`BodyMembership`** (core/physics) answers which body each entity belongs to: its own BodyComponent if it has one and Merge is off or no group above has a body; otherwise the nearest group above with a body; a surface with no body on it or above it is Static. The editor uses the same class for the Joint tool and for outlining the whole body of a selected entity.
- **`PhysicsSceneBuilder`** turns the play copy into bodies, surfaces and joints for the `PhysicsWorld`, **in Layers panel order**, so Box2D receives everything in the same order on every computer. Each body's pieces come from the [polygon pipeline](core-model/geometry.md#the-polygon-pipeline), moved into the body's space.
- **Each body's level matrix is split once at the start** into its pose (position and angle) and the rest (scale and skew). During play, `WorldMatrixCache` in the play copy and in the mirror computes `pose · rest` for the body's entity, and children follow through the tree as usual.
- **Body poses are the simulation's state.** A body entity's TransformComponent values during play are derived from its pose when someone asks (v2 live values, `get_position`), not written every tick.
- **Joints:** limits and lengths are measured from how the joint was built, so the reference angle is read from the editor's level at the start. An empty B is attached to a static ground body. A joint with both ends on one body, or neither end able to move, is skipped, as the tech notes advise.
- **Level bounds** with walls become static surfaces that collide with everything. **Gravity** is the World's strength and direction, and changing it wakes every body.

## Determinism

The same level, seed, inputs and clock time give the same run on any computer. What holds it:

| Source of difference | How it is closed |
|---|---|
| The physics engine | One Box2D build everywhere (`box2d3-wasm/compat`), fed in Layers panel order |
| Floating-point maths | `DeterministicMath` instead of `Math.sin` and friends; an ESLint rule bans the browser's versions in core |
| Randomness (v2) | `SeededRandom` from the run's seed; `math.random` in Lua uses it |
| The clock | The clock time is part of `start`; nothing in a run reads the real time |
| Inputs | Stamped with the tick they apply to; that list is the record of a run |
| Order | Layers panel order for building, phases, triggers and scripts; never the order of a hash map of objects |
| Timing | The tick is fixed at 1/60 s; pacing only decides when ticks run |

`stateHash()` folds every body's position, angle and speeds, the camera and the tick into one hash. The determinism test compares it tick by tick, see [testing.md](testing.md).

## The page side

`PlayMirror` is a second `Level` read from the same `LevelData` as the worker's, plus the poses from tick reports. It exists so the page can draw the run and, in v2, show live values in the read-only Inspector and Layers panel through the same models as the editor. The renderer draws whichever `Level` it is given, the editor's or the mirror's, so the drawing code has no play mode of its own.
