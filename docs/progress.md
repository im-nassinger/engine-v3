# Progress

## TL;DR

**Everything before code is done and approved:** the requirements, the scope, and the [architecture](architecture/README.md) (owner, 2026-11-14). Every feature has a version. **v1 is a level you build and watch**, with all logic in v2. **The editor's look is settled** (owner, 2026-11-14): direction A of the [mockups](design/mockups/index.html), written as a design system in [design/](design/README.md). **Stage 0, the project setup, is built** (2026-11-14): every check runs with `npm run check`, the browser tests run in three browsers, and an empty page builds. **CI runs on every push** and passed on 2026-11-15; the [runner](runner/README.md) pushes after each step. **Stage 1, the model, is built** (2026-11-14): `Level`, `Entity`, the components with TransformComponent and NameComponent, `Matrix2D` and the two caches, with 217 unit tests. **Round 9 is answered** (owner, 2026-11-14). **The owner gave a standing yes** (2026-11-14): Claude decides the smaller questions and keeps building without waiting, listing each decision in [decisions.md](decisions.md). Round 10 was settled that way. **Stage 2, the v1 components and the file format, is built** (2026-11-14): all ten v1 components, the registry, `level.json` with `LevelWriter` and `LevelReader`, with 418 tests. **Stage 3, geometry, is built** (2026-11-14): `exp`, `Units`, the polygon pipeline with `clipper2-ts` filling and the game's own `EarClipping` triangulating, lines, mass and the two caches, with 512 tests. **Stage 4, drawing a level, is built** (2026-11-15): `ViewState`, `ViewSettings`, `PixiLevelView` with PixiJS 8, `LevelDisplay`, culling and all five overlays (grid, bounds, camera frame, joint icons, physics view), and the page draws a test level, with 564 unit tests, 126 browser tests in three browsers and 3 Playwright tests. **Stage 5, editing without a mouse, is built** (2026-11-15): `EditorSession`, `OpenLevel`, the changes, `History` (512), `LevelEditor`, `Selection`, `CurrentGroup`, `StatusText` and the command registry, with Undo, Redo, Select all, Delete, Hide or show, renaming, Group, Ungroup, Go into group and the View commands, and 717 tests in Node. **Stage 6, the editor shell, is built** (2026-11-15): the page is the editor: the top bar with the main menu built from the registry, the level's name, Undo and Redo, the View menu and the zoom, the toolbar, the status bar, dialogs, an error boundary per panel, and the keys, with 790 tests in Node, 177 browser tests and 18 Playwright tests. **Stage 7, the Entities panel, is built** (2026-11-15): a circle instead of an ellipse, the virtual list of the level's rows with folding, the kind icons, clicks, the eye, renaming in place with F2, dragging rows into a new place in one step, and reveal, painting its first rows within 42 ms at 10,000 entities, with 863 tests in Node, 225 browser tests and 21 Playwright tests. **Stage 8, the Inspector, is built** (2026-11-15): `InspectorModel` with Mixed, the cards, Add Component, Remove and Reset to defaults, `ValueInput` and the typing table, every v1 field type including the list field with Points as a list of vectors, Kind changing a shape, `BodyMass`, `EditorMessages` with their notes and count, and the World's gravity as one vector, with 989 tests in Node, 363 browser tests and 25 Playwright tests. **Stage 9, the Select tool, is built** (2026-11-16): the nested level file, `LiveEdit`, `HitTester`, `GridSnapper`, `ToolController` with `PanGesture` and `EscapeChain`, the Select tool's clicks, selection box, moving, nudges, resizing and rotating, the body question, `PointerInput`, `SelectionOverlay`, and the page's toolbar, snapping switch, mouse position, `Back to level`, picker and live slider, selecting within 13 ms and dragging 1,000 of 10,000 entities within 14.8 ms a frame, with 1,195 tests in Node, 489 browser tests and 30 Playwright tests. **Stage 10, the Shape tool and point editing, is built** (2026-11-16): `createShape` with `EntityNamer`, the Shape tool's rectangle, circle, polygon and line with its options strip while the Inspector is hidden, `HighDetailRule`, point editing's selecting, dragging, nudging, adding and deleting, `DrawingPreviewOverlay` and the point handles, with 1,299 tests in Node, 525 browser tests and 38 Playwright tests, which now run in Chromium, Firefox and WebKit. **Stage 11, copy and paste, is built** (2026-11-16): `ClipboardCodec` with the tagged text, `IdRemapping` rewiring links inside a copied set, `LevelReader.checkSubtree` refusing bad pasted data whole, `PastePlacement` at the mouse with grid snapping, `EditorClipboard`, Cut, Copy, Paste and Duplicate, and `ClipboardBridge` for the browser's own clipboard events, with 1,393 tests in Node, 537 browser tests and 43 Playwright tests. **Stage 12, saving, is built** (2026-11-16): `Autosave` with its delays, failures and retry, `SaveState`, IndexedDB, `localStorage` settings, the Web Lock that makes a second tab read-only, `LevelOpener` with the crash note and the kept damaged record, the `.editable` file with `fflate`, Export and Ctrl+S, the import worker that stops a zip bomb at 256 MB, New, Import and dropping a file, and the page's save state, tab title and leave prompt, with 1,540 tests in Node, 654 browser tests and 48 Playwright tests. **Stage 13, physics and the determinism test, is built** (2026-11-16): `box2d3-wasm` 6.0.0 behind the `PhysicsEngine` and `PhysicsWorld` contracts, bodies and surfaces with the speed cap and Box2D 3.2's own spin cap, the tech notes rechecked against 3.2, `BodyMembership`, `PhysicsSceneBuilder`, `Simulation` with its v1 phases, `LevelBoundsPhase` with the hard limit and the maximum level size, `runHeadless`, and seven determinism levels that match their recorded hashes in Node on x86 and ARM and in three browsers, with 1,652 tests in Node, 690 browser tests and 48 Playwright tests. **Stage 14, joints, is built** (2026-11-16): Hinge, Rope and Spring in `Box2dPhysicsWorld`, the joint tech notes rechecked against 3.2, joints in `PhysicsSceneBuilder` with their skip reasons, scaling and mirroring, joints moving with their A's body in play with `JointPathPhase` keeping Rope and Spring paths on their ends, three joint determinism levels and a headless test per joint setting, `placeJoint`, the Joint tool with `pickBodyA` and `PointSnapper`, and the page's key 6, type strip, preview and thin lines, with 1,765 tests in Node, 723 browser tests and 53 Playwright tests. **Stage 15, the camera, is built** (2026-11-16): the camera's rules as plain functions (`smoothTowards`, `limitToBounds`, `keepInSafetyMargin`), `CameraPhase` with `CameraState` in the run, starting on its target with no opening pan, the `camera-follow` determinism level, `fixedSizeView` and `PixiLevelView.showThroughCamera` with `LetterboxOverlay`'s black bars, with 1,797 tests in Node, 747 browser tests and 53 Playwright tests.

