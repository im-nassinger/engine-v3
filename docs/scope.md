# Scope

## TL;DR

Every feature in one line, with the version it ships in and why. **v1 is the smallest thing that can be tested:** build one level out of coloured shapes, physics, three joints, triggers, variables and scripts, play it, and export it. **v2 is polish and content:** images, sound, the other joints, the collision grid, Flex, linked copies, the builtin library, remapping, the play file. **Later** is everything after that, mainly accounts and publishing. The exact rules for each feature are in [requirements/](requirements/README.md). Each topic file marks every feature with the same version as here.

## What the versions mean

| Version | Meaning |
|---|---|
| **v1** | Building and local play. The smallest thing that can be tested. |
| **v2** | Polish: what makes building comfortable, plus images, sound and the builtin library. |
| **Later** | After v2. Accounts and publishing are planned as v3. The rest has no version yet, only "not v1" or "not now". |

The versions were set in the scope review on 2026-11-13. The owner accepted every pick as proposed.

## Settled before the scope review

These versions were decided during the requirements review, so the scope review did not ask about them.

| Feature | Version | Why |
|---|---|---|
| One level at a time, saved in the browser. New and Import replace it after asking. Export and Ctrl+S make a `.editable` file | v1 | A list of levels isn't v1. Without the browser copy, closing the tab would lose work |
| Three joints: Hinge, Rope and Spring, with the Joint tool | v1 | Each does something the others can't |
| Weld, Rod, Slider and Wheel joints | v2 | Merging shapes into one body already glues them, and Rod is Rope that can't go slack |
| The Bézier pen and the Pencil tool | v1 | Decided in the review, before versions were split |
| Gradients | v1 | The owner changed this from "not in the first version" |
| The searchable list of shortcuts | v1 | Decided in the review |
| Debugging: the Panels button with live values, `print()` in the Console, Pause and Step | v1 | The agreed debugging set. Nothing else was discussed |
| The EffectsComponent: pixelate, shadow, blur | v2 | Each effect needs a shader pass per entity |
| A main menu, component presets, level ids, level thumbnails | Later | Not v1. No version picked yet |
| Publishing, accounts, replays, checkpoints, sprite sheets, animations, parallax | Later | Left out of both reviews. Not designed yet |

Trigger templates were folded into component presets. Version history was rejected outright, see [rejected.md](rejected.md).

## Counts

117 features went through the scope review: 51 in v1, 65 in v2, 1 Later.

## Editor

