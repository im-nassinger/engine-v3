# Glossary

## TL;DR

Every agreed word, one line each, grouped by subject: the basics, the editor, drawing, physics, files, logic, play. Then the list of components, and the words we dropped with what to say instead. **One word, one meaning:** a word from this file must mean exactly what it says here, everywhere in the docs and in the game's own text. Don't invent shorthand. If a new word is needed, add it here first.

## The basics

| Word | Meaning |
|---|---|
| Level | What a creator builds and a player plays: one tree of entities under the World. |
| Entity | Any single thing in a level: a rectangle, a piece of text, a joint, the camera. On its own an entity is just an id. What it is comes from its components. Say "entity", never "item" or "object". |
| Component | A piece of data attached to an entity, such as Transform or BodyComponent. The Inspector shows each one as a card. An entity has at most one component of each type. |
| Group | An entity whose job is to hold other entities as its children, so they move together. Every entity can hold children. |
| World | The top entity of every level. Everything else sits inside it. It holds the level-wide settings: gravity, background colour, level bounds, variables, inputs. |
| Camera | The one entity that decides which part of the level the player sees during play. In the editor it shows as a frame. |
| The screen | The camera's box, as the player sees it during play. |
| HUD | Not a kind of entity: a short name for the entities inside the camera. They stay fixed on the screen during play, such as a score. The editor's own text says "inside the camera". |
| Tag | A text label on an entity, such as `player` or `enemy`, that triggers and scripts look for. Tags picked into the collision grid also decide what hits what. |
| Level position | A position measured in the level, in pixels. |
| Screen position | A position measured on the screen, in pixels. Entities inside the camera use screen positions. |
| Creator | Someone building a level in the editor. |
| Player | Someone playing a level. Also loosely "the player": the entity a level's creator made controllable. There is no special player type in the game. |

## The editor

| Word | Meaning |
|---|---|
| Level view | Where you see and edit the level. It fills the whole window, with the panels on top. Older docs say "viewport". |
| Panel | A fixed area on top of the level view: Layers, Inspector, Assets, Console. |
| Layers panel | The panel listing every entity as a tree: groups with their children inside. One row is one entity. The top row is drawn in front. |
| Inspector | The panel on the right showing the components of what is selected, so you can edit their values. |
| Card | One component as the Inspector shows it: a title and its fields. |
| Field | One editable value on a card. Fields come from one fixed list of field types. |
| Attribute | One value of a component, as the Lua API names it: the Inspector field "Linear damping" is the attribute `linear_damping`. Scripts read it with `get_attribute` and change it with `set_attribute`. |
| Assets panel | The panel listing the level's files in folders, like a small file system. |
| Console | The panel at the bottom showing errors, `print()` messages and trigger lines from test play. |
| Top bar | The bar along the top with the menus, the tools and Play. |
| Status bar | The bar along the bottom with the zoom, the save state and the count of editor messages. |
| View menu | The top bar menu that switches what the editor draws over the level: Grid, Joint icons, Camera frame, Physics view. |
| Tool | What the mouse does in the level view: Select, Pencil, Bézier pen, Shape, Text, Joint, Trigger zone. |
| Selection | The entities currently selected. There is one selection, shown in the level view, the Layers panel and the Inspector. |
| Draw order | Which entity is painted on top when entities overlap. It is the Layers panel order. |
| Hidden | An entity whose eye icon is off. It is not drawn, in the editor or in play. It still collides and runs its triggers and scripts. |
| Locked | An entity whose lock icon is on. You can't click or drag it in the level view. Editor-only. |
| Snapping | When an entity you move jumps into line with the grid or with other entities. |
| Grid | The editor's grid of lines in the level view. Never the collision grid. |
| Pivot | The point an entity rotates and scales around. |
| Editor message | A short note on the card it is about, never blocking, maybe with a fix button. All of them are listed from the status bar. Two kinds: warning and tip. |
| Warning | An editor message with a yellow icon: this setup may not work as expected. |
| Tip | An editor message with a blue icon: this works, but there is an easier way. |
| Used by | The list at the bottom of the Inspector of every entity that points to the selected one. |
| Component preset | A saved set of values for one component, picked from a menu on its card. Not in v1. |

## Drawing

