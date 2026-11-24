# Progress

## TL;DR

**v1 is built** (stages 0 to 19, done 2026-11-19), with 2,048 tests in Node, 1,269 browser tests and 292 Playwright tests in three browsers. **The versions after v1 are small** (owner, round 12, 2026-11-20): v2 curves and gradients, v3 a first game without code, v4 the rest of the triggers, v5 scripts, v6 text, v7 `.entity` files and the builtin player; see [scope.md](scope.md). **v2 is done** (curves and gradients): built, tried by the owner, the [fixes](versions/v2/fixes.md) asked built, and the owner's last test passed (2026-11-22); its lasting parts are in [architecture/](architecture/README.md). **v3 is done** (a first game without code: tags, the World's variables and inputs, triggers, the Trigger tool, Win, Lose and Restart): built by the orchestrator, tried by the owner, its two [fixes](versions/v3/fixes.md) built, and marked sound by the owner (2026-11-22). **v4 is built** (the rest of the triggers, string and boolean variables on any entity, the shortcut list): the orchestrator built its [tasks](versions/v4/tasks.md) 1 to 17 (2026-11-22 to 2026-11-23), and **the owner is trying it** (task 18); the [fixes](versions/v4/fixes.md) asked so far are built: the trigger card's pickers and boxes, and **simpler triggers** (six events, one check, no Push, no Sensor setting; 2026-11-23). **The trigger card becomes Scratch blocks** (owner, 2026-11-24, [fix](versions/v4/fixes.md) 4), picked from a mockup and planned in [fix-4-scratch-triggers.md](versions/v4/fix-4-scratch-triggers.md), not built yet. Its plan stays in [versions/v4/](versions/v4/requirements.md); its lasting parts are in [architecture/](architecture/README.md), mainly [core-model/triggers.md](architecture/core-model/triggers.md) and [triggers-in-play.md](architecture/triggers-in-play.md). The repo is public since 2026-11-20, so CI runs on every push.

## Last session (2026-11-24)

The owner finds the trigger card ugly and convoluted, so we made a mockup of other ways to draw it: [design/mockups/triggers.html](design/mockups/triggers.html).

1. A first mockup with 11 variants at once was far too busy; it became one card at a time.
2. Over several rounds, more room inside every container, 13 options, and the owner's favourites: Branch (Tree and Flow merged), Scratch and Blocky (snap-together blocks, round or square).
3. The event now reads "When other starts touching this", `other` in the entity colour.
4. Later the same day: Set's value box shows its path (`Transform › Position`), hovering a block opens an "add a block" slot, and Scratch and Blocky merged into one **Scratch** option in Scratch's own colours, slightly rounded.

