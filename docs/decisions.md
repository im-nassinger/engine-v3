# Decisions

## TL;DR

Project-level choices and why: starting over, how the requirements were settled, how versions were set, and how these docs are organised. **What the game does is not decided here.** Those decisions are in [requirements/](requirements/README.md), each with its reason and source, and what was decided against is in [rejected.md](rejected.md).

## 2026-11-13: Start over from scratch

The first attempt (`~/projects/ecs-game`) reached Stage 3 of 13, but the owner was unhappy with the code. The project starts again with no code from it. Only the functional requirements were carried over.

The old technical design, implementation plan and stage notes stay in the old project. Its implementation choices worth a second look are listed at the end of [tech-notes.md](tech-notes.md).

## 2026-11-13: The requirements were settled in a 12-round review

The carried-over requirements were 12 big topic files. The owner reviewed them in 12 rounds of yes/no questions, and each round could change or override an earlier one. That left three layers that disagreed: the topic files, a list of 82 accepted decisions, and the 12 rounds. The rule for reading them: **a later layer always wins**, and a later round wins over an earlier one.

The review also produced the [principles](principles.md): each is something the owner corrected more than once.

## 2026-11-13: Versions were set in a separate scope review

Versions are never decided inside a requirement. One scope review went through 117 features with a proposed version and reason for each, and the owner accepted every pick. **v1 is the smallest thing that can be tested.** The result is [scope.md](scope.md).

## 2026-11-13: Clean docs in a new project

The three layers were rewritten into one set of docs in `~/projects/engine-v3`, a fresh git repo. `~/projects/ecs-game-v2` (GitHub: `im-nassinger/engine-v2`) is the source and is left as it is.

What the owner asked for: docs that a person or a future AI session can read and trust, as few files as possible with nothing important lost, no file too big to read in full, high level first and detail after, a TL;DR on every file, and a version and a reason on every requirement.

How the docs do it:

- **Rewritten, not patched.** Each topic was written again from the old file plus every decision that touched it, in today's words.
- **Eight topics instead of twelve:** editor, drawing, assets, physics, camera, triggers, scripts, play and save. A small topic is one file, a bigger one is a folder with a README.
- **Every feature heading carries its version**, and every feature ends in a `Source:` line, so a rule can be traced back to the review.
- **One place per fact.** Other files link to a rule instead of repeating it.
- **What isn't a requirement has its own file:** [rejected.md](rejected.md) for what was decided against, [requirements/later.md](requirements/later.md) for features not designed yet, [tech-notes.md](tech-notes.md) for what the old research learned about browsers, Box2D and Lua.
- **Two scripts check the docs.** `tools/check-docs.js` checks the form. `tools/check-sources.js` proves that every review decision and scope id is cited somewhere, so nothing was lost in the rewrite. That proof is finished: it keeps running only so a citation isn't deleted by accident. Decisions made after the review are cited as `owner: <date>`, which it doesn't read.

Where this differs from the earlier plan (`docs-cleanup-plan.md` in the old project): `scope.md` was kept as the one-page list of every feature, the technical notes are one file instead of one per topic, and a small topic is a single file instead of a folder.

## 2026-11-13: A smaller v1

The owner found v1 too big: 107 features, some of them settled before the scope review and never put through "smallest thing that can be tested". **v1 is now a level you build and watch:** coloured shapes, bodies, three joints, Play, Stop, Pause and Step, saving and export, with no logic. The cut is "no logic" because the smallest player you can steer is the builtin player, which is a Lua script, so any logic brings Lua, the code editor and the Console with it.

43 features moved to a new **v2, logic and play**: triggers, variables, inputs, scripts, the code editor and the Console, the Assets panel, `.entity` files and spawning, the builtin player, Win and Lose, the pause menu, the random seed, Panels, text, entities inside the camera, the Bézier pen and the Pencil, gradients, and the shortcut sheet. The old v2 became **v3**, and accounts and publishing became **v4**. The one rule that changed: v1 shows only three tools, Select, Shape and Joint.