| Word | Meaning |
|---|---|
| Shape | A rectangle, ellipse, polygon or line, held in a ShapeComponent. Used for drawing, for collision, or both. |
| Polygon | A closed shape made of straight edges between points. It may cross itself. |
| Regular polygon | A polygon whose sides are all the same length, such as a hexagon. |
| Line | An open chain of straight segments, 2 points or more. Used for ground. |
| Path | A curved line drawn with the Bézier pen or the Pencil. It is only drawn. It never collides. |
| Fill | What paints the inside of a shape, path or text: nothing, a solid colour, a gradient or an image. |
| Outline | The line drawn around a shape, path or text: a colour and a width. |
| Image | Not a kind of entity: a shape whose fill is an image file. |
| Text | An entity with a TextComponent, typed on the level. |
| Transform | The component holding an entity's position, rotation, scale and skew, measured from its parent. |
| Skew | Slanting an entity sideways, so a rectangle becomes a parallelogram. |
| Line height | The space between the rows of a text. |

## Physics

| Word | Meaning |
|---|---|
| Body | The BodyComponent makes an entity take part in physics: how it moves. Three types: Static, Dynamic, Kinematic. |
| Static | A body type that never moves: floors, walls. |
| Dynamic | A body type moved by gravity and by hitting things: crates, balls, a player. |
| Kinematic | A body type that moves only when a script or trigger tells it to, and is never pushed. Used for moving platforms. |
| Surface | The SurfaceComponent makes a shape collide: its density, friction, restitution and whether it is a sensor. Box2D calls this a shape, and older Box2D a fixture. |
| Density | How heavy a surface is for its size. Mass = area × density. |
| Friction | How much a surface grips: 0 is ice, 1 is rubber. |
| Restitution | How bouncy a surface is: 0 doesn't bounce, 1 bounces back to full height. |
| Sensor | A surface with Sensor ticked: it notices what touches it but pushes nothing. Used for coins and finish zones. |
| One-way | A surface setting: things pass through from one side and land on the other. |
| Gravity scale | How strongly gravity pulls a body: 1 is normal, 0 floats. |
| Damping | Slowing down over time, like air. Linear damping slows movement, angular damping slows spinning. |
| Fixed rotation | A body setting that stops it from ever turning. |
| Bullet | A body setting with extra checks so a fast entity doesn't pass through thin walls. |
| Merge | When shapes inside a group with a body become part of that one body. A car body made of three shapes moves as one piece. Only ever used in this sense. |
| Collision grid | The window, opened from the World's PhysicsWorldComponent, that decides which tags hit each other. |
| Physics view | A debug view in the editor and test play that draws every physics shape, even hidden ones. |
| Collision check | Right-click two entities, "Why do these collide?": explains why they do or don't. |
| Joint | An entity with a JointComponent, connecting two bodies: Hinge, Rope, Spring, Weld, Rod, Slider, Wheel. |
| Level bounds | The rectangle around the level that marks where it ends. Each edge is a wall or open. |
| Game speed | A World setting that slows or speeds the whole level. Different from the test speed menu. |

## Files

| Word | Meaning |
|---|---|
| Asset | A file the level uses: an image, a sound, a `.lua` file or an `.entity` file. An asset is only the raw file. Settings live where it is used. |
| File path | Where a file sits in the Assets panel, starting from the top, such as `images/coin.png`. |
| .entity file | A text file holding a saved entity with its children and components, such as a coin or a player. |
| Linked copy | An entity placed from an `.entity` file that stays linked to it: editing the file updates every linked copy. |
| Builtin folder | A read-only folder in the Assets panel with the ready-made files that come with the game. |
| My files | A folder in the Assets panel shared by every level in this browser. |
| Package | A `.zip` for sharing: an `.entity` file or a folder, plus every file it points to. |
| Project file | The `.editable` file: the level as you edit it, including editor-only data such as the grid size and lock. |
| Play file | The `.playable` file: made from the project file, with only what is needed to play. |

## Logic

| Word | Meaning |
|---|---|
| Trigger | No-code logic on an entity, in three parts: When (one event), If (optional checks), Do (actions in order). An entity's TriggerComponent holds a list of them. |
| Event | Something the game reports to triggers and scripts, such as touching, a key, a timer or level start. Triggers and scripts share one list of event names. |
| Custom event | An event you name yourself, such as `open`. A trigger or script fires it on an entity, and that entity's triggers and scripts react. It can carry one number. |
| Action | One step in a trigger's Do list, such as Change value or Spawn. Only ever used for triggers. |
| `this` and `other` | In a trigger: `this` is the entity holding the trigger, `other` is the entity that caused the event, when there is one. In a script: `this` is the id of the entity the script is on, and `other` is what a handler receives. |
| Variable | A named number during play, such as `coins = 5`, listed on the World's VariablesComponent. Whether it can also hold text is not decided yet (see the open questions in [progress.md](progress.md)). |
| Keep between runs | A variable setting: its value is saved in the browser and the next run starts from it. |
| Input | A name such as `jump`, with the keys and gamepad buttons mapped to it, listed on the World's InputComponent. Players can remap inputs. |
| Raw key | A key used directly, such as Space, without going through an input. |
| Script | A `.lua` file attached to an entity through its ScriptComponent, to control it during play. |
| Lua | The programming language used for scripts. Lua 5.4. |
| Lua API | The functions the game gives every script, such as `spawn(path)` and `destroy(entity)`. |
| Spawn | Creating new entities during play from an `.entity` file, such as bullets. |