5. The owner picked **Scratch**. Its rules, with what each round dropped, moved from the proposal into [design/controls.md](design/controls.md#v4-fix-4-the-trigger-card-as-scratch-blocks), as v4 fix 4; the proposal file is gone.

6. The build plan: [versions/v4/fix-4-scratch-triggers.md](versions/v4/fix-4-scratch-triggers.md). The trigger stays When, one If, a flat Do list, so play keeps its runner; the logic changes are Repeat going (resting and once per run become Enabled blocks, old levels converted when read) and a fresh firing being dropped when its trigger is already off. Nine orchestrator tasks.

**Where we stopped:** the plan is written; its six points (A to F) wait for the owner. Nothing in the game changed yet.

## Where things stand

| Part | State |
|---|---|
| Requirements, scope, glossary, principles, the [architecture](architecture/README.md), the [design system](design/README.md) | Done and approved (owner, 2026-11-14), kept up to date |
| v1 | Built: stages 0 to 19 in [plan.md](plan.md). What each stage showed is in [stages-built.md](stages-built.md), its steps in [steps/](steps/README.md), and what was settled along the way in [settled.md](settled.md) |
| [v2](versions/README.md) | Done (owner, 2026-11-22): gradients, the pen, the Pencil, point editing on paths, their journeys and speed tests, all four speed targets met. The owner tried it (task 18), the 12 [fixes](versions/v2/fixes.md) are built, and the owner marked it done after testing them. Its plan stays in [versions/v2/](versions/v2/requirements.md); what it built is now in [architecture/](architecture/README.md) |
| v3 | Done (owner, 2026-11-22): the four components and their cards, the trigger card, the Trigger tool, triggers in test play, the end window and Restart, the determinism levels, three journeys, and the 1,000 touch triggers speed test, which meets test play's targets. Its plan stays in [versions/v3/](versions/v3/requirements.md); what it built is now in [architecture/](architecture/README.md) |
| [v4](versions/v4/requirements.md) | **Built, waiting for the owner's try** (task 18, 2026-11-23): variable changes and custom events, Fire custom event and Wait, component values in the check (fix 3 later merged the checks, folded collisions into touching and dropped Destroyed and Push), string and boolean variables on any entity with Flip, the shortcut list with `?` and a tooltip on every icon button, two determinism levels, four journeys, and the 1,000 collision triggers speed test (touch triggers on solid posts since fix 3), which meets test play's targets. Its requirements, design, architecture and tasks were written in one night under the owner's go-ahead, so the owner sees the design for the first time in the try. What it built is now in [architecture/](architecture/README.md); [versions/v4/architecture.md](versions/v4/architecture.md) is the record, with where each part went |
| v5 to v7, Later | One line each in [scope.md](scope.md); their rules are in [requirements/](requirements/README.md) |
| The orchestrator | Built in `~/projects/orchestrator`, waiting for the owner's first try. It builds a version from `docs/versions/<version>/tasks.md`. The old runner that built v1 is in its `old-runner/` |
| Talking to Claude | Through `~/projects/discord-bridge`, in this project's Discord channel, since 2026-11-20 |
| `npm run check` | Passes. It includes the [safety check](architecture/tooling.md#the-safety-check) since 2026-11-20 |
| CI | Runs in this repo, public since 2026-11-20 (owner). The public copy `im-nassinger/engine-v3-ci` is retired. See [tooling.md](architecture/tooling.md#ci) |

The source, `~/projects/ecs-game-v2`, was left as it is. `tools/check-sources.js` reads it, so that check only works while it exists.

## Waiting for the owner

Each item is removed in the same commit that settles it, wherever that commit is made.

1. **Try the new grid snapping** (2026-11-22): a dragged, resized or drawn shape now always lands on the nearest grid line, Ctrl turning it off; the grid draws only the grid size's lines, with no fainter ones.
2. **Try v4** (task 18): it is built. Its picks made without the owner, the two open questions included, are in [decisions.md](decisions.md) (2026-11-22, "Planning v4").
3. **Try the trigger card's pickers and boxes** (2026-11-23, v4 [fix](versions/v4/fixes.md) 2): the entity picker (the Entities viewer's tree, its search and target icon) on every trigger entity word and entity field, Change value's menu by component then value, vectors added whole, the x and y boxes, and the plainer words. **One change from the approved plan:** the menus say "value" (`pick a value`, `Values of this`, `change a value`, `a component value`), not "property", because the glossary's word for it is value and "property" would be a second word for one thing; say if "property" should replace "value" everywhere instead. The other picks are in [decisions.md](decisions.md) (2026-11-23).
4. **Try simpler triggers** (2026-11-23, v4 [fix](versions/v4/fixes.md) 3): the When menu's six events with starts or stops, key or input and after or every picked in place; Add check's one "a value"; "add 0, -500 to other Body › Velocity" in place of Push; and the Surface card with no Sensor (a coin is a shape with no Surface and a touch trigger; old levels open with Sensor-ticked Surfaces removed). **Two differences from the plan:** the in-place word is also the event word, so its menu lists the two kinds and then the six events, since a key or input and a timer have no other word to hold the event; and the 1,000 touch and 1,000 solid-touch speed tests stay two, since they measure Box2D's two kinds of report. A door that opened by switching Sensor now has to move or be destroyed. The other picks are in [decisions.md](decisions.md) (2026-11-23).

5. **Confirm fix 4's six points** (2026-11-24, [plan](versions/v4/fix-4-scratch-triggers.md#for-the-owner-to-confirm)): Repeat goes entirely (once per run becomes an Enabled block), "when other starts touching this", no block outside the If, adding a check from the slot's menu, old cooldowns read as blocks, the Entity inspector 344 px.

## Next

1. The owner confirms points A to F of [fix 4's plan](versions/v4/fix-4-scratch-triggers.md#for-the-owner-to-confirm); then its tasks move to the end of `versions/v4/tasks.md` and the orchestrator builds them.
2. The owner tries v4 (task 18), and the fixes asked go into `versions/v4/fixes.md`; then v5 (scripts) is planned.
3. The owner may review the picks made under the standing yes in [decisions.md](decisions.md) and [before-v2.md](before-v2.md).

## How to change a requirement

- The format of a topic file is in [requirements/README.md](requirements/README.md).
- A new decision is written into the feature's rules, with its reason as `*Why: ...*`. Rewrite the text from the decision, don't patch it.
- If the decision replaces an idea, add a row to [rejected.md](rejected.md).
- If a feature changes version, change its heading, its row in the topic's README and its row in [scope.md](scope.md).
- Run `node tools/check-docs.js`, then commit.

The original text of any review question can be found with `git log -p -S'"ID"' -- review/open.js` in `ecs-game-v2`.

## Open questions for the owner

- **"When other starts touching this" in the game too?** The mockup says it; the real card and the requirements still say "something" (2026-11-24).

Under the owner's standing yes (2026-11-14), Claude decides what the docs don't answer and lists it in [decisions.md](decisions.md#decided-under-the-standing-yes) for the owner to review whenever they like. The [review page](review.html) holds round 12's record, settled on 2026-11-20; earlier rounds are in git history.

Left open by 2026-11-16's variables change, for v5 or Later. (The two that mattered in v4 were settled under the standing yes on 2026-11-22, see [decisions.md](decisions.md).)

- **Reading another entity's variables from a script**, such as an enemy's `health` for a health bar.
- **Keep between runs for an entity's variables** (Later).
- **Choice, variable and list types** for variables. The examples now name the level's `coins` directly instead of letting the creator pick it.

Left open by 2026-11-20's Convert to script (Later):

- **Where the new script runs.** Inside an entity, things run top to bottom, but a converted trigger leaves the TriggerComponent's list for the ScriptComponent's, so it may run at another moment in the tick than it did.
