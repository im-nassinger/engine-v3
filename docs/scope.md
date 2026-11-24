# Scope

## TL;DR

Every feature in one line, with the version it ships in and why. **v1 is the smallest thing that can be tested: a level you build and watch.** Coloured shapes, groups, bodies, three joints, the camera following an entity, Play, Stop, Pause and Step, saving in the browser and export. **After v1 come small versions, each adding one thing you can try at once** (owner, 2026-11-20): **v2** curves and gradients, **v3** the first triggers and Win and Lose, **v4** the rest of the triggers and the shortcut list, **v5** scripts, the code editor, the Console and the Assets panel, **v6** text and entities inside the camera, **v7** `.entity` files, spawning and the builtin player. **Later** is everything in no planned version yet, accounts and publishing last. The exact rules for each feature are in [requirements/](requirements/README.md). Each topic file marks every feature with the same version as here.

## What the versions mean

| Version | Meaning |
|---|---|
| **v1** | Build and watch. The smallest thing that can be tested. |
| **v2** | Draw curves: the Bézier pen, the Pencil, gradients. |
| **v3** | A first game without code: touching, tags, the first triggers, number variables on the World, inputs, Win and Lose. |
| **v4** | The rest of the triggers, string and boolean variables on any entity, the shortcut list. |
| **v5** | Scripts, the code editor, the Console, the Assets panel. |
| **v6** | Text, and entities inside the camera. |
| **v7** | `.entity` files, spawning, the builtin folder and the builtin player. |
| **Later** | In no planned version yet. A feature gets a number only when it joins a planned version. |

**How versions were set.** The scope review (2026-11-13) set v1, v2, v3 for polish and Later, and the owner made v1 smaller the same day, moving all logic to v2 and accounts to v4. **On 2026-11-20 the owner replaced everything after v1 with small versions**: each adds one thing you can try at once, the most value for the least work first, and only the next few are planned. The old v3 (polish) and v4 (accounts and publishing) became Later. Round 11, which kept v2 as one big version, was dropped half way. A reason below that says "Was v1 in the scope review" or names an old version is history.

Versions are decided in a scope review, never inside a requirement. An earlier decision to keep every proposed trigger event and action in the first release is replaced by the versions below.

Source: round 2: O3; round 3: S1; decisions: D64; owner: 2026-11-13

## Settled outside the scope review

These versions were decided during the requirements review, or by the owner afterwards, so the scope review did not ask about them.

