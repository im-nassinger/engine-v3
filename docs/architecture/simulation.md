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

- **v2 adds phases, not code paths:** `EventPhase` (keys, timers, level start, touches from the physics step), `TriggerPhase` and `ScriptPhase` (in Entities panel order), a `CustomEventQueue` shared by triggers and scripts with the chain limit of 32, `SpawnPhase` and the run's end in `EndOfTickPhase`. The order follows the requirements: touches are delivered after the physics step, destroys and spawns at the end of the tick.
- **The Lua host** is a contract in core, `ScriptEngine`, fulfilled in v2 by `adapters/lua/WasmoonScriptEngine`. The Lua API functions call a `GameApi` class in core, which uses the same schemas (`findFieldByAttribute`, `changeableInPlay`) as the Inspector.
- **Restart** (v2) builds a new `Simulation` from the same `LevelData` with a fresh physics world, Lua state, id counter and seed, as the tech notes advise. Nothing is reset in place.

## Bodies and their entities

- **`BodyMembership`** (core/physics) answers which body each entity belongs to: its own BodyComponent if it has one and Merge is off or no group above has a body; otherwise the nearest group above with a body; a surface with no body on it or above it is Static. The editor uses the same class for the Joint tool and for outlining the whole body of a selected entity.
- **`PhysicsSceneBuilder`** turns the play copy into bodies, surfaces and joints for the `PhysicsWorld`, **in Entities panel order**, so Box2D receives everything in the same order on every computer. Each body's pieces come from the [polygon pipeline](core-model/geometry.md#the-polygon-pipeline), moved into the body's space.
- **Each body's level matrix is split once at the start** into its pose (position and angle) and the rest (scale and skew). During play, `WorldMatrixCache` in the play copy and in the mirror computes `pose · rest` for the body's entity, and children follow through the tree as usual.
- **Body poses are the simulation's state.** A body entity's TransformComponent values during play are derived from its pose when someone asks (v2 live values, `get_position`), not written every tick.
- **Joints:** limits and lengths are measured from how the joint was built, so the reference angle is read from the editor's level at the start. An empty B is attached to a static ground body. A joint with both ends on one body, or neither end able to move, is skipped, as the tech notes advise.
- **Level bounds** come from the World's rectangle. With Walls on, its four edges become static surfaces that collide with everything. **Gravity** is the World's Gravity vector, and changing it wakes every body.

## Determinism

The same level, seed, inputs and clock time give the same run on any computer. What holds it:

| Source of difference | How it is closed |
|---|---|
| The physics engine | One Box2D build everywhere (`box2d3-wasm/compat`), fed in Entities panel order |
| Floating-point maths | `DeterministicMath` instead of `Math.sin` and friends; an ESLint rule bans the browser's versions in core |
| Randomness (v2) | `SeededRandom` from the run's seed; `math.random` in Lua uses it |
| The clock | The clock time is part of `start`; nothing in a run reads the real time |
| Inputs | Stamped with the tick they apply to; that list is the record of a run |
| Order | Entities panel order for building, phases, triggers and scripts; never the order of a hash map of objects |
| Timing | The tick is fixed at 1/60 s; pacing only decides when ticks run |

`stateHash()` folds every body's position, angle and speeds, the camera and the tick into one hash. The determinism test compares it tick by tick, see [testing.md](testing.md).

## The page side

`PlayMirror` is a second `Level` read from the same `LevelData` as the worker's, plus the poses from tick reports. It exists so the page can draw the run and, in v2, show live values in the read-only Inspector and Entities panel through the same models as the editor. The renderer draws whichever `Level` it is given, the editor's or the mirror's, so the drawing code has no play mode of its own.

## Stage 13's choices

