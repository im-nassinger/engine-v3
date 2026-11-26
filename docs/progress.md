# Progress

## TL;DR

**v1 is built** (stages 0 to 19, done 2026-11-19), with 2,048 tests in Node, 1,269 browser tests and 292 Playwright tests in three browsers. **The versions after v1 are small** (owner, round 12, 2026-11-20): v2 curves and gradients, v3 a first game without code, v4 the rest of the triggers, v5 scripts, v6 text, v7 `.entity` files and the builtin player; see [scope.md](scope.md). **v2 is done** (curves and gradients): built, tried by the owner, the [fixes](versions/v2/fixes.md) asked built, and the owner's last test passed (2026-11-22); its lasting parts are in [architecture/](architecture/README.md). **v3 is done** (a first game without code: tags, the World's variables and inputs, triggers, the Trigger tool, Win, Lose and Restart): built by the orchestrator, tried by the owner, its two [fixes](versions/v3/fixes.md) built, and marked sound by the owner (2026-11-22). **v4 is built** (the rest of the triggers, string and boolean variables on any entity, the shortcut list): the orchestrator built its [tasks](versions/v4/tasks.md) 1 to 17 (2026-11-22 to 2026-11-23), and **the owner tried it and found it ok** (task 18, 2026-11-24); the [fixes](versions/v4/fixes.md) asked so far are built: the trigger card's pickers and boxes, and **simpler triggers** (six events, one check, no Push, no Sensor setting; 2026-11-23). **The trigger card is Scratch blocks** (owner, 2026-11-24, [fix](versions/v4/fixes.md) 4), built by the orchestrator in tasks 19 to 26 (2026-11-25); the owner tried it and found it ok (task 27, 2026-11-25), with fixes 5 to 8 built from the try; **fixes 9 to 13 are being built by the orchestrator** (tasks 28 to 36). Its plan stays in [versions/v4/](versions/v4/requirements.md); its lasting parts are in [architecture/](architecture/README.md), mainly [core-model/triggers.md](architecture/core-model/triggers.md) and [triggers-in-play.md](architecture/triggers-in-play.md). The repo is public since 2026-11-20, so CI runs on every push.

## Last session (2026-11-26)

The owner tried the build on Netlify and asked for changes, built and deployed:

1. The Entity inspector and the Entities viewer are 400 px and never shrink; small windows are for later (they overlap under 888 px). Later that day: **380 px**, with the dialogs and the shortcut sheet (they overlap under 848 px).
4. The trigger's drag grip is gone: its `…` menu has Open in window, Move up and Move down. **Open in window** shows the trigger in a 600 px window over a scrim. Hovering under a script's last block opens the last "add a block" slot. See [controls.md](design/controls.md#the-triggers-menu-and-window-owner-2026-11-26).
2. Mass drags like Density (0 to the mass at density 100), and a Static or Kinematic body shows its Mass as `∞ kg`, read-only, instead of hiding it. The picks are in [decisions.md](decisions.md).
3. The console's PixiJS `[BindGroup] … destroyed while still bound` warnings were looked into, not fixed: PixiJS keeps a never-cleared cache of every set of textures a Graphics drew, and warns when one is destroyed. Ours are gradient textures, destroyed when no entity uses them (changing a gradient's colours drops the old one). Harmless; reusing old gradient textures in `GradientTextures` instead of destroying them would silence it. Waiting for the owner.

## Session before (2026-11-25)

The owner tried fix 4's Scratch blocks (task 27) and asked for changes.