| Feature | Version | Why |
|---|---|---|
| One level at a time, saved in the browser. New and Import replace it after asking. Export makes a `.editable` file; Ctrl+S saves in the browser now (owner: 2026-11-18) | v1 | A list of levels isn't v1. Without the browser copy, closing the tab would lose work |
| Three joints: Hinge, Rope and Spring, with the Joint tool | v1 | Each does something the others can't |
| Only three tools in v1: Select, Shape and Joint | v1 | The other tools make paths, triggers and text, which come in v2, v3 and v6 (owner: 2026-11-13; owner: 2026-11-20) |
| Pause and Step | v1 | To watch a collision tick by tick (owner: 2026-11-13) |
| The level's name, in the tab title and renamed from File → Rename level… (owner: 2026-11-18; not shown in the editor since the redesign) | v1 | It names the exported file. It was in no scope list (owner: 2026-11-13) |
| The minimap, show-only | v1 | Part of the redesign; moving the view by clicking or dragging on it is Later (owner: 2026-11-18) |
| The Bézier pen and the Pencil tool | v2 | A path never collides, and Convert to polygon is Later, so in v1 a path is decoration only. Was v1, decided before versions were split (owner: 2026-11-13) |
| Gradients | v2 | Decoration. Solid colours are enough to test. The owner had changed it from "not in the first version" (owner: 2026-11-13) |
| The searchable list of shortcuts | v4 | The owner put it in v4 (owner: 2026-11-20). It never went through "smallest thing that can be tested". The main menu lists every command with its shortcut (owner: 2026-11-13) |
| The rest of debugging: `print()` in the Console (v5), the Panels button with live values (Later) | v5 and Later | They come with scripts; live values are the most work of the set (owner: 2026-11-20). The agreed debugging set, nothing else was discussed |
| The Trigger tool (key 6, standing yes, 2026-11-22): a rectangle that notices touching, with a trigger | v3 | Triggers come in v3. It was in the tool list with no version (owner: 2026-11-13) |
| The camera follows a tag | Later | A spawned player can't be picked in the editor, so following its tag finds it without a script (owner: 2026-11-13) |
| A new level starts with the inputs left, right, up, down and jump | v3 | Inputs come in v3, and most games need these five (owner: 2026-11-13) |
| Variables are a number, a string, a boolean, an entity, an asset, a colour, a vector, an angle or tags | v3 to v5 | Variables come from v3. The owner wants text too (owner: 2026-11-13), named the first three types (owner: 2026-11-14), and added the rest when variables replaced the values scripts kept (owner: 2026-11-16) |
| Variables on any entity, number limits, and a warning on the ScriptComponent's card that adds the variables a script needs | v4 and v5 | They replace the values scripts kept on the ScriptComponent, which were v2 (owner: 2026-11-16) |
| Flip a boolean variable in a trigger | v4 | A light switch is then one trigger (owner: 2026-11-14) |
| Noticing touches, the random seed | v3 and v5 | Only triggers and scripts use them (owner: 2026-11-13). Since 2026-11-23 a shape with no Surface and a touch trigger is noticed by what passes through it, with no Sensor setting (owner) |
| Convert a trigger into a script, and switching a script off with a checkbox that triggers can change | Later | A way out when a trigger needs branches or loops; links that switched the trigger switch the script (owner: 2026-11-20) |
| Weld, Rod, Slider and Wheel joints | Later | Merging shapes into one body already glues them, and Rod is Rope that can't go slack |
| The EffectsComponent: pixelate, shadow, blur | Later | Each effect needs a shader pass per entity |
| Accounts and publishing | Later | Planned as the version after polish (owner: 2026-11-13) |
| A main menu, component presets, level ids, level thumbnails | Later | Not needed while there is one level at a time (owner: 2026-11-13) |
| Replays, checkpoints, sprite sheets, animations, parallax | Later | Left out of both reviews. Not designed yet |

Trigger templates were folded into component presets. Version history was rejected outright, see [rejected.md](rejected.md).

## Counts

These counts are from before 2026-11-20, in the old versions. 117 features went through the scope review: 51 in v1, 65 in the old v2, 1 Later. After the owner made v1 smaller: **31 in v1, 20 in the old v2, 65 in the old v3, 1 Later**, and DR4 came forward to v1 on 2026-11-17, so **32 in v1 and 64 in the old v3**. Since 2026-11-20 the old v2 is spread over v2 to v7, and the old v3 is Later.

**The small features** at the end of each topic file never went through the scope review. The owner gave all 119 their version in round 7 of the architecture review (owner, 2026-11-14): **14 in v1, 12 in the old v2, 80 in the old v3, 13 Later.** They are listed only in their topic files.

## Editor

