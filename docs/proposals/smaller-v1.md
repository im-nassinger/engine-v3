# Proposal: a smaller v1

## TL;DR

**Not decided. Waiting for the owner.** No version in the requirements has changed yet.

The recommendation: **v1 is a level you build and watch.** You build a level from coloured shapes, bodies and three joints, press Play and watch it run, and it is saved in the browser and exported as a file. Nothing reacts to keys and a run never ends by itself: there are no triggers, scripts, variables, inputs or Win and Lose. All the logic moves to v2, together with text, paths, gradients and the Assets panel. Today's v2 becomes v3, and accounts and publishing become v4.

By heading count, 43 of the 108 v1 features move to v2. By work it is well over half, because what moves is the Lua, the Monaco editor, the Console, the Assets panel, `.entity` files, spawning, triggers and text.

## The versions

| Version | Meaning | In short |
|---|---|---|
| **v1** | Build and watch. The smallest thing that can be tested | Coloured shapes, groups, bodies and surfaces, Hinge, Rope and Spring, the camera following an entity, level bounds, Play, Stop, Pause and Step, the determinism test, saving in the browser, export and import |
| **v2** | Logic and play | Triggers, variables, inputs, scripts with the code editor and the Console, the Assets panel, `.entity` files and spawning, the builtin player, Win and Lose, the pause menu, text, entities inside the camera, the Bézier pen and the Pencil, gradients |
| **v3** | Polish and content. Today's v2, unchanged | Images, sound, four more joints, the collision grid, Flex and Fill window, linked copies, the builtin library, remapping and gamepads, editor comforts, the play file |
| **v4** | Accounts and publishing. Today's "planned as v3" | Unchanged |
| **Later** | Not designed yet | Unchanged |

## Why this split

- **Any logic pulls in Lua.** The smallest player you can steer is the builtin player, and it is a script. A v1 with triggers but no scripts would have no player, and a v1 with the player needs Lua, the ScriptComponent, Monaco and the Console. So the cut is either "no logic" or "all of it".
- **Without logic, v1 still tests the hardest parts:** the editor, Box2D, merging, joints, determinism and saving. A car rolling down a hill or a row of falling crates is a real test of all of them.
- **What is left was already agreed.** v2's rules are written, so nothing new is designed. The architecture can still plan for them.