1. Hovering a value box seemed to leave the "add a block" slot open. It didn't reproduce on the current code in any browser, so the app was published to Netlify; there it worked.
2. [Fix](versions/v4/fixes.md) 5, built: the script is 4 to 10 blocks tall; no "Doesn't run until every yellow part is set." note; value boxes are pills in new colours (amber when unset); a right click on a block opens Replace and Delete; the event's box only switches its own kind (starts or stops), and an action's own word is plain text, since Replace changes the block. The rules are in [controls.md](design/controls.md#v4-fix-5-the-blocks-after-the-owners-try), the picks in [decisions.md](decisions.md).

3. [Fix](versions/v4/fixes.md) 7: a slot sometimes opened at once instead of over 400 ms. First fixed for slow frames (a frame moves it by 34 ms at most); the owner still saw it, and the real cause was a script shorter than its least height (one or two actions), where the slot jumped 27 px in one frame. Fixed and deployed.

4. [Fix](versions/v4/fixes.md) 8: a copied entity whose name ends in a number gets the next number for its word (copying `Entity 1` makes `Entity 2`), in Paste and Duplicate.

5. The owner asked for more, written down to plan and build later ([fixes](versions/v4/fixes.md) 9 to 12): show the "Every entity tagged" target group even with no tag in the level; multiply and divide in Change value, and a variable of the matching type in any trigger block's value box; the pen not closing a path ended on its first point ([bugs.md](bugs.md), with tips on the likely cause); lengths in metres everywhere. Fix 12's questions were settled: ☰ offers metres and pixels, pixels per metre is a World setting, default 100, not the grid size (Claude, asked to decide), and old levels aren't converted.
6. A new [principle](principles.md) (owner): until levels can be published, a change may break the levels saved so far; nothing is converted.

**Where we stopped:** fixes 5 to 8 are pushed and on Netlify. The owner settled the backlog (2026-11-25): the fix 4 try (task 27) is done, grid snapping is ok, the card says "other" (fix 13), and v4 fixes 9 to 13 come before v5. They are planned in [fixes-9-to-13-plan.md](versions/v4/fixes-9-to-13-plan.md) as tasks 28 to 36 of [tasks.md](versions/v4/tasks.md), built by the orchestrator, one session per task, to save the owner's tokens.

## Where things stand

| Part | State |
|---|---|
| Requirements, scope, glossary, principles, the [architecture](architecture/README.md), the [design system](design/README.md) | Done and approved (owner, 2026-11-14), kept up to date |
| v1 | Built: stages 0 to 19 in [plan.md](plan.md). What each stage showed is in [stages-built.md](stages-built.md), its steps in [steps/](steps/README.md), and what was settled along the way in [settled.md](settled.md) |
| [v2](versions/README.md) | Done (owner, 2026-11-22): gradients, the pen, the Pencil, point editing on paths, their journeys and speed tests, all four speed targets met. The owner tried it (task 18), the 12 [fixes](versions/v2/fixes.md) are built, and the owner marked it done after testing them. Its plan stays in [versions/v2/](versions/v2/requirements.md); what it built is now in [architecture/](architecture/README.md) |
| v3 | Done (owner, 2026-11-22): the four components and their cards, the trigger card, the Trigger tool, triggers in test play, the end window and Restart, the determinism levels, three journeys, and the 1,000 touch triggers speed test, which meets test play's targets. Its plan stays in [versions/v3/](versions/v3/requirements.md); what it built is now in [architecture/](architecture/README.md) |
| [v4](versions/v4/requirements.md) | **Built and tried** (the owner found it ok, task 18, 2026-11-24); fix 4, the Scratch trigger card, is built (tasks 19 to 26) and the owner is trying it (task 27), with fix 5 built from the first asks: variable changes and custom events, Fire custom event and Wait, component values in the check (fix 3 later merged the checks, folded collisions into touching and dropped Destroyed and Push), string and boolean variables on any entity with Flip, the shortcut list with `?` and a tooltip on every icon button, two determinism levels, four journeys, and the 1,000 collision triggers speed test (touch triggers on solid posts since fix 3), which meets test play's targets. Its requirements, design, architecture and tasks were written in one night under the owner's go-ahead, so the owner sees the design for the first time in the try. What it built is now in [architecture/](architecture/README.md); [versions/v4/architecture.md](versions/v4/architecture.md) is the record, with where each part went |
| v5 to v7, Later | One line each in [scope.md](scope.md); their rules are in [requirements/](requirements/README.md) |
| The orchestrator | Built in `~/projects/orchestrator`, waiting for the owner's first try. It builds a version from `docs/versions/<version>/tasks.md`. The old runner that built v1 is in its `old-runner/` |
| Talking to Claude | Through `~/projects/discord-bridge`, in this project's Discord channel, since 2026-11-20 |
| `npm run check` | Passes. It includes the [safety check](architecture/tooling.md#the-safety-check) since 2026-11-20 |
| CI | Runs in this repo, public since 2026-11-20 (owner). The public copy `im-nassinger/engine-v3-ci` is retired. See [tooling.md](architecture/tooling.md#ci) |

The source, `~/projects/ecs-game-v2`, was left as it is. `tools/check-sources.js` reads it, so that check only works while it exists.

## Waiting for the owner

Each item is removed in the same commit that settles it, wherever that commit is made.

Nothing right now; the next try point is task 36.

## Next

1. The orchestrator builds v4 fixes 9 to 13, tasks 28 to 35 of [tasks.md](versions/v4/tasks.md); the owner tries them in task 36.
2. Then v5 (scripts) is planned.
3. The owner may review the picks made under the standing yes in [decisions.md](decisions.md) and [before-v2.md](before-v2.md).

## How to change a requirement

- The format of a topic file is in [requirements/README.md](requirements/README.md).
- A new decision is written into the feature's rules, with its reason as `*Why: ...*`. Rewrite the text from the decision, don't patch it.
- If the decision replaces an idea, add a row to [rejected.md](rejected.md).
- If a feature changes version, change its heading, its row in the topic's README and its row in [scope.md](scope.md).
- Run `node tools/check-docs.js`, then commit.

The original text of any review question can be found with `git log -p -S'"ID"' -- review/open.js` in `ecs-game-v2`.

## Open questions for the owner

None right now. ("When other starts touching this" in the game too: yes, owner, 2026-11-25, fix 13.)

Under the owner's standing yes (2026-11-14), Claude decides what the docs don't answer and lists it in [decisions.md](decisions.md#decided-under-the-standing-yes) for the owner to review whenever they like. The [review page](review.html) holds round 12's record, settled on 2026-11-20; earlier rounds are in git history.

Left open by 2026-11-16's variables change, for v5 or Later. (The two that mattered in v4 were settled under the standing yes on 2026-11-22, see [decisions.md](decisions.md).)

- **Reading another entity's variables from a script**, such as an enemy's `health` for a health bar.
- **Keep between runs for an entity's variables** (Later).
- **Choice, variable and list types** for variables. The examples now name the level's `coins` directly instead of letting the creator pick it.

Left open by 2026-11-20's Convert to script (Later):

- **Where the new script runs.** Inside an entity, things run top to bottom, but a converted trigger leaves the TriggerComponent's list for the ScriptComponent's, so it may run at another moment in the tick than it did.
