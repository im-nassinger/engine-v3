# Triggers

## TL;DR

A trigger is no-code logic on an entity, in three parts: **When** (one event), **If** (optional checks), **Do** (a list of actions, run top to bottom). An entity's TriggerComponent holds a list of them. **v3:** the When, If, Do sentence, the events for touching, keys, timers, level start and "no entity with this tag is left", checking a tag or a number variable, the actions Change value, Destroy, Push, Win, Lose and Restart, the Repeat setting, and the Trigger tool. **v4:** the events collision, custom event, destroyed and a variable changes, Fire custom event and Wait, and checking a component value. **v7:** Spawn. **Later:** mouse events, "while touching" and "left the level", sound and camera shake actions, arrows to what a trigger affects, trigger lines in the Console, and Convert to script. Core rules: **if it's data, change it with Change value**, triggers and scripts share one list of events, and the order you see is the order things run.

## The trigger

### When, If, Do · v3

- A TriggerComponent holds a list of triggers. Any entity can have one, the World included. The World's triggers are the home for level-wide logic, because the World is never destroyed.
- **When:** one event. **If:** optional checks that must all be true. **Do:** a list of actions, run top to bottom.
- *Why three parts: an earlier one-sentence form hid the "who" inside the When, which only works for touching. When, If, Do gives every trigger the same shape: an event happens, checks decide, actions run.*
- Every event gives the trigger two entities: **`this`**, the entity holding the trigger, and **`other`**, the entity that caused the event, when there is one. For touching, `other` is the entity that touched. For a custom event, it is the sender. A key, a timer or level start has no `other`, and checks and actions that use it are greyed out.
- **Each check and action picks its target from: `this`, `other`, an entity by name, or every entity with a tag.**
- In the Entity inspector a trigger reads as a **sentence with clickable parts**, such as "When something starts touching this, if other has the tag player: add 1 to coins, destroy this."
- **Every clickable part is picked the way the rest of the editor picks it** (owner, 2026-11-23): an entity from the Entities viewer's tree, with a search, or by clicking it in the level view, or by dropping an Entities viewer row on it; a vector in two boxes, x and y; a colour in the colour box; a number in the number box with its unit. A value on an entity is picked in two steps, its component and then the value ("Transform › Position"), and the entity comes before the value in the sentence, since the values offered are that entity's. Every item of the Add check and Add action menus says in one line what it does. *Why: the owner found the first card lazy: a flat list of every entity, vectors typed as "0, -600" in a text box, "Transform position x" listed beside "Transform position y", and words such as "who is tagged…" that said nothing.*
- A part that isn't set yet is highlighted and says what it needs. A trigger with unset parts doesn't run.
- Each trigger can be switched on or off. It is a value like any other, so one trigger switches another on or off with Change value.
- Triggers can be dragged to reorder, duplicated and deleted. Every edit is one undo step.
- Triggers do nothing a script can't: both use the same events and the same Lua API underneath.
- A trigger on a hidden entity still runs.

Source: scope TR1; round 1: C11; round 2: R10; round 5: T3, T4; round 9: 09 2.11, 09 2.14; decisions: D10; old: TR-01 to TR-04, TR-120 to TR-124; owner: 2026-11-13; owner: 2026-11-23

### Events · v3

| Event | Reads as | `other` |
|---|---|---|
| Touched | When something starts touching this | The entity that touched |
| No longer touched | When something stops touching this | The entity that left |
| Key or input | When the Space key is pressed. When the jump input is pressed | None |
| Timer | After 60 seconds. Every 2 seconds | None |
| Level start | When the level starts | None |

- **A sensor being touched counts as "touched".** Two sensors never notice each other.
- Touching needs a SurfaceComponent, at least one Dynamic body, and (once the collision grid comes) a ticked pair in the collision grid. The trigger card says so when a trigger can't fire.
- **A trigger fires once for each entity that touches it**, even when that entity is built from several shapes. Sliding from one shape to another fires nothing.
- A trigger on a group hears touches on any part inside it. Parts of the group never set off the group's own trigger.
- **Key or input** fires on press, on release, or while held. See [variables-and-inputs.md](variables-and-inputs.md).
- **Timer:** fires once after a time, or again and again. It starts counting when its trigger is switched on, and slows down or stops with the game speed. Times are whole ticks, so timers never drift.
- **Level start** on a spawned entity fires when it spawns.
- *Why v3: enough for coins, hazards and a goal, steered with keys (owner: 2026-11-20).*

