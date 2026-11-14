# The Lua API

## TL;DR

Every function the game gives scripts. Example scripts are in [lua-examples.md](lua-examples.md). **Functions are top level, take entity ids, and use pixels, degrees and the Inspector's names.** Anything that is a component value is read with `get_attribute` and changed with `set_attribute`, the same list of values a trigger's Change value offers, so there are no separate setters for text, colours, joint motors or gravity. The rules behind the API are in [scripts.md](scripts.md).

**Most of this page is a proposal waiting for the owner.** The Status column says which functions the review named and which are proposed. The open questions are in [the Lua API proposal](../../proposals/lua-api.md). A "no" there changes this page.

## Conventions · v2

- **Every function is top level**, such as `spawn(path)`, never `world.spawn(path)`. Lua's own libraries (`string`, `table`, `math`) stay as Lua has them.
- **Functions take ids, never objects.** An id is a number. A destroyed entity's id no longer exists: functions given one do nothing, and `exists(id)` returns false.
- Positions are **level positions in pixels**, y pointing down. Angles are **degrees, clockwise on screen**. Speeds are px/s and °/s. Time is the level's time in seconds. Gravity alone is m/s², as in the Inspector.
- **A point is two numbers:** `local x, y = get_position(this)`.
- **Attributes use the Inspector's field names in snake_case:** the field "Linear damping" is the attribute `"linear_damping"`.
- Colours are text, such as `"#4A90D9"`.
- A function of its own exists only when it does more than change one value: velocity, level position, tags, spawning.
- *Why: handles, not references; same names as the Inspector; pixels and degrees; the owner's rule that functions are top level.*

Source: round 3: D66; round 9: 10 2.7, 10 2.8; round 10: API1; owner: 2026-11-13

## The functions

Status: **Review** means the review named it. **Owner** means the owner decided it after the review. **Proposed** means it waits for the owner's answer to that question in [the proposal](../../proposals/lua-api.md).

### Events · v2

| Function | Does | Status |
|---|---|---|
| `on(name, handler)` | Calls `handler` when the event happens on this script's entity | Review |
| `fire_event(id, name, number)` | Fires a custom event on an entity. `number` is optional | Review |

| Event | When | The handler gets | Status |
|---|---|---|---|
| `"tick"` | Every tick, 60 times a second | | Review |
| `"touched"`, `"no_longer_touched"` | Something starts or stops touching this | `other` | Review, Proposed (Q6) |
| `"collision"` | This hits something | `other` | Proposed (Q6) |
| `"level_start"` | The level starts, or this entity is spawned | | Proposed (Q6) |
| `"input_pressed"`, `"input_released"` | An input is pressed or released | the input's name | Proposed (Q6) |
| `"key_pressed"`, `"key_released"` | A raw key is pressed or released | the key's name | Proposed (Q6) |
| `"destroyed"` | This entity is destroyed | | Proposed (Q6) |
| `"variable_changed"` | A variable changes | the variable's name | Proposed (Q6) |
| `"no_entity_with_tag_left"` | The last entity with a tag is gone | the tag | Proposed (Q6) |
| A custom event, such as `"open"` | Something fires it on this entity | the sender, the number | Review, Proposed (Q6) |

Source: round 9: 10 2.3; round 10: EV1; owner: 2026-11-13

### Entities · v2

| Function | Does | Status |
|---|---|---|
| `this` | Not a function: the id of the entity this script is on | Proposed (Q1) |
| `get_entity_by_name(name)` | The first entity with this name in Layers panel order, or `nil` | Review |
| `get_entities_by_tag(tag)` | A list of ids, in Layers panel order | Proposed (Q7) |
| `get_world()`, `get_camera()` | The World's id, the camera's id | Proposed (Q7) |
| `get_parent(id)`, `get_children(id)` | The parent's id, a list of the children's ids | Proposed (Q7) |
| `exists(id)` | False once the entity is destroyed | Proposed (Q7) |
| `spawn(path)` | Creates an entity from an `.entity` file. Returns its id, or `nil` at the spawn limit | Review |
| `destroy(id)` | Destroys the entity and its children at the end of the tick | Review |
| `has_tag(id, tag)`, `add_tag(id, tag)`, `remove_tag(id, tag)` | Tags | Proposed (Q7) |

