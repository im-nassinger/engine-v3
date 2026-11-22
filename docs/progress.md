# Progress

## TL;DR

**v1 is built** (stages 0 to 19, done 2026-11-19), with 2,048 tests in Node, 1,269 browser tests and 292 Playwright tests in three browsers. **The versions after v1 are small** (owner, round 12, 2026-11-20): v2 curves and gradients, v3 a first game without code, v4 the rest of the triggers, v5 scripts, v6 text, v7 `.entity` files and the builtin player; see [scope.md](scope.md). **v2 is done** (curves and gradients): built, tried by the owner, the [fixes](versions/v2/fixes.md) asked built, and the owner's last test passed (2026-11-22); its lasting parts are in [architecture/](architecture/README.md). **v3 is built** (a first game without code: tags, the World's variables and inputs, triggers, the Trigger tool, Win, Lose and Restart), tasks 1 to 17 of its [tasks](versions/v3/tasks.md) done by the orchestrator (2026-11-22), and **waits for the owner's try** (task 18). Its lasting parts are in [architecture/](architecture/README.md), mainly [core-model/triggers.md](architecture/core-model/triggers.md) and [triggers-in-play.md](architecture/triggers-in-play.md). The repo is public since 2026-11-20, so CI runs on every push.

## Where things stand

| Part | State |
|---|---|
| Requirements, scope, glossary, principles, the [architecture](architecture/README.md), the [design system](design/README.md) | Done and approved (owner, 2026-11-14), kept up to date |
| v1 | Built: stages 0 to 19 in [plan.md](plan.md). What each stage showed is in [stages-built.md](stages-built.md), its steps in [steps/](steps/README.md), and what was settled along the way in [settled.md](settled.md) |
| [v2](versions/README.md) | Done (owner, 2026-11-22): gradients, the pen, the Pencil, point editing on paths, their journeys and speed tests, all four speed targets met. The owner tried it (task 18), the 12 [fixes](versions/v2/fixes.md) are built, and the owner marked it done after testing them. Its plan stays in [versions/v2/](versions/v2/requirements.md); what it built is now in [architecture/](architecture/README.md) |
| v3 | **Built, waiting for the owner's try** (task 18): the four components and their cards, the trigger card, the Trigger tool, triggers in test play, the end window and Restart, the determinism levels, three journeys, and the 1,000 touch triggers speed test, which meets test play's targets. Its plan stays in [versions/v3/](versions/v3/requirements.md); what it built is now in [architecture/](architecture/README.md) |
| v4 to v7, Later | One line each in [scope.md](scope.md); their rules are in [requirements/](requirements/README.md) |
| The orchestrator | Built in `~/projects/orchestrator`, waiting for the owner's first try. It builds a version from `docs/versions/<version>/tasks.md`. The old runner that built v1 is in its `old-runner/` |
| Talking to Claude | Through `~/projects/discord-bridge`, in this project's Discord channel, since 2026-11-20 |
| `npm run check` | Passes. It includes the [safety check](architecture/tooling.md#the-safety-check) since 2026-11-20 |
| CI | Runs in this repo, public since 2026-11-20 (owner). The public copy `im-nassinger/engine-v3-ci` is retired. See [tooling.md](architecture/tooling.md#ci) |

The source, `~/projects/ecs-game-v2`, was left as it is. `tools/check-sources.js` reads it, so that check only works while it exists.

## Waiting for the owner

Each item is removed in the same commit that settles it, wherever that commit is made.

1. **Try the new grid snapping** (2026-11-22): a dragged, resized or drawn shape now always lands on the nearest grid line, Ctrl turning it off; the grid draws only the grid size's lines, with no fainter ones.
2. **Try v3** (task 18, its try point): the Trigger tool, the trigger card, tags, the World's variables and inputs, triggers firing in test play, Win, Lose and Restart. Two [fixes](versions/v3/fixes.md) from the try so far are built: a trigger is clicked anywhere inside, and its bolt sits in its middle, scaling with the zoom.

## Next

1. After the owner's try: build any fixes asked, then plan v4 (the rest of the triggers) in `versions/v4/`, as [versions/README.md](versions/README.md#closing-a-version) says.
2. The owner may review the picks made under the standing yes in [decisions.md](decisions.md) and [before-v2.md](before-v2.md).

## How to change a requirement

- The format of a topic file is in [requirements/README.md](requirements/README.md).
- A new decision is written into the feature's rules, with its reason as `*Why: ...*`. Rewrite the text from the decision, don't patch it.
- If the decision replaces an idea, add a row to [rejected.md](rejected.md).
- If a feature changes version, change its heading, its row in the topic's README and its row in [scope.md](scope.md).
- Run `node tools/check-docs.js`, then commit.

The original text of any review question can be found with `git log -p -S'"ID"' -- review/open.js` in `ecs-game-v2`.

## Open questions for the owner

Under the owner's standing yes (2026-11-14), Claude decides what the docs don't answer and lists it in [decisions.md](decisions.md#decided-under-the-standing-yes) for the owner to review whenever they like. The [review page](review.html) holds round 12's record, settled on 2026-11-20; earlier rounds are in git history.

Left open by 2026-11-16's variables change. The first two matter in v4, the rest in v5 or Later. None blocks v2 or v3:

- **Which variable a trigger means.** Each check and action picks a target (`this`, `other`, a name, a tag). For "If coins is 10 or more", must the creator pick the World, or are the level's variables always offered beside the target's?
- **Who hears "a variable changes"** for an entity's own variable: only that entity, or every entity, with the entity in the event?
- **Reading another entity's variables from a script**, such as an enemy's `health` for a health bar.
- **Keep between runs for an entity's variables** (Later).
- **Choice, variable and list types** for variables. The examples now name the level's `coins` directly instead of letting the creator pick it.

Left open by 2026-11-20's Convert to script (Later):

- **Where the new script runs.** Inside an entity, things run top to bottom, but a converted trigger leaves the TriggerComponent's list for the ScriptComponent's, so it may run at another moment in the tick than it did.
