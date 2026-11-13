# Scripts and the Lua API

## TL;DR

A script is a `.lua` file from the Assets panel, attached to an entity through its ScriptComponent. **v1:** the ScriptComponent with a list of `.lua` files and their settings as Inspector fields, `on(name, function)` for events, handles for entities, `spawn(path)`, `wait(2)`, reading and changing component values, and Lua 5.4 with only its safe parts. **v2:** functions that come with v2 features, such as sound and the mouse. Core rules: **handles, not references**; scripts and triggers share one list of events; and **once a function ships it never changes**. The exact list of functions is not written yet, see the end of this file.

## Attaching scripts

### The ScriptComponent · v1

- **An entity has one ScriptComponent, holding a list of `.lua` files** from the Assets panel. *Why one: an entity has at most one component of each type, so "its ScriptComponent" always means one thing, in the Inspector and in Lua.*
- The `.lua` files are plain assets the component points to. Fixing a file fixes every entity that uses it.
- **Each file shows its own settings as fields:** values the script declares at its top, such as a speed or an entity. The fields come from the same fixed list of field types as components: number, text, checkbox, choice, colour, vector, angle, entity, asset, variable, tags, and lists of these.
- Each entity keeps its own values for those settings.
- Each entity runs its own copy of a script, so twenty enemies never share state by accident.
- Any entity can have scripts, joints and the camera included.
- Scripts in the list run top to bottom. Across entities they run in Layers panel order, see [triggers](../triggers/triggers.md).
- A script on a hidden entity still runs.
- A new `.lua` file is made in the Assets panel. The builtin `.lua` files can be read as examples.

Source: scope LU1; round 1: C12; round 3: S2; round 4: FT1; round 5: R45; round 10: SC1, OR1; old: LU-01, LU-02, LU-04, LU-50

## How a script works

### Events with `on()` · v1

- **Scripts and triggers share one list of events, with the same names.** A script listens with `on(name, function)`.
- `on("touched", ...)` matches the trigger sentence "When touched". `on("tick", ...)` runs every tick. `on("open", ...)` listens for a custom event.
- There are no separate callbacks such as `onStart` or `onUpdate`. *Why: the owner wanted it unified. One pattern, read like the trigger sentence, and a new event later is just a new name.*
- A custom event can't reuse a builtin event's name.
- A trigger calls a script by firing a custom event.
- Events from touching are delivered after the physics step, never during it, so every function can be called from every handler.
- A touch event fires once per pair of entities, even when a polygon is split into pieces. Both sides get it.
- The game runs 60 ticks per second.

Source: scope LU1; round 9: 10 2.3; round 10: EV1; round 1: D4; old: LU-22, LU-23, LU-25, LU-27

### Handles, not references · v1

- **Scripts work with entity and component ids, through functions.** `get_entity_by_name("car")` returns an id. `get_component(id, "NameComponent")` and `get_attribute(...)` read from it.
- **A destroyed id simply no longer exists.** There are no object references to keep alive. *Why: the owner rejected an object-style API.*
- Scripts find entities three ways: by name, by tag, or through an entity setting the script declares, picked in the Inspector.
- An id is never reused during a run, so a stored id can never point at a newer entity.

Source: round 3: D66; round 9: 10 2.2; old: LU-13, LU-18

### Component values · v1

- Scripts read and change the component values that are allowed to change during play, **with the same names as the Inspector**.
- They are the same values a trigger's Change value offers.
- Angles are in degrees and lengths in pixels, matching the Inspector. *Why degrees: this can't be changed once levels exist, so it was decided before any code.*

Source: round 1: D3; round 9: 10 2.7, 10 2.8; old: LU-57 to LU-62

### `spawn(path)` · v1

- `spawn(path)` takes the path of an `.entity` file and **returns the new entity's id, which can be used straight away**, such as to set its speed. *Why: it fits handles, not references.*
- The rules for spawned entities are in [entity files](../assets/entity-files.md).

Source: scope TR7; round 3: D67; round 9: 10 2.4; old: LU-33 to LU-38

### `wait(2)` · v1

- `wait(2)` pauses that script for 2 seconds. The rest of the game keeps going.
- Destroying the entity cancels its waits. Code after the wait then never runs.
- Waits count game time, so they slow down with the game speed.
- *Why v1: small, and scripts without it get clumsy fast.*

Source: scope LU5; round 9: 10 2.5; old: LU-39 to LU-42