The trade-off the owner accepted: nobody can play a v1 level, only watch it, and the game loop is built before scripts exist. The written v2 rules are what keep the architecture planning for them.

## 2026-11-14: The architecture is approved

After seven rounds on the [review page](review.html), the owner approved the architecture and every open question. The proposal moved to [architecture/](architecture/README.md), its plan became [plan.md](plan.md), and its words joined the [glossary](glossary.md). In the last round the owner asked for **every open question on one page at once** instead of a few per round, so all 119 small features without a version were given one together, as Claude suggested: 14 in v1, 12 in v2, 80 in v3, 13 Later, and three dropped (see [rejected.md](rejected.md)).

## 2026-11-14: The stage 0 plan is approved

The owner approved the detailed plan for stage 0 and all ten places where it differed from the architecture docs. They are written into [tooling.md](architecture/tooling.md), [stack.md](architecture/stack.md), [parts-and-folders.md](architecture/parts-and-folders.md), [testing.md](architecture/testing.md), [adapters.md](architecture/adapters.md) and [plan.md](plan.md):

- **Three fixes to setups that didn't work as written:** `jiti` so ESLint can read `eslint.config.ts`; test files in core may import `vitest`; the worker entry files move to `src/app/workers/` and each part's `tsconfig.json` sits inside its folder.
- **Four gaps closed in the checks:** dependency-cruiser for module entries and circles; all 22 approximated `Math` functions, `**`, `Date` and `Intl` banned in core, and `Date` and `Math.random` in editor; ESLint reads types, so a dropped promise is an error; guard tests for every check.
- **Three choices:** ESLint keeps the owner's TypeScript style where it has a built-in rule; **Node 26** instead of 24; each library is installed by the stage that first uses it.

Every setup was first tried in a throwaway folder outside the project. The proposal was deleted once written in.

## 2026-11-14: The stage 1 plan is approved

The owner approved the three places where the stage 1 plan differs from the architecture docs. **Imports in core go one way**, entities → components → fields → events. **`DeterministicMath`'s `sin`, `cos`, `atan2` and `sinCos` are built in stage 1**, because `Matrix2D` needs them and core bans `Math.sin`. **Skew is strictly between −90° and 90°.** They are written into [core-model/](architecture/core-model/README.md), [plan.md](plan.md) and [inspector-and-undo.md](requirements/editor/inspector-and-undo.md).

## 2026-11-14: The owner's standing yes

The owner: "from now on, I agree with all your decisions, since they are minor decisions (the important ones are already decided). so you can just implement the project without waiting for me." So **Claude decides what the docs don't answer and keeps building.** A stage's plan is no longer proposed first: its decisions are written into the architecture docs as the stage is built. Each decision made this way is written where it belongs, with its reason, marked *(standing yes, date)* or cited `owner: <date>` on a `Source:` line, and listed below so the owner can review them in one place and overturn any.

## 2026-11-14: The runner builds v1 without the owner

The owner asked for v1 to be built to the end with nobody typing "continue": one fresh Claude session per step, progress on Discord, and waiting out the usage limit on its own. That is the [runner](runner.md). For it to finish alone, the owner agreed to three changes: **Claude pushes `master` after each step** (before, pushes waited for the owner to ask), **stage 17's layout and phone checks are Playwright tests** instead of checks by hand, and **anything that needs `sudo` is sent to Discord** while the work goes on without it.

### Decided under the standing yes

