# Glossary

## TL;DR

Every agreed word, one line each, grouped by subject: the basics, the editor, drawing, physics, files, logic, play, the words for the code, and the words for the look. Then the list of components, and the words we dropped with what to say instead. **One word, one meaning:** a word from this file must mean exactly what it says here, everywhere in the docs and in the game's own text. Don't invent shorthand. If a new word is needed, add it here first.

## The basics

| Word | Meaning |
|---|---|
| Level | What a creator builds and a player plays: one tree of entities under the World. |
| Entity | Any single thing in a level: a rectangle, a piece of text, a joint, the camera. On its own an entity is just an id. What it is comes from its components. Say "entity", never "item" or "object". |
| Component | A piece of data attached to an entity, such as TransformComponent or BodyComponent. The Entity inspector shows each one as a card. An entity has at most one component of each type. |
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
| Level view | Where you see and edit the level. It fills the whole window, with the islands on top. Older docs say "viewport". |
| Free area | The part of the level view between the Entity inspector and the Entities viewer. Fitting the view (Whole level, Selection, Camera frame, and a new level opening) fills it. |
| Island | A rounded part of the editor floating over the level view, 10 px from the window's edge and from the next island, with a soft shadow: ☰, the tool column, the Entity inspector, the Entities viewer, the minimap and the debug box (stage 19). |
| Panel | An island that holds a list or cards: the Entities viewer, the Entity inspector, the Assets panel, the Console. |
| Entities viewer | The panel at the top right listing every entity as a tree: groups with their children inside. One row is one entity. The top row is drawn in front. Only as tall as its rows. |
| Entity inspector | The panel on the left, beside the tool column, showing the components of what is selected, so you can edit their values. |
| Card | One component as the Entity inspector shows it: a title and its fields. The title drops "Component": the TransformComponent's card reads `Transform` (owner: 2026-11-17). |
| ☰ | The square island at the top left that opens the main menu: Play, then File, Edit, Arrange, View and Help. Every command is reached through it. |
| Tool column | The island under ☰ holding the tools, one button each. |
| Shortcut list | The sheet `?` opens: every shortcut by area, searchable, staying open while you work. |
| Kinds menu | The menu that stands open beside the Shape tool while it is active, to pick Rectangle, Circle or Polygon; the Joint tool's types (Hinge, Rope, Spring) have the same menu. |
| Minimap | The island at the bottom right showing the whole level bounds small, with a rectangle for what the level view shows. Show-only in v1. |
| Debug box | The island under the minimap showing the mouse position, the grid size and the zoom: `X: … Y: … GRID: … ZOOM: …`. |
| Message pill | The pill at the bottom middle of the level view showing a status text while there is one, and a failed save until it is fixed. |
| Field | One editable value on a card. Fields come from one fixed list of field types. A list field holds several values of one type as one field, such as a shape's Points. |
| Attribute | One value of a component, as the Lua API names it: the Entity inspector field "Linear damping" is the attribute `linear_damping`. Scripts read it with `get_attribute` and change it with `set_attribute`. |
| Assets panel | The panel listing the level's files in folders, like a small file system. |
| Console | The panel at the bottom showing errors, `print()` messages and trigger lines from test play. |
| View menu | The main menu's View submenu, holding the editor's view settings: Grid, Grid snapping, Joint icons, Camera frame, Physics view, and the zooms. There is no View button of its own. |
| Tool | What the mouse does in the level view: Select, Pencil, Bézier pen, Shape, Text, Joint, Trigger. |
| Trigger tool | The tool on key 6 that draws a rectangle sensor holding one touch trigger, ready for its actions. A shape with no StyleComponent, as it makes, shows in the editor as a dashed edge with a bolt and isn't drawn in play. |
| Selection | The entities currently selected. There is one selection, shown in the level view, the Entities viewer and the Entity inspector. |
| Draw order | Which entity is painted on top when entities overlap. It is the Entities viewer order. |
| Hidden | An entity whose eye icon is off. It is not drawn, in the editor or in play. It still collides and runs its triggers and scripts. |
| Locked | An entity whose lock icon is on. You can't click or drag it in the level view. Editor-only. |
| Snapping | When an entity you move jumps into line with the grid or with other entities. |
| Grid | The editor's grid of lines in the level view. Never the collision grid. |
| Pivot | The point an entity rotates and scales around. |
| Editor message | A short note on the card it is about, never blocking, maybe with a fix button. Each shows only on its card. Two kinds: warning and tip. |
| Warning | An editor message with a yellow icon: this setup may not work as expected. |
| Tip | An editor message with a blue icon: this works, but there is an easier way. |
| Used by | The list at the bottom of the Entity inspector of every entity that points to the selected one. |
| Component preset | A saved set of values for one component, picked from a menu on its card. Not in v1. |
| Read-only tab | An older tab whose level was opened in a newer tab. It saved its changes first. You can look, select, pan, zoom, copy and export, but every edit is refused with "The level is open in another tab", and nothing more is saved. Reloading it takes the level back. |

