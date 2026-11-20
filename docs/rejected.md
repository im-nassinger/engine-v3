# Rejected and left out

## TL;DR

What we decided against, and why. **Check here before proposing something**: an idea on this page needs a new reason to come back. Two parts: ideas the owner rejected or replaced in the review, and things left out on purpose. The Source column names the review decision, written like the `Source:` lines in the requirements.

## Rejected or replaced in the review

| Idea | What we do instead | Why | Source |
|---|---|---|---|
| Mass read-only: you set density, never mass | Typing a mass sets the density that gives it; mass is still never stored | The owner wanted to set how heavy a body is directly | owner: 2026-11-19 |
| Prefabs | `.entity` files | If something is just a file, it stays a file | round 1: C14 |
| Behaviours | Builtin `.lua` scripts | Same reason | round 1: C13 |
| A built-in player | A builtin `.entity` file anyone could rebuild | There is no special player | round 1: C15 |
| Checkpoints | Nothing, in v1 or later, for now. A full save state could be added later | The owner's decision | round 3: K1, K2 |
| Soft respawn, lives, a fall limit | Nothing. Lives are up to the creator | The game decides nothing the creator should | decisions: D9; round 10: 11 2.16 |
| A script that watches a variable | The trigger event "a variable changes" | One fewer builtin script | decisions: D1; round 4: T2 |
| Automatic text such as `Coins: {coins}` | A text entity with the builtin Show Variable script | Keeps it out of the engine | decisions: D2; round 2: R2 |
| "Extract assets" on an `.entity` file | Packages: an explicit Export package command | One file type must not behave two ways | round 2: R9; round 6: E4 |
| Original hero art | Kenney art | Free to use, so no trademark check of our own | round 1: D32, D60; round 7: 08 2.12 |
| Spawning by name | Spawning by path | Two files can hold entities with the same name. No two files share a path | round 3: D67; round 7: 08 2.11 |
| Spawning at the action's target, moved by an offset | Spawn asks for TransformComponent values | Plainer, and it sets rotation and scale too | owner: 2026-11-14 |
| A notice when a second entity tagged `player` is placed | Nothing | It assumed one special player, which the review dropped | owner: 2026-11-14 |
| A Repeat choice "On the Nth time" | A variable that counts | The review kept three Repeat choices | owner: 2026-11-14 |
| A Drop through trigger action | `drop_through(id)` in a script | One line in the player's script | owner: 2026-11-14 |
| Music and Sound effects groups, base volume on the asset | One kind of audio, settings on each "Play sound" | Simpler, and assets are raw files | round 6: SND1; round 8: FX3 |
| An ImageComponent, image opacity, "Add hitbox" | A shape with an image fill | Everything known about shapes works on images for free | round 1: D31; round 5: 04 2.8; round 6: ST1 |
| `level.json`'s entities as a flat list, each naming its parent | One `world` entity, each entity holding its `children` | The file's shape is the tree, so a broken tree can't be written and the World is the one entity at the top | owner: 2026-11-15 |
| An ellipse kind with a width and a height | A circle with only a radius; an ellipse is a circle scaled unevenly | Scale isn't part of the shape, and the shape is a circle | owner: 2026-11-15 |
| The Inspector showing the shape about to be drawn, with only Kind editable | The Inspector hidden while the Shape tool is active, its kinds in an options strip | The Inspector only shows finished entities; a half-made shape in it would make its code handle things that aren't entities. The strip's old problem, two kinds shown at once, is gone because the Inspector is hidden | owner: 2026-11-15 |
| A Line choice in the Shape tool's options strip | A polygon finished open with Enter is a line | One choice draws both | owner: 2026-11-15 |
| A separate tool for editing points, and tools for each shape | Double-click with Select, one Shape tool | The owner wanted fewer tools | round 4: TK1; round 5: TK2 |
| Ctrl+click for the deepest entity | Alt+click for the next entity underneath | One key is enough | round 4: 02 2.2 |
| An "Entities here" list in the right-click menu | The Entities panel, and Alt+click in v3 | Two ways to reach a hidden entity are enough | owner: 2026-11-14 |
| "Select same type" and "Select same tag" | Select all and Invert only | Dropped by the owner | round 4: 02 2.5 |
| A selection box that needs entities fully inside | It selects anything it touches | The owner's change | round 1: D19 |
| Duplicate with an offset | The copy sits on top of the original | The owner's change | round 3: 01 2.9 |
| A polygon that crosses itself is refused | It is allowed, and every enclosed area is filled and collides | Both work, and it keeps "what you see is what collides" | round 6: PG1 |
| Copy style and Paste style | Copy value and Copy component on any field or card | Colours stop being a special case | round 6: CP1 |
| Adding a partner component automatically | A note on the card with a button | Nothing happens behind the user's back | round 5: AD2 |
| Body chips, joint badges and script badges in Entities panel rows | One row is one entity: name, eye, lock | Joints are their own rows | round 6: LY2 |
| A "Problems" tab | Editor messages on the card, listed from the status bar | One name and look for every note | round 8: WN1; round 10: EM1 |
| Version history, named versions | Nothing. Ctrl+S exports the project file | Rejected by the owner | round 11: 12 A4, 12 A5; round 12: SV1 |
| Material presets (Wood, Ice, Rubber) | Typing density, friction and restitution | Presets would be a real feature of their own, for every component | round 6: 05 2.5 |
| Collision categories, a Category field on surfaces | Tags in the collision grid | One label system instead of two | round 8: CT1 |
| A "parts don't collide" setting, a collision group component | The collision grid and the right tags | Once the grid exists, nothing else is needed. The first proposal also used "group" in two meanings | round 1: D37; round 8: CF3, CF4 |
| A hidden body under a sensor | A surface with no body acts as Static | Nothing happens behind the user's back | round 7: SN1 |
| Invented field names (Keep upright, Air drag, Bounciness) | Box2D's names: Fixed rotation, Linear damping, Restitution | Tutorials and the Lua API match | round 7: 05 2.4, SF1 |
| A one-way component or script | A SurfaceComponent setting | It must be decided inside the physics step | round 7: OW1 |
| A joint that follows its bodies in the editor, or is copied with them | A joint moves and copies only when selected | Only what is selected moves or copies | round 7: 06 2.9, 06 2.10; round 8: JM1, JC1 |
| A joint's automatic place in the tree | A joint sits where the user puts it | A joint is an ordinary entity | round 1: D45 |
| A "joint broke" event | The ordinary "destroyed" event | Breaking is being destroyed | round 5: R45; round 6: JB1 |
| A "joints of this body" list | The Used by list | "What points to this?" is the general question | round 8: LK1 |
| A line on a Dynamic body with a warning | The Dynamic option is greyed out for lines | Decided in round 2 | round 2: O8 |
| Level bounds of 3840×2160, then 2000×1000 | 20000×10000 px | The owner's size | round 6: 05 2.15; round 7: BND2 |
| Anchors, a ScreenAnchorComponent, a 3×3 anchor setting | The FlexComponent, also against the screen. Its 3×3 picker only sets Flex values | One layout system | decisions: D51; round 1: D50; round 4: FX1; round 9: AN2 |
| "HUD entity" as a kind of thing | Entities inside the camera | They are regular entities | round 8: HUD1 |
| "Entities inside the camera have no physics" as a rule | Any component is allowed. Physics and joints don't run there, and the cards show a warning | A warning explains it instead of a forbidden rule | round 8: HUD2 |
| A limit on how wide Fill window can show (21:9) | No limit. Bars only where the view would pass the level bounds | Rejected by the owner | round 1: D49; round 2: O10 |
| Camera smoothing per direction | One value for both | Rejected by the owner | round 1: D52 |
| A camera pinned at the top of the Entities panel | An ordinary row that can be moved | Its position changes nothing | round 4: 02 2.11 |
| A corner drag that changes the camera's shape | A corner drag only zooms | It would quietly change what players see | round 8: CA1 |
| A one-sentence trigger (T1) | When, If, Do | The sentence hid the "who" inside the When | round 5: T3 |
| Triggers that can't read values | The event "a variable changes" and the If checks | The owner's direction | round 4: T2; round 5: T5 |
| Actions for teleport, variables, tags, switching triggers, world settings | Change value | If it's data, change it with Change value | round 9: 09 2.4b |
| "Messages" | Custom events | "Event" was already in use, and "messages" was unclear | round 3: M1; round 9: MSG2 |
| A "Call Lua function" action | Fire a custom event the script listens for | One way for triggers and scripts to talk | round 10: EV1 |
| A fixed set of inputs that creators can't change | Inputs defined on the World's InputComponent, plus raw keys | The owner wanted both | round 9: 09 2.8; round 10: IN1 |
| "Lowest id first" run order | Entities panel order | The order you see is the order things run | round 9: 09 2.12; round 10: OR1 |
| Trigger templates | Component presets, not in v1 | A preset works the same on every component | round 9: 09 2.14; round 10: CP1 |
| An object-style Lua API (`self:setText`) | Ids and functions | Handles, not references | round 3: D66 |
| Lua functions inside tables (`world.spawn`, `input.isDown`, `math.clamp`) | Top-level functions: `spawn`, `is_down`, `clamp` | The owner's rule | owner: 2026-11-13 |
| A `self` object for a script's own entity | `this`, the entity's id | The same word as triggers, and handles, not references | owner: 2026-11-13 |
| A table shared by an entity's scripts, functions other scripts can call | Custom events and variables. Since 2026-11-16 an entity's scripts share its own variables, which triggers see too | Reuse before adding. A function to read another entity's state can come later | owner: 2026-11-13 |
| Script settings: values each script kept on the ScriptComponent, in a `settings` table | Variables on the entity's VariablesComponent, listed by the script in a `variables` table and added from a warning on its card | One concept for named values, so nothing is stored in two places and triggers can use them | owner: 2026-11-16 |
| An event that runs scripts in the editor, so a value changed in the Inspector updates the entity at once | Scripts change the level only during play | A script rewriting values behind the user's back muddles undo and which value is real; scripts may only change what can change in play; triggers couldn't share the event | owner: 2026-11-16 |
| Functions inside the `variables` table (`variables.speed.read()`) | Plain reads and writes: `variables.speed`, `variables.speed = 500` | Functions are top level | owner: 2026-11-16 |
| A vector variable read that writes through (`variables.offset.x = 5`) | A read-only copy, and an error that says to assign the whole vector | A copy kept in a local would change too, with no error | owner: 2026-11-16 |
| A `vec` type with operators | Two numbers, plus `clamp` and `lerp` | A type is a concept of its own. It can come later without changing any function | owner: 2026-11-13 |
| A shared set of builtin script events (`hurt`, `stun`, `activate`, `deactivate`, movement states) | Three events: `damage`, `heal`, `died` | Only what the builtin scripts need | owner: 2026-11-13 |
| `onStart`, `onUpdate` and other callbacks | `on(name, function)` | One list of events for triggers and scripts | round 1: D4; round 10: EV1 |
| A limit on script work per tick | No limit. The game runs separately from the editor | Rejected by the owner | round 3: D72; round 9: 10 2.11; round 10: LP1 |
| Scripts blocked from reading the clock | Scripts may read the date and time | The determinism test fixes the clock | round 10: SB1; round 11: CL1 |
| "Data" and "saved data" | Variables, with Keep between runs | One concept | round 2: O2 |
| Script templates | Builtin `.lua` files as examples, component presets later | A preset works the same on every component | round 9: 10 2.14; round 11: CP2 |
| Watched values, a Variables tab, breakpoints, shapes drawn from scripts | Live values, `print()`, Pause and Step | No feature appears inside another question | round 9: 10 2.16; round 10: DB1; round 11: DB2 |
| "Play from here" | Move the entity the camera follows and press Play | There is no special player | round 9: 11 2.5 |
| A title card before a level starts | A loading screen, then the level starts | The owner's choice | round 10: 11 2.14 |
| A level that replaces the end window, or puts its own text on it | One built-in end window: a title, the time, Restart and Leave | It always lets the player leave | round 3: D74; round 4: LS1 |
| Esc opens the pause menu | Tab opens and closes it | Esc is what browsers use to leave full screen | round 10: 11 2.13; round 12: PM1 |
| A restart key (hold R), a builtin `restart` input | Open the pause menu, then R | Restarting goes through the pause menu | round 9: 11 2.6; round 10: RS1; round 11: RS2 |
| Panels that stay visible during play | Play hides every panel, and the Panels button brings them back | The game should look like the real thing | round 10: UI1, 11 2.8; round 11: PN1 |
| Step 10 ticks, and speeds from 0.1× to 4× | Step one tick, and a speed menu of ¼×, ½×, 1×, 2× | The owner couldn't understand the first version: a list of numbers with no picture | round 9: 11 2.4; round 10: PS1, PS2 |
| A fixed seed as a level setting | A pinned seed is a test setting, stored in the browser | The seed is a testing tool, not part of the level | round 4: SD1 |
| Separate saved data for test play | Test play and playing use the same kept variables, with a Reset kept values button | Keep between runs was already agreed | round 10: 11 2.22; round 11: KV1 |
| A reduced motion setting | Nothing for now | The owner's choice | round 10: 11 2.21 |
| Backup reminders | The game asks the browser once to keep its data | The owner doesn't want reminders | round 11: 12 A6 |
| Ctrl+S saves a version | Ctrl+S exports the project file | Version history was dropped, and a Ctrl+S that did nothing would look like a save | round 12: SV1 |
| One `.level` file | `.editable` to keep editing, `.playable` to play | The owner's names: they say what each file is for | round 11: 12 A10; round 12: EXT1 |
| Limits of 10,000 entities and a 100 MB file | 100,000 entities and 256 MB | The owner's numbers | round 11: 12 A8 |
| 2,000 files in a level and 250 MB unpacked, beside the 256 MB file limit | One 256 MB limit counted unpacked, and 500 files per level from v3 | One number covers both, and 500 files already limits the count | owner: 2026-11-13 |
| 50 MB of imported files per level | 64 MB | The owner's number | owner: 2026-11-13 |
| 500 undo steps | 512 steps | The owner's number | owner: 2026-11-13 |
| A camera with no eye icon | An eye like every row, hiding everything inside the camera | No special cases | owner: 2026-11-13 |
| Removing a component also removes the ones that need it (`Remove Shape and Surface`) | Remove only that one, and the cards left show their partner note | Nothing happens behind the user's back | owner: 2026-11-13 |
| One click adds a BodyComponent and a SurfaceComponent together, or surfaces to every shape in a group | Only the BodyComponent, with a note and a button for the SurfaceComponent | Nothing happens behind the user's back | owner: 2026-11-13 |
| The physics view drawn by Box2D | The game draws its own collision pieces, in the editor and in test play | The editor has no Box2D world, and one way to draw is enough | owner: 2026-11-13 |
| Level bounds as fields on the PhysicsWorldComponent | A rectangle ShapeComponent on the World | A rectangle already has a size, a card and handles | owner: 2026-11-13 |
| A Wall or Open choice for each edge of the level bounds | One Walls checkbox: all four edges walls, or all open | One toggle is enough | owner: 2026-11-13 |
| The Joint tool stays active after each joint | It returns to Select like every tool. Tool lock keeps it | One rule for every tool | owner: 2026-11-13 |
| "Play as player": a test run with no debug tools | Play | Play already hides the panels, and v3 runs the play file | owner: 2026-11-13 |
| "Transform" as the component's name | TransformComponent; only its card's title reads `Transform` | Component names end in `Component`; card titles drop it (owner: 2026-11-17) | owner: 2026-11-13, 2026-11-17 |
| An import that compares level ids and asks Keep both or Replace | Import replaces the open level after asking | v1 keeps no list of levels, so there is nothing to compare against | round 11: 12 A11; round 12: LV1 |
| CodeMirror | Monaco | The owner's choice | round 9: 10 2.13 |
| A 12-font list | Inter, then Lora, JetBrains Mono and Roboto Mono | The owner's list | decisions: D26; round 3: F1 |
| A View button in the top bar | The View menu is the main menu's View submenu | The main menu already lists every command, so a second button only repeated it | owner: 2026-11-17 |
| The redesign's other directions: Bento tiles, Quiet, Glass, Candy, Neon, Ember, and Islands' Midnight, Graphite, Mint, Soft, Compact, Frosted and Warm | Islands, Slate with a bright blue | The owner's pick; don't bring them back | owner: 2026-11-17 |
| Round 8's flush panels with lines between parts and 4 px corners | Islands with 14 px corners and no borders or lines | The owner wanted a clean, cool look | owner: 2026-11-17 |
| A top bar; a menu bar island; a thin menu bar across the window | ☰ alone at the top left, holding every command | Every top row made the editor busier | owner: 2026-11-17 |
| Buttons for Undo, Redo, Save or Play, in a dock, a row, or islands of their own | Edit, File and Play in the main menu, and their keys | Four controls doing four jobs read badly in any one place | owner: 2026-11-17 |
| The level's name on screen (beside ☰, in a pill, a card, a chip, a title bar, the panels' heads, over the bounds) and the save state's words or a white dot | No name on screen; the tab title keeps `* Name`; File → Rename level… | None looked like the file's name rather than part of the UI | owner: 2026-11-17, 2026-11-18 |
| A status bar, a hint chip, a tool card, or a debug line in the middle | The debug box under the minimap, and the message pill | The owner wanted only the numbers checked while placing things | owner: 2026-11-17 |
| A lasting tool hint and a warning count | No hint; each warning on its card | The tool column shows the tool and each card its warnings | owner: 2026-11-18 |
| No shadows at all; hard opaque shadows | One soft 2 px shadow under every grey container | No shadow let parts merge; a hard one looked heavy | owner: 2026-11-17 |
| The Shape tool's options strip | The kinds menu beside the tool, the Joint tool's too | It belongs to the tool it changes | owner: 2026-11-17, 2026-11-18 |
| Ctrl+S exporting the project file | Ctrl+S saves in the browser now; Export… is its own item | Pressing Ctrl+S out of habit now does what people expect | owner: 2026-11-18 |
| Inter or Geist for the editor, and sizes between 10 and 16 px | JetBrains Mono at 10, 12, 14 or 16 px | One font, four sizes | owner: 2026-11-17 |
| A 240 px minimap, and a zoom or snapping button by it | 180 px, the map only | The owner reverted the widening | owner: 2026-11-17 |
| A square new level, 20000×20000 | 20000×10000 | The redesign's square was its example level only | owner: 2026-11-18 |

