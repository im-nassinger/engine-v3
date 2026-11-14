# Triggers

## TL;DR

A trigger is no-code logic on an entity, in three parts: **When** (one event), **If** (optional checks), **Do** (a list of actions, run top to bottom). An entity's TriggerComponent holds a list of them. **v2:** the When, If, Do sentence, the events for touching, keys, timers, level start, custom events, destroyed, a variable changing and "no entity with this tag is left", three kinds of If check, nine actions, the Repeat setting, and the Trigger tool. **v3:** mouse events, "while touching" and "left the level", sound and camera shake actions, arrows to what a trigger affects, and trigger lines in the Console. Core rules: **if it's data, change it with Change value**, triggers and scripts share one list of events, and the order you see is the order things run.

## The trigger

### When, If, Do · v2

- A TriggerComponent holds a list of triggers. Any entity can have one, the World included. The World's triggers are the home for level-wide logic, because the World is never destroyed.
- **When:** one event. **If:** optional checks that must all be true. **Do:** a list of actions, run top to bottom.
- *Why three parts: an earlier one-sentence form hid the "who" inside the When, which only works for touching. When, If, Do gives every trigger the same shape: an event happens, checks decide, actions run.*
- Every event gives the trigger two entities: **`this`**, the entity holding the trigger, and **`other`**, the entity that caused the event, when there is one. For touching, `other` is the entity that touched. For a custom event, it is the sender. A key, a timer or level start has no `other`, and checks and actions that use it are greyed out.
- **Each check and action picks its target from: `this`, `other`, an entity by name, or every entity with a tag.**
- In the Inspector a trigger reads as a **sentence with clickable parts**, such as "When something starts touching this, if it is tagged player: add 1 to coins, destroy this."
- A part that isn't set yet is highlighted and says what it needs. A trigger with unset parts doesn't run.
- Each trigger can be switched on or off. It is a value like any other, so one trigger switches another on or off with Change value.
- Triggers can be dragged to reorder, duplicated and deleted. Every edit is one undo step.
- Triggers do nothing a script can't: both use the same events and the same Lua API underneath.
- A trigger on a hidden entity still runs.

Source: scope TR1; round 1: C11; round 2: R10; round 5: T3, T4; round 9: 09 2.11, 09 2.14; decisions: D10; old: TR-01 to TR-04, TR-120 to TR-124; owner: 2026-11-13

### Events · v2

| Event | Reads as | `other` |
|---|---|---|
| Touched | When something starts touching this | The entity that touched |
| No longer touched | When something stops touching this | The entity that left |
| Collision | When this hits something | The entity it hit |
| Key or input | When the Space key is pressed. When the jump input is pressed | None |
| Timer | After 60 seconds. Every 2 seconds | None |
| Level start | When the level starts | None |
| Custom event | When this gets `open` | The sender |
| Destroyed | When this is destroyed | None |
| A variable changes | When coins becomes 10 or more | None |

- **A sensor being touched counts as "touched". Two solid things hitting counts as "collision".** Two sensors never notice each other.
- Touching and collision need a SurfaceComponent, at least one Dynamic body, and (from v3) a ticked pair in the collision grid. The trigger card says so when a trigger can't fire.
- **A trigger fires once for each entity that touches it**, even when that entity is built from several shapes. Sliding from one shape to another fires nothing.
- A trigger on a group hears touches on any part inside it. Parts of the group never set off the group's own trigger.
- **Key or input** fires on press, on release, or while held. See [variables-and-inputs.md](variables-and-inputs.md).
- **Timer:** fires once after a time, or again and again. It starts counting when its trigger is switched on, and slows down or stops with the game speed. Times are whole ticks, so timers never drift.
- **Level start** on a spawned entity fires when it spawns.
- **A variable changes** has an optional condition, such as "becomes 10 or more". *Why: it replaces a builtin script that watched a variable. It is one more event, not a new concept.*
- **Custom event:** an event you name yourself, see below.
- *Why this set: enough for coins, doors, buttons, timers and hazards.*

Source: scope TR2; round 1: D63; round 4: T2; round 8: 09 2.2, 09 2.6; round 9: MSG2, 09 2.10; round 10: IN1; old: TR-05 to TR-07, TR-10 to TR-20, TR-60 to TR-62, TR-86 to TR-90; owner: 2026-11-13

### "No entity with this tag is left" · v2

- Fires when the last entity with a tag is destroyed or loses the tag. It never fires if none ever existed.
- Example: on the World, when no `coin` is left, Win. Adding more coins needs no other change.
- *Why v2: "collect everything to win" is the simplest level goal.*

Source: scope TR3; round 8: 09 2.2; old: TR-21; owner: 2026-11-13