## Drawing

| Word | Meaning |
|---|---|
| Shape | A rectangle, circle, polygon or line, held in a ShapeComponent. Used for drawing, for collision, or both. |
| Kind | Which of the four a shape is: rectangle, circle, polygon or line. Each kind holds its own values. Not "type": a joint's type and a component's type are other things. |
| Circle | A shape with only a radius. There is no ellipse kind: an ellipse is a circle scaled unevenly by its TransformComponent. |
| Polygon | A closed shape made of straight edges between points. It may cross itself. |
| Regular polygon | A polygon whose sides are all the same length, such as a hexagon. |
| Line | An open chain of straight segments, 2 points or more. Used for ground. Drawn as a polygon finished with Enter instead of closed. |
| Path | A curved line drawn with the Bézier pen or the Pencil. It is only drawn. It never collides. |
| Path point | One point of a path: its position, its two curve handles and its corner. A field type of its own (v2). |
| Curve handle | One of the two dots on a path point that set how the curve leaves and enters it. A sharp point has none; a smooth point keeps its two in one line; a separate point's move on their own. |
| Smoothness | The Pencil's setting, Low, Medium or High: how closely the path it makes follows the drag. |
| Fill | What paints the inside of a shape, path or text: nothing, a solid colour, a gradient or an image. |
| Gradient | A fill that blends between colours: **linear**, along a line from a start to an end, or **radial**, out from a centre to a radius. |
| Colour stop | One colour of a gradient and where along it that colour is, from 0% to 100%. A gradient has 2 to 8. |
| Gradient handles | The dots on the level view that move a gradient's start and end, or its centre and radius. |
| Outline | The line drawn around a shape, path or text: a colour and a width. With **Scale outline** off, the entity's own scale doesn't stretch it. |
| Image | Not a kind of entity: a shape whose fill is an image file. |
| Text | An entity with a TextComponent, typed on the level. |
| TransformComponent | The component holding an entity's position, rotation, scale and skew, measured from its parent. |
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
| Level bounds | The rectangle around the level that marks where it ends: the World's rectangle ShapeComponent. Its edges are all walls or all open. |
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
| Fire custom event | The action that fires a custom event on its target, with an optional number. |
| Action | One step in a trigger's Do list, such as Change value or Spawn. Only ever used for triggers. |
| When, If, Do | The three parts of a trigger, each a section of its card: **When** names its one event, **If** its checks, **Do** its actions, run top to bottom. |
| Check | One condition in a trigger's If, such as "`other` has the tag `coin`" or "`coins` is at least 10". The actions run only when every check holds. |
| Repeat | A trigger's setting for how often it may fire: every time (the default), once per run, or at most once every N seconds. |
| Touched, no longer touched | The events for something starting or stopping touching an entity's sensor or surface, once per touching entity however many shapes it has. `other` is the entity that touched or left. |
| Collision (event) | The event for this entity starting to hit a solid thing, once per entity hit however many shapes it has: "When this hits something". `other` is the entity hit. Not the same as the collision grid, which decides what hits what. |
| Destroyed | The event for a Destroy action taking this entity or a group above it. Its triggers run before the entity disappears at the end of the tick. |
| A variable changes | The event for a variable getting a new value, with an optional condition: "When coins becomes 10 or more" fires once, when the condition turns true. |
| Change value | The action that sets, adds to or subtracts from a value on its target: a variable, a component value allowed to change during play, a tag, or a trigger's on or off. Teleporting is Change value on the position. |
| Flip | Change value on a boolean variable that turns true into false and false into true. |
| Wait | The action that delays the actions after it in a Do list, in whole ticks. |
| Waiting run | What is left of a trigger's Do list while a Wait counts down. Each firing is its own; a trigger holds at most 32. |
| Push | The action that gives a body a kick, ignoring its mass: a fixed vector in px/s, or a strength away from or towards `this`. |
| Unset part | A part of a trigger not chosen yet, shown in yellow on its card. A trigger with an unset part doesn't run. |
| Chain limit | Triggers setting off triggers stop after 32 rounds in one tick, with a play warning. The game keeps running. |
| `this` and `other` | In a trigger: `this` is the entity holding the trigger, `other` is the entity that caused the event, when there is one. In a script: `this` is the id of the entity the script is on, and `other` is what a handler receives. |
| Variable | A named value during play, such as `coins = 5`, listed on a VariablesComponent. The World's variables are the level's; any other entity's are its own, such as an enemy's `health`. Its type is **number**, **string** (text, such as `"Ada"`), **boolean** (`true` or `false`), **entity**, **asset**, **colour**, **vector**, **angle** or **tags**. A script lists the variables it needs in a `variables` table at its top. |
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
| Panels button | The Play bar button that brings the Entity inspector, the Entities viewer and the Console back during play, read-only. |
| Pause menu | The menu Tab opens during play: Resume, Restart (R), and later Controls, Settings and Quit. |
| End window | The window shown when a run is won or lost: a title, the time, Restart and Leave. |
| Win, Lose | The actions that end a run as won or lost: the tick finishes, the Play bar reads ENDED and the end window shows. |
| Restart | Starting the run again from the level as it was at Play, everything reset: from the end window, the Restart action, or the Pause menu once it comes. A Restart action in a run's first second is ignored, so a level can't restart forever. |
| Fixed size | A camera mode: players see exactly the camera's box, with black bars if their window is a different shape. |
| Fill window | A camera mode: the same height as the camera's box, and wider windows see more of the level sideways. |
| Publishing | A later feature: uploading a level so other people can play it online. |