## Where things stand

**Runner:** stage 16, step 7 of 12: `PlaySession` is built: Play commits, saves, writes and starts, ignored mid-drag or with a dialog open; Stop cancels a start and leaves the editor untouched; Pause, Resume and Step; a failed, crashed or hung run ends with its message; the hard limit's warning names the body. Next is step 8, inputs and focus. The [runner](runner/README.md) keeps this line up to date.

| Part | State |
|---|---|
| [overview.md](overview.md), [glossary.md](glossary.md), [principles.md](principles.md), [scope.md](scope.md), [decisions.md](decisions.md) | Done |
| [requirements/](requirements/README.md): editor, drawing, assets, physics, camera, triggers, scripts, play-and-save, later | Done |
| [rejected.md](rejected.md), [tech-notes.md](tech-notes.md) | Done |
| `tools/check-docs.js`, `tools/check-sources.js` | Done, both pass |
| The smaller v1: v1 build and watch, v2 logic and play, v3 polish, v4 accounts and publishing | Done, applied everywhere. See [decisions.md](decisions.md) |
| The Lua API: [lua-api.md](requirements/scripts/lua-api.md), [lua-examples.md](requirements/scripts/lua-examples.md) | Done, approved by the owner |
| The [architecture](architecture/README.md) and the [plan](plan.md) | Done, approved by the owner on 2026-11-14 |
| The editor's look: [design/](design/README.md) | Done, approved by the owner on 2026-11-14 |
| The stage 0 plan | Done, approved by the owner on 2026-11-14, written into [tooling.md](architecture/tooling.md) |
| Small features without a version | Done: all given a version in round 7 |
| Stage 0, project setup | Done; CI first passed on 2026-11-15. See below |
| Stage 1, the model | Done on 2026-11-14. See below |
| The stage 2 plan | Approved under the standing yes on 2026-11-14, with round 10, and written into the [architecture](architecture/README.md) |
| Stage 3, geometry | Done on 2026-11-14. See below |
| Stage 4, drawing a level | Done on 2026-11-15. See below |
| Stage 5, editing without a mouse | Done on 2026-11-15. See below |
| Stage 6, the editor shell | Done on 2026-11-15. See below |
| Stage 7, the Entities panel | Done on 2026-11-15. See below |
| Stage 8, the Inspector | Done on 2026-11-15. See below |
| Stage 9, the Select tool | Done on 2026-11-16. See below |
| Stage 10, the Shape tool and point editing | Done on 2026-11-16. See below |
| Stage 11, copy and paste | Done on 2026-11-16. See below |
| Stage 12, saving | Done on 2026-11-16. See below |
| Stage 13, physics and the determinism test | Done on 2026-11-16. See below |
| Stage 14, joints | Done on 2026-11-16. See below |
| Stage 15, the camera | Done on 2026-11-16. See below |
| Code | Stages 0 to 15 done. Stage 16, test play, is being built: its [steps](steps/stage-16.md) are written |

The source, `~/projects/ecs-game-v2`, was left as it is. `tools/check-sources.js` reads it, so that check only works while it exists. It is a finished one-time proof; decisions made after the review are cited as `owner: <date>`.

### Settled on 2026-11-13

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
### Settled on 2026-11-14

- **The architecture review, round 6** (owner): the right-click "Entities here" list is dropped. **Spawn asks for TransformComponent values** (position, rotation, scale, skew) instead of using a target and an offset. **A variable's type is number, string or boolean**: only numbers are added to and compared, strings and booleans are set and checked with "is" or "is not".