Rules: [requirements/editor](requirements/editor/README.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| ED1 | Pan and zoom the level view, from 1% to 1000%. F zooms to the selection. Space and drag pans, the mouse wheel zooms. | v1 | You can't build a level you can't move around in. |
| ED2 | Undo and redo, 512 steps (owner: 2026-11-13). Ctrl+Z and Ctrl+Shift+Z. The history is lost on reload. | v1 | Mistakes happen all the time while building. Testing the editor without undo is painful. |
| ED3 | Copy, paste and duplicate entities. Ctrl+C, Ctrl+V, Ctrl+D. Duplicate puts the copy on top of the original. | v1 | Building a level is mostly copying platforms. |
| ED4 | A grid you can show, set the size of, and snap to. Example: with the 50 px grid on, a dragged platform jumps to the nearest grid point. | v1 | It's the simplest way to make platforms meet. |
| ED5 | Snapping to other entities, with pink guides showing what is aligned. Example: you drag a platform, and a pink guide appears when its top edge is level with the next platform's. | Later | The grid already aligns things. Guides are a comfort, not a need. |
| ED6 | Resize and collapse the panels. Drag a panel's edge to make it wider, or click its title to fold it away. | Later | Panels in fixed places at one size are enough to test with. |
| ED7 | Right-click a field to copy and paste its value, and copy a whole component onto other selected entities. Example: copy a crate's SurfaceComponent and paste it onto ten other crates at once. | Later | Saves time in big levels, but values can be typed by hand. |
| ED8 | Warnings: a yellow note on the card it's about, with a fix button when there is one (no count since the redesign, owner: 2026-11-18). Example: a SurfaceComponent with no ShapeComponent shows 'Needs a Shape to collide.'; a trigger with an unset part shows 'Doesn't run until every yellow part is set.'. | v1 | Without it, a coin that does nothing gives no clue why. v1 needs only the warnings for missing partner components and failed saves. |
| ED9 | Tips: a blue note saying something works but there's an easier way. Example: an entity with more than 12 triggers gets a tip suggesting a script. | Later | Tips help people learn, but nothing breaks without them. |
| ED10 | Warnings for setups likely to behave badly in physics and joints. Examples: a joint end that is off its entity, or a small, fast Dynamic body without Bullet that may pass through walls. | Later | Each warning is its own small rule to find and write. Add them as testing shows which problems people hit. |

## Selecting and the Entities viewer

Rules: [requirements/editor](requirements/editor/README.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| SE1 | Click to select, drag a selection box, Shift+click to add, Ctrl+A to select all. The selection box selects every entity it touches. | v1 | Basic editing. |
| SE2 | Move, resize and rotate with handles, and nudge with the arrow keys. Arrows move 1 px, Shift+arrow 10 px, Ctrl+Shift+arrow one grid step. Z and X rotate 1°, Shift+Z and Shift+X 10°. W, A, S and D resize a shape's values 1 px, Shift one grid step (owner, 2026-11-17; the grid step, 2026-11-19). | v1 | Basic editing. |
| SE3 | Resize and rotate several selected entities together, around the centre of the selection box. Example: select five platforms and turn them as one block. | Later | Moving several at once is enough to build. To turn them together you can group them first, since a group resizes and rotates. |
| SE4 | Group and ungroup with Ctrl+G and Ctrl+Shift+G. Double-click to go into a group, Esc to go back up. Example: a car is a group of a body and two wheels. | v1 | Groups are how a car or a player becomes one body. |
| SE5 | A bar above the level view showing which group you're inside, such as World › Car › Wheel. Click a name to jump there. Inkscape has the same bar. | Later | Esc already goes back up one group at a time. |
| SE6 | Alt+click the same spot again to select the next entity underneath. Example: reach a small coin covered by a big background shape. | Later | The Entities viewer already reaches any entity. |
| SE7 | Hover outlines what a click would select. Hovering an Entities viewer row highlights its entity in the level view, and the other way round. | Later | Helps in crowded levels. Small test levels don't need it. |
| SE8 | The Entities viewer: the tree of entities. Drag rows to reorder them or move them into a group, F2 to rename. The top row is drawn in front. | v1 | It's the only way to see and change the tree. |
| SE9 | Search the Entities viewer by name, with filters. | Later | Small test levels have few rows. |
| SE10 | Hide an entity with its eye icon. A hidden entity isn't drawn but still collides and runs its scripts. | v1 | You need it to work on things behind other things, and it's saved in the level. |
| SE11 | Lock an entity with its lock icon, so you can't grab it in the level view. Example: lock a big background so dragging over it draws a selection box instead of moving it. | Later | Mostly for big backgrounds, which come with images. |
| SE12 | Invert the selection. | Later | Rarely needed. |
| SE13 | The Used by list at the bottom of the Entity inspector. Example: selecting a wheel lists 'Hinge 1 (JointComponent, A)'. | Later | Helps in big levels. In a small one you can see the joint. |

## Drawing and text

Rules: [requirements/drawing](requirements/drawing.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| DR1 | The Shape tool: rectangle, circle, polygon and line, the kind picked in the tool's options strip (a line is a polygon finished open with Enter) and changeable afterwards in the Entity inspector (owner, 2026-11-15). Shift keeps proportions, Alt draws from the centre. | v1 | Shapes are what levels are made of. |
| DR2 | Point editing: double-click a polygon, line or path with Select to move its points. Double-click an edge to add a point. | v1 | Without it, one wrong point means drawing the shape again. |
| DR3 | Polygons may cross themselves. Every enclosed area is filled and collides. Example: a figure-of-eight polygon is filled in both loops. | v1 | People draw them by accident, and a polygon library handles them. Supporting them from the start is less work than deciding what else should happen. |
| DR4 | W, A, S and D set the size of the Shape tool's preview before you click. D wider, A narrower, W taller, S shorter, 1 px per press, Shift one grid step (owner, 2026-11-17; the grid step, 2026-11-19). | v1 | Was Later: dragging already sets the size. Brought forward before v2, with the same keys resizing a selection (owner, 2026-11-17). |
| DR5 | Convert a path to a polygon: right-click, then a dialog with a points slider and a live preview. This is how a drawn curve becomes something that collides. | Later | Paths are drawn in v1, and collision has shapes. Turning one into the other is an extra step. |
| DR6 | The colour picker's extras: level colours, recent colours and the eyedropper. The plain picker (palette and a colour field) is in v1 either way. | Later | The plain picker is enough to test. |
| DR7 | Two colour swatches on the toolbar, so new shapes use the last colours you picked. | Later | New shapes can start with one default colour. |
| DR8 | The Text tool: type on the level, with font, size, weight, alignment, and Fit to text or Fixed width. | v6 | Its reason for v1 was a score on the screen, which needs variables. Text also brings fonts and sharp text. Was v1 in the scope review: A score on the screen needs text. |
| DR9 | Line height and letter spacing for text. | Later | The defaults read fine for a score or a title. |
| DR10 | Lora, JetBrains Mono and Roboto Mono, beside Inter. | Later | One font is enough to test, and every font adds download size. |
| DR11 | Images: drop a PNG, JPEG, WebP or GIF to make a rectangle with that image as its fill, set to stretch or tile, smooth or sharp. Images also bring the builtin Kenney art, licences, and a background image on the World. | Later | Coloured shapes are enough to build and test a level. Leaving images out also leaves out importing, licences and the builtin art. The builtin player would be coloured shapes in v1. |
| DR12 | The Flip button, which sets the scale to −1. | Later | Typing −1 in the TransformComponent's scale does the same. |

## Assets

Rules: [requirements/assets](requirements/assets/README.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| AS1 | The Assets panel, with folders and the builtin folder, holding your .lua and .entity files. | v5 | It holds .lua files, which come in v5 (owner: 2026-11-20). Was v1 in the scope review: Scripts and .entity files live there. |
| AS2 | Moving or renaming a file in the Assets panel updates every file path that points to it. Example: moving coin.entity into a pickups folder keeps every spawn of it working. | v5 | Comes with the Assets panel. Was v1 in the scope review: Otherwise moving a file silently breaks everything that uses it. |
| AS3 | Search and sort in the Assets panel. | Later | A test level has few files. |
| AS4 | Sound: import WAV, MP3 or OGG, then triggers and scripts start and stop sounds, with volume, loop, and start and end times. | Later | A silent level can still be tested. Sound brings importing, playing up to 32 at once, and the player's Volume slider with it. |
| AS5 | Use as level music: right-click a sound to add a World trigger that plays it on a loop. | Later | Comes with sound. |
| AS6 | Trim a sound in the Assets panel, saving a new, shorter file. | Later | Any sound editor already does it. |
| AS7 | Replacing a file keeps everything that used it. Deleting a file in use warns with a count. Example: '14 entities use coin.lua. Delete it?' | Later | Useful in big levels. A small one has few files to lose. |
| AS8 | Packages: export an .entity file or a folder as a .zip with every file it points to, and import one. | Later | With no images or sounds in v1, an .entity file has little to carry along. |
| AS9 | The My files folder, shared by every level in this browser. | Later | v1 holds one level, so there is nothing to share it with yet. |

## Physics

Rules: [requirements/physics](requirements/physics/README.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| PH1 | Add a BodyComponent in one click: Static, Dynamic or Kinematic. | v1 | Physics is the heart of the game. |
| PH2 | Body settings: Gravity scale, Linear damping, Angular damping, Fixed rotation, Bullet, and the read-only Mass. | v1 | They're Box2D's own settings, so they cost little, and the builtin player needs Fixed rotation and Gravity scale. |
| PH3 | SurfaceComponent: Density, Friction, Restitution. A shape with no Surface lets things pass through. | v1 | Without it nothing collides. Its Sensor setting was removed on 2026-11-23 (owner): a coin is a shape with no Surface and a touch trigger. |
| PH4 | Shapes inside a group with a body merge into that one body. Example: a car body made of three shapes moves as one piece. | v1 | It's how anything made of several parts is built. |
| PH5 | One-way platforms you can jump up through, set on the SurfaceComponent. | Later | A platformer can be tested with solid platforms. |
| PH6 | The collision grid: pick which tags hit which. Example: enemies pass through each other but still hit the player. | Later | In v1 every solid surface hits every other, and shapes with no Surface cover coins and finish zones. |
| PH7 | The Collision check: right-click two entities, 'Why do these collide?'. | Later | Comes with the collision grid. |
| PH8 | The physics view: draws every physics shape on top of the level. | v1 | A shape with no StyleComponent is invisible, and this is the only way to see it. |
| PH9 | Gravity as one vector, and the background colour, on the World. | v1 | Basic level settings. |
| PH10 | Buttons for gravity: Earth, Moon, Arcade, None. | Later | Typing a number works. |
| PH11 | Game speed on the World, so triggers and scripts can slow the whole level down. Example: slow motion for 2 seconds after the player hits a bomb. | Later | An effect, not something a test needs. |
| PH12 | Level bounds: the edges all walls or all open, and entities past an open edge are removed. | v1 | Without them a fallen crate falls forever, and the camera has no edge to stop at. |

## Joints

Rules: [requirements/physics](requirements/physics/README.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| JO1 | Each joint's own settings, typed on the JointComponent: limits, motor, springiness, and Let connected objects collide. | v1 | A joint without its settings is just a pin. |
| JO2 | Drag a hinge's limits on the level: an arc, with a ghost of the part at each limit. | Later | Typing the angles works. |
| JO3 | Joints that break under too much force. Breaking destroys the joint entity. | Later | For destructible things, which a first test doesn't need. |
| JO4 | After placing a joint, drag an end to attach it elsewhere, or change its type. | Later | Deleting it and placing it again works. |
| JO5 | Rope and Spring show in play when you add a StyleComponent: drawn straight between their ends, or as a zigzag for Spring. The game keeps the joint's read-only PathComponent on its ends. | v1 | A rope nobody can see makes a strange toy. |

## Camera and the screen

Rules: [requirements/camera](requirements/camera.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| CM1 | One camera that follows an entity, with smoothing, and stops at the level bounds. | v1 | Any level bigger than the screen needs it. |
| CM2 | Offset, dead zone and look-ahead for the camera's follow. | Later | Polish on top of following. |
| CM3 | Fixed size: the camera shows exactly its own box, with black bars if the window has different proportions. New levels in v1 would start in Fixed size instead of Fill window. | v1 | Positions inside the camera are then always the same, so a score stays in its corner without any layout. |
| CM4 | Fill window: the same height, and wider windows see more of the level sideways. | Later | On a wider window, a score placed in the corner would no longer be in the corner. That needs the FlexComponent (CM5), so the two go together. |
| CM5 | The FlexComponent: arrange children in a row or column, and place them against the screen's edges with the 3×3 picker. | Later | With Fixed size only, you can place things inside the camera by hand. |
| CM6 | Entities inside the camera stay fixed on the screen. | v6 | Its reason is a score or a timer, which need variables. Was v1 in the scope review: A score or a timer on the screen. |
| CM7 | HUD mode: editing what's inside the camera dims the level. | Later | A comfort for editing the screen layout. |
| CM8 | Camera zoom during play, from 0.1 to 10. Set with Change value, like any other value. | Later | An effect, not something a test needs. |
| CM9 | The Camera shake action. | Later | An effect. |

## .entity files and builtin content

Rules: [requirements/assets](requirements/assets/README.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| EF1 | Save a selection as an .entity file. Drag one into the level to place a copy. | v7 | It was v1 for spawning, which only triggers and scripts do. Copy and paste cover reuse inside one level. Was v1 in the scope review: Spawning needs .entity files. |
| EF2 | Linked copies: editing the .entity file in its own tab updates every copy, and Make unique cuts the link. In v1, a placed copy would be a plain copy you can change freely. | Later | Linking needs a second editing tab and read-only fields. Plain copies are enough to test spawning. |
| EF3 | Placing several copies: select an .entity file, then click in the level once per copy. Previews in the Assets panel. | Later | Dragging one at a time works. |
| EF4 | The builtin platformer player: an .entity file using the builtin platformer script (run, jump, double jump, ledge grace time, slopes). Ledge grace time: you can still jump for a moment after running off an edge. | v7 | It is a script that reads inputs, and both come in v2. Was v1 in the scope review: It proves a creator can build a player with only what they have, and it's the fastest way to test a level. |
| EF5 | The rest of the builtin .entity files: platforms, enemies, hazards, pickups, gadgets, projectiles, physics toys, the ragdoll. | Later | Each one is content to make and test. v1 needs the player, not a library. |
| EF6 | The rest of the builtin scripts: enemies, health, pickups, camera, showing a variable, Move Along Path. | Later | Same reason: v1 needs the player's script. |

## Triggers and variables

Rules: [requirements/triggers](requirements/triggers/README.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| TR1 | The TriggerComponent: When, If, Do, shown as a sentence with clickable parts. | v3 | Logic comes after v1. Was v1 in the scope review: No-code logic is a core idea of the game. |
| TR2 | Events: something starts or stops touching this, a key or input, after or every N seconds, level start, a variable changes, a custom event (six since 2026-11-23, owner). | v3 and v4 | Logic comes after v1. Was v1 in the scope review: Enough for coins, doors, buttons, timers and hazards. |
| TR3 | The event 'no entity with this tag is left'. Removed on 2026-11-23 (owner): a variable counting coins does it, see [rejected.md](rejected.md). | Rejected | Logic comes after v1. Was v1 in the scope review: 'Collect everything to win' is the simplest level goal. |
| TR4 | Mouse events: this is clicked, the mouse is over this. | Later | Keys are enough for a platformer test. Mouse events also need the rules for which entity gets the click. |
| TR5 | The events 'while touching' and 'left the level'. | Later | Touched and no longer touched cover the same cases with a little more work. |
| TR6 | If: one check, a value compared: other has a tag, a variable compared, a component value compared with a number (one check since 2026-11-23, owner). | v3 and v4 | Logic comes after v1. Was v1 in the scope review: A coin that only the player can pick up needs the tag check. |
| TR7 | Actions: Change value (Body › Velocity included, which replaced Push on 2026-11-23, owner), Spawn, Destroy, Fire custom event, Wait, Win, Lose, Restart. | v3, v4 and v7 | Logic comes after v1. Was v1 in the scope review: The full set except sound and camera shake. |
| TR8 | The Repeat setting: every time, once per run, or at most once every N seconds. Example: a spike that hurts at most once a second. | v3 | Logic comes after v1. Was v1 in the scope review: Small, and without it a trigger can fire every tick. |
| TR9 | Arrows from the selected entity to what its triggers affect. | Later | Helps reading big levels. |
| VA1 | Variables on the World, and from 2026-11-16 on any entity: a name and a starting value, which triggers and scripts read and change. Example: coins = 0. | v3 to v5 | Logic comes after v1. Was v1 in the scope review: A score needs one. |
| VA2 | Keep between runs: a variable remembers its value for the next run, with a Reset button. | Later | For best times and unlocks, which matter once other people try your levels. |

## Keys and mouse

Rules: [requirements/triggers](requirements/triggers/README.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| IN1 | Inputs on the World's InputComponent, such as jump on Space and W. Raw keys work in v1 either way. | v3 | Only triggers and scripts read keys. Was v1 in the scope review: The builtin player uses inputs, and remapping later needs them. |
| IN2 | Gamepads, through each input's gamepad buttons. | Later | Keyboard is the target for testing. |
| IN3 | Players remap inputs in the pause menu's Controls page. | Later | Until other people try your levels, you know your own keys. |
| IN4 | Scripts read the mouse: position, left, right and middle buttons, and converting between level and screen positions. | Later | Goes with the mouse events (TR4). |

## Scripts and the Console

Rules: [requirements/scripts](requirements/scripts/README.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| LU1 | The ScriptComponent: a list of .lua files. From 2026-11-16 each file lists the variables it needs on its entity, instead of showing its own fields. | v5 | Logic comes after v1. Was v1 in the scope review: Scripts are a core idea, and the builtin player is one. |
| LU2 | The Monaco code editor, with colours and find and replace. | v5 | Only scripts need a code editor. Was v1 in the scope review: Writing scripts needs an editor, and Monaco gives this for free. |
| LU3 | Suggestions and hover help for the game's own functions in the code editor. | Later | Needs a written description of every function in the Lua API, which is easier once it settles. |
| LU4 | Script help and short tutorial levels, built in and offline. | Later | Comes after the Lua API settles. |
| LU5 | wait(2) pauses a script for 2 seconds. | v5 | Logic comes after v1. Was v1 in the scope review: Small, and scripts without it get clumsy fast. |
| LU6 | A Console message repeated many times shows once with a count, such as 'Coin not found ×12'. | v5 | Only scripts write to the Console. Was v1 in the scope review: A print() that runs every tick would otherwise bury everything else. |
| LU7 | Filter the Console by kind and by entity. | Later | A short test run prints little. |
| LU8 | Trigger messages in the Console: every trigger that fires, and every If check that fails. Example: 'Coin 3: When touched, 12.4 s'. | Later | Pause, Step and live values already show what happened. |
| LU9 | Hints for common mistakes in script errors. Example: 'attempt to call a nil value' also says 'Did you mean get_entity_by_name?'. | Later | Each hint is collected from real mistakes, so they come after people use it. |

## Test play

Rules: [requirements/play-and-save](requirements/play-and-save/README.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| PL1 | Play and Stop: Play runs a copy of the level, the panels hide, and the Play bar shows Stop. Ctrl+Enter starts and stops. | v1 | The core of the game. |
| PL2 | Win and Lose: the end window with the time, Restart and Leave. | v3 | Only triggers and scripts end a run. Was v1 in the scope review: Ending is what makes a level a level. |
| PL3 | The pause menu on Tab, with Resume and Restart (R). | Later | In v1 a run never ends by itself, and in test play Stop then Play already starts again. Was v1 in the scope review: Restarting goes through it. |
| PL4 | The pause menu's Controls and Settings pages: remapping, Volume and Mute. | Later | Comes with remapping and sound. |
| PL5 | Switching browser tabs pauses the game, and keys never stay stuck down. | v1 | Otherwise a key held while switching tabs keeps the player running. |
| PL6 | The speed menu on the Play bar: ¼×, ½×, 1×, 2×. | Later | Pause and Step already cover watching closely. |
| PL7 | Pin the random seed in the Play bar menu. | Later | Only matters once levels use random values and you chase a bug in one run. |
| PL8 | View menu switches during play: highlight triggers as they fire, and performance numbers. The physics view is PH8. | Later | Debug comfort. |
| PL9 | A full screen button. | Later | Not needed to test. |
| PL10 | Players can slow the game to 50–100%. | Later | An accessibility setting for when other people try your levels. |
| PL11 | The determinism test: the same level, seed, inputs and clock time give the same run on any computer. | v1 | It's far cheaper to keep determinism from the first day than to find what broke it later. |

## Saving and files

Rules: [requirements/play-and-save](requirements/play-and-save/README.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| SA1 | A new tab on the same level edits it; the older tab saves, then says so and turns read-only (owner: 2026-11-22). | v1 | With one saved level, two tabs would silently overwrite each other's work. |
| SA2 | Ask the browser to keep the saved level. | v1 | One call. Without it, Safari may delete the level after 7 days without a visit. |
| SA3 | A warning when saving in the browser fails. | v1 | Otherwise you'd find out you lost work only after a reload. |
| SA4 | The play file (.playable), and a way to open one and run the level without the editor. | Later | Before publishing, nobody else plays your levels. The project file already keeps and moves them. |
| SA5 | Every level file records its file format version. Upgrading old files is written when the format first changes. | v1 | One field now. Without it, files saved by v1 can't be upgraded safely later. |
| — | Every level file also records its physics version. What to do with it is Later. Decided after the scope review (owner: 2026-11-13). | v1 | One field. Without it, the first physics engine update changes how old levels play. |
| SA6 | The warning after 10,000 entities. The 100,000 limit holds in v1 either way. | Later | Test levels stay far below it. |
