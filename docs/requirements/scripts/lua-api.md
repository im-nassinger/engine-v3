# The Lua API

## TL;DR

Every function the game gives scripts. Example scripts are in [lua-examples.md](lua-examples.md). **Functions are top level, take entity ids, and use pixels, degrees and the Entity inspector's names.** Anything that is a component value is read with `get_attribute` and changed with `set_attribute`, the same list of values a trigger's Change value offers, so there are no separate setters for text, colours, joint motors or gravity. The rules behind the API are in [scripts.md](scripts.md).

The Status column says which functions the review named and which the owner decided after it. The owner approved the whole list on 2026-11-13.

## Conventions · v5

- **Every function is top level**, such as `spawn(path)`, never `world.spawn(path)`. Lua's own libraries (`string`, `table`, `math`) stay as Lua has them.
- **Functions take ids, never objects.** An id is a number. A destroyed entity's id no longer exists: functions given one do nothing, and `exists(id)` returns false.
- Positions are **level positions in pixels**, y pointing down. Angles are **degrees, clockwise on screen**. Speeds are px/s and °/s. Time is the level's time in seconds. Gravity alone is m/s², as in the Entity inspector.
- **A script's own entity is `this`**, and a handler receives `other`, the words triggers use.
- **A point is two numbers:** `local x, y = get_position(this)`. There is no vector type. Only a vector variable reads as a table, see [variables](#variables--v2).
- **Attributes use the Entity inspector's field names in snake_case:** the field "Linear damping" is the attribute `"linear_damping"`.
- Colours are text, such as `"#4A90D9"`.
- A function of its own exists only when it does more than change one value: velocity, level position, tags, spawning.
- *Why: handles, not references; same names as the Entity inspector; pixels and degrees; the owner's rule that functions are top level. A vector type is a concept of its own, and can still be added later without changing these functions.*

Source: round 3: D66; round 9: 10 2.7, 10 2.8; round 10: API1; owner: 2026-11-13

## The functions

Status: **Review** means the review named it. **Owner** means the owner decided it after the review.

### Events · v5

| Function | Does | Status |
|---|---|---|
| `on(name, handler)` | Calls `handler` when the event happens on this script's entity | Review |
| `fire_event(id, name, number)` | Fires a custom event on an entity. `number` is optional | Review |

| Event | When | The handler gets | Status |
|---|---|---|---|
| `"tick"` | Every tick, 60 times a second | | Review |
| `"touched"`, `"no_longer_touched"` | Something starts or stops touching this | `other` | Review, Owner |
| `"collision"` | This hits something | `other` | Owner |
| `"level_start"` | The level starts, or this entity is spawned | | Owner |
| `"input_pressed"`, `"input_released"` | An input is pressed or released | the input's name | Owner |
| `"key_pressed"`, `"key_released"` | A raw key is pressed or released | the key's name | Owner |
| `"destroyed"` | This entity is destroyed | | Owner |
| `"variable_changed"` | A variable changes | the variable's name | Owner |
| `"no_entity_with_tag_left"` | The last entity with a tag is gone | the tag | Owner |
| A custom event, such as `"open"` | Something fires it on this entity | the sender, the number | Review, Owner |

Script event names are the trigger events in snake_case.

Source: round 9: 10 2.3; round 10: EV1; owner: 2026-11-13

### Entities · v5

| Function | Does | Status |
|---|---|---|
| `this` | Not a function: the id of the entity this script is on | Owner |
| `get_entity_by_name(name)` | The first entity with this name in Entities viewer order, or `nil` | Review |
| `get_entities_by_tag(tag)` | A list of ids, in Entities viewer order | Owner |
| `get_world()`, `get_camera()` | The World's id, the camera's id | Owner |
| `get_parent(id)`, `get_children(id)` | The parent's id, a list of the children's ids | Owner |
| `exists(id)` | False once the entity is destroyed | Owner |
| `spawn(path)` | Creates an entity from an `.entity` file. Returns its id, or `nil` at the spawn limit. Comes in v7, with `.entity` files | Review |
| `destroy(id)` | Destroys the entity and its children at the end of the tick | Review |
| `has_tag(id, tag)`, `add_tag(id, tag)`, `remove_tag(id, tag)` | Tags | Owner |

Source: round 3: D66; round 9: 10 2.2, 10 2.4; owner: 2026-11-13

### Component attributes · v5

| Function | Does | Status |
|---|---|---|
| `get_component(id, name)` | The id of the entity's component, such as `"BodyComponent"`, or `nil` | Review |
| `get_attribute(component, name)` | Reads one value of a component | Review |
| `set_attribute(component, name, value)` | Changes one value. Only values allowed to change during play | Owner |

Source: round 3: D66; round 9: 10 2.8; owner: 2026-11-13

### Moving and physics · v5

| Function | Does | Status |
|---|---|---|
| `get_position(id)`, `set_position(id, x, y)` | The level position. On a merged shape, it moves the body it belongs to | Owner |
| `get_rotation(id)`, `set_rotation(id, degrees)` | The rotation on screen | Owner |
| `teleport(id, x, y)` | Moves a group with the bodies inside it, keeping their layout and speed | Owner |
| `get_velocity(id)`, `set_velocity(id, x, y)` | The body's speed in px/s | Owner |
| `get_angular_velocity(id)`, `set_angular_velocity(id, speed)` | The body's spin in °/s | Owner |
| `push(id, x, y)` | Changes the velocity by this much, whatever the mass, like the trigger action Push | Owner |
| `apply_force(id, x, y)`, `apply_impulse(id, x, y)` | Box2D's own pushes, where mass counts | Owner |
| `is_touching(id, other)` | True while the two touch | Owner |
| `raycast(from_x, from_y, to_x, to_y)` | The first entity hit and where: `id, x, y`, or `nil` | Owner |

Source: round 9: 10 2.7; owner: 2026-11-13

### Variables, keys, the run · v5

| Function | Does | Status |
|---|---|---|
| `get_variable(name)`, `set_variable(name, value)` | The level's variables, on the World. A script reads its own entity's through `variables`, see [variables](#variables--v2) | Owner |
| `is_down(input)`, `is_key_down(key)` | Whether an input or a raw key is held | Review |
| `win()`, `lose()`, `restart()` | End or restart the run, at the end of the tick | Owner |
| `get_time()` | The level's time in seconds | Owner |
| `get_date()` | The real date and time, as a table like Lua's `os.date("*t")` | Owner |
| `wait(seconds)` | Pauses this script. Counts the level's time | Review |
| `print(...)` | A line in the Console | Review |
| `clamp(value, min, max)`, `lerp(from, to, amount)` | Two helpers | Owner |

Source: round 9: 10 2.5, 10 2.7; round 11: CL1; owner: 2026-11-13

### Variables · v5

| Function | Type of the variable | Status |
|---|---|---|
| `number_variable(start, options)` | Number. `options` may hold `min`, `max` and `unit` | Owner |
| `string_variable`, `boolean_variable`, `angle_variable`, `colour_variable` | String, boolean, angle, colour | Owner |
| `entity_variable`, `asset_variable`, `vector_variable`, `tags_variable` | Entity, asset, vector, tags | Owner |

- **A script lists the variables it needs in a `variables` table at its top**, such as `speed = number_variable(400, { min = 0, unit = "px/s" })`. The list only describes them: the values are the entity's own, on its VariablesComponent, where the Entity inspector shows them.
- **During play the same table reads and writes them:** `variables.speed` reads, `variables.speed = 500` writes, and triggers see the change. There are no functions inside it. *Why: functions are top level, and plain reads and writes match the rest of Lua (owner: 2026-11-16).*
- The level's variables, on the World, keep `get_variable(name)` and `set_variable(name, value)`.
- **What each type reads as:** a number or an angle (in degrees) is a number; a string or a colour is text; a boolean is `true` or `false`; an entity is its id, or `nil` when none is picked; an asset is its file path; tags are a list of text; a vector is a table such as `{ x = 10, y = 20 }`.
- **A vector or tags variable reads as a read-only copy.** `variables.offset.x = 5` stops the script with "A vector variable is changed as a whole: `variables.offset = { x = 5, y = 20 }`". *Why: a copy that wrote through would also change every older copy kept in a local, with no error (owner: 2026-11-16).*
- Writing a value of another type stops the script with an error, like any script error (standing yes, 2026-11-16).
- A name the entity doesn't have reads as `nil` and puts one warning in the Console, like an unknown input name (standing yes, 2026-11-16).

Source: round 10: SC1; owner: 2026-11-13; owner: 2026-11-16

### Comes with later features · Later

| Function | Comes with | Status |
|---|---|---|
| `is_mouse_down(button)`, `mouse_position()`, `mouse_screen_position()`, `level_to_screen(x, y)`, `screen_to_level(x, y)` | The mouse | Review |
| `play_sound(path, options)`, `stop_sound(sound)` | Sound. `options` holds volume, loop, start and end | Owner |
| `shake_camera(strength, seconds)` | Camera shake | Owner |
| `drop_through(id)` | One-way platforms | Owner |

Source: round 12: MS2; owner: 2026-11-13