- **The architecture review, round 7** (owner): everything still open, on one page at once, as the owner asked. **The architecture is approved**: it moved to [architecture/](architecture/README.md), its plan to [plan.md](plan.md), its words to the [glossary](glossary.md). Spawn measures position and rotation from the trigger's entity, and its values replace the `.entity` file's. A boolean variable can be **flipped** by a trigger. All 119 small features got the version Claude suggested (14 v1, 12 v2, 80 v3, 13 Later), and three were dropped. See [decisions.md](decisions.md).
- **Round 8, the editor's look** (owner): a Figma-like feel, cool blue-grey panels, a blue accent colour, medium density, 4 px corners, flush panels, outline icons, and **JetBrains Mono for the whole editor**. See [design/](design/README.md).
- **After the mockups** (owner): **the Inspector moves to the left and the Entities panel to the right.** The save state and the zoom are in the top bar, the tools in the toolbar strip, and v1 rows have no lock icon. See [design/](design/README.md).
- **Direction A is picked** (owner): the design system is written in [design/](design/README.md): [tokens](design/tokens.md), [controls](design/controls.md), [the level view's colours](design/level-view.md). Direction B was dropped. Some states are Claude's proposals, marked there.
- **The stage 0 plan is approved** (owner): all ten changes to the architecture docs, including **Node 26** instead of 24, `jiti`, dependency-cruiser, the guard tests and the worker files in `src/app/workers/`. See [decisions.md](decisions.md).

- **Imports in core go one way** (owner): entities → components → fields → events. A component never knows its entity, partner rules are plain data, Mass is a read-only row the Inspector adds, and the Add Component menu is worked out in the Inspector. See [components-and-fields.md](architecture/core-model/components-and-fields.md).
- **The stage 1 plan is approved** (owner): `DeterministicMath`'s `sin`, `cos`, `atan2` and `sinCos` move to stage 1, because `Matrix2D` needs them and `Math.sin` is banned in core; `exp` stays in stage 3. **Skew is strictly between −90° and 90°**, refused past that like a scale of 0. See [geometry.md](architecture/core-model/geometry.md) and [inspector-and-undo.md](requirements/editor/inspector-and-undo.md).

- **Round 9** (owner): a name is never empty (an empty one in a file makes it damaged) and reads as `Entity` when missing; names can't change during play; only position and rotation change during play; the five hover descriptions as proposed; a level name past 60 characters is refused, not cut; **stage 3 tries `clipper2-ts` first**. See [selection.md](requirements/editor/selection.md), [inspector-and-undo.md](requirements/editor/inspector-and-undo.md), [saving.md](requirements/play-and-save/saving.md) and [geometry.md](architecture/core-model/geometry.md).

### Settled on 2026-11-15

- **A circle, not an ellipse** (owner): the fourth shape kind is a circle with only a radius. An ellipse is a circle scaled unevenly by its TransformComponent, which collides as a 32-point polygon. Resizing keeps a circle round. Stage 7 gained step 2 to change the code built in stages 2 to 4. See [drawing](requirements/drawing.md#the-shape-tool--v1).
- **The Shape tool hides the Inspector** (owner, replacing the same day's "shape about to be drawn" in the Inspector): choosing the tool clears the selection and hides the Inspector, and an options strip at the top left offers Rectangle, Circle and Polygon. Enter finishes a polygon open, as a line; clicking the first point closes it. Once finished, the tool returns to Select and the Inspector shows the new shape. The Inspector only ever shows entities that exist. Kind on a selected shape still changes it, see [the Shape tool](requirements/drawing.md#the-shape-tool--v1) and [changing a shape's kind](requirements/drawing.md#changing-a-shapes-kind--v1).
- **Points is one list field** (owner): a polygon's or line's points show in the Inspector as one Points field, a list of vectors, instead of a read-only count. The list field type moves from v2 to v1 and is built in stage 8. A path's points become a list of **path points**, a new field type that comes with v2's pen. See [field types](requirements/editor/inspector-and-undo.md#one-fixed-list-of-field-types--v1).
- **The level file is nested** (owner): `level.json` holds one `world` entity, and each entity holds its `children` instead of naming its parent, so the file can't describe a broken tree and the World is the one entity at the top. The clipboard and undo copies are nested the same way. Stage 9 gained step 2 to change the code built in stages 2 and 5. See [persistence](architecture/persistence.md#leveljson).

### Settled on 2026-11-16

- **Variables replace the values scripts kept** (owner): any entity can have a VariablesComponent; variables gain the entity, asset, colour, vector, angle and tags types and number limits; a script lists what it needs in a `variables` table and a warning on its card adds what is missing; scripts read and write `variables.speed`. Scripts never run in the editor. All v2, so no v1 code changes. See [decisions.md](decisions.md#2026-11-16-variables-replace-the-values-scripts-kept).

### Settled under the standing yes, 2026-11-14

- **Round 10**, every card at Claude's pick: see [decisions.md](decisions.md#decided-under-the-standing-yes).
- **An owner decision built differently** (2026-11-14): the owner said to ask again if `clipper2-ts` failed. Its fill works, but **its triangulation drops areas** (a one-stroke star loses its middle) while reporting success. The unattended runner can't ask, so it took the closest fix: `clipper2-ts` only fills, and the game's own `EarClipping` triangulates. See [geometry.md](architecture/core-model/geometry.md#the-polygon-pipeline); the owner can overturn it.

- **An owner decision built differently** (2026-11-16): the requirement capped spin at 15 turns per second, but Box2D 3.2 turns a body at most 45° a step, 7.5 turns per second, with no setting to raise it. The closest fix is Box2D's own cap: [bodies.md](requirements/physics/bodies.md#body-settings--v1) now says 7.5, and the Hinge's motor speed range is ±2,700 °/s instead of ±5,400. See [adapters.md](architecture/adapters.md#physics); the owner can overturn it.
- **An owner decision built differently** (2026-11-16): the requirement let a Hinge's Min and Max angle go to a full turn, ±360°, but Box2D 3.2 clamps a Hinge's limits to ±180°. The closest fix is Box2D's own: [joints.md](requirements/physics/joints.md#settings-of-each-joint--v1) and the JointComponent's schema now range over ±180°. See [adapters.md](architecture/adapters.md#physics); the owner can overturn it.

### Stage 15, built on 2026-11-16

- All seven [steps](steps/stage-15.md) are done, one commit each. What the build showed is written into [simulation.md](architecture/simulation.md#stage-15s-choices) as "as built" entries, each choice listed in [decisions.md](decisions.md#decided-under-the-standing-yes). No package was added, and no speed test: a camera tick is a few sums, and the speed of play is stage 16's and 17's.
- `core/simulation` gained `camera/` with `smoothTowards`, `limitToBounds`, `keepInSafetyMargin`, `limitToLevel`, `startingCameraPosition`, `CameraSettings` and `CameraState`, and `CameraPhase` in `phases/`; `editor/play/fixed-size` holds `fixedSizeView`; `adapters/pixi` gained `showThroughCamera`, `ViewState.place` and `overlays/letterbox/` with `LetterboxOverlay`; `tests/determinism/camera-follow` checks the ball and the camera's box on every tick.
- **The camera's position lives in `CameraState`**, not the camera entity's TransformComponent, and the report and `stateHash` read it. **Recording the ten older levels again changed none of their hashes**, since no placed camera was outside its bounds. **The view through the camera is a second `ViewState`**, placed past the editor's 1% to 1000% zoom range, since a 160 px camera can need 1200%.
- **The determinism test passed** with its eleven levels on CI's x86 and ARM jobs and in Chromium, Firefox and WebKit on every push of the stage; CI never failed during it.
- **Left for later stages:** `PlaySession` feeding `fixedSizeView` to the view, `PlayMirror` moving the camera from the report, and interpolating it between ticks (stage 16); following a tag (v2); offset, dead zone, look-ahead, zoom, Fill window and moves by scripts (v3).

### Stage 14, built on 2026-11-16

- All twelve [steps](steps/stage-14.md) are done, one commit each. What the build showed is written into [simulation.md](architecture/simulation.md#stage-14s-choices) and [selection-and-tools.md](architecture/editor/selection-and-tools.md#stage-14s-choices) as "as built" entries, and the Box2D joint facts into [tech-notes.md](tech-notes.md#physics-and-joints), each choice listed in [decisions.md](decisions.md#decided-under-the-standing-yes). No package was added, and no speed test: placing a joint is one edit, and the speed of play is stage 16's and 17's.
- `core/physics` gained `joint-paths/` with `jointPathPoints`, and its contracts `JointDefinition`, `createJoint` and `destroyJoint`; `core/simulation` gained `JointPathPhase` and the report's `paths`; `adapters/box2d` builds the Hinge as a revolute joint and Rope and Spring as distance joints; `editor/commands/joints` holds `placeJoint`, `editor/tools/joint` the Joint tool and `pickBodyA`, `editor/snapping/point` `PointSnapper`; `adapters/pixi/overlays/joint-preview` holds `JointPreviewOverlay` and `planJointPreview`; `tests/determinism/joint-settings` runs each joint setting headless.
- **Field A is Box2D's body B**, so the motor and limits act on A. **Min angle and Max angle range over ±180°**, not ±360°, since Box2D 3.2 clamps a Hinge's limits there; see "An owner decision built differently" above. **Scaling a group with joints needs no editor rule:** play multiplies typed lengths by the joint's scale and flips a mirrored joint's limits and motor. **A Rope or Spring's second click on empty space pins B to the background.** **`CreateJointCommand` is the edit `placeJoint`**, like `createShape`.
- **The determinism test passed** with its ten levels on CI's x86 and ARM jobs and in Chromium, Firefox and WebKit on every push of the stage; CI never failed during it.
- **Left for later stages:** the page's `PlayMirror` applying the tick report's `paths` (stage 16); the joint warnings, dragging limits, re-attaching an end, breaking, choosing among three bodies under the mouse and hover outlines (v3); snapping to entities in general, which replaces `PointSnapper`'s first half (v3).

### Stage 13, built on 2026-11-16

- All eleven [steps](steps/stage-13.md) are done, one commit each. What the build showed is written into [simulation.md](architecture/simulation.md#stage-13s-choices) as "as built" entries per step, and the Box2D facts into [tech-notes.md](tech-notes.md), each choice listed in [decisions.md](decisions.md#decided-under-the-standing-yes). One package was added, as [stack.md](architecture/stack.md) planned: `box2d3-wasm` 6.0.0, always imported as `box2d3-wasm/compat`. No speed test was added: the speed of play is stage 16's and 17's.
- `core/physics` gained the contracts in `contracts/`, `BodyMembership` in `membership/` and `PhysicsSceneBuilder` in `scene/`; `core/simulation` holds `Simulation` in `run/`, the phases in `phases/`, `BodyMatrices` in `bodies/`, `RemovalMarks` in `removal/`, the report, `stateHash`, `startSimulation` and `runHeadless`, one subfolder each; `core/derived`'s caches take a `BodyMatrixSource`; `core/level-data`'s limits gained `maxLevelSize`; `adapters/box2d` holds `Box2dPhysicsEngine` and `Box2dPhysicsWorld`; `tests/levels/determinism` builds the seven level files and `tests/determinism` runs them in Node and in the browsers.
- **The spin cap is Box2D 3.2's own 7.5 turns per second**, not the 15 the requirement asked for, since 3.2 can't turn a body faster; see "An owner decision built differently" above. **Every surface with no body, and the Walls, go into one Static ground body.** **A line is skipped by the type of the body it goes into.** **A run starts from the clock time alone**, since the seed comes with v2.
- **The determinism test passed** on CI's x86 and ARM jobs and in Chromium, Firefox and WebKit on every push of the stage; CI never failed during it.
- **Left for later stages:** Hinge, Rope and Spring with the `JointPathPhase`, their tech notes rechecked against 3.2, and the rope bridge, springs and hinged wheels as determinism levels (stage 14); the `CameraPhase` and a level with the camera following a body (stage 15); `GameWorkerHost` calling `startSimulation`, the worker checked against `runHeadless`, and the status text for a body removed past the hard limit (stage 16); the seed (v2).

### Stage 12, built on 2026-11-16

- All thirteen [steps](steps/stage-12.md) are done, one commit each. What the build showed is written into [persistence.md](architecture/persistence.md#stage-12s-choices) as "as built" entries per step, each choice listed in [decisions.md](decisions.md#decided-under-the-standing-yes). Two packages were added, as [stack.md](architecture/stack.md) planned: `idb` 8.0.4 and `fflate` 0.8.3. No speed test was added: a save writes the whole level in one transaction, and the "saving only what changed" place in [performance.md](architecture/performance.md) stays empty until a measurement asks for it.
- `editor/saving` holds the contracts, `Autosave`, `EditorSettings`, `LevelOpener`, `ProjectFile` and `LevelExport`, `ImportCheck` and `LevelImport`, and `SaveIndicator`, one subfolder each; `editor/commands/file` holds New, Import, Export and `LevelReplacement`; `editor/history` gained `ReadOnlyMode`, `editor/time` the `TimeOfDay` contract. The adapters are `adapters/storage` (IndexedDB, `localStorage`, Web Locks, persist), `adapters/zip` (`FflateZipCodec`, `FflateZipReader`), `adapters/worker/import`, and `adapters/browser`'s `files/` and `page/`; `ui/top-bar` gained `SaveStateButton`, and `ui/shared/popup-closing` the closing it shares with `Menu`.
- **A second tab is read-only for good** in v1, since there is no "Edit here instead"; it opens the saved level and writes nothing. **A damaged saved record is kept under its own key**, and if keeping it fails, nothing is saved that session. **The crash note's time is the record's own `savedAtMs`.** **Dropping a file listens on the whole window**, not only the level view, so a file dropped on a panel isn't opened by the browser in place of the editor.
- **CI failed once** after step 10: a browser test waited a fixed ten timer turns for a dropped file's bytes, which CI's slower WebKit didn't give in time. It now waits for the `Imported` status; see [tech-notes.md](tech-notes.md).
- **Left for later stages:** Play's `saveNow()` (stage 16); the Assets panel's files in the project file and IndexedDB (v2); "Edit here instead" for a read-only tab (v3); saving only what changed, if a speed test ever asks.

### Stage 11, built on 2026-11-16

- All nine [steps](steps/stage-11.md) are done, one commit each. What the build showed is written into [clipboard-and-shortcuts.md](architecture/editor/clipboard-and-shortcuts.md#stage-11s-choices) as "as built" entries per step, each choice listed in [decisions.md](decisions.md#decided-under-the-standing-yes). No package was added, and no speed test: a paste is checked and added in one step, and its limits are the reader's.
- `editor/clipboard` holds `ClipboardCodec`, `ClipboardText` and `copiedRoots` in `codec/`, `IdRemapping` in `remapping/`, `PastePlacement` and `rootTransform` in `placement/`, and `EditorClipboard` with the `SystemClipboard` contract in `memory/`; `editor/commands` gained `clipboard/` with `CutCommand`, `CopyCommand`, `PasteCommand`, `DuplicateCommand`, `pasteEntities`, `pasteRefusalText` and `ClipboardEvents`, and `shared/` with `removeEntities` and `skippedRefusal`, shared with Delete; `editor/session` `TokenMaker` and `OpenLevel.sourceToken`; `core/level-data` `LevelReader.checkSubtree`; `adapters/browser` `ClipboardBridge`.
- **The clipboard text holds the copied set's box**, not its centre, so a paste can snap the box's top left to the grid. **Ctrl+C, Ctrl+X and Ctrl+V arrive as the browser's `copy`, `cut` and `paste` events**, which `ShortcutDispatcher` leaves to the browser through `shortcutsAsBrowserEvents`; the Edit menu's entries use the asynchronous clipboard and fall back to the last copy only when the read is refused. **Ctrl+D works everywhere in v1**, also in a text field; v2's code editor will be the exception.
- **CI hung on the drag speed test** after step 8: the test timed 120 frames back to back, and without a GPU their drawing piled up until the renderer's teardown passed its 30 s timeout. Each timed frame now waits for its drawing outside the timing; see [performance.md](architecture/performance.md#targets-and-their-tests).
- **Left for later stages:** Paste in place, `Paste here`, repeating a duplicate's move, and pasting between levels or tabs with the files a copy uses (v3); the code editor's exception to Ctrl+D (v2).

### Stage 10, built on 2026-11-16

- All eleven [steps](steps/stage-10.md) are done, one commit each. What the build showed is written into [drawing-and-points.md](architecture/editor/drawing-and-points.md#stage-10s-choices) as "as built" entries per step, each choice listed in [decisions.md](decisions.md#decided-under-the-standing-yes). No package was added, and no speed test: drawing adds one entity at a time.
- `editor/commands` gained `createShape` in `draw/` and `PointsTarget`, `PointsMove`, `nudgePoints`, `addPoint` and `deletePoints` in `points/`; `editor/tools` the Shape tool in `shape/` with `boxDrawing` and `polygonDrawing`, the readouts moved up to `readout/`, `undoDrawingStep()` on the tool contract, and in `select/` `PointEditState`, `PointPressState`, `PointBoxState`, `PointDragState`, `EditedPoints` and `PointHits`; `editor/history` `History.undoneOrRedone`; `editor/messages` `HighDetailRule`; `adapters/pixi` `DrawingPreviewOverlay` with `planDrawing` and the point handles in `SelectionOverlay`; `app` `EditorDrawingSource`; `ui` the Shape button, `ToolOptions` with `ShapeOptions`, and `EditorShell` dropping the Inspector's place.
- **Ctrl+Z reaches a drawing through `undoDrawingStep()`**, which the dispatcher asks when a press matches Undo, so every keyboard layout works. **While points are edited the arrows and Delete are the Select tool's**, even with no point selected, so they never move or delete the whole shape by surprise. **A path's points wait for v2's pen**: nothing in v1 makes a path with points.
- **Playwright runs in Chromium, Firefox and WebKit** from step 10 on, in CI too, instead of Chromium until stage 17.
- **Left for later stages:** the Inspector's and the Select tool's older Playwright tests still work on the camera, as stages 8 and 9 wrote them; the Shape tool's tests now cover a drawn shape and a real group, so moving the older ones to a drawn crate waits for stage 17's journeys (standing yes, 2026-11-16). Play finishing a drawing through `deactivate` (stage 16); the path's curve handles and sharp or smooth points, and the pen and Pencil (v2).

### Stage 9, built on 2026-11-16

- All seventeen [steps](steps/stage-09.md) are done, one commit each; step 16 was added when step 15 measured the drag at 22 ms. What the build showed is written into [selection-and-tools.md](architecture/editor/selection-and-tools.md#stage-9s-choices) as "as built" entries and the speed numbers into [performance.md](architecture/performance.md#targets-and-their-tests), each choice listed in [decisions.md](decisions.md#decided-under-the-standing-yes). No package was added.
- **The level file is nested in the code** (owner, 2026-11-15), as step 2, with no upgrade step: `level.json` holds one `world`, and each entity its `children`.
- `editor/history` gained `LiveEdit`; `editor/hit-testing` `HitTester` and `LinearSpatialIndex`; `editor/snapping` `GridSnapper`; `editor/tools` the tool contract, `ToolController`, `PanGesture`, `EscapeChain`, `OpenWindowCount`, `MousePosition` and the Select tool's states with `SelectionFrame` and `EntityResize`; `editor/commands` the nudges and `FieldSlide`; `core/physics` `countBodyChanges`; `adapters/browser` `PointerInput` with `ClickCounter`; `adapters/pixi` `SelectionOverlay` with `planSelection` and `ChunkedChildren`; `ui` the toolbar's `ToolButton`, the snapping switch, the mouse position, `Back to level` and `EntityPickButton`; `tests/performance` the two speed tests and `tests/levels/generator` their level.
- **The speed targets are met** on the owner's laptop: a click shows the selection within 13 ms at 10,000 entities, so `LinearSpatialIndex` stays, and dragging 1,000 of them keeps 95% of frames within 14.0 to 14.8 ms, after render chunks and culling only what changed. A level that puts everything inside one group gets one render chunk; if a level like that is slow, the render chunks go a level down.
- **The Playwright tests use the camera, not a group**, since the page can make no entity until stage 10's Shape tool.
- **Left for later stages:** point editing, so a double-click on a polygon or line only selects it, the Shape button, `ToolPreviewOverlay` and a Playwright test with a real group (stage 10); the Joint button (stage 14); the rest of the speed tests at 10,000 and 100,000 entities (stage 17); hover outlines, Alt+click, resizing several entities, the pivot marker and the Lock icon (v3).

### Stage 8, built on 2026-11-15

- All fifteen [steps](steps/stage-08.md) are done, one commit each. What the build showed is written into [inspector-and-entities.md](architecture/editor/inspector-and-entities.md#stage-8s-choices) as "as built" entries per step, each choice listed in [decisions.md](decisions.md#decided-under-the-standing-yes). No package was added.
- `core/fields` gained `ListFieldType`; `core/geometry` `convertShape` in `conversion/` and `ShapeOutlines`; `core/physics` `mergesInto` and `BodyMass`; `editor/inspector` `ValueInput`, `CardFolds`, `ListFolds` and `InspectorModel`; `editor/messages` `EditorMessages`, `MissingPartnerRule` and `MissingEntityRule`; `editor/commands/inspector` the edits `setFieldValue`, `setVectorAxis`, `addComponent`, `removeComponent`, `resetComponent` and `applyMessageFix`; `editor/history` `AddComponentChange` and `RemoveComponentChange`; `editor/status` `messagesCount`; `ui/inspector` the Inspector; `ui/fields` every field component; `ui/shared` `RowKindIcon`, `MenuSearch` and the entity row drop; `ui/status-bar` `MessagesCount`.
- **Two owner decisions came in during the stage** (2026-11-15) and were built in it: Points is one list field (step 2) and the World's gravity is one x, y vector (step 14). **101 in a gravity box is clamped, not refused** as step 14's line said, because the typing table clamps every number past its limit.
- **A vector is Mixed per axis**, and a box commits only its own axis. **A row dropped from the Entities panel reaches an entity field through a DOM event**, so neither panel imports the other. **A message's fix is plain data**, not a command id.
- **One browser test run of four failed one test** (2026-11-15), and the three reruns passed; the failing test wasn't shown. If it comes back, find it and write it in progress.
- **Left for later stages:** picking an entity for an entity field in the level view, and Esc's whole chain (stage 9); the Playwright tests' drawn crate instead of the camera, and `EntityNamer` (stage 10); keeping card folds after a reload, and the failed-save message (stage 12); the Inspector's read-only state during play (stage 16).

### Stage 7, built on 2026-11-15

- All twelve [steps](steps/stage-07.md) are done, one commit each. What the build showed is written into [inspector-and-entities.md](architecture/editor/inspector-and-entities.md#stage-7s-choices) as "as built" entries per step, and the open time into [performance.md](architecture/performance.md), each choice listed in [decisions.md](decisions.md#decided-under-the-standing-yes). `@tanstack/react-virtual` 3.14.26 is installed, see [stack.md](architecture/stack.md).
- **The fourth shape kind is a circle** (owner, 2026-11-15), changed through the code built in stages 2 to 4: an unevenly scaled circle is drawn as a stretched circle and collides as 32 points.
- `editor/entities-panel` holds `EntitiesRows` and `rowKind` in `rows/`, `RowClicks` in `clicks/`, `EntitiesDrop` in `drop/`, `RenameRequest` in `rename/` and `SelectionReveal` in `reveal/`, all held by `OpenLevel`; `editor/commands` gained `toggleEntityHidden` in `hide/`, `moveEntities` in `move/` and Rename (`edit.rename`, F2); `ui/entities-panel` holds `EntitiesPanel`, `EntitiesList`, `EntitiesListRow`, `RowNameBox`, `RowDrag` and `DropLine`.
- **A drag follows the pointer on the window**, so it survives its row scrolling out of the virtual list. **A selection made outside the panel unfolds the parents of every selected entity**; one made in the panel reveals nothing, so a drop into a folded group leaves it folded.
- **Left for later stages:** hover outlines between a row and the level view (v3); selecting in the level view, and Ctrl+Z being ignored during a row drag once `PointerInput` tells the dispatcher a button is held (stage 9; until then a change to the tree ends the drag like Esc); the panel's read-only state during play (stage 16); the lock (v3); the scrolling speed test at 10,000 and 100,000 entities (stage 17).

### Stage 6, built on 2026-11-15

- All eleven [steps](steps/stage-06.md) are done, one commit each. What the build showed is written into [ui.md](architecture/ui.md#stage-6s-choices) as "as built" entries per step, into [clipboard-and-shortcuts.md](architecture/editor/clipboard-and-shortcuts.md#keys) and [parts-and-folders.md](architecture/parts-and-folders.md), each choice listed in [decisions.md](decisions.md#decided-under-the-standing-yes). `lucide-react` 1.73.0 and `@fontsource/jetbrains-mono` 5.3.0 are installed, see [stack.md](architecture/stack.md).
- `editor/shortcuts` holds `KeyChord`, `KeyPress`, `ShortcutMap` and `ShortcutDispatcher`; `editor/commands` gained `CommandRunner` and `OpenDialog` in `running/` and About in `help/`; `editor/status` `selectionSummary`; `adapters/browser` `SystemClock`, `BrowserTimer` and `KeyboardInput`; `app/EditorComposition.ts` is the composition root; `ui` holds the theme, the shared pieces, `EditorShell`, the top bar, the main menu, the toolbar, the status bar and the dialogs. `app/startLevelView.ts` and `app/testLevel.ts` are gone.
- **Fitting fills only the part no panel covers** (`ViewState.setCoveredEdges`, reported by `FreeArea`), since the canvas fills the whole window. **A component that calls a command's `availability()` or `checked()` opts out of the React Compiler**, which would keep a method call's old answer.
- **Left for later stages:** the Entities panel and its F2 rename (stage 7); the Inspector and the editor messages' count (stage 8); `PointerInput`, the tools in the toolbar with their keys, the mouse position in the status bar, grid snapping, `EscapeChain`, `handleKeyUp`, the middle button's autoscroll and the `Back to level` button (stage 9); the save state and the `*` in the tab title (stage 12); Play (stage 16).

### Stage 5, built on 2026-11-15

- All eleven [steps](steps/stage-05.md) are done, one commit each. What the build showed is written into [editor/README.md](architecture/editor/README.md#stage-5s-choices) as "as built" entries per step, into [history.md](architecture/editor/history.md), [selection-and-tools.md](architecture/editor/selection-and-tools.md) and [entities-and-level.md](architecture/core-model/entities-and-level.md#copying-and-the-one-data-shape), each choice listed in [decisions.md](decisions.md#decided-under-the-standing-yes).
- `editor/session` holds `EditorSession`, `OpenLevel` and `CurrentGroup`; `editor/selection` `Selection`; `editor/history` `EditTransaction`, `History`, `LevelEditor` and the six changes in `changes/`; `editor/status` `StatusText` and `outcomeText`; `editor/time` `Clock` and `Timer` with their manual fakes; `editor/commands` the registry and the commands in `edit/`, `arrange/`, `view/` and `rename/`; `core/derived` `DerivedCaches`; `core/level-data` `LevelReader.readSubtree`.
- **`EditorSession` doesn't hold the commands:** `createCommandRegistry(session)` builds them on top of it, to avoid an import cycle. **Group goes into the frontmost selected entity's parent**, as the requirement words it. **Ungroup also removes the joints attached to the group.** **Joint icons and Camera frame got Shift+J and Shift+C.**
- Nothing was on the page yet: the page still drew `app/testLevel.ts` through `app/startLevelView.ts`, until stage 6 replaced them.
- **Left for later stages:** the menu, `CommandRunner`, `KeyboardInput`, `ShortcutDispatcher`, `SystemClock`, `BrowserTimer` and wiring `EditorSession` into the page (stage 6); Rename (F2) in the Entities panel (stage 7); `EditorMessages`, `AddComponentChange` and `RemoveComponentChange` (stage 8); `HitTester`, `LiveEdit`, grid snapping (Shift+G) and Esc's `EscapeChain` (stage 9); `EntityNamer` for shapes (stage 10).

### Stage 4, built on 2026-11-15

- All nine [steps](steps/stage-04.md) are done, one commit each. What the build showed is written into [adapters.md](architecture/adapters.md#stage-4s-choices) as "as built" entries, each choice listed in [decisions.md](decisions.md#decided-under-the-standing-yes). `pixi.js` 8.23.0 is installed, see [stack.md](architecture/stack.md).
- `editor/view` holds `ViewState` and `ViewSettings`; `editor/time` the `FrameScheduler` contract with `ManualFrames`; `adapters/browser` `AnimationFrames` and `DevicePixelRatio`; `adapters/pixi` `PixiLevelView`, `LevelDisplay`, `EntityNode`, `EntityDrawing` and the five overlays.
- **PixiJS runs without an `Application`**, through `autoDetectRenderer` with WebGL first, so there is no ticker and an idle view draws nothing. **Culling runs every render** from `BoundsCache`, so nothing tracks what moved. **The grid is drawn over the level**, because the World's fill is the background inside the level layer.
- **A WebGL canvas can't be read back after it is shown**, so the Playwright test reads colours from a screenshot of the canvas.
- **Left for later stages:** panning and zooming with the mouse (stage 9), F and the Zoom menu (stages 5 and 6), `Back to level` (stage 6), remembering the view (stage 12), `SelectionOverlay` (stage 9), `ToolPreviewOverlay` (stage 10), drawing during play (stage 16). `app/startLevelView.ts` and `app/testLevel.ts` go when stage 5's `EditorSession` and the editor page replace them.

### Stage 3, built on 2026-11-14

- All eight [steps](steps/stage-03.md) are done, one commit each. What the build showed is written into [geometry.md](architecture/core-model/geometry.md), each choice listed in [decisions.md](decisions.md#decided-under-the-standing-yes).
- **`clipper2-ts` only fills; the game's own `EarClipping` triangulates**, because the library's triangulation drops areas while reporting success. This builds an owner decision differently; see "Settled under the standing yes" above.
- `core/math` gained `exp` and `Units`; `core/geometry` holds `Bounds`, `PolygonLibrary` (the only file importing `clipper2-ts`), `EarClipping`, `ShapePieces`, `LineChains` and `MassProperties`; `core/derived` holds `PiecesCache` and `BoundsCache`.
- **Left for later stages:** `BodyMass` (which surfaces belong to a body) with the Inspector in stage 8. A joint's bounds came with the joint icons in stage 4.

### Stage 2, built on 2026-11-14

- All eight steps of the plan are done, one commit each, and the plan file is deleted. Its eight changes to the docs are written where they belong: a shape's kind and size are one stored `geometry`, `StoredValueDefinition`, the path's stored shape, the fill's kind `'fill'` and `alsoSatisfiedBy` in [components-and-fields.md](architecture/core-model/components-and-fields.md); `Level.createNew` without a registry and `LevelEditorData` in [entities-and-level.md](architecture/core-model/entities-and-level.md); the reader's refusals and where the 256 MB limit is checked in [persistence.md](architecture/persistence.md).
- `core/components` holds the ten v1 components and `createV1Registry`; `core/level-data` holds `LevelWriter`, `LevelReader`, `LevelLimits`, `PhysicsVersions` and an empty `FormatUpgrader`. A new level's `level.json` is recorded in `src/core/level-data/LevelWriter.newLevel.json`, and every component's round trip in `LevelReader.everyComponent.json`.
- The smaller choices made while building are in [decisions.md](decisions.md#decided-under-the-standing-yes).

### Stage 1, built on 2026-11-14

- All eight steps of the approved plan are done, one commit each, and the plan file is deleted. Its decisions are in [core-model/](architecture/core-model/README.md); what stays for later is in [plan.md](plan.md).
- `core/level` holds `EntityIdAllocator`, `EntityVersions`, `LevelSignals`, `LevelTree`, `Entity` and `Level`, with the tree's rules as tests. What differs from the docs is written into [entities-and-level.md](architecture/core-model/entities-and-level.md): an entity raises its own signal, which `Level` forwards, to keep imports one way.
- **Draw order puts the World first**, because its fill is the background; the docs had the whole walk backwards, which drew the World in front of everything.
- `core/derived` holds `WorldMatrixCache` and `HiddenCache`. Moving an entity between parents with skew in both keeps its level matrix to within 1e-9.
- `TextFieldType` has a `minLength`, so `parse` refuses an empty name. Test components for code that holds components are in `core/components/testing/`.

### Stage 0, built on 2026-11-14

- Steps 1 to 8 of the [plan](steps/stage-00.md) are done, one commit each, except steps 1 and 2, which are one commit: `src/app` has no file to type-check until `main.tsx` exists.
- `npm run check` passes on a clean `npm ci` in about 8 seconds. `npm run test:browser` passes in Chromium, Firefox and WebKit, `npm run test:e2e` passes.
- What the build showed differs from the plan is written into [tooling.md](architecture/tooling.md): `Math.f16round` (new in Node 26) is allowed in core, the ESLint guards switch off the type-aware rules, the circle between modules is a folder-scope rule in dependency-cruiser, and `tools/package.json` keeps the two doc tools CommonJS.
- WebKit needed three system packages on the laptop, installed with apt.

- **Gravity is one vector, x and y** (owner): the World's gravity is one vector field in m/s², default 0, 9.8, instead of strength, direction and custom angle, so zero gravity keeps no direction. The v3 gravity buttons set the vector's length. Stage 8 gained step 14 to change the code. See [world](requirements/physics/world.md#gravity-and-background-colour--v1).
- **Push's fixed kick is a vector, x and y** (owner), in px/s. See [triggers](requirements/triggers/triggers.md#actions--v2).

## Waiting for the owner

Nothing. Pushing works again (2026-11-15), and CI passes on GitHub.

## Next

1. **Stage 16 of [plan.md](steps/stage-16.md): test play.** Step 1 wrote its twelve steps and the [choices](architecture/simulation.md#stage-16s-choices); step 2, the game worker's protocol and `GameWorkerHost`, is next.
2. Then each stage in order. A stage ends with its tests passing, this file updated, and a commit.

## How to change a requirement

- The format of a topic file is in [requirements/README.md](requirements/README.md).
- A new decision is written into the feature's rules, with its reason as `*Why: ...*`. Rewrite the text from the decision, don't patch it.
- If the decision replaces an idea, add a row to [rejected.md](rejected.md).
- If a feature changes version, change its heading, its row in the topic's README and its row in [scope.md](scope.md).
- Run `node tools/check-docs.js`, then commit.

The original text of any review question can be found with `git log -p -S'"ID"' -- review/open.js` in `ecs-game-v2`.

## Open questions for the owner

Under the owner's standing yes (2026-11-14), Claude decides what the docs don't answer and lists it in [decisions.md](decisions.md#decided-under-the-standing-yes) for the owner to review whenever they like. The [review page](review.html) holds only round 10's record.

Left open by 2026-11-16's variables change, all for v2 unless marked. None blocks v1:

- **Which variable a trigger means.** Each check and action picks a target (`this`, `other`, a name, a tag). For "If coins is 10 or more", must the creator pick the World, or are the level's variables always offered beside the target's?
- **Who hears "a variable changes"** for an entity's own variable: only that entity, or every entity, with the entity in the event?
- **Reading another entity's variables from a script**, such as an enemy's `health` for a health bar.
- **Keep between runs for an entity's variables** (v3).
- **Choice, variable and list types** for variables. The examples now name the level's `coins` directly instead of letting the creator pick it.

## Before v2

The owner's changes to build after v1's stages and before v2 starts (resizing changes the scale, Z and X rotate, Ctrl+Shift resizes from the centre) are listed in [before-v2.md](before-v2.md), with their open questions.
