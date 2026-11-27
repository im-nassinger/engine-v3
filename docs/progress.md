# Progress

## TL;DR

**v1 is built** (stages 0 to 19, done 2026-11-19), with 2,048 tests in Node, 1,269 browser tests and 292 Playwright tests in three browsers. **The versions after v1 are small** (owner, round 12, 2026-11-20): v2 curves and gradients, v3 a first game without code, v4 the rest of the triggers, v5 scripts, v6 files and images (v5 split in two, owner, 2026-11-26), v7 text, v8 `.entity` files and the builtin player; see [scope.md](scope.md). **v2 is done** (curves and gradients): built, tried by the owner, the [fixes](versions/v2/fixes.md) asked built, and the owner's last test passed (2026-11-22); its lasting parts are in [architecture/](architecture/README.md). **v3 is done** (a first game without code: tags, the World's variables and inputs, triggers, the Trigger tool, Win, Lose and Restart): built by the orchestrator, tried by the owner, its two [fixes](versions/v3/fixes.md) built, and marked sound by the owner (2026-11-22). **v4 is done** (the rest of the triggers, string and boolean variables on any entity, the shortcut list): the orchestrator built its [tasks](versions/v4/tasks.md) 1 to 17 (2026-11-22 to 2026-11-23), and **the owner tried it and found it ok** (task 18, 2026-11-24); the [fixes](versions/v4/fixes.md) asked so far are built: the trigger card's pickers and boxes, and **simpler triggers** (six events, one check, no Push, no Sensor setting; 2026-11-23). **The trigger card is Scratch blocks** (owner, 2026-11-24, [fix](versions/v4/fixes.md) 4), built by the orchestrator in tasks 19 to 26 (2026-11-25); the owner tried it and found it ok (task 27, 2026-11-25), with fixes 5 to 8 built from the try; fixes 9 to 13 were built by the orchestrator (tasks 28 to 35) and **the owner tried them and found everything working (task 36, 2026-11-26), so v4 is done**. **v5's requirements are written** ([versions/v5/requirements.md](versions/v5/requirements.md): scripts, the code editor, the Console, a flat list of `.lua` files) and **wait for the owner's review**, with one question; see Next below. Its plan stays in [versions/v4/](versions/v4/requirements.md); its lasting parts are in [architecture/](architecture/README.md), mainly [core-model/triggers.md](architecture/core-model/triggers.md) and [triggers-in-play.md](architecture/triggers-in-play.md). The repo is public since 2026-11-20, so CI runs on every push.

## Last session (2026-11-27)

The owner played the example platformer in the editor and asked for two fixes, both built ([bugs.md](bugs.md#shapes-with-no-style-showed-a-bolt-and-a-shape-that-holds-children-couldnt-be-entered-fixed-2026-11-27)):

1. Only a shape with a TriggerComponent shows the bolt; other shapes with no StyleComponent keep only the dashed edge.
2. A double-click on a shape that holds children goes into it when a child is under the mouse, and inside it, its own shape no longer blocks clicks on its children.

**Where we stopped:** pushed and published to Netlify for the owner to try. v5's requirements still wait for review (below).

## Where things stand

| Part | State |
|---|---|
| Requirements, scope, glossary, principles, the [architecture](architecture/README.md), the [design system](design/README.md) | Done and approved (owner, 2026-11-14), kept up to date |
| v1 | Built: stages 0 to 19 in [plan.md](plan.md). What each stage showed is in [stages-built.md](stages-built.md), its steps in [steps/](steps/README.md), and what was settled along the way in [settled.md](settled.md) |
| [v2](versions/README.md) | Done (owner, 2026-11-22): gradients, the pen, the Pencil, point editing on paths, their journeys and speed tests, all four speed targets met. The owner tried it (task 18), the 12 [fixes](versions/v2/fixes.md) are built, and the owner marked it done after testing them. Its plan stays in [versions/v2/](versions/v2/requirements.md); what it built is now in [architecture/](architecture/README.md) |
| v3 | Done (owner, 2026-11-22): the four components and their cards, the trigger card, the Trigger tool, triggers in test play, the end window and Restart, the determinism levels, three journeys, and the 1,000 touch triggers speed test, which meets test play's targets. Its plan stays in [versions/v3/](versions/v3/requirements.md); what it built is now in [architecture/](architecture/README.md) |
| [v4](versions/v4/requirements.md) | Done (owner, 2026-11-26): built from its [tasks](versions/v4/tasks.md), fix 4's Scratch trigger card, fixes 1 to 13, all tried by the owner. Its record is [versions/v4/architecture.md](versions/v4/architecture.md); what it built is now in [architecture/](architecture/README.md) |
| [v5](versions/v5/requirements.md) | Requirements written (2026-11-26), waiting for the owner's review |
| v6 to v8, Later | One line each in [scope.md](scope.md); their rules are in [requirements/](requirements/README.md) |
| The orchestrator | Built in `~/projects/orchestrator`, waiting for the owner's first try. It builds a version from `docs/versions/<version>/tasks.md`. The old runner that built v1 is in its `old-runner/` |
| Talking to Claude | Through `~/projects/discord-bridge`, in this project's Discord channel, since 2026-11-20 |
| `npm run check` | Passes. It includes the [safety check](architecture/tooling.md#the-safety-check) since 2026-11-20 |
| CI | Runs in this repo, public since 2026-11-20 (owner). The public copy `im-nassinger/engine-v3-ci` is retired. See [tooling.md](architecture/tooling.md#ci) |

The source, `~/projects/ecs-game-v2`, was left as it is. `tools/check-sources.js` reads it, so that check only works while it exists.

## Waiting for the owner

Each item is removed in the same commit that settles it, wherever that commit is made.

- **Play the example platformer** ([examples/platformer.md](examples/platformer.md)) and say what to tune.
- **Review v5's requirements** ([versions/v5/requirements.md](versions/v5/requirements.md)), and answer its one question: the touch events' script names, `"touched"` and `"no_longer_touched"` as approved, or `"starts_touching"` and `"stops_touching"` to match the trigger's words since 2026-11-24 (Claude recommends the second).

## Next

1. **The owner reviews v5's requirements** and answers the touch events' names. On a rename, change [lua-api.md](requirements/scripts/lua-api.md#events--v5), [scripts.md](requirements/scripts/scripts.md#events-with-on--v5), [lua-examples.md](requirements/scripts/lua-examples.md) and [principles.md](principles.md).
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

1. **The touch events' script names** in v5, see Waiting for the owner. ("When other starts touching this" in the game too: yes, owner, 2026-11-25, fix 13.)

Under the owner's standing yes (2026-11-14), Claude decides what the docs don't answer and lists it in [decisions.md](decisions.md#decided-under-the-standing-yes) for the owner to review whenever they like. The [review page](review.html) holds round 12's record, settled on 2026-11-20; earlier rounds are in git history.

Left open by 2026-11-16's variables change, for v5 or Later. (The two that mattered in v4 were settled under the standing yes on 2026-11-22, see [decisions.md](decisions.md).)

- **Keep between runs for an entity's variables** (Later).