Rules: [requirements/editor](requirements/editor.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| ED1 | Pan and zoom the level view, from 1% to 1000%. F zooms to the selection. Space and drag pans, the mouse wheel zooms. | v1 | You can't build a level you can't move around in. |
| ED2 | Undo and redo, 500 steps. Ctrl+Z and Ctrl+Shift+Z. The history is lost on reload. | v1 | Mistakes happen all the time while building. Testing the editor without undo is painful. |
| ED3 | Copy, paste and duplicate entities. Ctrl+C, Ctrl+V, Ctrl+D. Duplicate puts the copy on top of the original. | v1 | Building a level is mostly copying platforms. |
| ED4 | A grid you can show, set the size of, and snap to. Example: with the 50 px grid on, a dragged platform jumps to the nearest grid point. | v1 | It's the simplest way to make platforms meet. |
| ED5 | Snapping to other entities, with pink guides showing what is aligned. Example: you drag a platform, and a pink guide appears when its top edge is level with the next platform's. | v2 | The grid already aligns things. Guides are a comfort, not a need. |
| ED6 | Resize and collapse the panels. Drag a panel's edge to make it wider, or click its title to fold it away. | v2 | Panels in fixed places at one size are enough to test with. |
| ED7 | Right-click a field to copy and paste its value, and copy a whole component onto other selected entities. Example: copy a crate's SurfaceComponent and paste it onto ten other crates at once. | v2 | Saves time in big levels, but values can be typed by hand. |
| ED8 | Warnings: a yellow note on the card it's about, with a fix button when there is one, and a count in the status bar. Example: a trigger that reacts to touching on an entity with no SurfaceComponent shows 'Needs a SurfaceComponent to notice touching. [Add SurfaceComponent as sensor]'. | v1 | Without it, a coin that does nothing gives no clue why. v1 needs only the warnings for missing partner components and failed saves. |
| ED9 | Tips: a blue note saying something works but there's an easier way. Example: an entity with more than 12 triggers gets a tip suggesting a script. | v2 | Tips help people learn, but nothing breaks without them. |
| ED10 | Warnings for setups likely to behave badly in physics and joints. Examples: a joint end that is off its entity, or a small, fast Dynamic body without Bullet that may pass through walls. | v2 | Each warning is its own small rule to find and write. Add them as testing shows which problems people hit. |

## Selecting and the Layers panel

Rules: [requirements/editor](requirements/editor.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| SE1 | Click to select, drag a selection box, Shift+click to add, Ctrl+A to select all. The selection box selects every entity it touches. | v1 | Basic editing. |
| SE2 | Move, resize and rotate with handles, and nudge with the arrow keys. Arrows move 1 px, Shift+arrow 10 px, Ctrl+Shift+arrow one grid step. | v1 | Basic editing. |
| SE3 | Resize and rotate several selected entities together, around the centre of the selection box. Example: select five platforms and turn them as one block. | v2 | Moving several at once is enough to build. To turn them together you can group them first, since a group resizes and rotates. |
| SE4 | Group and ungroup with Ctrl+G and Ctrl+Shift+G. Double-click to go into a group, Esc to go back up. Example: a car is a group of a body and two wheels. | v1 | Groups are how a car or a player becomes one body. |
| SE5 | A bar above the level view showing which group you're inside, such as World › Car › Wheel. Click a name to jump there. Inkscape has the same bar. | v2 | Esc already goes back up one group at a time. |
| SE6 | Alt+click the same spot again to select the next entity underneath. Example: reach a small coin covered by a big background shape. | v2 | The Layers panel already reaches any entity. |
| SE7 | Hover outlines what a click would select. Hovering a Layers row highlights its entity in the level view, and the other way round. | v2 | Helps in crowded levels. Small test levels don't need it. |
| SE8 | The Layers panel: the tree of entities. Drag rows to reorder them or move them into a group, F2 to rename. The top row is drawn in front. | v1 | It's the only way to see and change the tree. |
| SE9 | Search the Layers panel by name, with filters. | v2 | Small test levels have few rows. |
| SE10 | Hide an entity with its eye icon. A hidden entity isn't drawn but still collides and runs its scripts. | v1 | You need it to work on things behind other things, and it's saved in the level. |
| SE11 | Lock an entity with its lock icon, so you can't grab it in the level view. Example: lock a big background so dragging over it draws a selection box instead of moving it. | v2 | Mostly for big backgrounds, which come with images. |
| SE12 | Invert the selection. | v2 | Rarely needed. |
| SE13 | The Used by list at the bottom of the Inspector. Example: selecting a wheel lists 'Hinge 1 (JointComponent, A)'. | v2 | Helps in big levels. In a small one you can see the joint. |

## Drawing and text

Rules: [requirements/drawing](requirements/drawing.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| DR1 | The Shape tool: rectangle, ellipse, polygon and line. Shift keeps proportions, Alt draws from the centre. | v1 | Shapes are what levels are made of. |
| DR2 | Point editing: double-click a polygon, line or path with Select to move its points. Double-click an edge to add a point. | v1 | Without it, one wrong point means drawing the shape again. |
| DR3 | Polygons may cross themselves. Every enclosed area is filled and collides. Example: a figure-of-eight polygon is filled in both loops. | v1 | People draw them by accident, and a polygon library handles them. Supporting them from the start is less work than deciding what else should happen. |
| DR4 | W, A, S and D set the size of the Shape tool's preview before you click. D wider, A narrower, W taller, S shorter, 1 px per press. | v2 | Dragging already sets the size. |
| DR5 | Convert a path to a polygon: right-click, then a dialog with a points slider and a live preview. This is how a drawn curve becomes something that collides. | v2 | Paths are drawn in v1, and collision has shapes. Turning one into the other is an extra step. |
| DR6 | The colour picker's extras: level colours, recent colours and the eyedropper. The plain picker (palette and a colour field) is in v1 either way. | v2 | The plain picker is enough to test. |
| DR7 | Two colour swatches on the toolbar, so new shapes use the last colours you picked. | v2 | New shapes can start with one default colour. |
| DR8 | The Text tool: type on the level, with font, size, weight, alignment, and Fit to text or Fixed width. | v1 | A score on the screen needs text. |
| DR9 | Line height and letter spacing for text. | v2 | The defaults read fine for a score or a title. |
| DR10 | Lora, JetBrains Mono and Roboto Mono, beside Inter. | v2 | One font is enough to test, and every font adds download size. |
| DR11 | Images: drop a PNG, JPEG, WebP or GIF to make a rectangle with that image as its fill, set to stretch or tile, smooth or sharp. Images also bring the builtin Kenney art, licences, and a background image on the World. | v2 | Coloured shapes are enough to build and test a level. Leaving images out also leaves out importing, licences and the builtin art. The builtin player would be coloured shapes in v1. |
| DR12 | The Flip button, which sets the scale to −1. | v2 | Typing −1 in the Transform's scale does the same. |

## Assets

Rules: [requirements/assets](requirements/assets.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| AS1 | The Assets panel, with folders and the builtin folder, holding your .lua and .entity files. | v1 | Scripts and .entity files live there. |
| AS2 | Moving or renaming a file in the Assets panel updates every file path that points to it. Example: moving coin.entity into a pickups folder keeps every spawn of it working. | v1 | Otherwise moving a file silently breaks everything that uses it. |
| AS3 | Search and sort in the Assets panel. | v2 | A test level has few files. |
| AS4 | Sound: import WAV, MP3 or OGG, then triggers and scripts start and stop sounds, with volume, loop, and start and end times. | v2 | A silent level can still be tested. Sound brings importing, playing up to 32 at once, and the player's Volume slider with it. |
| AS5 | Use as level music: right-click a sound to add a World trigger that plays it on a loop. | v2 | Comes with sound. |
| AS6 | Trim a sound in the Assets panel, saving a new, shorter file. | Later | Any sound editor already does it. |
| AS7 | Replacing a file keeps everything that used it. Deleting a file in use warns with a count. Example: '14 entities use coin.lua. Delete it?' | v2 | Useful in big levels. A small one has few files to lose. |
| AS8 | Packages: export an .entity file or a folder as a .zip with every file it points to, and import one. | v2 | With no images or sounds in v1, an .entity file has little to carry along. |
| AS9 | The My files folder, shared by every level in this browser. | v2 | v1 holds one level, so there is nothing to share it with yet. |

## Physics

Rules: [requirements/physics](requirements/physics.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| PH1 | Add a BodyComponent in one click: Static, Dynamic or Kinematic. | v1 | Physics is the heart of the game. |
| PH2 | Body settings: Gravity scale, Linear damping, Angular damping, Fixed rotation, Bullet, and the read-only Mass. | v1 | They're Box2D's own settings, so they cost little, and the builtin player needs Fixed rotation and Gravity scale. |
| PH3 | SurfaceComponent: Density, Friction, Restitution and Sensor. | v1 | Without it nothing collides, and coins need Sensor. |
| PH4 | Shapes inside a group with a body merge into that one body. Example: a car body made of three shapes moves as one piece. | v1 | It's how anything made of several parts is built. |
| PH5 | One-way platforms you can jump up through, set on the SurfaceComponent. | v2 | A platformer can be tested with solid platforms. |
| PH6 | The collision grid: pick which tags hit which. Example: enemies pass through each other but still hit the player. | v2 | In v1 every solid surface hits every other, and sensors cover coins and finish zones. |
| PH7 | The Collision check: right-click two entities, 'Why do these collide?'. | v2 | Comes with the collision grid. |
| PH8 | The physics view: draws every physics shape on top of the level. | v1 | A sensor with no StyleComponent is invisible, and this is the only way to see it. Box2D draws it for us. |
| PH9 | Gravity strength and direction, and the background colour, on the World. | v1 | Basic level settings. |
| PH10 | Buttons for gravity: Earth, Moon, Arcade, None. | v2 | Typing a number works. |
| PH11 | Game speed on the World, so triggers and scripts can slow the whole level down. Example: slow motion for 2 seconds after the player hits a bomb. | v2 | An effect, not something a test needs. |
| PH12 | Level bounds: each edge a wall or open, and entities past an open edge are removed. | v1 | Without them a fallen crate falls forever, and the camera has no edge to stop at. |

## Joints

Rules: [requirements/physics](requirements/physics.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| JO1 | Each joint's own settings, typed on the JointComponent: limits, motor, springiness, and Let connected objects collide. | v1 | A joint without its settings is just a pin. |
| JO2 | Drag a hinge's limits on the level: an arc, with a ghost of the part at each limit. | v2 | Typing the angles works. |
| JO3 | Joints that break under too much force. Breaking destroys the joint entity. | v2 | For destructible things, which a first test doesn't need. |
| JO4 | After placing a joint, drag an end to attach it elsewhere, or change its type. | v2 | Deleting it and placing it again works. |
| JO5 | Rope and Spring show in play when you add a StyleComponent: drawn straight between their ends, or as a zigzag for Spring. The game keeps the joint's read-only PathComponent on its ends. | v1 | A rope nobody can see makes a strange toy. |

## Camera and the screen

Rules: [requirements/camera](requirements/camera.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| CM1 | One camera that follows an entity, with smoothing, and stops at the level bounds. | v1 | Any level bigger than the screen needs it. |
| CM2 | Offset, dead zone and look-ahead for the camera's follow. | v2 | Polish on top of following. |
| CM3 | Fixed size: the camera shows exactly its own box, with black bars if the window has different proportions. New levels in v1 would start in Fixed size instead of Fill window. | v1 | Positions inside the camera are then always the same, so a score stays in its corner without any layout. |
| CM4 | Fill window: the same height, and wider windows see more of the level sideways. | v2 | On a wider window, a score placed in the corner would no longer be in the corner. That needs the FlexComponent (CM5), so the two go together. |
| CM5 | The FlexComponent: arrange children in a row or column, and place them against the screen's edges with the 3×3 picker. | v2 | With Fixed size only, you can place things inside the camera by hand. |
| CM6 | Entities inside the camera stay fixed on the screen. | v1 | A score or a timer on the screen. |
| CM7 | HUD mode: editing what's inside the camera dims the level. | v2 | A comfort for editing the screen layout. |
| CM8 | Camera zoom during play, from 0.1 to 10. Set with Change value, like any other value. | v2 | An effect, not something a test needs. |
| CM9 | The Camera shake action. | v2 | An effect. |

## .entity files and builtin content

Rules: [requirements/assets](requirements/assets.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| EF1 | Save a selection as an .entity file. Drag one into the level to place a copy. | v1 | Spawning needs .entity files. |
| EF2 | Linked copies: editing the .entity file in its own tab updates every copy, and Make unique cuts the link. In v1, a placed copy would be a plain copy you can change freely. | v2 | Linking needs a second editing tab and read-only fields. Plain copies are enough to test spawning. |
| EF3 | Placing several copies: select an .entity file, then click in the level once per copy. Previews in the Assets panel. | v2 | Dragging one at a time works. |
| EF4 | The builtin platformer player: an .entity file using the builtin platformer script (run, jump, double jump, ledge grace time, slopes). Ledge grace time: you can still jump for a moment after running off an edge. | v1 | It proves a creator can build a player with only what they have, and it's the fastest way to test a level. |
| EF5 | The rest of the builtin .entity files: platforms, enemies, hazards, pickups, gadgets, projectiles, physics toys, the ragdoll. | v2 | Each one is content to make and test. v1 needs the player, not a library. |
| EF6 | The rest of the builtin scripts: enemies, health, pickups, camera, showing a variable, Move Along Path. | v2 | Same reason: v1 needs the player's script. |

## Triggers and variables

Rules: [requirements/triggers](requirements/triggers.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| TR1 | The TriggerComponent: When, If, Do, shown as a sentence with clickable parts. | v1 | No-code logic is a core idea of the game. |
| TR2 | Events: touched, no longer touched, collision, key or input, timer, level start, custom event, destroyed, a variable changes. | v1 | Enough for coins, doors, buttons, timers and hazards. |
| TR3 | The event 'no entity with this tag is left'. Example: on the World, when no coin is left, Win. Adding coins needs no other change. | v1 | 'Collect everything to win' is the simplest level goal. |
| TR4 | Mouse events: this is clicked, the mouse is over this. | v2 | Keys are enough for a platformer test. Mouse events also need the rules for which entity gets the click. |
| TR5 | The events 'while touching' and 'left the level'. | v2 | Touched and no longer touched cover the same cases with a little more work. |
| TR6 | If checks: other has a tag, a variable compared with a number, a component value compared with a number. | v1 | A coin that only the player can pick up needs the tag check. |
| TR7 | Actions: Change value, Spawn, Destroy, Push, Fire custom event, Wait, Win, Lose, Restart. | v1 | The full set except sound and camera shake. |
| TR8 | The Repeat setting: every time, once per run, or at most once every N seconds. Example: a spike that hurts at most once a second. | v1 | Small, and without it a trigger can fire every tick. |
| TR9 | Arrows from the selected entity to what its triggers affect. | v2 | Helps reading big levels. |
| VA1 | Variables on the World: a name and a starting value, which triggers and scripts read and change. Example: coins = 0. | v1 | A score needs one. |
| VA2 | Keep between runs: a variable remembers its value for the next run, with a Reset button. | v2 | For best times and unlocks, which matter once other people try your levels. |

## Keys and mouse

Rules: [requirements/triggers](requirements/triggers.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| IN1 | Inputs on the World's InputComponent, such as jump on Space and W. Raw keys work in v1 either way. | v1 | The builtin player uses inputs, and remapping later needs them. |
| IN2 | Gamepads, through each input's gamepad buttons. | v2 | Keyboard is the target for testing. |
| IN3 | Players remap inputs in the pause menu's Controls page. | v2 | Until other people try your levels, you know your own keys. |
| IN4 | Scripts read the mouse: position, left, right and middle buttons, and converting between level and screen positions. | v2 | Goes with the mouse events (TR4). |

## Scripts and the Console

Rules: [requirements/scripts](requirements/scripts.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| LU1 | The ScriptComponent: a list of .lua files, each showing the settings it declares as fields. | v1 | Scripts are a core idea, and the builtin player is one. |
| LU2 | The Monaco code editor, with colours and find and replace. | v1 | Writing scripts needs an editor, and Monaco gives this for free. |
| LU3 | Suggestions and hover help for the game's own functions in the code editor. | v2 | Needs a written description of every function in the Lua API, which is easier once it settles. |
| LU4 | Script help and short tutorial levels, built in and offline. | v2 | Comes after the Lua API settles. |
| LU5 | wait(2) pauses a script for 2 seconds. | v1 | Small, and scripts without it get clumsy fast. |
| LU6 | A Console message repeated many times shows once with a count, such as 'Coin not found ×12'. | v1 | A print() that runs every tick would otherwise bury everything else. |
| LU7 | Filter the Console by kind and by entity. | v2 | A short test run prints little. |
| LU8 | Trigger messages in the Console: every trigger that fires, and every If check that fails. Example: 'Coin 3: When touched, 12.4 s'. | v2 | Pause, Step and live values already show what happened. |
| LU9 | Hints for common mistakes in script errors. Example: 'attempt to call a nil value' also says 'Did you mean get_entity_by_name?'. | v2 | Each hint is collected from real mistakes, so they come after people use it. |

## Test play

Rules: [requirements/play-and-save](requirements/play-and-save.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| PL1 | Play and Stop: Play runs a copy of the level, the panels hide, and the Play bar shows Stop. Ctrl+Enter starts and stops. | v1 | The core of the game. |
| PL2 | Win and Lose: the end window with the time, Restart and Leave. | v1 | Ending is what makes a level a level. |
| PL3 | The pause menu on Tab, with Resume and Restart (R). | v1 | Restarting goes through it. |
| PL4 | The pause menu's Controls and Settings pages: remapping, Volume and Mute. | v2 | Comes with remapping and sound. |
| PL5 | Switching browser tabs pauses the game, and keys never stay stuck down. | v1 | Otherwise a key held while switching tabs keeps the player running. |
| PL6 | The speed menu on the Play bar: ¼×, ½×, 1×, 2×. | v2 | Pause and Step already cover watching closely. |
| PL7 | Pin the random seed in the Play bar menu. | v2 | Only matters once levels use random values and you chase a bug in one run. |
| PL8 | View menu switches during play: highlight triggers as they fire, and performance numbers. The physics view is PH8. | v2 | Debug comfort. |
| PL9 | A full screen button. | v2 | Not needed to test. |
| PL10 | Players can slow the game to 50–100%. | v2 | An accessibility setting for when other people try your levels. |
| PL11 | The determinism test: the same level, seed, inputs and clock time give the same run on any computer. | v1 | It's far cheaper to keep determinism from the first day than to find what broke it later. |

## Saving and files

Rules: [requirements/play-and-save](requirements/play-and-save.md)

| Id | Feature | Version | Why this version |
|---|---|---|---|
| SA1 | A second tab on the same level says so and stays read-only. | v1 | With one saved level, two tabs would silently overwrite each other's work. |
| SA2 | Ask the browser to keep the saved level. | v1 | One call. Without it, Safari may delete the level after 7 days without a visit. |
| SA3 | A warning when saving in the browser fails. | v1 | Otherwise you'd find out you lost work only after a reload. |
| SA4 | The play file (.playable), and a way to open one and run the level without the editor. | v2 | Before publishing, nobody else plays your levels. The project file already keeps and moves them. |
| SA5 | Every level file records its file format version. Upgrading old files is written when the format first changes. | v1 | One field now. Without it, files saved by v1 can't be upgraded safely later. |
| SA6 | The warning after 10,000 entities. The 100,000 limit holds in v1 either way. | v2 | Test levels stay far below it. |
