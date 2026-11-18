# Scripts and the Lua API

## TL;DR

A script is a `.lua` file from the Assets panel, attached to an entity through its ScriptComponent. **v2:** the ScriptComponent with a list of `.lua` files, each listing the variables it needs on its entity, `on(name, function)` for events, handles for entities, `spawn(path)`, `wait(2)`, reading and changing component values, and Lua 5.4 with only its safe parts. **v3:** functions that come with v3 features, such as sound and the mouse. Core rules: **handles, not references**; scripts and triggers share one list of events; and **once a function ships it never changes**. Every function is in [lua-api.md](lua-api.md), and example scripts in [lua-examples.md](lua-examples.md).

## Attaching scripts

### The ScriptComponent · v2

- **An entity has one ScriptComponent, holding a list of `.lua` files** from the Assets panel. *Why one: an entity has at most one component of each type, so "its ScriptComponent" always means one thing, in the Entity inspector and in Lua.*
- The `.lua` files are plain assets the component points to. Fixing a file fixes every entity that uses it.
- **A script's values are the entity's variables.** The ScriptComponent holds only the list of files; the values, such as a speed or a door, live on the entity's VariablesComponent. *Why: one concept for named values, so nothing is stored in two places, and triggers can read and change a script's values too (owner: 2026-11-16).*
- **A script lists the variables it needs in a `variables` table at its top, built with one `<type>_variable` function per type**, such as `speed = number_variable(400, { min = 0, max = 1500, unit = "px/s" })`. The table only describes them. The rules for reading and writing them are in [lua-api.md](lua-api.md#variables--v2).
- **When the entity lacks some of them, the ScriptComponent's card shows a warning with a button:** "This script needs `speed` and `jump_height`. [Add variables]". The button adds a VariablesComponent if there is none, then only the missing variables, with the script's types, starting values and limits, as one Undo step. With several entities selected, it adds them to each. *Why: nothing happens behind the user's back, and editor messages never block, so a script changed later or added to many entities is covered too (owner: 2026-11-16).*
- **A variable with the same name and another type is left as it is**, and the warning says so: "`speed` is a string here, but this script needs a number."
- Scripts on one entity share its variables: two scripts that both need `speed` read the same one.
- A variable the script no longer needs stays on the entity until the creator removes it. *Why: the creator added it, so only the creator removes it (standing yes, 2026-11-16).*
- Each entity runs its own copy of a script, so twenty enemies never share state by accident.
- Any entity can have scripts, joints and the camera included.
- Scripts in the list run top to bottom. Across entities they run in Entities viewer order, see [triggers](../triggers/triggers.md).
- A script on a hidden entity still runs.
- A new `.lua` file is made in the Assets panel. The builtin `.lua` files can be read as examples.

Source: scope LU1; round 1: C12; round 3: S2; round 4: FT1; round 5: R45; round 9: 10 2.1; round 10: SC1, OR1; old: LU-01, LU-02, LU-04, LU-50; owner: 2026-11-13; owner: 2026-11-16

## How a script works

### Events with `on()` · v2

- **Scripts and triggers share one list of events, with the same names.** A script listens with `on(name, function)`.
- `on("touched", ...)` matches the trigger sentence "When touched". `on("tick", ...)` runs every tick. `on("open", ...)` listens for a custom event.
- There are no separate callbacks such as `onStart` or `onUpdate`. *Why: the owner wanted it unified. One pattern, read like the trigger sentence, and a new event later is just a new name.*
- **Script event names are the trigger events in snake_case**, such as `on("no_longer_touched", ...)`. A handler gets `other` and the event's number. The list is in [lua-api.md](lua-api.md).
- A custom event can't reuse a builtin event's name.
- A trigger calls a script by firing a custom event.
- **Scripts share values through custom events and variables, and nothing else.** To ask an entity for something, fire a custom event, such as `fire_event(other, "damage", 1)`, and the scripts on that entity decide what it means. For a level-wide value, use a variable. *Why: reuse before adding. The trade-off is that a script can't read another entity's private state, such as an enemy's health for a health bar. Since the API only grows, a function for that can come later.*
- Events from touching are delivered after the physics step, never during it, so every function can be called from every handler.
- A touch event fires once per pair of entities, even when a polygon is split into pieces. Both sides get it.
- The game runs 60 ticks per second.

Source: scope LU1; round 9: 10 2.3; round 10: EV1; round 1: D4; old: LU-22, LU-23, LU-25, LU-27; owner: 2026-11-13

### Handles, not references · v2

- **Scripts work with entity and component ids, through functions.** `get_entity_by_name("car")` returns an id. `get_component(id, "NameComponent")` and `get_attribute(...)` read from it.
- **A destroyed id simply no longer exists.** There are no object references to keep alive. *Why: the owner rejected an object-style API.*
- Scripts find entities three ways: by name, by tag, or through an entity variable the script needs, picked in the Entity inspector.
- An id is never reused during a run, so a stored id can never point at a newer entity.
- **A script's own entity is `this`**, the id of the entity the script is on, such as `destroy(this)`. A handler receives `other`. *Why: the same words as triggers, and each entity runs its own copy, so `this` is always right.*

Source: round 3: D66; round 9: 10 2.2; old: LU-13, LU-18; owner: 2026-11-13

### Component values · v2

- Scripts read and change the component values that are allowed to change during play, **with the same names as the Entity inspector**.
- They are the same values a trigger's Change value offers.
- Angles are in degrees and lengths in pixels, matching the Entity inspector. *Why degrees: this can't be changed once levels exist, so it was decided before any code.*

Source: round 1: D3; round 9: 10 2.7, 10 2.8; old: LU-57 to LU-62; owner: 2026-11-13

### `spawn(path)` · v2

- `spawn(path)` takes the path of an `.entity` file and **returns the new entity's id, which can be used straight away**, such as to set its speed. *Why: it fits handles, not references.*
- The rules for spawned entities are in [entity files](../assets/entity-files.md).

Source: scope TR7; round 3: D67; round 9: 10 2.4; old: LU-33 to LU-38; owner: 2026-11-13

### `wait(2)` · v2

- `wait(2)` pauses that script for 2 seconds. The rest of the game keeps going.
- Destroying the entity cancels its waits. Code after the wait then never runs.
- Waits count game time, so they slow down with the game speed.
- *Why v2: small, and scripts without it get clumsy fast.*

Source: scope LU5; round 9: 10 2.5; old: LU-39 to LU-42; owner: 2026-11-13

### What the Lua API covers · v2

The **Lua API** is the set of functions the game gives scripts. It uses pixels and degrees. **Every function is top level**, such as `spawn(path)`, never inside a table such as `world.spawn(path)`. Lua's own libraries (`string`, `table`, `math`) stay as Lua has them. *Why: the owner's rule.* Every function is in [lua-api.md](lua-api.md), and example scripts in [lua-examples.md](lua-examples.md).

The areas the API covers:

| Area | What scripts can do |
|---|---|
| Movement | Read and set position and rotation, move a group with its bodies together |
| Physics | Read and set speed and spin, push a body, read mass, ask what is touching, cast a ray |
| Joints | Drive a motor, change limits and lengths, destroy a joint |
| The World | Read and set gravity and the background colour, read the level's time |
| Variables | Read and change the level's variables |
| Text and style | Change a text, colours and opacity |
| Tags and the tree | Read, add and remove tags, find parents and children |
| Camera | Change the follow target and zoom |
| Keys | Read inputs and raw keys |
| The run | Win, lose, restart |
| Random numbers | From the run's seed, so a run can be repeated |

- **A built-in timer counts the level's time, and scripts can read it.** Use it for timing during play.
- **Scripts can read the real date and time.** *Why: the owner said reading the clock is fine. The determinism test fixes the clock the same way it fixes the seed.*
- The v3 features bring their functions with them: sound, the mouse (`is_mouse_down("left")`, `mouse_position()`, `mouse_screen_position()`, `level_to_screen(x, y)`, `screen_to_level(x, y)`), game speed, camera shake.

Source: round 9: 10 2.7; round 10: API1, 11 2.18; round 11: CL1; round 12: MS2; old: section 2.7 of 10; owner: 2026-11-13

### The API only grows · v2

- **Once a function ships it never changes. Updates only add functions.** *Why: so levels made today still work after updates.*
- A game update never changes how a level plays.
- Exporting a `.lua` file needs nothing special: it is a file in the Assets panel.

Source: round 9: 10 2.19; round 10: API1; round 11: 12 A12; old: LU-143, LU-151; owner: 2026-11-13

## Safety

### Lua 5.4, safe parts only · v2

- Scripts are Lua 5.4, with only the safe parts of its built-in library.
- **Scripts can't read or write files, and can't use the network.**
- Gone: `io`, `os`, `package`, the standard `debug` library, and everything that loads code (`load`, `require`, `dofile`).
- Still there: `string`, `table`, `utf8`, `math`, and the usual base functions such as `pairs`, `type`, `tostring` and `pcall`.
- `math.random` uses the run's seed.
- The library tables are read-only, so one script can't change `math` for every other script.

Source: round 3: D78; round 9: 10 2.17; round 10: SB1; old: LU-03, section 2.17 of 10; owner: 2026-11-13

### Scripts can't freeze the editor · v2

- **The game runs separately from the editor**, so an endless loop never freezes the editor, and Stop always works.
- **There is no limit on how much work a script does per tick.** *Why: the owner rejected per-script work limits.*

Source: round 9: 10 2.11; round 10: LP1; old: LU-88; owner: 2026-11-13

### Script errors · v2

- A script error appears in the Console with the file and line, the entity and the time.
- **A script error stops only that script.** The level continues.
- **Test play pauses at the first error**, and the Console opens by itself.
- Players only see a small notice when a script stops.
- A script with a mistake that stops it from loading doesn't start. The level still plays.

Source: round 3: D68; round 9: 10 2.12; round 10: 11 2.9, UI1; old: LU-95 to LU-97; owner: 2026-11-13

### Hints in script errors · v3

- Common mistakes get a plain hint. Example: "attempt to call a nil value" also says "Did you mean `get_entity_by_name`?".
- *Why v3: each hint is collected from real mistakes, so they come after people use it.*

Source: scope LU9; round 9: 10 2.12; old: LU-98

## Small features

Small features from the old draft and review that the scope review never asked about. The owner gave each its version in round 7 of the architecture review.

| Open point | What is known | Version |
|---|---|---|
| More ways to wait | Waiting a number of ticks, waiting until something is true, running a function later or every N seconds | v3 |
| Running a script once more for each list entry | The same file listed twice on one entity runs twice. Both copies share the entity's variables | v2 |
| Switching a script off | A checkbox on each file in the list | v3 |

Source: old: LU-05 to LU-12, LU-43 to LU-49, LU-51 to LU-56; owner: 2026-11-14