Made under the standing yes (2026-11-16), before building. The [plan](../plan.md#stage-13-in-steps) has the steps.

- **Bodies and surfaces only.** Joints, the `JointPathPhase` and `createJoint` come with stage 14, and the `CameraPhase` with stage 15. Until then the report's camera is the camera entity's level position, unchanged, and `stateHash` folds it in already. *Why: the plan gives joints and the camera their own stages, and a stage never builds what a later one owns.*
- **Where things live:** the contracts `PhysicsEngine` and `PhysicsWorld`, their definitions and `BodyPoses` in `core/physics/contracts/`; `BodyMembership` in `core/physics/membership/` beside `merging/`, which it builds on; `PhysicsSceneBuilder` in `core/physics/scene/`; `Simulation`, `startSimulation` and `runHeadless` in `core/simulation/`, one subfolder per job (`run/`, `phases/`, `report/`, `hash/`, `headless/`); `Box2dPhysicsEngine` and `Box2dPhysicsWorld` in `adapters/box2d/`. *Why: `runHeadless` takes a `PhysicsEngine`, so it stays in core, and the test hands it the Box2D adapter.*
- **`startSimulation(levelData, engine, start)`** is the one way to build a run: `LevelReader`, the play copy's caches, `PhysicsSceneBuilder`, the phases. `runHeadless` and, in stage 16, `GameWorkerHost` both call it. *Why: the determinism test only proves the worker's runs if both build them the same way.*
- **`BodyMembership` is built on `mergesInto`**, which stage 8 wrote for the Inspector's greyed fields, rather than replacing it. It adds the rest: the body an entity's surfaces go into (its own or the one it merges into), Static for a surface with nothing above, none for the World and the camera.
- **A line on a Dynamic body is skipped** by `PhysicsSceneBuilder`, with the rest of the body built. *Why: the editor already refuses it; a level edited by hand must still play.*
- **Lines are two-sided segments, one per edge**, not chains. *Why: the requirement says lines collide from both sides and never with each other; Box2D's chains are one-sided, and segments on a body never hit segments. Step 4 confirms it against 3.2.*
- **The speed cap** is Box2D's world setting `maximumLinearSpeed` at 120 m/s (6,000 px/s). **The spin cap is Box2D 3.2's own** 45° a step, 7.5 turns per second, so nothing clamps it (changed in step 3, standing yes, 2026-11-16: the planned clamp at 15 turns per second could never act). *Why: Box2D 3.2 has a world setting for speed and holds spin itself.*
- **Pieces too small to collide** are those whose area is under 1 px² or whose points are closer than 0.5 px (Box2D's polygon skin); they are skipped, not turned into a box. Step 4 checks the numbers against 3.2.
- **Body poses are the play copy's state:** `PhysicsPhase` writes them into `BodyPoses`, and the play copy's `WorldMatrixCache` reads a body entity's matrix as `pose · rest` through an injected pose source. *Why: the architecture says TransformComponent values aren't written each tick; the cache already updates the children.*
- **`stateHash()`** is FNV-1a over the bytes of one `Float64Array` holding the tick, then each body's id, position, angle, speed and spin in Entities panel order, then the camera, written as 8 hex digits. *Why: simple, needs no library, and any one bit that differs changes it.*
- **The hard limit** is per axis: a body whose position has |x| or |y| over 100,000 px is removed, with or without Walls, and the report lists it under `removedPastHardLimit` for the status text stage 16 shows (`Crate went too far from the level and was removed`, *proposal*). *Why: the maximum level size is a 200,000 px square centred on the origin, so its edge is 100,000 px on each axis.*
- **The maximum level size** is a new `maxLevelSize` of 200,000 px in `LevelLimits`: the reader refuses a World's rectangle wider or taller, and the World's width and height fields stop there.
- **The determinism test's levels in stage 13** are seven: a crate pyramid; a car body of three merged shapes; a self-crossing polygon falling on a line; bodies leaving through an open edge; bouncing balls inside Walls; one body of each type with gravity scale, damping, fixed rotation and bullet set; a rotated, skewed, mirrored group of merged shapes. Stage 14 adds the rope bridge, the springs and the car's hinged wheels, and stage 15 the camera following a body. *Why: testing.md's list needs joints and the camera, which come later.*
- **The levels are `level.json` files in the repo**, built once by the code in `tests/levels/determinism/` and written by `npm run determinism:record` with their hashes. The test reads only the files. *Why: a change to the building code can then never change a recorded level unnoticed.*
- **The Node test runs in `npm run check`**, through the `node` project of Vitest, so the CI's existing x86 and ARM jobs run it with no new job. 600 ticks of seven levels take a few seconds. The browsers' run is a `.browser.test.ts` in the `browser` project. The worker against `runHeadless` waits for stage 16, which builds the worker.