## The code

Words for how the game is built, used in [architecture/](architecture/README.md). Approved with the architecture (owner, 2026-11-13 and 2026-11-14). They are never shown to players or creators.

| Word | Meaning |
|---|---|
| Command | What a menu entry or a shortcut runs, such as Group or Delete. The requirements already use the word this way. |
| Change | One undoable edit to the level, which can apply itself and revert itself. A command makes one or more changes. |
| History step | One entry in the undo history: the changes one command made, with a label such as "Move 3 entities". |
| Contract | A small TypeScript type that the game's rules declare and some other class fulfils, such as `PhysicsWorld`. |
| Adapter | A class that fulfils a contract using a library or the browser, such as the Box2D adapter. |
| Worker | A browser thread that runs code away from the page, so a long computation never freezes the editor. |
| Play copy | The copy of the level that test play runs. Stop throws it away. |
| Schema | The list of fields a component type declares once: each field's type, label, unit, range, default and whether it can change during play. |
| Current group | The group you are inside: double-click goes in, Esc goes up. |
| Part (of the code) | One of the five top folders of `src`: core, editor, adapters, ui, app. Used instead of "layer". |
| Module | A folder directly under a part, with one `index.ts` that other modules import from. |
| Guard test | A test that hands one of the code checks (the type check, ESLint, dependency-cruiser) a small file breaking its rule, and expects the check to refuse it. Proves a check still works. |
| Composition root | The one place that builds the concrete classes and connects them: the editor page, the game worker, the import worker. |
| Open level | The level open in the editor, together with its history, selection, current group and caches. New and Import replace it. |
| Game worker | The worker that runs the play copy during test play. |
| Play mirror | The editor page's own copy of the running level, updated from tick reports and drawn by the level view. |
| Tick report | What the game worker sends back after running ticks: the bodies that moved, entities removed, the camera's position, and from v3 the changed values, the run's end and play warnings. |
| Collision piece | One convex part of a shape, at most 8 points, as handed to the physics engine and drawn by the physics view. |
| Value type | A class that knows how to check, store, copy and compare one kind of value. Every field type is a value type the Entity inspector can show. |
| Change signal | The notice a class sends when its state changed, so caches, the level view and panels can update. Not a game event. |
| Derived cache | A value worked out from the level and kept until something it depends on changes, such as an entity's bounds. |
| Status text | The short result the message pill shows for 4 seconds, such as "Undid: Move 3 entities". |
| Browser event | Something the browser reports to the page, such as a key press or a paste. Never a game event. |
| Body pose | A body's position and angle during play, as the physics engine reports it. |
| Sensor event | What the physics world reports after a step when a surface starts (begin) or stops (end) overlapping a sensor. It names the sensor's entity, the visitor (the other surface's entity, Box2D's word) and the visitor's body. Not a game event: `TouchLedger` turns sensor events into "touched" and "no longer touched". |
| Firing | One trigger hearing one event in one tick (`TriggerFiring`): its entity, the trigger, and the entity that caused the event (`other`), if any. Two entities touching at once are two firings. `EventPhase` lists a tick's firings, `TriggerPhase` runs them. |
| Round | One pass of `TriggerPhase` over a list of firings in one tick: the first is the firings `EventPhase` listed, each next one the firings the last round's actions set off. A tick stops after 32 (the chain limit). |
| Play warning | Something that went wrong during play without stopping the run, such as the chain limit, given once per run (`PlayWarnings`). Shown in the message pill until the Console comes in v5. Not an editor message. |
| Changed value | A value Change value wrote during play, sent in the tick report so the play mirror and the Entity inspector show it. |
| Recorded inputs | The keys a determinism test level holds and presses on each tick, written as code beside the levels, so every run of the test plays the same inputs. |
| Trigger owner | The entity holding a trigger (`this`). For touches, the sensor's entity and every group above it with a touch trigger. |
| Render chunk | A run of the World's children, next to each other in the draw order, that PixiJS draws as its own render group. Moving an entity uploads again only the shapes of its render chunk, not the whole level's. |
| Runner | The script that built v1, stages 0 to 19, without the owner: one fresh Claude session per step, with reports to Discord. Moved out of this project on 2026-11-20, to `~/projects/orchestrator/old-runner/`, to become a tool for any project. |