Source: round 3: D66; round 9: 10 2.2, 10 2.4; owner: 2026-11-13

### Component attributes · v2

| Function | Does | Status |
|---|---|---|
| `get_component(id, name)` | The id of the entity's component, such as `"BodyComponent"`, or `nil` | Review |
| `get_attribute(component, name)` | Reads one value of a component | Review |
| `set_attribute(component, name, value)` | Changes one value. Only values allowed to change during play | Owner |

Source: round 3: D66; round 9: 10 2.8; owner: 2026-11-13

### Moving and physics · v2

| Function | Does | Status |
|---|---|---|
| `get_position(id)`, `set_position(id, x, y)` | The level position. On a merged shape, it moves the body it belongs to | Proposed (Q7) |
| `get_rotation(id)`, `set_rotation(id, degrees)` | The rotation on screen | Proposed (Q7) |
| `teleport(id, x, y)` | Moves a group with the bodies inside it, keeping their layout and speed | Proposed (Q7) |
| `get_velocity(id)`, `set_velocity(id, x, y)` | The body's speed in px/s | Proposed (Q7) |
| `get_angular_velocity(id)`, `set_angular_velocity(id, speed)` | The body's spin in °/s | Proposed (Q7) |
| `push(id, x, y)` | Changes the velocity by this much, whatever the mass, like the trigger action Push | Proposed (Q7) |
| `apply_force(id, x, y)`, `apply_impulse(id, x, y)` | Box2D's own pushes, where mass counts | Proposed (Q7) |
| `is_touching(id, other)` | True while the two touch | Proposed (Q7) |
| `raycast(from_x, from_y, to_x, to_y)` | The first entity hit and where: `id, x, y`, or `nil` | Proposed (Q7) |

Source: round 9: 10 2.7; owner: 2026-11-13

### Variables, keys, the run · v2

| Function | Does | Status |
|---|---|---|
| `get_variable(name)`, `set_variable(name, value)` | The level's variables | Proposed (Q7) |
| `is_down(input)`, `is_key_down(key)` | Whether an input or a raw key is held | Review |
| `win()`, `lose()`, `restart()` | End or restart the run, at the end of the tick | Proposed (Q7) |
| `get_time()` | The level's time in seconds | Proposed (Q7) |
| `get_date()` | The real date and time, as a table like Lua's `os.date("*t")` | Proposed (Q7) |
| `wait(seconds)` | Pauses this script. Counts the level's time | Review |
| `print(...)` | A line in the Console | Review |
| `clamp(value, min, max)`, `lerp(from, to, amount)` | Two helpers | Proposed (Q4) |

Source: round 9: 10 2.5, 10 2.7; round 11: CL1; owner: 2026-11-13

### Settings · v2

| Function | Field type in the Inspector | Status |
|---|---|---|
| `number_field(default, options)` | Number. `options` may hold `min`, `max` and `unit` | Proposed (Q2) |
| `text_field`, `checkbox_field`, `choice_field`, `colour_field`, `vector_field`, `angle_field` | Text, checkbox, choice, colour, vector, angle | Proposed (Q2) |
| `entity_field`, `asset_field`, `variable_field`, `tags_field`, `list_field` | Entity, asset, variable, tags, a list | Proposed (Q2) |

A script declares its settings in a `settings` table at its top. The Inspector shows them in that order, labelled from the name (`run_speed` reads "Run speed"), and the script reads each entity's own values from the same table.

Source: round 10: SC1; owner: 2026-11-13

### Comes with v3 features · v3

| Function | Comes with | Status |
|---|---|---|
| `is_mouse_down(button)`, `mouse_position()`, `mouse_screen_position()`, `level_to_screen(x, y)`, `screen_to_level(x, y)` | The mouse | Review |
| `play_sound(path, options)`, `stop_sound(sound)` | Sound. `options` holds volume, loop, start and end | Proposed (Q7) |
| `shake_camera(strength, seconds)` | Camera shake | Proposed (Q7) |
| `drop_through(id)` | One-way platforms | Proposed (Q7) |

Source: round 12: MS2; owner: 2026-11-13
