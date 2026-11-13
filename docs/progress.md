# Progress

## TL;DR

**The docs rewrite is half done** (2026-11-13). Written and committed: glossary, principles, scope, and three of the eight requirement topics (editor, drawing, assets), plus technical notes for those three. **Still to write:** physics (with joints), camera, triggers, scripts, play-and-save, then `overview.md`, `rejected.md`, `decisions.md`, the docs checker and the "nothing lost" check. No code exists. The source is `~/projects/ecs-game-v2` (read-only). The next session should read "How to continue" below and carry on with physics.

## Done

| File | State |
|---|---|
| [glossary.md](glossary.md), [principles.md](principles.md), [scope.md](scope.md) | Done |
| [requirements/editor/](requirements/editor/README.md) | Done, 4 files |
| [requirements/drawing.md](requirements/drawing.md) | Done |
| [requirements/assets/](requirements/assets/README.md) | Done, 3 files |
| [requirements/later.md](requirements/later.md) | Started: sprite sheets, public uploads. Publishing, accounts, replays, parallax, main menu still to add from source files 07, 11, 12 |
| [tech-notes.md](tech-notes.md) | Editor, drawing, assets done |

## Still to do, in order

1. `requirements/physics/`: `README.md`, `bodies.md`, `world.md`, `joints.md`. Source files 05 and 06 are already read, and the decisions that apply are listed under "Worked out for physics" below.
2. `requirements/camera.md` from source file 07.
3. `requirements/triggers/` from 09, plus inputs from 11 (scope ids TR, VA, IN).
4. `requirements/scripts/` from 10 (scope ids LU). The Lua API probably needs its own file.
5. `requirements/play-and-save/`: `test-play.md` and `saving.md` from 11 and 12 (scope ids PL, SA). Other files already link to these two names.
6. `requirements/README.md` (one line per topic), `docs/README.md`, `overview.md`, `decisions.md`, `rejected.md`, a small `CLAUDE.md` at the repo root.
7. `tools/check-docs.js`: every file has a TL;DR, stays under about 300 lines, links resolve, every `###` feature heading ends in `· v1`, `· v2` or `· Later`, dropped words appear only in the glossary and `rejected.md`.
8. The "nothing lost" check: every decision id in `ecs-game-v2/docs/requirements/review-decisions/round-*.md`, every D number in `00-decisions.md` and every scope id in `review/scope.js` must appear in a `Source:` line or in `rejected.md`.
9. Fix the topic links in `scope.md` (they point to `requirements/<topic>.md`, but editor, assets, physics, triggers, scripts and play-and-save are folders).

## How to continue

Each topic is rewritten from three layers in `ecs-game-v2`, and a later layer always wins:

1. The topic file in `docs/requirements/NN-*.md`: read sections 2 (requirements), 4 (edge cases), 5 (defaults), 8 (out of scope) and 11 (technical notes). Skip 7, 9, 10 and 13, which the review settled.
2. `docs/requirements/00-decisions.md` (D1 to D82).
3. `docs/requirements/review-decisions/round-1.md` to `round-12.md`. A later round wins over an earlier one.
4. `review/scope.js` gives each feature's version and the reason for it.

The format every topic file follows:

- A TL;DR, then one `###` heading per feature, ending in its version: `### The grid · v1`.
- Rules as short bullets in today's words (check [glossary.md](glossary.md), including its dropped words). A reason is added in italics as `*Why: ...*` only where the review recorded one. Never invent a reason.
- A `Source:` line closes each feature: `Source: scope ED4; round 3: 01 2.6; decisions: D12; old: WS-53`. `round N:` lists ids from that round's table, `decisions:` is for D numbers that appear only in `00-decisions.md`, `old:` is the requirement ids in the old topic file.
- Each file ends with a "Not in the scope review" table: features that were accepted but never given a version, with Claude's suggested version. These are suggestions, not decisions.
- Out-of-scope lists go to `rejected.md`, technical notes to `tech-notes.md`.
- Commit after each topic. Never change `ecs-game-v2`.

The original text of any review question can be found with `git log -p -S'"ID"' -- review/open.js` in `ecs-game-v2`.

## Worked out for physics

Source files 05 and 06 were read in full. These are the decisions that override them:

**Bodies and surfaces (05)**

- Words: BodyComponent is how something moves, SurfaceComponent is how it collides (05 2.1, round 6). Don't use "solid group", "fixture" or "collision category".
- BodyComponent fields, Box2D names (05 2.4, round 7): Type, Gravity scale, Linear damping, Angular damping, Fixed rotation, Bullet, read-only Mass in kg. The old draft's Start asleep, Starting velocity and Starting spin are not in this list: put them in the "not in the scope review" table.
- SurfaceComponent fields (SF1 round 7, changed by CT1 round 8): Density, Friction, Restitution, Sensor, One-way. No Category field, no material presets (05 2.5).
- One click adds a BodyComponent as Static, Dynamic or Kinematic (05 2.2, scope PH1). Open: whether that click also adds the SurfaceComponent, since AD2 says partners are never added automatically.
- A surface with no BodyComponent on it or above it acts as Static. Touch triggers need a SurfaceComponent. A coin is Shape + Surface (sensor) + Trigger (SN1, round 7).
- Merging: a shape inside a group with a body merges into it unless unticked. Nothing is lost when it changes (05 2.6, C8, scope PH4).
- Scale, rotate and skew freely. Collision always matches what you see. Bigger means heavier (05 2.7).
- One-way is a SurfaceComponent setting: a checkbox and a direction, up by default (OW1, 05 2.10, scope PH5 v2).
- A line can't go on a Dynamic body: the Dynamic option is greyed out with the reason (O8, round 2). Lines collide from both sides (D36).
- Physics view: debug view, off by default, editor and test play only, draws every physics shape whatever the eye or opacity says (05 2.8, scope PH8 v1, "Box2D draws it for us").
- Warnings table in 05 2.9 is v2 (scope ED10).
- No physics preview in the editor (05 2.16).