## The look

Words for how the editor looks, used while the design is settled (owner, 2026-11-14). Never shown to players or creators.

| Word | Meaning |
|---|---|
| Mockup | A static page that shows how a screen of the editor will look, with made-up content and nothing working behind it. |
| Design system | The written rules of the editor's look: its design tokens, how each control looks in each state, its icons, and the colours the level view draws with. |
| Design token | One named value of the design system, such as the panel background colour or the space between two rows. In the code it is a CSS custom property in `theme.css`. |
| Stacking order | Which part of the editor shows over which: the level view, then the islands, then the floating parts, popups, tooltips and dialogs, each named once as a design token (stage 18, standing yes, 2026-11-17). |
| Accent colour | The one colour that marks what is active or selected: the active tool, a selected row, the selection outline in the level view, the focused field. |

## Components

Component names end in `Component`, the TransformComponent included (owner: 2026-11-13). The rule covers the names, not the card titles, which drop it (owner: 2026-11-17).

| Component | What it holds | On |
|---|---|---|
| TransformComponent | Position, rotation, scale, skew, measured from the parent | Every entity |
| NameComponent | The entity's name, filled automatically ("Rectangle 1"). Not unique | Every entity |
| TagsComponent | The entity's tags (v3) | Any entity |
| ShapeComponent | A rectangle, circle, polygon or line. On the World, a rectangle: the level bounds | Any entity, the World included |
| PathComponent | A curved path. Read-only on Rope, Spring and Rod joints | Any entity |
| TextComponent | Text and its font settings (v6) | Any entity |
| StyleComponent | Fill, outline and opacity, for a shape, path or text. On the World, its fill is the background | Any entity that draws, the World included |
| EffectsComponent | Pixelate, shadow, blur (Later) | Any entity that draws |
| BodyComponent | Body type and how it moves | Any entity |
| SurfaceComponent | How a shape collides | Any entity with a shape |
| JointComponent | The joint type, its two entities A and B, and its settings | A joint |
| CameraComponent | The camera's size, mode and follow settings | The camera |
| FlexComponent | Arranges children in a row or column (Later) | Any entity |
| TriggerComponent | A list of triggers (v3) | Any entity, the World included |
| ScriptComponent | A list of `.lua` files (v5). Their values are the entity's variables | Any entity |
| AssetComponent | Marks a linked copy and records its `.entity` file (Later) | A linked copy |
| PhysicsWorldComponent | Gravity, game speed, the collision grid | The World |
| VariablesComponent | Variables: the level's on the World (v3), an entity's own on any other entity (v4) | Any entity, the World included |
| InputComponent | The level's inputs (v3) | The World |

## Parts gone from the editor

Stage 19, the redesign, removes these parts. Docs written before it still name them, as what was built then; never use them for the editor after it (standing yes, 2026-11-18).

| Part | What replaces it |
|---|---|
| Top bar | ☰ for every command, the tab title for unsaved changes, the debug box for the zoom. The level's name and the save state are no longer shown |
| Status bar | The debug box for the mouse position, the message pill for status texts. The tool's hint, the selection and the message count are no longer shown |
| Toolbar | The tool column |
| Options strip | The kinds menu |

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
| Script setting, `settings` table | Variable, the `variables` table | Variables replaced them: one concept for named values (owner: 2026-11-16) |
| Diagnostic, lint | Warning | The word everyone knows |
| World position | Level position | World is the top entity |
| Template | Component preset | One idea for every component |
| Full screen (camera mode) | Fill window | Full screen is the browser's mode |
| `.level` file | `.editable`, `.playable` | Names that say what each file is for |
| `onStart`, `onUpdate`, `onEvent` | `on(name, function)` | One way to listen |
| Hitbox | Surface on a shape | Physics is added like on any shape |
| Trigger zone (the tool) | Trigger tool | Shorter (owner: 2026-11-13) |
| Transform | TransformComponent | Component names end in `Component` (owner: 2026-11-13). Only a card's title drops it (owner: 2026-11-17) |
| Layers panel, Entities panel | Entities viewer | Renamed (owner: 2026-11-14, then 2026-11-17) |
| Inspector | Entity inspector | Renamed (owner: 2026-11-17) |
