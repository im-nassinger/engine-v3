# Proposal: the Lua API

## TL;DR

**Not decided. Waiting for the owner.** Nothing here goes into [scripts.md](../requirements/scripts/scripts.md) until the owner answers the questions at the end.

The old function list (sections 2.1 to 2.8 of `10-lua-and-data.md` in `ecs-game-v2`) rewritten in the style the review agreed: **plain snake_case functions that take an entity id**, pixels and degrees, the Inspector's names, and events through `on()`. The list is small on purpose: **if something is a component value, scripts change it with `set_value`**, the same way triggers use Change value, so most of the old setters (`setText`, `setMotorSpeed`, `setGravity`) disappear. Seven yes-or-no questions settle what the review never wrote.

Versions use the numbering of [the smaller v1](smaller-v1.md), which is also waiting for an answer: scripts are **v2**, and what comes with today's v2 features (sound, the mouse, one-way platforms) is **v3**. If that proposal changes, these shift with it.

## Conventions

- **Every function takes ids, never objects.** An entity id is a number. A destroyed entity's id simply no longer exists: functions given one do nothing, and `exists(id)` says false.
- Positions are **level positions in pixels**, y pointing down. Angles are **degrees, clockwise on screen**. Speeds are px/s and °/s. Time is seconds of the level's time. Gravity alone is m/s², as in the Inspector.
- **A point is two numbers:** `local x, y = get_position(id)`. See question 5.
- Colours are text, such as `"#4A90D9"`.
- **Same names as the Inspector**, written in snake_case: the field "Linear damping" is `"linear_damping"`.
- A dedicated function exists only when it does more than change one value: velocity, level position, tags, spawning. Everything else goes through `set_value`. *Why: the old draft's rule, and it keeps triggers and scripts on one list of values.*
- Once a function ships it never changes. Updates only add functions.

## A script, start to finish

```lua
-- coin.lua: a sensor that adds to a variable when the player touches it
settings = {
  amount = field.number(1, { min = 1 }),
  variable = field.variable("coins"),
}

on("touched", function(other)
  if has_tag(other, "player") then
    set_variable(settings.variable, get_variable(settings.variable) + settings.amount)
    destroy(this)
  end
end)
```

## The functions

### Events · v2

| Function | Does |
|---|---|
| `on(name, function)` | Listens for an event on this script's entity. The function gets `other` and the event's number, when the event has them |
| `fire_event(id, name, number)` | Fires a custom event on an entity. `number` is optional |

The event names are the trigger events written in snake_case (question 7):

| Script event | Trigger event | The function gets |
|---|---|---|
| `"level_start"` | Level start. On a spawned entity, when it spawns | |
| `"tick"` | None. Every tick | |
| `"touched"`, `"no_longer_touched"` | Touched, No longer touched | `other` |
| `"collision"` | Collision | `other` |
| `"input_pressed"`, `"input_released"` | Key or input, with an input | the input's name |
| `"key_pressed"`, `"key_released"` | Key or input, with a raw key | the key's name |
| `"destroyed"` | Destroyed | |
| `"variable_changed"` | A variable changes | the variable's name |
| `"no_entity_with_tag_left"` | "No entity with this tag is left" | the tag |
| Any custom event name, such as `"open"` | Custom event | `other` (the sender), the number |

Timers have no script event: `wait(2)` does the same.

### Finding entities · v2

| Function | Does |
|---|---|
| `this` | Not a function: the id of the entity this script is on (question 1) |
| `get_entity_by_name(name)` | The first entity with this name, in Layers panel order, or `nil` |
| `get_entities_by_tag(tag)` | A list of ids, in Layers panel order |
| `get_world()`, `get_camera()` | The World's id, the camera's id |
| `get_parent(id)`, `get_children(id)` | The parent's id (`nil` for the World), a list of the children's ids |
| `exists(id)` | False once the entity is destroyed |

### Creating and destroying · v2

| Function | Does |
|---|---|
| `spawn(path)` | Creates an entity from an `.entity` file and returns its id, usable at once. `nil` when refused at the spawn limit |
| `destroy(id)` | Destroys the entity and its children at the end of the tick |

### Component values · v2

| Function | Does |
|---|---|
| `get_component(id, name)` | The id of the entity's component, such as `"BodyComponent"`, or `nil` |
| `get_value(component, field)` | A value, by its Inspector name in snake_case |
| `set_value(component, field, value)` | Changes a value. Only values allowed to change during play, the same list as Change value (question 3) |

```lua
set_value(get_component(this, "BodyComponent"), "gravity_scale", 0)
set_value(get_component(this, "TextComponent"), "text", "Coins: " .. get_variable("coins"))
```

This covers what the old draft had separate functions for: text, colours and opacity, joint motors, limits and lengths, gravity and the background colour, the camera's follow target and smoothing, switching a trigger on or off.

### Moving · v2

| Function | Does |
|---|---|
| `get_position(id)`, `set_position(id, x, y)` | The level position. On a merged shape it moves the body it belongs to |
| `get_rotation(id)`, `set_rotation(id, degrees)` | The rotation on screen |
| `teleport(id, x, y)` | Moves a group together with the bodies inside it, keeping their layout and speed |

The Transform's own values, measured from the parent, are read with `get_value`.

### Physics · v2

