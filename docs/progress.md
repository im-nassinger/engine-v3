# Progress

## TL;DR

**v1 is built** (stages 0 to 19, done 2026-11-19), with 2,048 tests in Node, 1,269 browser tests and 292 Playwright tests in three browsers. **The versions after v1 are small** (owner, round 12, 2026-11-20): v2 curves and gradients, v3 a first game without code, v4 the rest of the triggers, v5 scripts, v6 files and images (v5 split in two, owner, 2026-11-26), v7 text, v8 `.entity` files and the builtin player; see [scope.md](scope.md). **v2 is done** (curves and gradients): built, tried by the owner, the [fixes](versions/v2/fixes.md) asked built, and the owner's last test passed (2026-11-22); its lasting parts are in [architecture/](architecture/README.md). **v3 is done** (a first game without code: tags, the World's variables and inputs, triggers, the Trigger tool, Win, Lose and Restart): built by the orchestrator, tried by the owner, its two [fixes](versions/v3/fixes.md) built, and marked sound by the owner (2026-11-22). **v4 is done** (the rest of the triggers, string and boolean variables on any entity, the shortcut list): the orchestrator built its [tasks](versions/v4/tasks.md) 1 to 17 (2026-11-22 to 2026-11-23), and **the owner tried it and found it ok** (task 18, 2026-11-24); the [fixes](versions/v4/fixes.md) asked so far are built: the trigger card's pickers and boxes, and **simpler triggers** (six events, one check, no Push, no Sensor setting; 2026-11-23). **The trigger card is Scratch blocks** (owner, 2026-11-24, [fix](versions/v4/fixes.md) 4), built by the orchestrator in tasks 19 to 26 (2026-11-25); the owner tried it and found it ok (task 27, 2026-11-25), with fixes 5 to 8 built from the try; fixes 9 to 13 were built by the orchestrator (tasks 28 to 35) and **the owner tried them and found everything working (task 36, 2026-11-26), so v4 is done**. **Next: write v5's requirements** (scripts, the code editor, the Console, a flat list of `.lua` files; v5 was split in two on 2026-11-26), see Next below. Its plan stays in [versions/v4/](versions/v4/requirements.md); its lasting parts are in [architecture/](architecture/README.md), mainly [core-model/triggers.md](architecture/core-model/triggers.md) and [triggers-in-play.md](architecture/triggers-in-play.md). The repo is public since 2026-11-20, so CI runs on every push.

## Last session (2026-11-26)

Earlier that day the owner tried the build on Netlify and asked for small changes, all built and deployed: the panels are 380 px and never shrink, the trigger's `…` menu has Open in window, Move up and Move down, and Mass drags like Density (`∞ kg` on a Static or Kinematic body). See [controls.md](design/controls.md#the-triggers-menu-and-window-owner-2026-11-26) and [decisions.md](decisions.md). Then:

