# v3 architecture

## TL;DR

**How v3 is built**, Claude's draft (2026-11-22); the owner said to go ahead and build it the same day. v3 adds **four components** (TagsComponent, VariablesComponent, InputComponent, TriggerComponent), **three field types** for them, **the Trigger tool**, **a trigger model in core** that both the Entity inspector and the game read, and **three tick phases** in the game worker (`EventPhase`, `TriggerPhase`, and the run's end in `EndOfTickPhase`). The page learns to show **changed values**, **the end window** and **Restart**. Everything plugs into seams v1 left for it (see [components-and-fields.md](../../architecture/core-model/components-and-fields.md#seams-for-later-versions) and [simulation.md](../../architecture/simulation.md#the-simulation)); no part boundary is crossed that v1 didn't already cross. **Saved levels never change:** a level without the new components reads as before. Every choice here is made under the standing yes and listed in [decisions.md](../../decisions.md) unless it names the owner.

## Where things live

| Code | Folder | Part |
|---|---|---|
| `TagsComponent`, `VariablesComponent`, `InputComponent`, `TriggerComponent` | `core/components/<Name>/` | core |
| `TagsFieldType`, `VariableFieldType`, `InputFieldType`, `TriggerFieldType` | `core/fields/field-types/`, beside v1's (as built, standing yes, 2026-11-22) | core |
| `wordName` (the rule for a tag, a variable's name and an input's name) | `core/fields/names/` | core |
| The trigger's types and how a saved trigger is read (`parseTrigger`, `normalizeTrigger`, `copyTrigger`, `mapTriggerEntities`) | `core/fields/trigger/` (as built, standing yes, 2026-11-22) | core |
| `triggerName`, `triggerProblems`, `changeableValues`, `newTriggerId` | `core/triggers/model/` | core |
| `KeyCodes` (the keys a level may use, and the ones it can't) | `core/keys/` (as built, standing yes, 2026-11-22) | core |
| `EventPhase`, `TriggerPhase`, `TouchLedger`, `InputState`, `TriggerTimers`, `ActionRunner`, `PlayValueWriter` | `core/simulation/triggers/`, `core/simulation/phases/` | core |
| `TriggerTool` | `editor/tools/trigger/` | editor |
| `createTrigger` (the tool's one step), the trigger edits | `editor/commands/triggers/` | editor |
| `TriggerCardModel`, `TriggerSentence`, `TriggerChoices` | `editor/entity-inspector/triggers/` | editor |
| `TouchNeedsSurfaceRule`, `TriggerCantRunRule` | `editor/messages/rules/` | editor |
| `LevelTags` (every tag in the level, for suggestions and pickers) | `core/derived/tags/` | core |
| Sensor events, teleports, kicks and live settings in the Box2D adapter | `adapters/box2d/` | adapters |
| `UnstyledShapeOverlay` (the dashed edge and bolt) | `adapters/pixi/overlays/unstyled/` | adapters |
| `TriggerCard`, `TagsField`, `VariableRow`, `InputRow`, `EndWindow` | `ui/entity-inspector/triggers/`, `ui/fields/`, `ui/play/end-window/` | ui |
| The new tool in `createTools`, the new components in the registry | `app/` | app |

## The components

| Component | Card | Values | On | Changes in play |
|---|---|---|---|---|
| TagsComponent | 11 | Tags: `TagsFieldType` | Any entity | Yes, by adding or removing one tag |
| VariablesComponent | 12 | Variables: a list of `VariableFieldType` | The World only in v3 (any entity from v4) | Each variable's value |
| InputComponent | 13 | Inputs: a list of `InputFieldType` | The World only, not in the Add Component menu, like the CameraComponent | No |
| TriggerComponent | 15 | Triggers: a list of `TriggerFieldType` | Any entity, the World included | Each trigger's on/off |

- **Registered at the end of the registry, in that order**, so a component's index never changes, as v1 decided. Card 14 is kept for the ScriptComponent (v5), so the cards follow the requirement's order: tags, then scripts, then triggers. Variables and inputs, which the requirement's order doesn't name, sit after tags. *Why: they hold the values triggers read, so they read before the triggers.*
- **A new level's World gets an InputComponent** with `left`, `right`, `up`, `down` and `jump`, written into `LevelWriter.newLevel.json`. A level saved before v3 opens without one, as the requirement says; adding one is a World note with a fix, "No inputs. [Add the five inputs]". *Why: the reader never adds anything behind the user's back.*
- **Partners:** a TriggerComponent asks for nothing (a key trigger needs no shape). The missing Surface note is a rule on its card, below, not a partner, since only touch triggers need it.

## The field types

| Type | Value | Stored as |
|---|---|---|
| `TagsFieldType` | `readonly string[]` | `["coin", "pickup"]` |
| `VariableFieldType` | `{ name, value: number }` | `{ "name": "coins", "value": 0 }` |
| `InputFieldType` | `{ name, keys: readonly KeyCode[] }` | `{ "name": "jump", "keys": ["Space", "KeyW"] }` |
| `TriggerFieldType` | a `Trigger`, below | the same shape, keys in snake_case |

- **`normalize` makes a tag** lowercase, spaces to `_`, other characters dropped, 1 to 32 characters; the list keeps the first of two equal tags. **A variable's name and an input's name** follow the same rule (they are names a script will use in v5), unique in their list: `parse` refuses a second `coins`. *Why 32: long enough for `enemy_flying_boss`, short enough for a menu.*
- **A key is a `KeyboardEvent.code`**, such as `KeyW` or `Space`, so it is matched by its place on the keyboard as the requirement asks. `KeyCodes.label(code)` gives what the Entity inspector shows (`W`, `Left arrow`). `parse` refuses the keys the requirement says can't be bound.
- **The keys a level may use are a list, and every other key is refused** (as built, standing yes, 2026-11-22): letters, digits, Space, Enter, Backspace, the Shifts, the arrows, the editing keys, punctuation and the numpad. Tab, Esc, the F keys, Ctrl, Alt, the system key and the media and browser keys can't be bound. An input may have no key; it is never held. *Why: a list of what is allowed refuses any key a browser adds later, and Ctrl, Alt and the system key start shortcuts.*
- **The Inputs card's key pill listens once clicked** (as built, standing yes, 2026-11-22): each usable key pressed is added, leaving the pill makes them the input's keys in one step, Esc puts the old ones back.
- **The fixed list of field types gains `input` and `trigger`**, and `variable` is built now (numbers only; its other types come in v4 and v5). The requirement's list in [inspector-and-undo.md](../../requirements/editor/inspector-and-undo.md#one-fixed-list-of-field-types--v1) is updated with them. *Why: "a new need adds a type to the list, never a special field on one component."*
- **Copying keeps links** (requirement): `IdRemapping` today rewires only `entity` fields. **A field type may now say where its entity links are**, with an optional `mapEntities(raw, linkTo)`; `TriggerFieldType` and `ListFieldType` implement it, and `IdRemapping` and the missing-entity rule call it for any field that has it. *Why: a trigger names entities deep inside its value, and the clipboard must not learn the trigger's shape.*

## The trigger

```typescript
export type Trigger = {
    readonly id: number;                      // unique in its TriggerComponent, never reused, so Change value can name it
    readonly name: string | null;             // null: made from its When (triggerName)
    readonly on: boolean;
    readonly when: When | null;
    readonly checks: readonly Check[];
    readonly actions: readonly Action[];
    readonly repeat: Repeat;
};

export type When =
    | { kind: 'touched' } | { kind: 'untouched' }
    | { kind: 'input'; input: string | null; how: Press }
    | { kind: 'key'; key: KeyCode | null; how: Press }
    | { kind: 'after'; seconds: number | null } | { kind: 'every'; seconds: number | null }
    | { kind: 'levelStart' }
    | { kind: 'tagLeft'; tag: string | null };
export type Press = 'pressed' | 'released' | 'held';

export type Target =
    | { kind: 'this' } | { kind: 'other' }
    | { kind: 'entity'; entity: EntityId | null }
    | { kind: 'tagged'; tag: string | null };

export type Check =
    | { kind: 'hasTag'; target: Target; tag: string | null }
    | { kind: 'compare'; variable: string | null; compare: Compare; value: number | null };
export type Compare = 'is' | 'isNot' | 'more' | 'less' | 'atLeast' | 'atMost';

export type Action =
    | { kind: 'change'; target: Target; value: ValueRef | null; op: 'set' | 'add' | 'subtract'; amount: JsonValue | null }
    | { kind: 'destroy'; target: Target }
    | { kind: 'push'; target: Target; push: Push | null }
    | { kind: 'win' } | { kind: 'lose' } | { kind: 'restart' };
export type Push =
    | { kind: 'by'; x: number; y: number }                 // px/s
    | { kind: 'away' | 'towards'; strength: number };       // px/s

export type ValueRef =
    | { kind: 'variable'; name: string }                   // the World's in v3
    | { kind: 'field'; component: ComponentTypeName; field: string; axis?: 'x' | 'y' }
    | { kind: 'tag' }                                      // op is add or subtract: add or remove the tag in amount
    | { kind: 'triggerOn'; trigger: number };              // a trigger on the target, by its id

export type Repeat = { kind: 'everyTime' } | { kind: 'oncePerRun' } | { kind: 'atMostEvery'; seconds: number };
```

- **Unset is `null`**, so a trigger half made is saved and read back half made, as the requirement asks ("a trigger with unset parts doesn't run").
- **`triggerProblems(trigger, level)`** (core) lists what stops a trigger running: an unset part, a missing entity, an unknown variable, input or value. **The Entity inspector and the game both call it**, so "yellow in the editor" and "doesn't run in play" can't disagree. A missing entity shows `missing` and only that action is skipped in play, as the requirement says; an unset part stops the whole trigger.
- **`changeableValues(entity, registry)`** lists what Change value may offer for a target: every field whose schema marks it `changeableInPlay`, the TagsComponent's tag, each trigger's on/off, and the World's variables. It reads the schemas only, so a component added later is offered with no trigger code, as v1's seam promised. A vector is offered whole for Set, and by axis for Add and Subtract.
- **`triggerName(trigger)`** gives "Touched", "jump pressed", "After 60 s", "No coin left". A trigger with a name of its own keeps it.
- **Ids are never reused** (as built, standing yes, 2026-11-22): the TriggerComponent stores `nextTriggerId` beside its list, and `newTriggerId(component)` gives the next one, above every id the list holds. The list refuses two triggers with one id (`ListFieldType`'s `itemId`, the problem `repeatedId`).

## The trigger card

- **`TriggerCardModel`** (editor) turns one `Trigger` into the card the mockup draws: the head (name, on, menu) and four sections of rows. **A row is a `TriggerSentence`**: a list of words, each plain text or a slot with its label, its state (set, unset, greyed) and the `TriggerChoices` it offers. React draws the rows and never knows what a trigger is. *Why: the sentence rules are the hard part, and in editor they are tested without a browser, as v1 keeps every Entity inspector rule.*
- **`TriggerChoices`** builds each menu from the level: the events; the targets (`this`, `other` greyed with its reason under an event with none, every named entity, every tag from `LevelTags`); the variables and inputs from the World; `changeableValues` for the target picked.
- **Every edit is one step** through v1's `SetValuesCommand` on the TriggerComponent's list, labelled by what changed, such as `Change trigger "Touched"`. Reordering, duplicating and deleting are the list field's own edits. Picking a new event resets the When's own parts and keeps the checks and actions.
- **Two new message rules:** `TouchNeedsSurfaceRule` puts "Needs a Surface to notice touching. [Add Surface as sensor]" on the card when a touch trigger's entity has no SurfaceComponent; the fix adds one with Sensor ticked, one step. `TriggerCantRunRule` puts "Doesn't run until every yellow part is set." under a trigger with problems.
- **As built (standing yes, 2026-11-22):** a word is a slot with its state, **set, unset, greyed or missing** (a deleted entity or trigger, which only skips its own part), and its entry: a menu whose items each carry the row as it is once picked, a number field, or a field of the value's own type (a colour, a vector). The edits are `TriggerEdits` beside the model, each giving the new list, `nextTriggerId` and the label; **`editTriggers` (`editor/commands/triggers/`) commits one as one step**, through the list's file form like `setFieldValue`. Labels: `Change trigger "Touched"`, `Add check to trigger …`, `Add action to trigger …`, `Remove check from trigger …`, `Remove action from trigger …`, `Switch off trigger …`, `Switch on trigger …`, `Rename trigger …`, `Duplicate trigger …`, `Delete trigger …`, `Move trigger …`, `Add trigger`. **A message can name one trigger by its id (`itemId`)**, and each block takes the card's notes about its own trigger. **A note's fix may carry values written over the component's defaults** (`savedValues`, `{ sensor: true }`). **A rule's `readsEntities` gets the level, and changing an entity it reads checks its readers again**, so a trigger's note follows the World's variables and inputs.

- **On screen (standing yes, 2026-11-22):** `TriggerCard` (ui, inside `EntityInspectorCard`) draws `TriggerCardModel` and commits each edit through `editTriggers`; it takes the card's place of fields and the notes about each trigger. With several entities shown it reads "Triggers are changed one entity at a time." Rename is a box in the head, a dragged name dropped on another block moves its trigger, and a number or value word opens a small field read by `TriggerTyping` (a colour code, `x, y`, a text).

## The Trigger tool

- **`TriggerTool` (key 6) draws a rectangle the way the Shape tool does**, sharing its drag state, readout and snapping. On release `createTrigger` makes one entity, one step: a TransformComponent, a rectangle ShapeComponent, a SurfaceComponent with Sensor on, and a TriggerComponent holding one trigger, `When: touched`, everything else unset. Then the tool returns to Select with it selected, like every tool.
- **A shape with no StyleComponent** is drawn by `UnstyledShapeOverlay` as the design's dashed edge and bolt, in the editor only, so a trigger can be seen; the overlay hides in play with the other editor-only drawing. Hit testing already treats a shape with no fill as its edge only, which is the requirement's "selected by its edge".
- **As built (standing yes, 2026-11-22):** `TriggerTool` (`editor/tools/trigger/`) holds its own `ShapeTool` given `createTrigger` as the function that makes the entity, so it shares every part of the Shape tool's rectangle (drag, click, readout, snapping, Z, X and W, A, S, D) and remembers its own size; it never shows the kinds menu. `createShape`, `createPath` and `createTrigger` share `addDrawnEntity`. The new entity also gets a NameComponent, "Trigger 1", and the step is "Draw Trigger 1". `UnstyledShapeOverlay` (`adapters/pixi/overlays/unstyled/`) sits over the grid and under the selection; the level itself no longer draws an unstyled shape's thin line, only an unstyled path's. The bolt is placed 6 px in from the top left of the shape's box on screen, upright at any rotation.

## Test play

### The tick, from v3

| Phase | Does |
|---|---|
| `InputPhase` | Builds `InputState` for the tick: each key and each input pressed, released or held |
| `PhysicsPhase` | One step, then reads the moved bodies **and the sensor events** into `TouchLedger` |
| `JointPathPhase` | As in v1 |
| **`EventPhase`** | Lists the tick's events, in a fixed order: level start (first tick only), keys and inputs, timers, touches, no longer touched, "no entity with this tag is left" |
| **`TriggerPhase`** | For each event in that order, the triggers that hear it, decided once, in Entities viewer order; their checks, then their actions |
| `LevelBoundsPhase`, `CameraPhase` | As in v1 |
| `EndOfTickPhase` | Removes destroyed and marked entities, finds tags that just ran out for the next tick, ends the run on Win or Lose, writes the report |

- **Events come after the physics step**, so touches are the step's own, as the requirement and the tech notes ask, and a Push lands in the next step, 1/60 s later. *Why one place: every event in a tick is seen in one order, which is what the determinism test can check.*
- **`TouchLedger` counts per trigger owner and touching entity**, not per pair of shapes, as the tech notes warn: "touched" fires when a count goes from 0 to 1, "no longer touched" when it goes back to 0. The owner is the sensor's entity and every group above it with a touch trigger; the touching entity is the body's own entity. Two sensors are filtered out here. An end event Box2D sends when a body is destroyed outside the step waits for the next tick. **A count is compared before and after all of a step's events**, not after each one, so a surface rebuilt in the step (an end and a begin for the same two entities) fires nothing (standing yes, 2026-11-22). *Why: Box2D 3.2 sends the old shape's ends and the new one's begins in the same step (`box2dFacts.test.ts`).*
- **`Box2dPhysicsWorld` names a sensor event's two entities from its own table**, from the whole shape id (index and generation) to the entity, not from Box2D's user data, and drops a destroyed shape's entry only once its ends have come (standing yes, 2026-11-22). *Why: in 3.2 a destroyed shape's end arrives with the next step, when the shape can no longer be read, and its slot may already hold a new shape ([tech notes](../../tech-notes.md#triggers)).*
- **`InputState`** reads, per tick, the keys held and the keys pressed since the last batch, which `HeldKeys` now also keeps, so a press shorter than a tick still counts. An input is held while any of its keys is held. An unknown input name reads as not held and sends one warning.
- **As built (standing yes, 2026-11-22):** `TickInputs` gains `pressedKeys`, carried by a batch's first tick only. `InputState` and `PlayInputs` are in `core/simulation/inputs/`; `PlayRun.inputs` holds the run's `PlayInputs`, which `InputPhase` moves on each tick and `Simulation.inputs` shows. A key is down while held or pressed this tick, and pressed only when `HeldKeys` kept its press; an input is pressed when one of its keys is and none stayed held through. Unknown input names go to `PlayInputs.unknownInputs`, once each. `levelKeys` lists the inputs' keys and the triggers' raw keys; `PlaySession.usesKey` answers from it while the run plays or is paused.
- **`TriggerTimers`** count whole ticks: "after 60 s" is tick 3,600 after the trigger was switched on; anything that slows the ticks slows the timers too, as the requirement asks of the game speed.
- **Repeat** keeps, per trigger, whether it fired this run and the tick of its last firing; a firing that comes too soon is dropped.
- **The chain limit:** an action that causes an event in the same tick (Change value that removes the last tag, or switches on a trigger whose When is level start) queues it in the same `TriggerPhase`. After 32 rounds in one tick the rest are dropped with one warning. *Why: v3 has no custom events, but a tag running out can already feed another trigger.*

### Actions

- **`ActionRunner`** finds the targets (`this`, `other`, the named entity, or every entity tagged, in Entities viewer order) and runs each action on each, skipping a target that lacks what the action needs.
- **Change value goes through `PlayValueWriter`**, which writes the play copy with the field type's `normalize`, and, **for a value physics owns, tells the physics world**: a body's position or rotation teleports it, Friction and Restitution change the surface, Sensor rebuilds it (Box2D 3.2 can't switch a surface between sensor and solid, standing yes, 2026-11-22), Gravity calls `setGravity`, a joint's Motor values change the motor. The `PhysicsWorld` contract gains `setPose`, `addVelocity`, `setSurfaceSettings` and `setMotor`. *Why one writer: every changed value has one road, and v5's `set_attribute` will take the same one.*
- **Push** adds to the body's velocity, ignoring mass, as the requirement says: `addVelocity(body, v)`.
- **Destroy** marks the target's subtree, removed by `EndOfTickPhase` with v1's removal, so the actions after it still run.
- **Win, Lose and Restart** are recorded on the run; the first one in a tick wins, and the tick finishes.
- **As built (standing yes, 2026-11-22):** `ActionRunner`, `PlayValueWriter`, `checksPass` and `targetsOf` are in `core/simulation/actions/`, away from the event bookkeeping in `triggers/`. `TriggerPhase` runs rounds: the listed firings, then the firings their actions set off (`ChainedEvents`), up to 32. Each firing asks again for on/off and Repeat, then `RunnableTriggers` (the trigger's `triggerProblems`, worked out once per trigger), then the checks; **a firing whose checks fail doesn't count for Repeat**. A tag check is true when one of its targets holds the tag, itself or on a group above; with no target it is false. `PlayValueWriter` writes only what `changeableValues` offers the entity in play. **A body's Position and Rotation are read from where it is now**, then written and teleported (`setPose`); **the Position or Rotation of an entity that isn't a body but has a surface, a body or a joint in it is skipped**, since only a body moves in a running world. **A value physics owns that the contract can't change yet (any BodyComponent field, a joint's fields other than the four motor values) is skipped with the play warning `valueFixedInPlay`.** A tag taken away by Change value that was the last one is heard in the same tick, not the next. **A level start trigger switched on during the first tick hears level start.** Push away from or towards goes along the line from `this`'s origin to the body's position; a body exactly there isn't pushed. Destroy never takes the World or the camera. The run keeps `ending` (`RunEnding`, the first Win, Lose or Restart) and `warnings` (`PlayWarnings`), which `Simulation.end` and `Simulation.warnings` show until task 13 puts them in the report. `CameraSettings` now reads Follow and Smoothing each tick, as its comment already said.

### The report, the mirror and the end

- **`TickReport` gains `changes`**, each changed value as `{ entity, component, values }`, and **`end`**: `{ kind: 'won' | 'lost', tick }` or `{ kind: 'restart' }`. **`PlayMirror` writes the changes into its level**, so a changed colour, a teleport or a switched-off trigger shows, and the Entity inspector (read-only during play) shows the new values.
- **Win or Lose** puts `PlaySession` in `ended`; the Play bar reads ENDED and **`EndWindow`** (ui) shows the title and the time, the run's tick count as `m:ss.hh`. Leave is Stop. Restart is below.
- **Restart** (the action or the button) starts a new `Simulation` from the `LevelData` the worker kept, with the run's same clock time, as v1 planned: nothing is reset in place. The page's `PlayMirror` starts again from the same data. One worker does it; the tech notes' spare worker is not needed, since the level is already read. **The guard against a restart loop:** a Restart action in the first second of a run is ignored with a warning. *Why: a level-start trigger that restarts would otherwise rebuild the level every tick, which is the "restart loop that could freeze the computer" the requirement names.*
- **Warnings during play** (the chain limit, an unknown input, an ignored Restart) go to the message pill until the Console comes in v5, through the report's new `warnings`, each sent once per run.

### Keys during play

- **While the game has the keyboard, `KeyboardInput` prevents the browser's default for every key the level uses**, so Space and the arrows don't scroll, and passes the rest on, so browser keys work. The keys that can't be bound (Esc, Tab, Shift+T and the rest) never reach a level.
- **As built (standing yes, 2026-11-22):** `KeyboardInput` is given `PlaySession` as its `GameKeys` and stops a key's default when the editor used it or `usesKey` says the game does.

## Determinism

- **Everything new is ordered**: events in their fixed order, triggers in Entities viewer order, targets with a tag in Entities viewer order, touches by the ids of the two entities. No hash map is walked.
- **The determinism test gains three levels**: `trigger-coins` (a ball pushed by a recorded input across sensor coins that destroy themselves and count, a World trigger that wins when none is left), `trigger-timers` (every and after, Repeat at most once a second, a trigger switching another off), and `trigger-touch-groups` (a group of shapes touching a sensor, counted once). Each records the hashes per tick, the variables included in `stateHash`.

## Tests

- **Unit (core, editor):** each field type's parse and normalize; `triggerProblems`; `changeableValues`; `TouchLedger` with shapes, groups and destroyed bodies; `InputState` with short presses; each action; Repeat; the chain limit; `TriggerCardModel`'s sentences, unset and greyed words, and every edit as one step; the two message rules; `IdRemapping` with trigger links.
- **Box2D facts first** (`box2dFacts.test.ts`, the first task): sensor begin and end events in 3.2, a sensor on a Static body and a Kinematic visitor, the end event for a destroyed body, and that two sensors see each other. The results go into [tech-notes.md](../../tech-notes.md#triggers). **As built:** also a visitor skipping a sensor between steps (a Dynamic one is still seen, a Kinematic one isn't), destroying the sensor, switching its events off and on, and rebuilding a sensor.
- **Browser:** the tags field, the trigger card's menus, the dashed overlay.
- **Playwright journeys:** draw a trigger with the Trigger tool, make it Win when touched by `player`, play, roll into it, see the end window, Restart, Leave; a key trigger pushing a body; the World's variables and inputs edited and saved.

## Performance

- **Triggers are found by event kind**: at the start of a run `TriggerIndex` lists, per kind of When, the triggers that hear it, in Entities viewer order, and keeps it when entities are destroyed. Touch triggers are found from the sensor's entity. *Why: a level of 10,000 entities must not walk every trigger every tick.*
- **A new speed test plays 1,000 touch triggers**, with 100 bodies sweeping through them for 10 s, in the real game worker: it must keep v1's test play targets, 95% of frames within 16.7 ms and 600 ticks in 10 s.