| Function | Does |
|---|---|
| `get_velocity(id)`, `set_velocity(id, x, y)` | Speed in px/s, of the body the entity belongs to |
| `get_angular_velocity(id)`, `set_angular_velocity(id, v)` | Spin in °/s |
| `push(id, x, y)` | Changes the velocity by this much whatever the mass, like the trigger action Push |
| `apply_force(id, x, y)`, `apply_impulse(id, x, y)` | Box2D's own pushes, where mass counts |
| `is_touching(id, other)` | True while the two touch |
| `raycast(x1, y1, x2, y2)` | The first entity hit and where: `id, x, y`, or `nil` |

### Variables, keys, the run · v2

| Function | Does |
|---|---|
| `get_variable(name)`, `set_variable(name, value)` | The level's variables |
| `is_down(input)`, `is_key_down(key)` | Whether an input or a raw key is held |
| `has_tag(id, tag)`, `add_tag(id, tag)`, `remove_tag(id, tag)` | Tags |
| `win()`, `lose()`, `restart()` | End or restart the run, at the end of the tick |
| `get_time()` | The level's time in seconds |
| `get_date()` | The real date and time, as a table like Lua's `os.date("*t")` |

### Waiting, output, helpers · v2

| Function | Does |
|---|---|
| `wait(seconds)` | Pauses this script. Counts the level's time |
| `print(...)` | A line in the Console |
| `math.random(...)` | As in plain Lua, from the run's seed |
| `math.clamp(x, min, max)`, `math.lerp(a, b, t)` | Two helpers (question 5) |
| `field.number(...)` and the other field types | Declare a setting (question 2) |

### Comes with v3 features · v3

| Function | Comes with |
|---|---|
| `is_mouse_down(button)`, `mouse_position()`, `mouse_screen_position()`, `level_to_screen(x, y)`, `screen_to_level(x, y)` | The mouse. Names from the review |
| `play_sound(path, options)` returns a sound id, `stop_sound(sound)` | Sound. `options` holds volume, loop, start and end |
| `shake_camera(strength, seconds)` | Camera shake |
| `drop_through(id)` | One-way platforms |

Game speed, zoom, gravity scale and the v3 joints' settings are values, so they need no function.

### Left out

Not proposed, because the review never asked for them or a value already does it: the old `vars` table and `call` (see question 4), `waitTicks`, `waitUntil`, `run`, `after`, `every` (already suggested v3 in scripts.md), animations (Later), `debug.*` drawing (rejected), the joint's current angle, `world.overlapPoint`.

## Questions for the owner

Each is one yes or no. A "no" means the old open point stays open.

**1. A script's own entity is `this`.**
The problem: with ids there is no `self` object, so a script needs its entity's id. The proposal reuses the trigger word: in a script, `this` is the id of the entity the script is on, and `other` is what a handler receives. Example: `destroy(this)`. Each entity runs its own copy, so `this` is always right.

**2. Settings are a `settings` table at the top, built with `field.<type>`.**
The problem: "values the script declares at its top" was never written down. The proposal names one function per field type in the fixed list (`field.number`, `field.text`, `field.checkbox`, `field.choice`, `field.colour`, `field.vector`, `field.angle`, `field.entity`, `field.asset`, `field.variable`, `field.tags`, `field.list`). The Inspector shows them in the order written, labelled from the name (`run_speed` reads "Run speed"). The script reads the entity's values as `settings.run_speed`. Example: `speed = field.number(400, { min = 0, max = 1500, unit = "px/s" })`.

**3. Values are read with `get_value` and changed with `set_value`, by their snake_case Inspector name.**
The problem: the review named `get_component(id, name)` and `get_attribute(...)` as examples, but "attribute" isn't a glossary word, and the trigger action is Change value. The proposal keeps `get_component` and calls the other two `get_value` and `set_value`. Example: `set_value(get_component(this, "BodyComponent"), "linear_damping", 2)`.

**4. No new way to share values between scripts: custom events and variables cover it.**
The problem: the old draft had a table shared by an entity's scripts, and functions other scripts could call. The proposal adds neither: to ask an entity for something, fire a custom event, and for a level-wide value, use a variable. Example: a Damage script does `fire_event(other, "damage", 1)`, and the Health script on that entity decides what it means. The trade-off: one script can't read another entity's private state, such as an enemy's health for a health bar. Since the API only grows, a function for that can come later.

**5. No vector type. A point is two numbers, plus `math.clamp` and `math.lerp`.**
The problem: the old draft had a `vec` type with operators. A type is a concept of its own, with its own rules for printing and comparing. The proposal returns two numbers everywhere and adds only the two helpers almost every movement script writes by hand. Example: `local x, y = get_position(this)`. A vector type can still be added later without changing these functions.

**6. Builtin scripts share three custom events: `damage`, `heal` and `died`.**
The problem: the old draft listed `damage`, `heal`, `hurt`, `died`, `stun`, `activate`, `deactivate` and movement states, and none were reviewed. The proposal keeps the three the v3 builtin scripts need: `damage` and `heal` carry an amount, and the Health script fires `died` on its own entity at zero, so a trigger there can Destroy or Lose. Each builtin script's help lists the events it fires and hears. More come only when a builtin file needs one.

**7. Script event names are the trigger events in snake_case**, as in the table under Events, and a handler gets `other` and the event's number.
The problem: EV1 named only `touched`, `tick` and custom events. Example: `on("no_longer_touched", function(other) ... end)`.

Once answered, the functions and the answers are written into [scripts.md](../requirements/scripts/scripts.md), cited as `owner: <date>`, and this file is deleted.