## Left out on purpose

Not planned for any version. Each would need its own review.

**Editor:** free docking and floating panels, a light theme, custom shortcuts, an interface scale setting, a command palette, guides dragged from rulers, Inspector search, branching undo, undo history that survives a reload, touch and tablet editing, keyboard-only editing of the level view, translations, editing one level in several windows, skew handles, rotating each selected entity around its own centre, per-pixel clicking on images, thumbnails in Entities panel rows, batch rename, saved selection sets, lasso selection.

**Drawing:** union and subtract of shapes (a group with a body already merges shapes, and subtract needs holes), polygons with holes, dashed outlines, outlines drawn inside or outside the edge, rich text, text on a path, fonts uploaded by users, a radius per corner, star, arc and pie tools, a polygon that updates by itself when its path changes, collision that follows the outer edge of a thick outline (it follows the centre), joining two paths into one, brushes and arrowheads, shared named styles, group opacity.

**Physics:** storing a mass of its own (typed Mass sets density), setting the centre of mass directly, changing the collision grid or level bounds during play, changing shape or scale during play, a physics preview in the editor, radial gravity, wind and water, several background layers, tracing an image into a collision polygon, showing pixels per metre as a setting, Pulley and Gear joints (after v3), motor, friction and mouse joints, a chain generator tool, switching a joint off and on during play (destroy covers it), joint presets, separate force and torque limits for breaking.

