# Settled while v1 was planned and built

## TL;DR

What the owner settled from 2026-11-13 to 2026-11-20, day by day, as it was written in [progress.md](progress.md) until v1 closed. **Each decision is also written where it belongs**, in the requirements, the architecture or [decisions.md](decisions.md), with its reason; this file is the record of when. New decisions go where they belong, not here.

## Settled on 2026-11-13

- **Box2D v3 and Lua run in the browser with wasm.** No proof needed. See [tech-notes.md](tech-notes.md).
- **Every level file records its physics version from v1.** Claude's call after the owner said "you decide". See [saving](requirements/play-and-save/saving.md).
- **A smaller v1** (owner): 43 features moved to a new v2, the old v2 became v3, accounts and publishing v4. See [scope.md](scope.md).
- **The Lua API is approved** (owner): every function is top level, `this` is the script's entity, settings are a `settings` table, and component values change with `set_attribute`. See [scripts.md](requirements/scripts/scripts.md) and [lua-api.md](requirements/scripts/lua-api.md).
- **The architecture review, round 1** (owner): all 24 cards answered yes. Its decisions are in the [architecture](architecture/README.md). The ones that changed requirements:
  - The component is called **TransformComponent** everywhere, also on its card and in Lua (was open question 1).
  - **The camera has an eye** like every row, hiding everything inside it (was open question 2).
  - **Removing a component removes only that one**, and the cards left show their partner note (was open question 5).
  - **Adding physics adds only the BodyComponent**, with a note and a button for the SurfaceComponent (was open question 6).
  - **The level's name** is v1, shown and edited in the top bar, saved in the project file (was open question 10).
  - **Limits:** 64 MB of imported files per level (v3), and one 256 MB limit counted unpacked. The old 2,000 files and 250 MB limits are dropped (were open questions 11 and 12).
  - **The camera follows an entity in v1.** Following by tag can come later (open question 15 stays open for v2).
  - **Undo keeps 512 steps**, not 500.
  - **In v1 a fill is a colour field that can be emptied.** Gradients add a fill field type in v2.
  - **The physics view draws the game's own collision pieces**, not Box2D's drawing.
  - **The small features Claude suggested for v1** are built in v1 (confirmed in round 7).