1. **v4 is done.** The owner tried fixes 9 to 13 (task 36) and found everything working.
2. **The owner settled the questions before v5** ([decisions.md](decisions.md#2026-11-26-before-planning-v5)): a script reads another entity's variables through its VariablesComponent (`get_component` and `get_attribute`, no function made for variables); choice and list variable types wait for Later; a future sprite sheet editor picks its frames from the image files in the Assets panel.
3. **v5 is split in two, and images come forward** ([decisions.md](decisions.md#2026-11-26-v5-is-split-and-images-move-to-v6)): **v5** is scripts, the code editor, the Console and the Assets panel as a flat list of `.lua` files; **v6** is folders, file paths that update themselves, importing images, the image fill and the World's background image; text is now **v7** and `.entity` files with the builtin player **v8**. Every doc was renumbered.
4. **The PixiJS `[BindGroup]` warnings are fixed** (owner's yes): a gradient texture no entity uses is repainted for the next gradient instead of destroyed ([bugs.md](bugs.md)). One Firefox browser test failed once in the full run and passed alone; it is in [bugs.md](bugs.md) to watch.

**Where we stopped:** everything is committed, not pushed. Nothing of v5's plan is written yet: `docs/versions/v5/` doesn't exist.

## Where things stand

| Part | State |
|---|---|
| Requirements, scope, glossary, principles, the [architecture](architecture/README.md), the [design system](design/README.md) | Done and approved (owner, 2026-11-14), kept up to date |
| v1 | Built: stages 0 to 19 in [plan.md](plan.md). What each stage showed is in [stages-built.md](stages-built.md), its steps in [steps/](steps/README.md), and what was settled along the way in [settled.md](settled.md) |
| [v2](versions/README.md) | Done (owner, 2026-11-22): gradients, the pen, the Pencil, point editing on paths, their journeys and speed tests, all four speed targets met. The owner tried it (task 18), the 12 [fixes](versions/v2/fixes.md) are built, and the owner marked it done after testing them. Its plan stays in [versions/v2/](versions/v2/requirements.md); what it built is now in [architecture/](architecture/README.md) |
| v3 | Done (owner, 2026-11-22): the four components and their cards, the trigger card, the Trigger tool, triggers in test play, the end window and Restart, the determinism levels, three journeys, and the 1,000 touch triggers speed test, which meets test play's targets. Its plan stays in [versions/v3/](versions/v3/requirements.md); what it built is now in [architecture/](architecture/README.md) |
| [v4](versions/v4/requirements.md) | Done (owner, 2026-11-26): built from its [tasks](versions/v4/tasks.md), fix 4's Scratch trigger card, fixes 1 to 13, all tried by the owner. Its record is [versions/v4/architecture.md](versions/v4/architecture.md); what it built is now in [architecture/](architecture/README.md) |
| v5 to v8, Later | One line each in [scope.md](scope.md); their rules are in [requirements/](requirements/README.md) |
| The orchestrator | Built in `~/projects/orchestrator`, waiting for the owner's first try. It builds a version from `docs/versions/<version>/tasks.md`. The old runner that built v1 is in its `old-runner/` |
| Talking to Claude | Through `~/projects/discord-bridge`, in this project's Discord channel, since 2026-11-20 |
| `npm run check` | Passes. It includes the [safety check](architecture/tooling.md#the-safety-check) since 2026-11-20 |
| CI | Runs in this repo, public since 2026-11-20 (owner). The public copy `im-nassinger/engine-v3-ci` is retired. See [tooling.md](architecture/tooling.md#ci) |

The source, `~/projects/ecs-game-v2`, was left as it is. `tools/check-sources.js` reads it, so that check only works while it exists.

## Waiting for the owner

Each item is removed in the same commit that settles it, wherever that commit is made.

Nothing right now. The next thing for the owner is reviewing v5's requirements once they are written.

## Next

1. **Write v5's requirements** in `docs/versions/v5/requirements.md`, following the `orchestrator-workflow` skill and [versions/v4/requirements.md](versions/v4/requirements.md) as the example of the shape. v5 is scripts, the code editor (Monaco), the Console and the Assets panel as a flat list of `.lua` files. Gather the rules marked v5 in [requirements/scripts/](requirements/scripts/README.md) (scripts.md, lua-api.md, code-editor-and-console.md), [assets/files-and-sound.md](requirements/assets/files-and-sound.md#the-assets-panel--v5), the variable types in [triggers/variables-and-inputs.md](requirements/triggers/variables-and-inputs.md), the random seed in [play-and-save/test-play.md](requirements/play-and-save/test-play.md), and every other heading marked `· v5` (`grep -rn '· v5' docs/requirements`). Fill the gaps, mainly how the flat list makes, renames and deletes a `.lua` file and how a script is attached; decide small ones under the standing yes and list them in [decisions.md](decisions.md). The two Convert to script questions below are settled there too. **The owner reviews it.**
2. Then v5's design with a clickable mockup (the owner tries it), its architecture, and its `tasks.md`; then the orchestrator builds it.
3. Push when the owner asks; the commits of 2026-11-26 are local.
4. The owner may review the picks made under the standing yes in [decisions.md](decisions.md) and [before-v2.md](before-v2.md).

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

- **Keep between runs for an entity's variables** (Later).

Left open by 2026-11-20's Convert to script (Later):

- **Where the new script runs.** Inside an entity, things run top to bottom, but a converted trigger leaves the TriggerComponent's list for the ScriptComponent's, so it may run at another moment in the tick than it did.
