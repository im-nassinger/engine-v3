# Triggers in test play

## TL;DR

**How triggers run in the game worker**, built in v3 and moved here from [v3's architecture](../versions/v3/architecture.md) when v3 closed (2026-11-22). Three tick phases join v1's: **`EventPhase`** lists the tick's events in a fixed order after the physics step, **`TriggerPhase`** runs the triggers that hear them, in Entities viewer order, and **`EndOfTickPhase`** removes what was destroyed and ends the run on Win or Lose. Every changed value goes through **`PlayValueWriter`**, which tells the physics world when it owns the value. The tick report gains **changed values, the run's end and play warnings**, which the page shows; **Restart** builds a new run from the `LevelData` the worker kept. The trigger model itself is in [core-model/triggers.md](core-model/triggers.md); the rest of test play in [simulation.md](simulation.md).

## The tick, from v3

| Phase | Does |
|---|---|
| `InputPhase` | Builds `InputState` for the tick: each key and each input pressed, released or held |
| `PhysicsPhase` | One step, then reads the moved bodies **and the sensor events** into `TouchLedger` |
| `JointPathPhase` | As in v1 |
| **`EventPhase`** | Lists the tick's events, in a fixed order: level start (first tick only), keys and inputs, timers, touches, no longer touched, collision (from v4, counted by `ContactLedger`, see [v4's architecture](../versions/v4/architecture.md#triggers-in-play)), "no entity with this tag is left" |
| **`TriggerPhase`** | For each event in that order, the triggers that hear it, decided once, in Entities viewer order; their checks, then their actions |
| `LevelBoundsPhase`, `CameraPhase` | As in v1. `CameraSettings` reads Follow and Smoothing each tick |
| `EndOfTickPhase` | Removes destroyed and marked entities, finds tags that just ran out for the next tick, ends the run on Win or Lose, writes the report |

The events' bookkeeping is in `core/simulation/triggers/`, the actions in `core/simulation/actions/`, the inputs in `core/simulation/inputs/`, the run's end (`RunEnd`, `RunEnding`) in `core/simulation/end/` (standing yes, 2026-11-22).

- **Events come after the physics step**, so touches are the step's own, and a Push lands in the next step, 1/60 s later. *Why one place: every event in a tick is seen in one order, which is what the determinism test can check.*
- **`TouchLedger` counts per trigger owner and touching entity**, not per pair of shapes: "touched" fires when a count goes from 0 to 1, "no longer touched" when it goes back to 0. The owner is the sensor's entity and every group above it with a touch trigger; the touching entity is the body's own entity. Two sensors are filtered out here. An end event Box2D sends when a body is destroyed outside the step waits for the next tick. **A count is compared before and after all of a step's events**, so a surface rebuilt in the step fires nothing (standing yes, 2026-11-22). *Why: Box2D 3.2 sends the old shape's ends and the new one's begins in the same step (`box2dFacts.test.ts`).*
- **The adapter names a sensor event's two entities from its own table**, `SensorShapeTable` (`ShapeTable` from v4, which names contact events too), not from Box2D's user data ([adapters.md](adapters.md#physics)). *Why: in 3.2 a destroyed shape's end arrives with the next step, when the shape can no longer be read ([tech notes](../tech-notes.md#triggers)).*
- **`InputState`** reads, per tick, the keys held and the keys pressed since the last batch, which `HeldKeys` keeps, so a press shorter than a tick still counts. `TickInputs` carries `pressedKeys` on a batch's first tick only. A key is down while held or pressed this tick; an input is held while any of its keys is, and pressed when one of its keys is and none stayed held through. `PlayRun.inputs` holds the run's `PlayInputs`, which `InputPhase` moves on each tick. An unknown input name reads as not held and goes to `PlayInputs.unknownInputs`, once each, as a play warning.
- **`TriggerTimers`** count whole ticks: "after 60 s" is tick 3,600 after the trigger was switched on, and a timer on from the start counts from tick 0. Anything that slows the ticks slows the timers too.
- **Repeat** keeps, per trigger, whether it fired this run and the tick of its last firing; a firing that comes too soon is dropped. **A firing whose checks fail doesn't count for Repeat.**
- **`TriggerPhase` runs rounds:** the listed firings, then the firings their actions set off (`ChainedEvents`), such as a Change value that removes the last tag, heard in the same tick. After 32 rounds the rest are dropped with one play warning (the chain limit). Each firing asks again for on/off and Repeat, then `RunnableTriggers` (each trigger's `triggerProblems`, worked out once), then the checks. A level start trigger switched on during the first tick hears level start.
- **`TriggerIndex`** lists, at the start of a run, the triggers that hear each kind of When, in Entities viewer order, and keeps it when entities are destroyed. Touch triggers are found from the sensor's entity. *Why: a level of 10,000 entities must not walk every trigger every tick.*

## Actions

- **`ActionRunner`** finds the targets (`targetsOf`: `this`, `other`, the named entity, or every entity tagged, in Entities viewer order) and runs each action on each, skipping a target that lacks what the action needs. A tag check (`checksPass`) is true when one of its targets holds the tag, itself or on a group above; with no target it is false.
- **Change value goes through `PlayValueWriter`**, which writes only what `changeableValues` offers the entity, with the field type's `normalize`, and, **for a value physics owns, tells the physics world**: a body's Position or Rotation is read from where it is now, then written and teleported (`setPose`); Friction and Restitution change the surface; Sensor rebuilds it (Box2D 3.2 can't switch a surface between sensor and solid); Gravity calls `setGravity`; a Hinge's four motor values call `setMotor`. **The Position or Rotation of an entity that isn't a body but has a surface, a body or a joint in it is skipped**, and **a value physics owns that the contract can't change yet** (any BodyComponent field, a joint's other fields) **is skipped with the play warning `valueFixedInPlay`** (standing yes, 2026-11-22). *Why one writer: every changed value has one road, and v5's `set_attribute` will take the same one.*
- **Push** adds to the body's velocity, ignoring mass: `addVelocity(body, v)`. Away from or towards goes along the line from `this`'s origin to the body's position; a body exactly there isn't pushed.
- **Destroy** marks the target's subtree, removed by `EndOfTickPhase` with v1's removal, so the actions after it still run. It never takes the World or the camera.
- **Win, Lose and Restart** are kept on the run as `ending` (`RunEnding`), the first one in a tick winning; the tick finishes, and `Simulation.runTick` does nothing once `end` is set.

## The report, the mirror and the end

- **`TickReport` gains `changes`**, each changed value as `{ entity, component, values }`, only the keys `PlayValueWriter` wrote, at their latest (`ReportCollector`); **`end`**: `{ kind: 'won' | 'lost', tick }` or `{ kind: 'restart' }`; and **`warnings`**, the `PlayWarning`s first given in the batch (`PlayWarnings.takeNew`), each a kind with its details, once per run. A teleport also sets the pose's snap flag.
- **`PlayMirror` writes the changes into its level**, so a changed colour, a teleport or a switched-off trigger shows, and the Entity inspector (read-only during play) shows the new values.
- **Win or Lose** puts `PlaySession` in `ended` with its `outcome`; the Play bar reads ENDED and **`EndWindow`** (`ui/end-window/`, in the Play bar's floating layer, under it) shows the title and the time, the run's tick count as `m:ss.hh` (`runTimeText`, `editor/play/end/`). Leave is Stop.
- **Play warnings** go to the message pill, which stays on the page during play, written by `playWarningText` (`editor/play/warnings/`), until the Console comes in v5.

## Restart

- **Restart** (the action or the end window's button) starts a new `Simulation` from the `LevelData` and clock time the game worker kept from the last `start`, until a `stop`; a `restart` request is answered like a start (standing yes, 2026-11-22). Nothing is reset in place. `GameRunner` has `restart()`, and `DirectGameRunner` keeps them the same way. `PlaySession` keeps the `LevelData` it sent, so `PlayMirror` starts again from it. One worker does it; the tech notes' spare worker isn't needed, since the level is already read.
- **The last frame stays on screen while the new run starts**, so nothing flashes, and **a paused run restarts paused**. Restart is ignored while a run is starting and once it failed, crashed or hung.
- **The guard against a restart loop:** a Restart action in the first second of a run (ticks 1 to 60) is skipped with the play warning `restartIgnored`, and the rest of the tick runs. *Why: a level-start trigger that restarts would otherwise rebuild the level every tick, the "restart loop that could freeze the computer" the requirement names.*

## Keys during play

- **While the game has the keyboard, `KeyboardInput` prevents the browser's default for every key the level uses**, so Space and the arrows don't scroll, and passes the rest on. It is given `PlaySession` as its `GameKeys`, whose `usesKey` answers from `levelKeys` (the inputs' keys and the triggers' raw keys) while the run plays or is paused. The keys that can't be bound never reach a level.

## Determinism

- **Everything new is ordered**: events in their fixed order, triggers in Entities viewer order, targets with a tag in Entities viewer order, touches by the ids of the two entities. No hash map is walked.
- **`stateHash` adds the World's variables' values after the camera, in list order**, and nothing for a level with none, so the older levels' hashes are unchanged. The three trigger levels and their recorded inputs are in [testing.md](testing.md#the-determinism-test).
