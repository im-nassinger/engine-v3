# Progress

## TL;DR

**Everything before code is done and approved:** the requirements, the scope, and the [architecture](architecture/README.md) (owner, 2026-11-14). Every feature has a version. **v1 is a level you build and watch**, with all logic in v2. **Next: stage 0 of [plan.md](plan.md), project setup.** Its detailed plan was approved on 2026-11-14 and is written into [tooling.md](architecture/tooling.md) and the [plan's stage 0 steps](plan.md#stage-0-in-steps). One question is open, about the polygon library, needed by stage 3. No code exists yet.

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
| The stage 0 plan | Done, approved by the owner on 2026-11-14, written into [tooling.md](architecture/tooling.md) |
| Small features without a version | Done: all given a version in round 7 |
| Code | Not started. Next: stage 0 |

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
- **The stage 0 plan is approved** (owner): all ten changes to the architecture docs, including **Node 26** instead of 24, `jiti`, dependency-cruiser, the guard tests and the worker files in `src/app/workers/`. See [decisions.md](decisions.md).

## Next

1. **Stage 0 of [plan.md](plan.md): project setup**, in the [eight steps](plan.md#stage-0-in-steps). Waits for the owner to say start. Step 6 may need the owner's password, step 7 needs a push.
2. Then each stage in order. A stage ends with its tests passing, this file updated, and a commit.

## How to change a requirement

- The format of a topic file is in [requirements/README.md](requirements/README.md).
- A new decision is written into the feature's rules, with its reason as `*Why: ...*`. Rewrite the text from the decision, don't patch it.
- If the decision replaces an idea, add a row to [rejected.md](rejected.md).
- If a feature changes version, change its heading, its row in the topic's README and its row in [scope.md](scope.md).
- Run `node tools/check-docs.js`, then commit.

The original text of any review question can be found with `git log -p -S'"ID"' -- review/open.js` in `ecs-game-v2`.

## Open questions for the owner

When several come up, they go on the [review page](review.html) all at once, not a few per round (owner, 2026-11-14).

1. **Which polygon library does core use?** (found 2026-11-14, needed by stage 3) [geometry.md](architecture/core-model/geometry.md) has `clipper2-js` cut self-crossing polygons and triangulate them. `clipper2-js` 1.2.4 has no triangulation, was last published on 2024-01-01, and brings Angular 15 into the project when installed. A candidate is `clipper2-ts` 2.0.1-19 (published 2026-11-07, has triangulation, needs no other package), not tried yet. Both call `Math.sin` and others somewhere inside, so stage 3 must check the functions it uses never reach them. Stage 0 keeps the library's name in one constant of the ESLint config, so the answer changes one line.