### Mouse events · v3

- **"When this is clicked"** and **"When the mouse is over this"**.
- **Only entities with a trigger whose When is a mouse event react to the mouse.** Clicks on any other entity pass through to what is below. So a decorative frame over a button doesn't block it.
- The area that counts is the entity's shape. No physics is needed.
- **Entities inside the camera come first, then the one drawn on top.** Exactly one entity gets the event.
- A click is a press and a release on the same entity. Hidden entities don't react.
- A clickable button in a level is just an entity with a "When this is clicked" trigger.
- *Why v3: keys are enough for a platformer test, and mouse events need the rules for which entity gets the click.*

Source: scope TR4; round 9: 09 2.7b; decisions: D54; old: TR-66 to TR-72

### "While touching" and "left the level" · v3

- **While touching** fires every tick for each entity that is touching, unless Repeat slows it down.
- **Left the level** fires on an entity just before it is removed for being fully outside an open edge of the level bounds.
- *Why v3: touched and no longer touched cover the same cases with a little more work.*

Source: scope TR5; round 8: 09 2.2; old: TR-12, TR-22

### If checks · v2

- **`other` has a tag:** "If other is tagged player". The tag may be on the touching entity or on any group above it, so tagging the player's group is enough.
- **A variable compared with a value:** "If coins is 10 or more". A string or boolean variable is only checked with "is" or "is not", see [variables](variables-and-inputs.md).
- **A component value compared with a number:** "If this BodyComponent speed is more than 200".
- All checks must be true. Anything more complex is a script.
- *Why v2: a coin that only the player can pick up needs the tag check.*

Source: scope TR6; round 5: T5; old: TR-24 to TR-27; owner: 2026-11-13

### Actions · v2

| Action | What it does |
|---|---|
| Change value | Sets, adds to or subtracts from any component value on the target |
| Spawn | Creates an entity from an `.entity` file, picked by path, with the TransformComponent values you type: position, rotation, scale and skew |
| Destroy | Removes the target and its children |
| Push | Gives a body a kick: a fixed direction, away from `this` or towards `this`, and a strength. By default it ignores mass, so a jump pad feels the same for everything |
| Fire custom event | Fires a named event on the target, with an optional number |
| Wait | Delays the actions after it |
| Win, Lose | Ends the run as won or lost |
| Restart | Restarts the level |

