# Progress

## TL;DR

**The docs rewrite is about 80% done** (2026-11-13). Written and committed: glossary, principles, scope, and seven of the eight requirement topics (editor, drawing, assets, physics, camera, triggers, scripts), plus technical notes for those seven. **Still to write:** play-and-save (test play and saving), then `overview.md`, `rejected.md`, `decisions.md`, the docs checker and the "nothing lost" check. No code exists. The source is `~/projects/ecs-game-v2` (read-only). The next session should read "How to continue" below and carry on with play-and-save.

## Done

| File | State |
|---|---|
| [glossary.md](glossary.md), [principles.md](principles.md), [scope.md](scope.md) | Done |
| [requirements/editor/](requirements/editor/README.md) | Done, 4 files |
| [requirements/drawing.md](requirements/drawing.md) | Done |
| [requirements/assets/](requirements/assets/README.md) | Done, 3 files |
| [requirements/physics/](requirements/physics/README.md) | Done, 3 files |
| [requirements/camera.md](requirements/camera.md) | Done |
| [requirements/triggers/](requirements/triggers/README.md) | Done, 2 files |
| [requirements/scripts/](requirements/scripts/README.md) | Done, 2 files |
| [requirements/later.md](requirements/later.md) | Started: sprite sheets, public uploads. Publishing, accounts, replays, parallax, main menu still to add from source files 07, 11, 12 |
| [tech-notes.md](tech-notes.md) | Editor, drawing, assets, physics, camera, triggers, scripts done |

## Still to do, in order

1. Done: physics.
2. Done: camera.
3. Done: triggers.
4. Done: scripts.
5. **Next:** `requirements/play-and-save/`: `README.md`, `test-play.md` and `saving.md` from source files 11 and 12 (scope ids PL1 to PL11, SA1 to SA6). Other files already link to these two names. Neither source file has been read yet, except 11's input sections (2.10 to 2.12), which are already in `triggers/variables-and-inputs.md`. Decisions that apply:
   - Test play: UI1, PS1, PS2, PN1, RS2 (no restart key), PM1 (Tab opens the pause menu, R restarts, Esc only leaves full screen), LS1 (a run is playing, won or lost, one end window), SD1 and SD2 with CL1 (seed, determinism test), 11 2.1 to 11 2.22 in rounds 9 and 10, D13, D69, D73 to D77, K1, R54.
   - Rejected there: Play from here (11 2.5), a title card (11 2.14), a suggested way to handle lives (11 2.16), reduced motion (11 2.21), replacing the end window (D74).
   - Saving: LV1, SV1, SV2, ST1 (round 12, the storage request), TB1, EXT1, FMT1, FMT2, 12 A1 to A12 in round 11, D8, D30, D79, D80.
   - Add what 11 and 12 say about publishing, accounts and replays to `requirements/later.md`. Also add parallax and the main menu there.
   - Then add the play-and-save rows to `rejected.md` and remove its "draft" note.
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
13. **Follow by tag:** can the camera's target be a tag, so a spawned player is found without a script?
14. **Does the camera have an eye?** The review says no, but the old draft used it to hide everything inside the camera.
15. **Can a variable hold text**, or only numbers?
16. **Inputs of a new level:** suggested `left`, `right`, `up`, `down`, `jump`.
17. **The Trigger zone tool** is in the tool list but has no version. Suggested v1.
18. **The Lua function list** has to be rewritten as functions that take ids. The old one used an object style the review rejected.
19. **How a script declares its settings, and how it names its own entity**, were never written.
20. **Events between builtin scripts** (`damage`, `heal` and so on) were never reviewed.
