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
    readonly removed: readonly EntityId[];    // past an open edge of the level bounds, or the hard limit
    readonly removedPastHardLimit: readonly EntityId[];  // those of removed past the hard limit
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
    constructor(run: PlayRun, start: RunStart, phases: readonly TickPhase[]);

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
- *As built (step 5, standing yes, 2026-11-16):* `BodyMembership` is made for one `Level` and answers three questions: `bodyOf(entity)`, the body it moves with (the one it merges into, else its own); `isBuiltBody(entity)`, whether play builds a body for it (a BodyComponent that merges into nothing); and `surfaceTargetOf(entity)`, where its surface goes: a body, `static`, or `skipped` with the reason `lineOnDynamicBody`. **A line is skipped by the type of the body it goes into**, so a line on a Static body merged into a Dynamic one is skipped too, since the group's type wins. The World and the camera get none of the three. How `static` surfaces become Box2D bodies is the builder's choice in step 6. `bodyOf` moved from `countBodyChanges` into `merging/bodyOf.ts` so both use one rule. *Why: the builder needs all three, and one shared `bodyOf` keeps the body question and play from drifting apart.*
- *As built (step 6, standing yes, 2026-11-16):* `PhysicsSceneBuilder.build(level, caches, engine)` makes the world with the World's Gravity, then goes through the Entities panel order once: a body is created where `isBuiltBody` says so, then the entity's surface is added. Every `static` surface and the Walls go into **one Static ground body** named after the World, made only when something needs it. Each body's level matrix is split once by `splitBodyMatrix` into its pose (position and angle) and its rest (scale, skew, a mirror); the body's own surface uses the rest directly, and every other member is moved by the inverse of the pose times its level matrix, so a mirrored or skewed parent mirrors and skews its pieces. `piecesInBodySpace` moves the pieces and skips those too small to collide; a circle stays a circle only when that matrix scales evenly (`Matrix2D.scalesEvenly`, shared with the physics view), else it goes in as the 32-point polygon. The Walls are four lines on the level bounds with a SurfaceComponent's default values. The result, `PhysicsScene`, holds the world, the bodies with their pose and rest, the ground and the skipped lines. *Why: one ground body keeps the number of Box2D bodies low, and the rest matrix is what `WorldMatrixCache` multiplies by the pose in step 7.*
- *As built (step 7, standing yes, 2026-11-16):* `WorldMatrixCache` and `DerivedCaches` take an optional `BodyMatrixSource` (core/derived). During play it is `BodyMatrices` (core/simulation/bodies), which answers a body entity's matrix as its pose from `BodyPoses` times the rest from the scene, and nothing for any other entity; `DerivedCaches.bodyMoved(entity)` marks that body's matrices and bounds stale, so children and bounds follow. `PhysicsPhase` calls it for each moved body. The phases share one `PlayRun`: the play copy, its caches, the `PhysicsScene`, the poses, `BodyMatrices` and the `ReportCollector`, so `Simulation` takes a `PlayRun` instead of the level and the world. `TickInputs` is `{ heldKeys }`, each key by its `KeyboardEvent.code`. A report holds each body that moved since the last one once, with its latest pose, in the order it first moved; the snap flag is 0 for now, since nothing teleports or spawns in v1. `startSimulation` returns the `LevelReader`'s `ReadOutcome` and needs an engine already loaded, since the worker loads it on `prepare`. `Simulation.destroy()` frees the physics world and the caches. Two subfolders join the planned ones: `bodies/` for `BodyMatrices`, and `start/` for `startSimulation`, which imports both `run/` and `phases/`, so it can't sit in `run/` without a circle between folders. *Why: the caches stay ignorant of physics, the page's `PlayMirror` can use the same source, and one shared run keeps each phase's constructor empty.*
- **A line on a Dynamic body is skipped** by `PhysicsSceneBuilder`, with the rest of the body built. *Why: the editor already refuses it; a level edited by hand must still play.*
- **Lines are two-sided segments, one per edge**, not chains. *Why: the requirement says lines collide from both sides and never with each other; Box2D's chains are one-sided, and segments on a body never hit segments. Step 4 confirmed both against 3.2.*
- **The speed cap** is Box2D's world setting `maximumLinearSpeed` at 120 m/s (6,000 px/s). **The spin cap is Box2D 3.2's own** 45° a step, 7.5 turns per second, so nothing clamps it (changed in step 3, standing yes, 2026-11-16: the planned clamp at 15 turns per second could never act). *Why: Box2D 3.2 has a world setting for speed and holds spin itself.*
- **Pieces too small to collide** are those whose area is under 1 px² or whose points are closer than 0.5 px; they are skipped, not turned into a box. Step 4 checked the numbers against 3.2 (standing yes, 2026-11-16): polygons have no skin, but Box2D drops a point within 0.5 px of the line through its neighbours, so 0.5 px stays. A long sliver thinner than 0.5 px passes this rule and gets no hull in Box2D; `Box2dPhysicsWorld` skips an empty hull, so it doesn't collide, as the rule intends. *Why: the builder's check keeps the physics view honest for the common cases, and the adapter's skip covers the rest without a second geometry test in core.* See [tech-notes.md](../tech-notes.md#physics-and-joints).
- **Body poses are the play copy's state:** `PhysicsPhase` writes them into `BodyPoses`, and the play copy's `WorldMatrixCache` reads a body entity's matrix as `pose · rest` through an injected pose source. *Why: the architecture says TransformComponent values aren't written each tick; the cache already updates the children.*
- **`stateHash()`** is FNV-1a over the bytes of one `Float64Array` holding the tick, then each body's id, position, angle, speed and spin in Entities panel order, then the camera, written as 8 hex digits. *Why: simple, needs no library, and any one bit that differs changes it.*
- **The hard limit** is per axis: a body whose position has |x| or |y| over 100,000 px is removed, with or without Walls, and the report lists it under `removedPastHardLimit` for the status text stage 16 shows (`Crate went too far from the level and was removed`, *proposal*). *Why: the maximum level size is a 200,000 px square centred on the origin, so its edge is 100,000 px on each axis.*
- **The maximum level size** is a new `maxLevelSize` of 200,000 px in `LevelLimits`: the reader refuses a World's rectangle wider or taller, and the World's width and height fields stop there.
- *As built (step 8, standing yes, 2026-11-16):* `LevelBoundsPhase` looks only at bodies, since only bodies move in v1: all of them on the first tick, then the ones that moved. A body is **inside** while its subtree's bounds (the `BoundsCache`'s, so everything drawn in it counts) overlap the level bounds, touching included, and **fully outside** when they don't; one whose subtree draws nothing is never removed for the bounds. It marks entities in `RemovalMarks` (core/simulation/removal), shared through `PlayRun`, and `EndOfTickPhase` removes each marked entity with everything inside it, destroying every body built in that subtree, before it writes the moved poses. `removed` lists only the top entity of each removal, past an open edge or the hard limit, so the page removes the same subtree; `removedPastHardLimit` names those of them past the hard limit. The hard limit reads the body's pose, so it counts from the body's origin. `stateHash` leaves out removed bodies. The reader's refusal is `overLimit` with the new limit `levelSize`, read as "its level bounds are wider or taller than 200,000 px". The cap in the editor is a `max` of 200,000 on the ShapeComponent's Width and Height fields, so it holds for every shape, and the World's resize handles stop there. The scripted `PhysicsWorld` the simulation's tests share moved to `core/simulation/testing/`. *Why: a body is what Box2D moves, so checking only moved bodies keeps the phase cheap; one list of removed entities lets the page remove without knowing why; the shared Width and Height fields can't tell the World apart, and no shape needs to be bigger than the largest level.*
- **The determinism test's levels in stage 13** are seven: a crate pyramid; a car body of three merged shapes; a self-crossing polygon falling on a line; bodies leaving through an open edge; bouncing balls inside Walls; one body of each type with gravity scale, damping, fixed rotation and bullet set; a rotated, skewed, mirrored group of merged shapes. Stage 14 adds the rope bridge, the springs and the car's hinged wheels, and stage 15 the camera following a body. *Why: testing.md's list needs joints and the camera, which come later.*
- **The levels are `level.json` files in the repo**, built once by the code in `tests/levels/determinism/` and written by `npm run determinism:record` with their hashes. The test reads only the files. *Why: a change to the building code can then never change a recorded level unnoticed.*
- *As built (step 9, standing yes, 2026-11-16):* `runHeadless(levelData, engine, { ticks, start, inputsAt })` builds the run with `startSimulation`, runs it and returns, per tick, its `stateHash` and `Simulation.bodyHashes()`: one FNV-1a hash per body over the same seven numbers, in Entities panel order. A run starts from the clock time alone, since the seed comes with v2. The levels are built by `tests/levels/determinism/build/` and written to `tests/levels/determinism/files/<name>.json`; the hashes go to `tests/determinism/recorded/<name>.hashes.txt`, one line per tick, `12 0a1b2c3d 3:4e5f6a7b ...`. Both are written only by `npm run determinism:record`, which runs in plain Node, and both are left out of Prettier. The test runs every level file against its hashes and every level twice in one process; a failure reads like `tick 100, first at body 5 (Crate 1.2)`. All seven levels come to rest within the 600 ticks, and the open-edge level loses every crate. *Why: a per-body hash names the body without storing every number, and a text line per tick keeps a failing diff readable.*
- **The Node test runs in `npm run check`**, through the `node` project of Vitest, so the CI's existing x86 and ARM jobs run it with no new job. 600 ticks of seven levels take a few seconds. The browsers' run is a `.browser.test.ts` in the `browser` project. The worker against `runHeadless` waits for stage 16, which builds the worker.
- *As built (step 10, standing yes, 2026-11-16):* `tests/determinism/determinism.browser.test.ts` runs every level file against its recorded hashes in Chromium, Firefox and WebKit. The browser has no files to read, so it takes the same files through Vite's `import.meta.glob`, the hashes as raw text; the tests' `tsconfig.json` gained Vite's types for it. What both tests share is in `tests/determinism/run/` (the 600 ticks, the start, `runLevel`) and `tests/determinism/compare/` (`firstDifference`, `describeDifference`); `level-files/` keeps only what reads files in Node. The run-twice check stays in Node alone. It is in the `browser` project, so the CI's browser job runs it on every push, not only on master as [testing.md](testing.md#in-ci) first said. The seven levels take about two seconds in all three browsers. *Why: one copy of the levels and hashes for both tests, and running it on every push costs little.*

## Stage 14's choices

Made under the standing yes (2026-11-16), before building. The [plan](../plan.md#stage-14-in-steps) has the steps; the Joint tool's choices are in [selection-and-tools.md](editor/selection-and-tools.md#stage-14s-choices).

- **Field A is Box2D's body B, and field B (or the ground) is Box2D's body A.** *Why: the requirement's motor turns A and its limits stop A turning too far, and Box2D measures the angle of its body B against its body A, as the [tech notes](../tech-notes.md#physics-and-joints) say.*
- **Box2D 3.2 has no reference angle; it has a local frame on each body.** `Box2dPhysicsWorld` gives both frames the joint's level position, and B's frame the angle between the two bodies at the start, so the placed angle reads 0 and the limits are measured from how the joint was built. Box2D's positive angle is clockwise on screen, like the requirement's. Step 2 found that 3.2 holds a Hinge's limits inside ±180°, so that cap is now in the requirement and the schema, as the spin cap was (see [adapters.md](adapters.md#physics)).
- **Units:** motor speed in °/s becomes rad/s; Motor strength and Resistance are Box2D's `maxMotorTorque` in N·m at 50 px per metre, and their defaults stay marked (tune). **Resistance is a motor at speed 0** with that strength while Motor is off, and does nothing while Motor is on, as the tech notes advise.
- **Rope is a distance joint with a spring of 0 bounces per second and a limit from 0 to Length**, so it pulls nothing until taut and can go slack. **Spring is a distance joint with a spring**: Rest length is its length, Stiffness its `hertz` and Damping its `dampingRatio`, with no limit. *Why: Box2D 3.2 takes the spring in bounces per second, so the mass the tech notes' conversion needed isn't used. Step 3 confirmed both against the real build (`Box2dPhysicsWorld.distance.test.ts`): a Rope stops at its Length and goes slack, and a Spring bounces at its Stiffness give or take half a bounce per second.*
- **`PhysicsSceneBuilder` adds joints after every body and surface**, in Entities panel order, so both their bodies exist. Each end's level position is the joint's level matrix applied to its end. A and B go to `BodyMembership.bodyOf`; an empty B, or an end that is a surface with no body on it or above it, goes to the one Static ground body, which is now made when a joint needs it too.
- **A joint is skipped with a reason**, kept in the `PhysicsScene` for v3's warnings: `noPhysics` (an end that is neither a body nor a surface), `sameBody` (Box2D asserts the two differ), `cannotMove` (neither end Dynamic), `insideCamera`. A missing entity counts as `noPhysics`. A hidden joint is built, since a hidden joint still works. Step 5 built it in `jointDefinitionOf` and `PhysicsSceneBuilder`: `insideCamera` is checked first, a skipped joint makes no ground body, and each built joint keeps the entities of its two bodies (none for the ground) in the `PhysicsScene`, for `BodyMatrices` and `EndOfTickPhase` in step 6. A Hinge hands its one end to both bodies.
- **Scaling a group with joints needs no editor rule.** A joint's ends are in its own space, so the gap already scales with any group above it. **A typed Length or Rest length is in the joint's own space too:** play multiplies it by the joint's scale, the square root of the absolute determinant of its level matrix, the geometric mean the tech notes ask for. **A mirrored joint** (a negative determinant) gets its limits swapped and negated and its motor speed negated. Match drawn distance uses the gap in level positions at the start. *Why: the stored values never change when a group is scaled, so undo has nothing extra to put back, and the rule holds for a joint scaled on its own too.*
- **A joint entity moves with its A's body during play:** `BodyMatrices` answers its matrix as A's pose times a rest worked out once at the start (the inverse of A's starting pose times the joint's level matrix), so its children follow and a Hinge's icon stays on its wheel. *Why: the requirement says the physics engine moves the joint during play, and only a body moves.*
- **`jointPathPoints(type, a, b)`** in `core/physics/joint-paths/` gives a Rope two points and a Spring a zigzag of 8 teeth, 8 px each side of the line between its ends (*proposal*), in the joint's own space. `CreateJointCommand` and `JointPathPhase` both use it, so the path in play starts as the editor drew it. `JointPathPhase` works out each end from its body's pose, not from Box2D, and changes a path only when one of its bodies moved. The tick report gains `paths`, the changed paths only, which the page's `PlayMirror` applies in stage 16. `stateHash` leaves paths out, since they follow from the poses. Step 6 built it: `PlayJoints` keeps each built joint's two ends in its bodies' spaces, worked out once at the start, and `JointPathPhase` runs after `PhysicsPhase`. A joint whose A is the ground stays where it was placed.
- **A joint goes with the body at either of its ends.** Box2D destroys a body's joints with it; `EndOfTickPhase` also removes each joint entity with an end in a removed subtree and lists it in `removed`, as Delete does in the editor. `destroyJoint` joins the contract for this and for v2's triggers. Step 6 built it to go on until nothing is left: a removed joint entity can hold bodies, whose own joints go too. Such a joint is listed in `removed` but never in `removedPastHardLimit`, since only a body goes past the hard limit. `destroyJoint` is called for every removed joint, as the adapter allows one Box2D already destroyed with its body.
- **The determinism levels gain three**, as planned in stage 13: a rope bridge, springs of three stiffnesses, and a car with a hinged wheel driven by a motor and one turning freely. Step 7 built them as `rope-bridge` (eight planks hung by slack Ropes between two Static posts, a crate dropped on them), `springs` (three weights under a Static ceiling on Springs of Stiffness 1, 4 and 10, pulled past their Rest length) and `hinged-car` (a car whose back wheel is driven at 180 °/s and whose front wheel turns freely, over a bump); the seven older levels' hashes stayed the same when recorded again. `tests/levels/determinism/build/levelParts.ts` gained `addJoint`, which places a joint as the Joint tool will: at the hinge point or halfway between the ends, ends in its own space, Length and Rest length from the gap. *The headless test per joint setting lives in `tests/determinism/joint-settings/`, not `core/simulation` as the plan said (standing yes, 2026-11-16).* *Why: it needs the real Box2D build, and core never imports an adapter.* For each of the sixteen settings of the three types it runs three seconds with the setting changed and without, and checks the end states differ.

## Stage 15's choices

Made under the standing yes (2026-11-16), before building. The [plan](../plan.md#stage-15-in-steps) has the steps. The [camera requirement](../requirements/camera.md) gives the rules; these say how they are built.

- **Smoothing is an even ease, the same share each tick:** the camera moves `1 − exp(−3 / (60 · Smoothing))` of the way to its goal, so it is 95% of the way there after Smoothing seconds. 0 locks it to the goal. `exp` is `DeterministicMath.exp`. *Why: the requirement calls Smoothing roughly how long the camera takes to catch up; an ease never quite arrives, so "catching up" is read as 95%, and a share per tick needs no speed kept between ticks.*
- **Each tick, in order:** the goal is the target's level origin, limited to the bounds; the camera smooths towards it; then the safety margin pulls it so the target is at least 10% of the box's width and height from its edge; then it is limited to the bounds again. *Why: limiting the goal first makes the camera slow down gently into an edge instead of hitting it, as the requirement asks; limiting last means the bounds win over the margin, so the camera always ends up inside, and near a wall the target can reach the edge of the view.*
- **Limiting to the bounds uses the camera's own box**, which is the whole view in Fixed size. Where the level is smaller than the box in one direction, the camera sits on the bounds' middle in that direction. v3's Fill window limits the shown view again on the drawing side, as the [tech notes](../tech-notes.md#camera) say.
- **The teleport rule needs no code of its own:** a target far away is pulled to the margin's edge in one tick, which is the cut the requirement asks for.
- **`CameraState` in `PlayRun` holds the position**, and `CameraPhase` (`core/simulation/phases/`) is the only code that changes it. The rules are plain functions in `core/simulation/camera/`. The run starts with the camera on its target, limited to the bounds, so there is no opening pan. A target that is missing or removed holds the last position; with no target the camera stays where it was placed, limited to the bounds. *Why: the requirement says the camera always ends up inside, also with nothing to follow.*
- **The camera entity's TransformComponent isn't written during play**, like a body's: the report and `stateHash` read `CameraState`. The page's `PlayMirror` (stage 16) moves its camera from the report. *Why: nothing in v1 reads the camera's values in the play copy; entities inside the camera are v2, which can add the camera to `BodyMatrixSource`'s job then.*
- **`CameraPhase` runs after `LevelBoundsPhase` and before `EndOfTickPhase`**, so the target is read before a removal at the end of the tick, and the next tick finds it gone and holds.
- **The determinism test gains `camera-follow`**, and the ten older levels are recorded again, since the camera now starts inside the bounds; only a level whose placed camera was outside them changes.
- *As built (step 4, standing yes, 2026-11-16):* `camera-follow` is a ball rolling down two Static slopes to the right Wall, in 2,400 by 1,400 bounds with Walls, so the default 1,920 by 1,080 camera stops at the bounds both ways. Recording again left all ten older levels' hashes as they were: none placed its camera outside its bounds, and `leaving-open-edge` and `bouncing-balls`, smaller than the camera, already had it on their middle at the origin. `tests/determinism/camera-follow/` checks on every tick that the ball's origin is inside the camera's box, that the box is inside the bounds, and that the camera reaches both side limits. *Why: a level only a little bigger than the camera makes the limits happen within ten seconds.*
- **`fixedSizeView(cameraBox, windowSize)`** in `editor/play/fixed-size/` works out the zoom, the middle and the black bars, in screen pixels. *Why: it is about the window, which never reaches the game, so it stays out of core; `PlaySession` in stage 16 feeds it to the view.*
- **`PixiLevelView.showThroughCamera(position, box)`** sets its view from `fixedSizeView` and draws `LetterboxOverlay` (`adapters/pixi/overlays/letterbox/`) in black over everything, so nothing of the level shows on a bar. Selection and handles aren't drawn; the grid, camera frame, joint icons and physics view follow their View menu switches, as [adapters.md](adapters.md#rendering) says. Interpolating the camera between ticks, as the tech notes advise, comes with stage 16's mirror.
- *As built (step 6, standing yes, 2026-11-16):* the view through the camera is a second `ViewState` inside `PixiLevelView`, so the editor's own view is left as it was and `stopShowingThroughCamera()` goes back to it; `shownView` says which one draws. Its middle and zoom are set with a new `ViewState.place`, which skips the editor's 1% to 1000% zoom range and pan limit. *Why: a 160 px camera, the smallest allowed, in a 1920 px window needs 1200%, and the bars must match the zoom drawn.* During play the dimmed outside of the bounds isn't drawn, nor the selection, the Shape tool's preview or the Joint tool's preview and thin lines; `readPixels()` lets the browser tests check every pixel of each bar is black.