- **If it's data, change it with Change value.** One action covers teleporting (the TransformComponent's position), variables (on the World's VariablesComponent), tags, switching triggers on or off, a joint's motor, the camera's zoom and follow target, gravity. *Why: the owner pointed out that teleporting is just changing a component value. What is left on the list does something no value can.*
- Change value only offers values that are allowed to change during play.
- **Spawn asks for TransformComponent values and has no target.** *Why: you say exactly where the new entity appears and how it is turned and sized (owner: 2026-11-14).*
  - **Position and rotation are measured from the entity the trigger is on.** Example: a cannon tilted 30° spawns a bullet at 40, 0: the bullet appears 40 px along the cannon, tilted 30°, wherever the cannon is. A trigger on the World measures from the level's origin. *Why: a moving cannon then works without a script (owner: 2026-11-14).*
  - **Spawn's values replace the TransformComponent saved in the `.entity` file.** *Why: what the trigger shows is what you get (owner: 2026-11-14).*
- **A destroyed entity disappears at the end of the tick**, so the actions after Destroy in the list still run.
- **Wait** is one action in the list. A trigger that fires again during a wait gets its own run, so two enemies in a "wait, then destroy other" trigger both die. Destroying the entity, or switching the trigger off, cancels what is still waiting. *Why a list with Wait: without a list, "add a coin, play a sound, destroy this" needs three triggers with the same When.*
- **Restart is guarded against abuse**, such as a restart loop that could freeze the player's computer.
- Win, Lose and Restart let the current tick finish. If two fire in one tick, the first wins.
- A target that lacks what the action needs is skipped, and the other targets still run. An empty tag is not an error.
- Actions on a group use the group's own components. Body actions go to the body the entity belongs to.
- *Why v2: the full set except sound and camera shake.*

Source: scope TR7; round 1: D62; round 5: T6; round 9: 09 2.4b, 09 2.9; round 10: WT1; round 11: WT2; round 8: 09 2.4; old: TR-30 to TR-53, TR-78 to TR-84; owner: 2026-11-13; owner: 2026-11-14

### Play sound, Stop sound, Camera shake · v3

- **Play sound** and **Stop sound** come with sound, see [files and sound](../assets/files-and-sound.md).
- **Camera shake** comes with the camera effects, see [camera](../camera.md).

Source: scope AS4, CM9; round 9: 09 2.4b

### Repeat · v2

- Each trigger has one Repeat setting: **every time** (the default), **once per run**, or **at most once every N seconds**.
- Example: a spike that hurts at most once a second.
- Firings that arrive too soon are dropped, not queued.
- *Why v2: small, and without it a trigger can fire every tick.*

Source: scope TR8; round 5: T7; old: TR-55 to TR-57; owner: 2026-11-13

### Custom events · v2

- A **custom event** is an event you name yourself, such as `open`. A trigger or script fires it on an entity, and that entity's triggers and scripts react. It can carry one number.
- *The problem it solves: making something happen on another entity without knowing how that entity works. A button fires `open` on a door, and the door decides what opening means. Swap the door for a drawbridge and the button doesn't change.*
- *Why "custom event" and not "message": "event" is a word already in use, so there is no second concept.*
- A custom event can't reuse the name of a builtin event.
- A custom event nobody listens to is ignored without an error.
- A trigger calls a script by firing a custom event that the script listens for.

Source: scope TR2, TR7; round 3: M1; round 9: MSG2; round 10: EV1; owner: 2026-11-13

## When things run

### Order and limits · v2

- **Triggers and scripts run in Layers panel order:** the top row first, and top to bottom inside an entity's card. Drag a row or a trigger to change it. Spawned entities run where they sit in the tree.
- *Why: the order you see is the order things happen, and it needs nothing new. Godot works this way. The trade-off: moving a row for drawing also changes when it runs. A priority number can be added later without breaking levels.*
- Which triggers fire for an event is decided once, before any of that event's actions run.
- When several entities touch at once, each is its own firing.
- An entity placed or spawned already touching fires "touched" on the next physics step. It is never skipped.
- **Triggers setting off triggers stop after 32 steps in one tick**, with a warning in the Console. The game keeps running. A loop that goes through a Wait is fine, because it runs at most once per tick. *Why: it prevents endless loops.*
- Restart resets everything: which triggers are on, used-up "once per run" triggers, timers, waiting runs, tags, and variables (except kept ones).
- Copying entities keeps links between the copies. A link to something outside the copies stays pointed at the original in the same level and becomes missing in another level.
- A trigger that points to a deleted entity, file or trigger shows a `missing` warning. In play that action is skipped.

Source: round 8: 09 2.2; round 9: 09 2.12, 09 2.13, 09 2.18; round 10: OR1; old: TR-100 to TR-118, TR-150 to TR-158; owner: 2026-11-13

## Seeing what triggers do

### Arrows to what a trigger affects · v3

- Selecting an entity draws arrows from it to every entity its triggers name.
- *Why v3: it helps reading big levels.*

Source: scope TR9; round 9: 09 2.15; old: TR-129 to TR-134

### Trigger lines in the Console · v3

- During test play the Console can list every trigger that fires, and every If check that fails. See [the Console](../scripts/code-editor-and-console.md).

Source: scope LU8; round 10: TL1, TL2

## Making a trigger

### The Trigger tool · v2

- **Tool 7 draws a rectangle that notices touching.** The new entity has a TransformComponent, a rectangle ShapeComponent, a SurfaceComponent with Sensor ticked, and a TriggerComponent holding one trigger that starts "When something starts touching this".
- It has no StyleComponent, so it isn't drawn in play, and it is selected by its edge.
- Example: draw one over the end of a level, then add Win to its trigger.
- *Why v2: triggers are v2. "Trigger", not "Trigger zone": the owner's shorter name.*

Source: owner: 2026-11-13

## Not in the scope review

Left over from the old draft, or accepted without a version. The last column is Claude's suggestion, not a decision.

| Feature | Rule | Suggested |
|---|---|---|
| "Can't fire" explanations | The trigger card says why a touch trigger can never fire: no shape, sensors only, neither side Dynamic. v2 has only the missing SurfaceComponent note | v3 |
| Waiting runs limit | Each trigger can hold 32 waiting runs. More are skipped with a Console warning | v2 |
| Collision speed | A smallest impact speed for the collision event | Later |
| "First one in", "last one out" | Touch events that count entities, such as "when the last heavy thing leaves this" | Later |
| "On the Nth time" | A Repeat choice that fires on a set count. The review kept three choices | Dropped |
| Trigger names | Each trigger gets a name made from its When, which can be edited | v2 |
| Drop through | An action that drops a body through the one-way platform under it. Not in the reviewed action list, so it is script-only for now | Needs a decision |
| Show every link | A View menu switch that shows the arrows of every entity | v3 |
| Pause when this fires | A switch on a trigger that pauses test play when it fires | v3 |

Source: round 5: TK2; old: TR-13, TR-29, TR-58, TR-63, TR-81, TR-134, TR-146