**World (05)**

- The World has a PhysicsWorldComponent: gravity, game speed, the collision grid (CF1, round 7).
- Gravity strength and direction, default 9.8 down, stored as strength and direction (D6, D38). Background colour. Both v1 (scope PH9). Gravity buttons Earth, Moon, Arcade, None are v2 (PH10). Game speed is v2 (PH11). Background image comes with images, v2.
- Collision grid uses tags (CT1, round 8): you pick which tags appear in the grid, an entity's tags decide what its surfaces hit, no grid tag counts as Default, with two grid tags it hits if either does, changes in play apply at once, up to 64 grid tags. v2 (PH6). In v1 every solid surface hits every other.
- Nothing extra for ragdolls: no "parts don't collide" setting (CF4, round 8, drops D37). CF3 was rejected.
- Collision check: right-click two entities, "Why do these collide?" (v2, PH7).
- Level bounds always exist, default 20000×10000 px, default grid 50 px = 1 metre (BND2, round 7). Each edge is a wall or open. Only entities fully outside an open edge are removed (D5, D40, 11 2.16). v1 (PH12). The "left the level" event is v2 (TR5).

**Joints (06)**

- A joint is an ordinary entity with a JointComponent. It can hold children, triggers and scripts (C9, G2, R45).
- v1: Hinge, Rope, Spring. v2: Weld, Rod, Slider, Wheel (JV2, round 8). Pulley and Gear later (D46).
- Joint tool: click where two physics entities overlap to connect them, or on one alone to pin it to the background (06 2.2). One-point joints take one click, two-ended joints (Rope, Spring, Rod) take two clicks, and ends snap to centres and corners (06 2.3, round 7).
- The JointComponent's two entities are fields A and B (06 2.4, round 8), not "Part" and "Base".
- A joint moves only when selected. In play the physics engine moves it. A joint inside a group moves with the group (JM1, replaces D45 and rejected 06 2.9). So the old "automatic place in the tree" rules are dropped.
- Copying copies a joint only when selected (JC1, rejected 06 2.10).
- Rope, Spring and Rod get a read-only PathComponent that the game keeps on the joint's ends, a zigzag for Spring. Adding a StyleComponent shows it in play (J1 round 3, scope JO5 v1). No other special drawing (D43).
- Breaking destroys the joint entity. No "joint broke" event (JB1, scope JO3 v2).
- Typed settings per type are v1 (JO1). Dragging limits on the level is v2 (JO2). Dragging an end elsewhere or changing type is v2 (JO4).
- "Let connected objects collide", off by default for most joints (06 2.14).
- Deleting an entity deletes its joints. Deleting a joint deletes only the joint (06 2.11).
- Used by list replaces the old "joints of this body" section (LK1). Joint icons are a View menu switch (VW1).
- Joint warnings are v2 (ED10, 06 2.13).
- The technical notes in 05 and 06 describe Box2D v2.4.1. The review assumes Box2D v3 (64 collision bits, determinism). Mark them as "recheck against v3".

## Open questions for the owner

Found while rewriting. None was decided by Claude.

1. **Features without a version.** Each topic file ends with a "Not in the scope review" table. One pass over them is needed.
2. **Transform or TransformComponent?** The principle says component names end in `Component`, but every source writes "Transform". Also assumed: `TagsComponent`.
3. **Does the Joint tool stay active after placing a joint?** D11 said yes. R11 (later) says tools return to Select. Written as: all tools return, tool lock keeps one active.
4. **Removing a component that others need.** The old rule removed the dependants too. With "nothing behind the user's back", suggested: remove only that one and let the other cards show their note.
5. **Adding physics in one click:** does it add the SurfaceComponent together with the BodyComponent?
6. **Version history** was rejected in round 11 (12 A5), but the scope page listed it under "Not v1". Written as rejected.
7. **A main menu, component presets, level ids, thumbnails** are "not v1" with no version. Written as Later.
8. **50 MB of files per level** (round 6) and a **256 MB level file** (round 11): do both stand?
9. **Text size by dragging a corner** was written before the text box (TX2). Keep?
10. **The "entities here" right-click list**: the review kept only Alt+click. Dropped?
11. **Changing a builtin file:** assumed you copy it into your own folder first.
12. **Spawn settings:** what the trigger's Spawn action offers (position, speed), now that `spawn(path)` returns an id.
13. **Events between builtin scripts** (`damage`, `heal` and so on) were never reviewed.