**The trade-off:** nobody can play a v1 level, only watch it run. The proof that a creator can rebuild the builtin player waits for v2. And the parts of the design that only show up with scripts (the game's own worker, events, run order with Lua) would be built in v2 on top of a game loop made without them. The written v2 rules are what keeps that safe: the architecture must plan for them even though v1 doesn't ship them.

## Every v1 feature

"Stays" means it stays v1. "v2" means it moves to the new v2.

### Editor: workspace

| Feature | Proposal | Why |
|---|---|---|
| Fixed panels over the level view | Stays | The frame of the editor. The Assets panel and the Console arrive in v2, so v1 shows the Layers panel and the Inspector |
| Top bar | Stays | Menus, Play, the save state and the View menu |
| Status bar | Stays | Where the save state, results and editor messages show |
| Seven tools on number keys | Stays, with three tools | **Needs your yes.** v1 has Select (1), Shape (4) and Joint (6). The others come in v2 on the keys already listed, so nothing is relearned |
| What Esc does | Stays | Basic editing |
| The searchable list of shortcuts | v2 | Settled before the scope review, so it never went through "smallest thing that can be tested". The main menu already lists every command with its shortcut |
| Pan and zoom | Stays | You can't build a level you can't move around in |
| The grid | Stays | The simplest way to make platforms meet |
| Opens straight on the editor | Stays | There is no main menu |

### Editor: selection, groups, the Layers panel

| Feature | Proposal | Why |
|---|---|---|
| Click, drag-box, Shift+click, Select all | Stays | Basic editing |
| How the selection is drawn | Stays | You have to see what is selected |
| Handles and arrow keys | Stays | Basic editing |
| Group, ungroup, go in, go out | Stays | Groups are how a car becomes one body |
| Moving between groups keeps the place on screen | Stays | Comes with groups |
| The tree of entities | Stays | The only way to see and change the tree |
| Hide | Stays | To work on things behind other things |
| The World and the camera | Stays | Both are in every level |
| Large levels stay responsive | Stays | A speed target, not a feature. It shapes the architecture from the start |

### Editor: Inspector and undo

| Feature | Proposal | Why |
|---|---|---|
| Cards for the selection | Stays | The only way to edit values |
| One fixed list of field types | Stays | Every card is built from it |
| Typing values | Stays | Basic editing |
| Adding and removing components | Stays | Physics is added as components |
| Warnings | Stays | v1's two warnings: a missing partner and a failed save |
| Copy, paste and duplicate | Stays | Building a level is mostly copying |
| Delete | Stays | Basic editing |
| Undo and redo | Stays | Mistakes happen all the time |

### Drawing and text

| Feature | Proposal | Why |
|---|---|---|
| Shared rules for drawing tools | Stays | The Shape tool uses them |
| The Shape tool | Stays | Shapes are what levels are made of |
| Width and height, not scale | Stays | How resizing works |
| The Bézier pen | v2 | A path never collides, and Convert to polygon is v3, so in v1 a path is decoration only. Settled before the scope review |
| The Pencil | v2 | Same reason |
| Point editing | Stays | One wrong point would mean drawing the shape again |
| Polygons may cross themselves | Stays | Less work than deciding what else should happen |
| The StyleComponent | Stays | Solid colours only in v1 |
| Gradients | v2 | Decoration, and settled before the scope review. Solid colours are enough to test |
| Each entity draws one thing | Stays | Still decides what a joint's path and a shape draw |
| The Text tool | v2 | Its reason for v1 was a score on the screen, which needs variables. Text also brings fonts and sharp text |

### Physics

| Feature | Proposal | Why |
|---|---|---|
| Add a body in one click | Stays | Physics is the heart of v1 |
| Body settings | Stays | Box2D's own settings, so they cost little |
| The SurfaceComponent | Stays | Without it nothing collides. The Sensor field stays: it is one Box2D setting |
| Sensors and touching | v2 | Noticing a touch is only for triggers and scripts |
| Shapes in a group merge into one body | Stays | How anything made of several parts is built |
| Scale, rotate and skew freely | Stays | Collision must match what you see |
| The physics view | Stays | The only way to see an unstyled shape that collides |
| A joint is an ordinary entity | Stays | Joints are in v1 |
| Three joints: Hinge, Rope, Spring | Stays | Each does something the others can't |
| The Joint tool | Stays | How joints are made |
| Settings of each joint | Stays | A joint without its settings is just a pin |
| Rope and Spring show in play | Stays | A rope nobody can see makes a strange toy |
| Only what is selected moves or copies | Stays | The rule for every entity |
| Gravity and background colour | Stays | Basic level settings |
| Level bounds | Stays | Without them a fallen crate falls forever |

### Camera

| Feature | Proposal | Why |
|---|---|---|
| One camera | Stays | Play shows what the camera sees |
| Fixed size | Stays | The only camera mode until Fill window |
| Follow an entity | Stays | A car rolling down a long hill leaves the screen without it |
| Entities inside the camera stay on the screen | v2 | Its reason is a score or a timer, which need variables |

### Assets, .entity files, builtin content

| Feature | Proposal | Why |
|---|---|---|
| Folders of files | v2 | In v1 it would hold `.lua` and `.entity` files, which both move to v2 |
| File paths that update themselves | v2 | Comes with the Assets panel |
| Plain files, no private powers | v2 | Comes with the builtin folder |
| The builtin platformer player | v2 | It is a script, and it needs inputs |
| The builtin platformer script | v2 | Same |
| Save and place (`.entity` files) | v2 | Its reason was spawning. Copy and paste cover reuse in one level |
| Spawning during play | v2 | Only triggers and scripts spawn |

### Triggers, variables, inputs, scripts

| Feature | Proposal | Why |
|---|---|---|
| All 8 trigger features | v2 | Logic |
| Variables on the World | v2 | Logic |
| Raw keys and inputs | v2 | Only triggers and scripts read keys |
| All 11 script features | v2 | Logic |
| All 4 code editor and Console features | v2 | Only scripts need an editor, and only scripts write to the Console |

### Test play

| Feature | Proposal | Why |
|---|---|---|
| Play and Stop | Stays | The core of the game |
| Pause and Step | Stays | To watch a collision tick by tick |
| The Panels button and live values | v2 | It brings back the Console, which comes with scripts. Pause and Step are enough to watch physics |
| When something goes wrong in a run | Stays | A crashed run must still return to the editor. The script parts apply from v2 |
| Win and Lose: the end window | v2 | Only triggers and scripts end a run |
| The pause menu | v2 | Restart goes through it, and in test play Stop then Play already starts again |
| 60 ticks per second and the level's time | Stays | How the game runs |
| Switching tabs pauses the game | Stays | Small, and a hidden tab must add nothing to a run. Keys that stick matter from v2 |
| The random seed | v2 | Only scripts make random values |
| The determinism test | Stays | Far cheaper to keep determinism from the first day |

### Saving

| Feature | Proposal | Why |
|---|---|---|
| All 9 saving features | Stays | The level must survive a reload and leave the browser as a file |

## What else changes in the apply pass

- **Every "· v2" becomes "· v3"** before the 43 headings above move to v2. "Later" stays Later. Accounts and publishing become v4.
- Rules that name a version get rewritten, not patched: "New levels in v1 start in Fixed size" and "from v2 Fill window" become v1 and v3. The debugging set becomes Pause and Step in v1, plus live values and `print()` in v2.
- **The "Not in the scope review" suggestions follow their topic.** Suggested-v1 rows in triggers, variables and inputs, scripts, the code editor, `.entity` files and the four test-play rows about Panels become suggested v2. The other suggested-v1 rows (workspace, Inspector, joints, the World, the camera's safety margin, saving) stay.
- **Open questions that become v2 questions:** 9 (the Trigger zone tool), 14 to 19 (spawn settings, follow by tag, inputs of a new level, the Lua API), 20 to 22 (end window and Play as player).
- Each moved feature's reason becomes the "Why" above, cited as `owner: <date of your answer>`.
- Files: every requirement heading, the topic READMEs, scope.md, overview.md, principles.md (the v1 example), decisions.md (a new entry), progress.md and `tools/check-docs.js` (accept v3 and v4).

## Question for the owner

**Approve this split?** Yes, no, or name the features to move back. Then it is applied in one pass.

The one rule it changes is the tool list: v1 shows only Select, Shape and Joint. Everything else is a version move.