| Date | Decision | Written in |
|---|---|---|
| 2026-11-14 | Round 10 took every pick: the stage 2 plan with its eight changes; background `#BFE3F5` with no outline; custom gravity angle starts at 90°; grid size 5 to 1,000 px, whole; camera 160 to 7,680 px each way; Smoothing 0 to 5 s, starting at 0.3 s; joints only from the Joint tool; one shared Match drawn distance; Length and Rest length 100 px when missing; a flat line has height 0; StyleComponent values change in play, the camera's size, Walls and Merge don't; a missing TransformComponent or NameComponent reads as defaults; the descriptions as proposed | [world](requirements/physics/world.md), [workspace](requirements/editor/workspace.md), [camera](requirements/camera.md), [joints](requirements/physics/joints.md), [drawing](requirements/drawing.md), [bodies](requirements/physics/bodies.md), [saving](requirements/play-and-save/saving.md), [inspector](requirements/editor/inspector-and-undo.md), [components](architecture/core-model/components-and-fields.md), [persistence](architecture/persistence.md) |
| 2026-11-14 | Follow and Smoothing change during play (v3's Change value sets them), and so do the gravity fields; the PhysicsWorldComponent's card comes last, at 10 | [components](architecture/core-model/components-and-fields.md) |
| 2026-11-14 | A component's Lua index is its order in `createV1Registry`, and new types only go at the end; the registry also lists `all()` in that order, for the schema tests; `LevelEditorData` keeps the grid size whole from 5 to 1,000 px by rounding and clamping, lists folded rows lowest id first, and its changes move the level's version so autosave sees them | [components](architecture/core-model/components-and-fields.md), [entities](architecture/core-model/entities-and-level.md) |
| 2026-11-14 | `LevelWriter` writes every value, defaults included, components in card order; `writeSubtree` keeps each root's own parent id; `FormatUpgrader`'s latest version is one more than its step count; limits are a plain `LevelLimits` object the reader takes; the new level's `level.json` is recorded as a JSON file the test imports, with `resolveJsonModule` on | [persistence](architecture/persistence.md), [tooling](architecture/tooling.md) |
| 2026-11-14 | `LevelReader` wants every top-level and entity key, and only component values read as defaults; a physics version above the game's is `newerVersion`; values go through `writeValue`, so they are clamped as when typed; folded rows of missing entities are dropped; the level is built only after every check, through a new `Level.createEmpty(worldId, cameraId)`; `readJson` refuses text that isn't JSON as not a level | [persistence](architecture/persistence.md), [entities](architecture/core-model/entities-and-level.md) |
| 2026-11-14 | Stage 3's eight steps; `PolygonLibrary` is the one file that imports `clipper2-ts`, using only its whole-number functions; its one `Math.atan2`, compared only with 0, is accepted if a test confirms it; an even ellipse's polygon for play isn't cached; joint bounds wait for stage 4's icons; `BodyMass` waits for the Inspector; `exp` is checked relatively over −700 to 700 | [plan](plan.md#stage-3-in-steps), [geometry](architecture/core-model/geometry.md) |
| 2026-11-14 | **`clipper2-ts` only fills; the game triangulates with its own `EarClipping`**, because the library's triangulation drops areas (a one-stroke star loses its middle, about 1.4% of random polygons lose area) while reporting success. The owner's "ask again if it fails" couldn't run unattended, so this is the closest fix. Also: `Bounds`' shape, with touching edges counting as overlapping; pixels scaled by 1,000 for the library; a second union merges outlines inside dropped holes; outlines turn the positive shoelace way | [geometry](architecture/core-model/geometry.md), [stack](architecture/stack.md), [plan](plan.md#stage-3-in-steps) |
| 2026-11-14 | `exp` is fdlibm's `e_exp` with 2ᵏ built by multiplying powers of two; `Units` also has `toDegrees`, and speeds use the length and angle functions | [geometry](architecture/core-model/geometry.md) |
| 2026-11-14 | `ShapePieces` also returns the cleaned filled outlines; points within 0.01 px of straight are dropped in step 1; merging drops only exactly straight corners, so pieces cover the outline exactly; the short side is measured across each edge; circles under 1 px are dropped; ellipse points go through the library like any polygon | [geometry](architecture/core-model/geometry.md#the-polygon-pipeline) |
| 2026-11-14 | `LineChains` keeps the line's ends in place when merging close points, cuts where the line crosses, touches or passes through its own point again, and doesn't cut segments lying along each other; the Box2D adapter adds each chain twice, once reversed | [geometry](architecture/core-model/geometry.md#the-polygon-pipeline) |

## Still to decide

Nothing waits for the owner. Under the standing yes, new questions are decided and listed above instead of asked.
