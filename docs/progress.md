# Progress

## TL;DR

**Everything before code is done and approved:** the requirements, the scope, and the [architecture](architecture/README.md) (owner, 2026-11-14). Every feature has a version. **v1 is a level you build and watch**, with all logic in v2. **The editor's look is settled** (owner, 2026-11-14): direction A of the [mockups](design/mockups/index.html), written as a design system in [design/](design/README.md). **Stage 0, the project setup, is built** (2026-11-14): every check runs with `npm run check`, the browser tests run in three browsers, and an empty page builds. **Only CI hasn't run, because it needs a push**, which waits for the owner. **Now: stage 1 of [plan.md](plan.md), the model**, following its [approved plan](proposals/stage-1.md): imports in core go one way, `DeterministicMath` (without `exp`) is built now, and skew is strictly between −90° and 90°. **Round 9 is answered** (owner, 2026-11-14): every pick as suggested, and stage 3 tries `clipper2-ts`. Nothing is open.

## Where things stand

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
| Stage 0, project setup | Done, except the first CI run, which needs a push. See below |
| Code | Stage 1, the model: steps 1 to 6 of 8 done (signals, `DeterministicMath`, `Matrix2D`, the field types, the components with TransformComponent and NameComponent, `Entity` and `Level`). Next: step 7, the caches. See [proposals/stage-1.md](proposals/stage-1.md) |

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

### Stage 1, step 6, built on 2026-11-14

- `core/entities` holds `EntityIdAllocator`, `EntityVersions`, `LevelSignals`, `LevelTree`, `Entity` and `Level`, with the tree's rules as tests. What differs from the docs is written into [entities-and-level.md](architecture/core-model/entities-and-level.md): an entity raises its own signal, which `Level` forwards, to keep imports one way.
- **Draw order puts the World first**, because its fill is the background; the docs had the whole walk backwards, which drew the World in front of everything.
- The test with skew in both parents comes with step 7, `WorldMatrixCache`.

### Stage 0, built on 2026-11-14

- Steps 1 to 8 of the [plan](plan.md#stage-0-in-steps) are done, one commit each, except steps 1 and 2, which are one commit: `src/app` has no file to type-check until `main.tsx` exists.
- `npm run check` passes on a clean `npm ci` in about 8 seconds. `npm run test:browser` passes in Chromium, Firefox and WebKit, `npm run test:e2e` passes.
- What the build showed differs from the plan is written into [tooling.md](architecture/tooling.md): `Math.f16round` (new in Node 26) is allowed in core, the ESLint guards switch off the type-aware rules, the circle between modules is a folder-scope rule in dependency-cruiser, and `tools/package.json` keeps the two doc tools CommonJS.
- WebKit needed three system packages on the laptop, installed with apt.

## Next

1. **Push, when the owner asks,** so CI runs for the first time on x86 and ARM (step 7 of stage 0).
2. **Stage 1 of [plan.md](plan.md): the model.** The work follows the eight steps of [proposals/stage-1.md](proposals/stage-1.md).
3. Then each stage in order. A stage ends with its tests passing, this file updated, and a commit.

## How to change a requirement

- The format of a topic file is in [requirements/README.md](requirements/README.md).
- A new decision is written into the feature's rules, with its reason as `*Why: ...*`. Rewrite the text from the decision, don't patch it.
- If the decision replaces an idea, add a row to [rejected.md](rejected.md).
- If a feature changes version, change its heading, its row in the topic's README and its row in [scope.md](scope.md).
- Run `node tools/check-docs.js`, then commit.

The original text of any review question can be found with `git log -p -S'"ID"' -- review/open.js` in `ecs-game-v2`.

## Open questions for the owner

Nothing is open (2026-11-14).

When several come up, they go on the [review page](review.html) all at once, not a few per round (owner, 2026-11-14).