**Camera:** camera rotation, automatic framing of several targets, vertical look-ahead, pixel-perfect scaling, art in the bars, a fade-to-colour action (a rectangle inside the camera does it), text input fields, a constant-size screen layout, a player-controlled camera, split screen, picture-in-picture.

**Triggers:** branches, loops or nested actions in a trigger, random choice in a trigger, changing a value smoothly over time, a visual node graph, mouse drag, the right and middle buttons as trigger events, "view this trigger as Lua" (Convert to script, v3, replaces the trigger with a script instead).

**Scripts:** typed Lua, external editors, stepping through code, hot reload, profiler charts.

**Assets:** a sound component, a music setting on the World, positional sound, nine-slice images, drawing pixels, sound editing beyond trim, loading files from web addresses, wall jump, ladders, dash and crush detection in the builtin platformer script, local multiplayer.

**Test play:** editing the running game or keeping changes made during play, stepping through Lua line by line, rewind, levels linked into a campaign, a pause menu or end window made by the level, locking or hiding the mouse pointer, a custom pointer, the mouse wheel as an input, key names inside a level's text such as `{jump}`, showing physics shapes to players, a function that makes the player leave, a built-in countdown, assist options such as invincibility (the game has no health to protect), a guided tutorial drawn over the editor.

**Saving:** saving straight to a file on disk (only Chromium browsers can), cloud saving before accounts exist, exporting for an older version of the game, two people editing one level, merging two versions of a level, live syncing between tabs, detecting private windows (browsers hide it on purpose), a question that blocks importing a level with scripts (the safe set of functions is the protection, not the user's judgement), payments and marketplaces.