### What the Lua API covers · v1

The **Lua API** is the set of functions the game gives scripts. It uses pixels and degrees. Functions named in the review:

| Function | Does |
|---|---|
| `on(name, function)` | Listens for an event |
| `spawn(path)` | Creates an entity from an `.entity` file and returns its id |
| `destroy(entity)` | Destroys an entity |
| `wait(seconds)` | Pauses this script |
| `print(...)` | Writes a line to the Console |
| `get_entity_by_name(name)` | Returns an entity's id |
| `get_component(id, name)`, `get_attribute(...)` | Read a component and its values |
| `is_down(input)`, `is_key_down(key)` | Whether an input or a raw key is held |
| `fire_event(entity, name)` | Fires a custom event on an entity |

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
- The v2 features bring their functions with them: sound, the mouse (`is_mouse_down("left")`, `mouse_position()`, `mouse_screen_position()`, `level_to_screen(x, y)`, `screen_to_level(x, y)`), game speed, camera shake.

Source: round 9: 10 2.7; round 10: API1, 11 2.18; round 11: CL1; round 12: MS2; old: section 2.7 of 10

### The API only grows · v1

- **Once a function ships it never changes. Updates only add functions.** *Why: so levels made today still work after updates.*
- A game update never changes how a level plays.
- Exporting a `.lua` file needs nothing special: it is a file in the Assets panel.

Source: round 10: API1; round 11: 12 A12; old: LU-143, LU-151

## Safety

### Lua 5.4, safe parts only · v1

- Scripts are Lua 5.4, with only the safe parts of its built-in library.
- **Scripts can't read or write files, and can't use the network.**
- Gone: `io`, `os`, `package`, the standard `debug` library, and everything that loads code (`load`, `require`, `dofile`).
- Still there: `string`, `table`, `utf8`, `math`, and the usual base functions such as `pairs`, `type`, `tostring` and `pcall`.
- `math.random` uses the run's seed.
- The library tables are read-only, so one script can't change `math` for every other script.

Source: round 3: D78; round 9: 10 2.17; round 10: SB1; old: LU-03, section 2.17 of 10

### Scripts can't freeze the editor · v1

- **The game runs separately from the editor**, so an endless loop never freezes the editor, and Stop always works.
- **There is no limit on how much work a script does per tick.** *Why: the owner rejected per-script work limits.*

Source: round 9: 10 2.11; round 10: LP1; old: LU-88

### Script errors · v1

- A script error appears in the Console with the file and line, the entity and the time.
- **A script error stops only that script.** The level continues.
- **Test play pauses at the first error**, and the Console opens by itself.
- Players only see a small notice when a script stops.
- A script with a mistake that stops it from loading doesn't start. The level still plays.

Source: round 3: D68; round 9: 10 2.12; round 10: 11 2.9, UI1; old: LU-95 to LU-97

### Hints in script errors · v2

- Common mistakes get a plain hint. Example: "attempt to call a nil value" also says "Did you mean `get_entity_by_name`?".
- *Why v2: each hint is collected from real mistakes, so they come after people use it.*

Source: scope LU9; round 9: 10 2.12; old: LU-98

## Not in the scope review

The review settled the shape of the API, not every detail. The last column is Claude's suggestion, not a decision.

| Open point | What is known | Suggested |
|---|---|---|
| The full list of functions | The old draft's list used an object style (`self:setVelocityX`) that the review rejected. The areas above are what it covered. The list has to be rewritten as functions that take ids | Before the architecture work |
| How a script declares its settings | "Values the script declares at its top." The exact form was never written | Needs a decision |
| How a script names its own entity | With handles there is no `self` object. The function that gives a script its entity's id was never named | Needs a decision |
| Sharing values between scripts | The old draft had a table shared by the scripts of one entity, and functions another script could call. Custom events and variables may cover it | Needs a decision |
| More ways to wait | Waiting a number of ticks, waiting until something is true, running a function later or every N seconds | v2 |
| Vectors and math helpers | A vector type, and helpers such as clamp and lerp | v1 |
| Running a script once more for each list entry | The same file listed twice on one entity runs twice | v1 |
| Switching a script off | A checkbox on each file in the list | v2 |
| Old settings after a script changes | A removed setting keeps its value under "Unused settings". A renamed one can say what it was called before | v2 |

Source: old: LU-05 to LU-12, LU-43 to LU-49, LU-51 to LU-56
