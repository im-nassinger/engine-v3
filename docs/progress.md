# Progress

## TL;DR

**The docs rewrite is half done** (2026-11-13). Written and committed: glossary, principles, scope, and five of the eight requirement topics (editor, drawing, assets, physics, camera), plus technical notes for those five. **Still to write:** triggers, scripts, play-and-save, then `overview.md`, `rejected.md`, `decisions.md`, the docs checker and the "nothing lost" check. No code exists. The source is `~/projects/ecs-game-v2` (read-only). The next session should read "How to continue" below and carry on with triggers.

## Done

| File | State |
|---|---|
| [glossary.md](glossary.md), [principles.md](principles.md), [scope.md](scope.md) | Done |
| [requirements/editor/](requirements/editor/README.md) | Done, 4 files |
| [requirements/drawing.md](requirements/drawing.md) | Done |
| [requirements/assets/](requirements/assets/README.md) | Done, 3 files |
| [requirements/physics/](requirements/physics/README.md) | Done, 3 files |
| [requirements/camera.md](requirements/camera.md) | Done |
| [requirements/later.md](requirements/later.md) | Started: sprite sheets, public uploads. Publishing, accounts, replays, parallax, main menu still to add from source files 07, 11, 12 |
| [tech-notes.md](tech-notes.md) | Editor, drawing, assets, physics, camera done |

## Still to do, in order

1. Done: physics.
2. Done: camera.
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
15. **Events between builtin scripts** (`damage`, `heal` and so on) were never reviewed.