- **The architecture review, round 2** (owner): eight yes, one changed.
  - **The background colour is the World's StyleComponent fill.** In v3 an image fill is the background image.
  - **The level bounds are a rectangle ShapeComponent on the World** (the owner's change to the suggestion of fields on the PhysicsWorldComponent). Three details follow from it, below.
  - **Merge** is a checkbox on the BodyComponent. **The TagsComponent is v2.** The World's TransformComponent card isn't shown. Partner notes read "Needs a X to Y. [Add X]". Links to outside entities last one opening of the level. Changing the grid size is an undo step. TypeScript is pinned to 6.0.3.
- **The architecture review, round 3** (owner): **the World's rectangle is centred on the level's origin**, and dragging one edge moves the opposite edge by the same amount, so the centre never moves. A new level's camera starts at the origin. Questions 26 and 27 got comments asking for plainer words, so they are asked again in round 4.
- **The architecture review, round 4** (owner): **one Walls checkbox** on the PhysicsWorldComponent makes all four edges walls or all open, off by default (the owner's change to a choice per edge). **The World's rectangle is never solid:** the World can't take a BodyComponent or a SurfaceComponent.
- **The architecture review, round 5** (owner): every tool returns to Select, a text's corner changes its size, the **Trigger tool** (renamed from Trigger zone) is v2, builtin files are changed through a copy, **variables hold a number or a text** in v2, the camera follows a tag in v2, a new level starts with five inputs, Leave in test play goes back to the editor, the end window extras and the main menu stay Later, Play as player and version history stay rejected.
## Settled on 2026-11-14

- **The architecture review, round 6** (owner): the right-click "Entities here" list is dropped. **Spawn asks for TransformComponent values** (position, rotation, scale, skew) instead of using a target and an offset. **A variable's type is number, string or boolean**: only numbers are added to and compared, strings and booleans are set and checked with "is" or "is not".

- **The architecture review, round 7** (owner): everything still open, on one page at once, as the owner asked. **The architecture is approved**: it moved to [architecture/](architecture/README.md), its plan to [plan.md](plan.md), its words to the [glossary](glossary.md). Spawn measures position and rotation from the trigger's entity, and its values replace the `.entity` file's. A boolean variable can be **flipped** by a trigger. All 119 small features got the version Claude suggested (14 v1, 12 v2, 80 v3, 13 Later), and three were dropped. See [decisions.md](decisions.md).
- **Round 8, the editor's look** (owner): a Figma-like feel, cool blue-grey panels, a blue accent colour, medium density, 4 px corners, flush panels, outline icons, and **JetBrains Mono for the whole editor**. See [design/](design/README.md).
- **After the mockups** (owner): **the Entity inspector moves to the left and the Entities viewer to the right.** The save state and the zoom are in the top bar, the tools in the toolbar strip, and v1 rows have no lock icon. See [design/](design/README.md).
- **Direction A is picked** (owner): the design system is written in [design/](design/README.md): [tokens](design/tokens.md), [controls](design/controls.md), [the level view's colours](design/level-view.md). Direction B was dropped. Some states are Claude's proposals, marked there.
- **The stage 0 plan is approved** (owner): all ten changes to the architecture docs, including **Node 26** instead of 24, `jiti`, dependency-cruiser, the guard tests and the worker files in `src/app/workers/`. See [decisions.md](decisions.md).

- **Imports in core go one way** (owner): entities → components → fields → events. A component never knows its entity, partner rules are plain data, Mass is a row the Entity inspector adds (typing it sets density since 2026-11-19), and the Add Component menu is worked out in the Entity inspector. See [components-and-fields.md](architecture/core-model/components-and-fields.md).
- **The stage 1 plan is approved** (owner): `DeterministicMath`'s `sin`, `cos`, `atan2` and `sinCos` move to stage 1, because `Matrix2D` needs them and `Math.sin` is banned in core; `exp` stays in stage 3. **Skew is strictly between −90° and 90°**, refused past that like a scale of 0. See [geometry.md](architecture/core-model/geometry.md) and [inspector-and-undo.md](requirements/editor/inspector-and-undo.md).

- **Round 9** (owner): a name is never empty (an empty one in a file makes it damaged) and reads as `Entity` when missing; names can't change during play; only position and rotation change during play; the five hover descriptions as proposed; a level name past 60 characters is refused, not cut; **stage 3 tries `clipper2-ts` first**. See [selection.md](requirements/editor/selection.md), [inspector-and-undo.md](requirements/editor/inspector-and-undo.md), [saving.md](requirements/play-and-save/saving.md) and [geometry.md](architecture/core-model/geometry.md).

## Settled on 2026-11-15

- **A circle, not an ellipse** (owner): the fourth shape kind is a circle with only a radius. An ellipse is a circle scaled unevenly by its TransformComponent, which collides as a 32-point polygon. Resizing keeps a circle round. Stage 7 gained step 2 to change the code built in stages 2 to 4. See [drawing](requirements/drawing.md#the-shape-tool--v1).
- **The Shape tool hides the Entity inspector** (owner, replacing the same day's "shape about to be drawn" in the Entity inspector): choosing the tool clears the selection and hides the Entity inspector, and an options strip at the top left offers Rectangle, Circle and Polygon. Enter finishes a polygon open, as a line; clicking the first point closes it. Once finished, the tool returns to Select and the Entity inspector shows the new shape. The Entity inspector only ever shows entities that exist. Kind on a selected shape still changes it, see [the Shape tool](requirements/drawing.md#the-shape-tool--v1) and [changing a shape's kind](requirements/drawing.md#changing-a-shapes-kind--v1).
- **Points is one list field** (owner): a polygon's or line's points show in the Entity inspector as one Points field, a list of vectors, instead of a read-only count. The list field type moves from v2 to v1 and is built in stage 8. A path's points become a list of **path points**, a new field type that comes with v2's pen. See [field types](requirements/editor/inspector-and-undo.md#one-fixed-list-of-field-types--v1).
- **The level file is nested** (owner): `level.json` holds one `world` entity, and each entity holds its `children` instead of naming its parent, so the file can't describe a broken tree and the World is the one entity at the top. The clipboard and undo copies are nested the same way. Stage 9 gained step 2 to change the code built in stages 2 and 5. See [persistence](architecture/persistence.md#leveljson).
- **Gravity is one vector, x and y** (owner): the World's gravity is one vector field in m/s², default 0, 9.8, instead of strength, direction and custom angle, so zero gravity keeps no direction. The v3 gravity buttons set the vector's length. Stage 8 gained step 14 to change the code. See [world](requirements/physics/world.md#gravity-and-background-colour--v1).
- **Push's fixed kick is a vector, x and y** (owner), in px/s. See [triggers](requirements/triggers/triggers.md#actions--v2).

## Settled on 2026-11-16

- **Variables replace the values scripts kept** (owner): any entity can have a VariablesComponent; variables gain the entity, asset, colour, vector, angle and tags types and number limits; a script lists what it needs in a `variables` table and a warning on its card adds what is missing; scripts read and write `variables.speed`. Scripts never run in the editor. All v2, so no v1 code changes. See [decisions.md](decisions.md#2026-11-16-variables-replace-the-values-scripts-kept).

## Settled on 2026-11-20

- **Convert to script, Later** (owner; v3 when decided, which became Later with round 12): a trigger's `…` menu turns it into a `.lua` file that does the same, and triggers that switched it on or off now switch the script's on/off checkbox. See [triggers](requirements/triggers/triggers.md#convert-to-script--v3) and [scripts](requirements/scripts/scripts.md#switching-a-script-off--v3).
- **Many small versions instead of one big v2** (owner): round 11 cut v2 with one test, a small platformer, which pulled in almost everything. The owner stopped half way and asked for more versions with smaller steps, the most value for the least work first. Round 11 is dropped; its answers that still count: the pen and the Pencil stay in v2 ("not hard, and a lot of value"), and `.entity` files and the builtin player go later. **Round 12 settled it** the same day: v2 curves and gradients, v3 a first game without code, v4 the rest of the triggers and the shortcut list, v5 scripts, v6 text, v7 `.entity` files and the builtin player; everything else, the old v3 and v4 included, is Later. The owner moved gradients to v2 and the shortcut list to v4 in comments. Written into [scope.md](scope.md), every requirement heading and the architecture. **Version marks in the entries above this one are the old ones.**
- **Planning v2, step 1: the requirements checked against v1** (owner): the Bézier pen is key 4 and the Pencil key 5; choosing the pen keeps the selection when it is one open path, so its ends can be continued; a gradient is edited in the Entity inspector and with gradient handles on the level, its details under the standing yes. See [drawing](requirements/drawing.md#gradients--v2) and [workspace](requirements/editor/workspace.md#seven-tools-on-number-keys--v1). The check found v1 already stores curved paths and a tagged fill, and already draws and hit-tests curves; v2 must add point editing on paths and the path point field type.
- **Planning v2, step 2: the screen parts** (standing yes): the pen and the Pencil hide the Entity inspector, the Pencil's smoothness is a kinds menu, a path's points and the gradient editor are laid out in the Entity inspector, and the points, curve handles and gradient handles are drawn on the level. Drawn in the [v2 mockup](design/mockups/v2.html), **approved by the owner** the same day.

## Settled under the standing yes, 2026-11-14

- **Round 10**, every card at Claude's pick: see [decisions.md](decisions.md#decided-under-the-standing-yes).
- **An owner decision built differently** (2026-11-14): the owner said to ask again if `clipper2-ts` failed. Its fill works, but **its triangulation drops areas** (a one-stroke star loses its middle) while reporting success. The unattended runner can't ask, so it took the closest fix: `clipper2-ts` only fills, and the game's own `EarClipping` triangulates. See [geometry.md](architecture/core-model/geometry.md#the-polygon-pipeline); the owner can overturn it.
- **An owner decision built differently** (2026-11-16): the requirement capped spin at 15 turns per second, but Box2D 3.2 turns a body at most 45° a step, 7.5 turns per second, with no setting to raise it. The closest fix is Box2D's own cap: [bodies.md](requirements/physics/bodies.md#body-settings--v1) now says 7.5, and the Hinge's motor speed range is ±2,700 °/s instead of ±5,400. See [adapters.md](architecture/adapters.md#physics); the owner can overturn it.
- **An owner decision built differently** (2026-11-16): the requirement let a Hinge's Min and Max angle go to a full turn, ±360°, but Box2D 3.2 clamps a Hinge's limits to ±180°. The closest fix is Box2D's own: [joints.md](requirements/physics/joints.md#settings-of-each-joint--v1) and the JointComponent's schema now range over ±180°. See [adapters.md](architecture/adapters.md#physics); the owner can overturn it.