Source: scope TR2; round 1: D63; round 4: T2; round 8: 09 2.2, 09 2.6; round 9: MSG2, 09 2.10; round 10: IN1; old: TR-05 to TR-07, TR-10 to TR-20, TR-60 to TR-62, TR-86 to TR-90; owner: 2026-11-13

### More events · v4

| Event | Reads as | `other` |
|---|---|---|
| Collision | When this hits something | The entity it hit |
| Custom event | When this gets `open` | The sender |
| Destroyed | When this is destroyed | None |
| A variable changes | When coins becomes 10 or more | None |

- **Two solid things hitting counts as "collision"**, while a sensor being touched counts as "touched". Collision needs what touching needs.
- **A variable changes** has an optional condition, such as "becomes 10 or more". *Why: it replaces a builtin script that watched a variable. It is one more event, not a new concept.*
- **Collision fires once for each entity this hits**, like touched: an entity built from several shapes hitting with two of them fires once, and it fires again only after the two have stopped touching. A trigger on a group hears hits on any part inside it, and parts of the group hitting each other fire nothing. *Why: the same counting as touching, so "hits" and "touches" never disagree on what one hit is (standing yes, 2026-11-22).*
- **Destroyed** fires when a Destroy action takes the entity, or a group above it. Its triggers run in the same tick, before the entity disappears at the end of it, so they can still read and change it. Every entity in a destroyed group hears its own Destroyed. Restart and Stop never fire it, and nor does falling out of the level bounds until "left the level" comes (Later). *Why: Destroyed is the moment to give points or open a door; Restart is not a loss of the entity (standing yes, 2026-11-22).*
- **A variable changes** names one variable: one of the level's (on the World), or one of this entity's own. **The level's variables are heard by triggers on any entity**: a door's trigger can say "When coins becomes 10 or more". **An entity's own variable is heard only by that entity's triggers.** *Why: the level's variables are shared by the whole level, so anyone may watch them; an enemy's `health` is its own business, which keeps triggers local and easy to follow (standing yes, 2026-11-22: Claude's pick, asked of the owner, who went ahead without answering).*
- **"Becomes" fires only when the condition turns true**, not on every change while it stays true: coins going 9, 10, 11 fires "becomes 10 or more" once, at 10. Without a condition, it fires on every change of value. Setting a variable to the value it already has is no change. *Why: "becomes" is a moment, so a door opens once (standing yes, 2026-11-22).*
- **Custom event:** an event you name yourself, see below.
- *Why this set: with v3's, enough for coins, doors, buttons, timers and hazards. Why v4: none of them is needed to win or lose a first game (owner: 2026-11-20).*

Source: scope TR2; round 4: T2; round 9: MSG2; owner: 2026-11-20

### "No entity with this tag is left" · v3

- Fires when the last entity with a tag is destroyed or loses the tag. It never fires if none ever existed.
- Example: on the World, when no `coin` is left, Win. Adding more coins needs no other change.
- *Why v3: "collect everything to win" is the simplest level goal.*

Source: scope TR3; round 8: 09 2.2; old: TR-21; owner: 2026-11-13

### Mouse events · Later

- **"When this is clicked"** and **"When the mouse is over this"**.
- **Only entities with a trigger whose When is a mouse event react to the mouse.** Clicks on any other entity pass through to what is below. So a decorative frame over a button doesn't block it.
- The area that counts is the entity's shape. No physics is needed.
- **Entities inside the camera come first, then the one drawn on top.** Exactly one entity gets the event.
- A click is a press and a release on the same entity. Hidden entities don't react.
- A clickable button in a level is just an entity with a "When this is clicked" trigger.
- *Why Later: keys are enough for a platformer test, and mouse events need the rules for which entity gets the click.*

Source: scope TR4; round 9: 09 2.7b; decisions: D54; old: TR-66 to TR-72

### "While touching" and "left the level" · Later

- **While touching** fires every tick for each entity that is touching, unless Repeat slows it down.
- **Left the level** fires on an entity just before it is removed for being fully outside an open edge of the level bounds.
- *Why Later: touched and no longer touched cover the same cases with a little more work.*

Source: scope TR5; round 8: 09 2.2; old: TR-12, TR-22

### If checks · v3

- **`other` has a tag:** "If other has the tag player". The tag may be on the touching entity or on any group above it, so tagging the player's group is enough.
- **A variable compared with a value:** "If coins is 10 or more". Only a number variable is compared: the other types (from v4) are only checked with "is" or "is not", see [variables](variables-and-inputs.md).
- All checks must be true. Anything more complex is a script.
- *Why v3: a coin that only the player can pick up needs the tag check.*

Source: scope TR6; round 5: T5; old: TR-24 to TR-27; owner: 2026-11-13

### Checking a component value · v4

- **A component value compared with a number:** "If this Body › Speed is more than 200".
- It offers every number value of the target's components, and each vector once, whose x or y is then picked as a word of its own ("this Transform › Position y is at most 500"), plus what a body is doing right now: its **speed** and its **velocity**, x or y, in px/s. *Why: speed is not a value anyone types, but "fast enough to break" is the example that asked for this check (standing yes, 2026-11-22).*
- With a tag as the target, the check is true when any tagged entity passes it, as the tag check is. A target without the value makes the check false.
- *Why v4: v3's game needs only tags and its count (owner: 2026-11-20).*

Source: scope TR6; owner: 2026-11-20; owner: 2026-11-23

### Actions · v3

| Action | What it does |
|---|---|
| Change value | Sets, adds to or subtracts from any component value on the target. From v4 a boolean variable can also be flipped |
| Destroy | Removes the target and its children |
| Push | Gives a body a kick: a fixed vector, or a strength away from `this` or towards `this`. By default it ignores mass, so a jump pad feels the same for everything |
| Win, Lose | Ends the run as won or lost |
| Restart | Restarts the level |

- **If it's data, change it with Change value.** One action covers teleporting (the TransformComponent's position), variables (on the World's VariablesComponent for the level's, or on any entity's for its own), tags, switching triggers on or off, a joint's motor, the camera's zoom and follow target, gravity. *Why: the owner pointed out that teleporting is just changing a component value. What is left on the list does something no value can.*
- Change value only offers values that are allowed to change during play.
- **A vector is set, added to or subtracted from whole**, such as "add 5, 0 to this Transform › Position" (owner, 2026-11-23). A trigger saved before, which added to one axis, reads as the same vector with 0 on the other axis. *Why: one value, one word; listing Position x and Position y beside Position looked like three values.*
- **Push's fixed kick is a vector, x and y**, in px/s: the change in velocity, like `push(id, x, y)` in Lua. Away from or towards `this` takes one strength in px/s instead, since the direction comes from where the two entities are. *Why: a kick is a direction and a size, which one vector holds (owner: 2026-11-15).*
- **A destroyed entity disappears at the end of the tick**, so the actions after Destroy in the list still run.
- **Restart is guarded against abuse**, such as a restart loop that could freeze the player's computer.
- Win, Lose and Restart let the current tick finish. If two fire in one tick, the first wins.
- A target that lacks what the action needs is skipped, and the other targets still run. An empty tag is not an error.
- Actions on a group use the group's own components. Body actions go to the body the entity belongs to.
- *Why v3: what a coin, a spike and a goal need (owner: 2026-11-20).*

Source: scope TR7; round 1: D62; round 5: T6; round 9: 09 2.4b, 09 2.9; round 8: 09 2.4; old: TR-30 to TR-53, TR-78 to TR-84; owner: 2026-11-13; owner: 2026-11-15; owner: 2026-11-20; owner: 2026-11-23

### Fire custom event and Wait · v4

| Action | What it does |
|---|---|
| Fire custom event | Fires a named event on the target, with an optional number |
| Wait | Delays the actions after it |

- **Wait** is one action in the list. A trigger that fires again during a wait gets its own run, so two enemies in a "wait, then destroy other" trigger both die. Destroying the entity, or switching the trigger off, cancels what is still waiting. *Why a list with Wait: without a list, "add a coin, play a sound, destroy this" needs three triggers with the same When.*
- **A wait is counted in whole ticks**, like timers, so it slows and stops with the game speed. Wait 0 continues in the next tick.
- **A waiting run keeps its `this` and `other`.** If `other` is destroyed during the wait, the actions on it are skipped and the rest still run.
- **Fire custom event** picks a target like any action, a name, and an optional number. The event goes down the tree, so each target and everything inside it hears it (see [custom events](#custom-events--v4)). Each hears it in the same tick, with `other` set to the entity whose trigger fired it, so it counts towards the 32 steps. A trigger reads the number nowhere in v4; scripts (v5) read it. *Why: carrying it now means a level saved in v4 doesn't change when scripts come (standing yes, 2026-11-22).*
- *Why v4: they come with custom events and timed doors (owner: 2026-11-20).*

Source: scope TR7; round 10: WT1; round 11: WT2; owner: 2026-11-20

### Spawn · v7

| Action | What it does |
|---|---|
| Spawn | Creates an entity from an `.entity` file, picked by path, with the TransformComponent values you type: position, rotation, scale and skew |

- **Spawn asks for TransformComponent values and has no target.** *Why: you say exactly where the new entity appears and how it is turned and sized (owner: 2026-11-14).*
  - **Position and rotation are measured from the entity the trigger is on.** Example: a cannon tilted 30° spawns a bullet at 40, 0: the bullet appears 40 px along the cannon, tilted 30°, wherever the cannon is. A trigger on the World measures from the level's origin. *Why: a moving cannon then works without a script (owner: 2026-11-14).*
  - **Spawn's values replace the TransformComponent saved in the `.entity` file.** *Why: what the trigger shows is what you get (owner: 2026-11-14).*
- *Why v7: it comes with `.entity` files (owner: 2026-11-20).*

Source: scope TR7; owner: 2026-11-14; owner: 2026-11-20

### Play sound, Stop sound, Camera shake · Later

- **Play sound** and **Stop sound** come with sound, see [files and sound](../assets/files-and-sound.md).
- **Camera shake** comes with the camera effects, see [camera](../camera.md).

Source: scope AS4, CM9; round 9: 09 2.4b

### Repeat · v3

- Each trigger has one Repeat setting: **every time** (the default), **once per run**, or **at most once every N seconds**.
- Example: a spike that hurts at most once a second.
- Firings that arrive too soon are dropped, not queued.
- *Why v3: small, and without it a trigger can fire every tick.*

Source: scope TR8; round 5: T7; old: TR-55 to TR-57; owner: 2026-11-13

### Custom events · v4

- A **custom event** is an event you name yourself, such as `open`. A trigger or script fires it on an entity, and that entity's triggers and scripts react. It can carry one number.
- **A custom event goes down the tree:** the entity it is fired on hears it, then everything inside it, parents first, top row first, as with Destroyed. Fired on the World, every entity in the level can hear it. An entity hears one Fire once, even when two of its targets hold it, such as a tagged group and a tagged entity inside it. *Why: the owner fired an event on the World and expected a trigger anywhere in the level to hear it (owner: 2026-11-23). The trade-off: an event fired on a group, such as `damage`, also reaches the entities inside it.*
- *The problem it solves: making something happen on another entity without knowing how that entity works. A button fires `open` on a door, and the door decides what opening means. Swap the door for a drawbridge and the button doesn't change.*
- *Why "custom event" and not "message": "event" is a word already in use, so there is no second concept.*
- **A custom event's name follows the rule for tags**: one word of lowercase letters, digits and `_`. The When offers the names already used in the level, as tags are offered.
- A custom event can't reuse the name of a builtin event.
- A custom event nobody listens to is ignored without an error.
- A trigger calls a script by firing a custom event that the script listens for.

Source: scope TR2, TR7; round 3: M1; round 9: MSG2; round 10: EV1; owner: 2026-11-13; owner: 2026-11-23

## Tags

### The TagsComponent · v3

- **The TagsComponent lists an entity's tags**, such as `player` or `coin`. Any entity can have one. Its card holds one tags field: type a tag and press Enter to add it, click a tag's × to remove it. Tags already used in the level are offered as you type.
- **A tag is one word of lowercase letters, digits and `_`.** What is typed is made lowercase and its spaces become `_`. An entity has each tag once. *Why: so `Coin` and `coin` are never two tags that look alike (standing yes, 2026-11-22).*
- During play, Change value adds or removes a tag.
- *Why v3: nothing reads tags before triggers (owner: 2026-11-20).*

Source: owner: 2026-11-20

## When things run

### Order and limits · v3

- **Triggers and scripts run in Entities viewer order:** the top row first, and top to bottom inside an entity's card. Drag a row or a trigger to change it. Spawned entities run where they sit in the tree.
- *Why: the order you see is the order things happen, and it needs nothing new. Godot works this way. The trade-off: moving a row for drawing also changes when it runs. A priority number can be added later without breaking levels.*
- Which triggers fire for an event is decided once, before any of that event's actions run.
- When several entities touch at once, each is its own firing.
- An entity placed or spawned already touching fires "touched" on the next physics step. It is never skipped.
- **Triggers setting off triggers stop after 32 steps in one tick**, with a warning in the Console (in the message pill until the Console comes in v5). The game keeps running. A loop that goes through a Wait is fine, because it runs at most once per tick. *Why: it prevents endless loops.*
- Restart resets everything: which triggers are on, used-up "once per run" triggers, timers, waiting runs, tags, and variables (except kept ones).
- Copying entities keeps links between the copies. A link to something outside the copies stays pointed at the original in the same level and becomes missing in another level.
- A trigger that points to a deleted entity, file or trigger shows a `missing` warning. In play that action is skipped.

Source: round 8: 09 2.2; round 9: 09 2.12, 09 2.13, 09 2.18; round 10: OR1; old: TR-100 to TR-118, TR-150 to TR-158; owner: 2026-11-13

## Seeing what triggers do

### Arrows to what a trigger affects · Later

- Selecting an entity draws arrows from it to every entity its triggers name.
- *Why Later: it helps reading big levels.*

Source: scope TR9; round 9: 09 2.15; old: TR-129 to TR-134

### Trigger lines in the Console · Later

- During test play the Console can list every trigger that fires, and every If check that fails. See [the Console](../scripts/code-editor-and-console.md).

Source: scope LU8; round 10: TL1, TL2

## Making a trigger

### The Trigger tool · v3

- **The Trigger tool, key 6, draws a rectangle that notices touching.** The new entity has a TransformComponent, a rectangle ShapeComponent, a SurfaceComponent with Sensor ticked, and a TriggerComponent holding one trigger that starts "When something starts touching this".
- It has no StyleComponent, so it isn't drawn in play, and it is selected by its edge.
- Example: draw one over the end of a level, then add Win to its trigger.
- *Why key 6: it is the next free key, so the keys have no gap until Text comes in v6 (standing yes, 2026-11-22).*
- *Why v3: triggers are v3. "Trigger", not "Trigger zone": the owner's shorter name.*

Source: owner: 2026-11-13

## When a trigger isn't enough

### Convert to script · Later

- **Each trigger's `…` menu has Convert to script.** It makes a new `.lua` file in the Assets panel that does what the trigger did, named after the trigger, and adds it to the entity's ScriptComponent, adding the component if there is none. The trigger is removed. Example: "When touched, Do: Change value coins + 1, Destroy this" becomes a script with `on("touched", ...)` that adds to `coins` and destroys `this`.
- **Triggers that switched it on or off with Change value now switch the script instead**, through the script's own on/off checkbox (see [scripts](../scripts/scripts.md#switching-a-script-off--v3)). A trigger that was off becomes a script that is off.
- The new file is ordinary readable Lua, to edit like any other script.
- **It is one Undo step, and Undo is the only way back.** There is no converting a script into a trigger.
- Every event, If check and action a trigger has must have a Lua equivalent, so every trigger can be converted.
- *Why: triggers have no branches, loops or random choice on purpose. When a trigger needs one, this is the way out without rewriting it in Lua by hand (owner: 2026-11-20).*

Source: owner: 2026-11-20

## Small features

Small features from the old draft and review that the scope review never asked about. The owner gave each its version in round 7 of the architecture review.

| Feature | Rule | Version |
|---|---|---|
| "Can't fire" explanations | The trigger card says why a touch trigger can never fire: no shape, sensors only, neither side Dynamic. v3 has only the missing SurfaceComponent note | Later |
| Waiting runs limit | Each trigger can hold 32 waiting runs. More are skipped with a Console warning | v4 |
| Collision speed | A smallest impact speed for the collision event | Later |
| "First one in", "last one out" | Touch events that count entities, such as "when the last heavy thing leaves this" | Later |
| Trigger names | Each trigger gets a name made from its When, which can be edited | v3 |
| Show every link | A View menu switch that shows the arrows of every entity | Later |
| Pause when this fires | A switch on a trigger that pauses test play when it fires | Later |

Source: round 5: TK2; old: TR-13, TR-29, TR-58, TR-63, TR-81, TR-134, TR-146; owner: 2026-11-14