## Play

| Word | Meaning |
|---|---|
| Test play | Pressing Play in the editor. It runs a copy of the level, and Stop returns to the editor with nothing changed. |
| Run | One play of a level, from start to Stop, Restart, Win or Lose. A run is playing, won or lost. |
| Tick | One step of the game. The game runs 60 ticks per second. |
| Seed | The number all random values in a run come from. The same seed gives the same random values. |
| Play bar | The small bar shown during test play, with Stop, Pause, Step and Panels. |
| Panels button | The Play bar button that brings the Inspector, Layers and Console back during play, read-only. |
| Pause menu | The menu Tab opens during play: Resume, Restart (R), and later Controls, Settings and Quit. |
| End window | The window shown when a run is won or lost: a title, the time, Restart and Leave. |
| Fixed size | A camera mode: players see exactly the camera's box, with black bars if their window is a different shape. |
| Fill window | A camera mode: the same height as the camera's box, and wider windows see more of the level sideways. |
| Publishing | A later feature: uploading a level so other people can play it online. |

## Components

Component names end in `Component`. The Transform is the one name the sources write without it (see the open questions in [progress.md](progress.md)).

| Component | What it holds | On |
|---|---|---|
| Transform | Position, rotation, scale, skew, measured from the parent | Every entity |
| NameComponent | The entity's name, filled automatically ("Rectangle 1"). Not unique | Every entity |
| TagsComponent | The entity's tags | Any entity |
| ShapeComponent | A rectangle, ellipse, polygon or line | Any entity |
| PathComponent | A curved path. Read-only on Rope, Spring and Rod joints | Any entity |
| TextComponent | Text and its font settings (v2) | Any entity |
| StyleComponent | Fill, outline and opacity, for a shape, path or text | Any entity that draws |
| EffectsComponent | Pixelate, shadow, blur (v3) | Any entity that draws |
| BodyComponent | Body type and how it moves | Any entity |
| SurfaceComponent | How a shape collides | Any entity with a shape |
| JointComponent | The joint type, its two entities A and B, and its settings | A joint |
| CameraComponent | The camera's size, mode and follow settings | The camera |
| FlexComponent | Arranges children in a row or column (v3) | Any entity |
| TriggerComponent | A list of triggers (v2) | Any entity, the World included |
| ScriptComponent | A list of `.lua` files, each with its settings (v2) | Any entity |
| AssetComponent | Marks a linked copy and records its `.entity` file (v3) | A linked copy |
| PhysicsWorldComponent | Gravity, game speed, the collision grid | The World |
| VariablesComponent | The level's variables (v2) | The World |
| InputComponent | The level's inputs (v2) | The World |

## Dropped words

Don't use these. Each was replaced in the requirements review.

| Don't say | Say instead | Why it was dropped |
|---|---|---|
| Prefab | `.entity` file | A saved entity is just a file |
| Behaviour | Builtin `.lua` script | A ready-made script is just a file |
| Fixture, collider | Surface | Box2D's "shape" would clash with ShapeComponent |
| Rule, trigger rule | Trigger | One word for the thing |
| Data, saved data | Variable, Keep between runs | One concept, one place |
| Message | Custom event | "Event" was already in use |
| Anchor, ScreenAnchorComponent | Flex | One layout system |
| HUD entity, HUD item | Entity inside the camera | They are ordinary entities |
| Item, object | Entity | One word |
| ImageComponent, sprite | Shape with an image fill | An image is not its own kind of entity |
| RenderStyle | StyleComponent | Renamed |
| Collision category, layer (physics) | Tag in the collision grid | One label system |
| Physics overlay | Physics view | Renamed |
| Input action, action (for keys) | Input | "Action" belongs to triggers |
| Diagnostic, lint | Warning | The word everyone knows |
| World position | Level position | World is the top entity |
| Template | Component preset | One idea for every component |
| Full screen (camera mode) | Fill window | Full screen is the browser's mode |
| `.level` file | `.editable`, `.playable` | Names that say what each file is for |
| `onStart`, `onUpdate`, `onEvent` | `on(name, function)` | One way to listen |
| Hitbox | Surface on a shape | Physics is added like on any shape |
