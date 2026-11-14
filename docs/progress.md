# Progress

## TL;DR

The docs rewrite is finished and both checks pass. No code exists. **v1 is now a level you build and watch**, with all logic in v2 (owner, 2026-11-13). **The Lua API is approved** and written into the scripts topic. **Waiting for the owner:** the open questions below. Then we talk through what went wrong in the first attempt's code, and plan the architecture and the stack.

## Where things stand

| Part | State |
|---|---|
| [overview.md](overview.md), [glossary.md](glossary.md), [principles.md](principles.md), [scope.md](scope.md), [decisions.md](decisions.md) | Done |
| [requirements/](requirements/README.md): editor, drawing, assets, physics, camera, triggers, scripts, play-and-save, later | Done |
| [rejected.md](rejected.md), [tech-notes.md](tech-notes.md) | Done |
| `tools/check-docs.js`, `tools/check-sources.js` | Done, both pass |
| The smaller v1: v1 build and watch, v2 logic and play, v3 polish, v4 accounts and publishing | Done, applied everywhere. See [decisions.md](decisions.md) |
| The Lua API: [lua-api.md](requirements/scripts/lua-api.md), [lua-examples.md](requirements/scripts/lua-examples.md) | Done, approved by the owner |
| Open questions below | Waiting for the owner |
| Architecture, stack, `plan.md`, code | Not started |

The source, `~/projects/ecs-game-v2`, was left as it is. `tools/check-sources.js` reads it, so that check only works while it exists. It is a finished one-time proof; decisions made after the review are cited as `owner: <date>`.

### Settled on 2026-11-13

- **Box2D v3 and Lua run in the browser with wasm.** No proof needed. Box2D v3's own replay support is looked at later. See [tech-notes.md](tech-notes.md).
- **Every level file records its physics version from v1** (was open question 14). Claude's call after the owner said "you decide". See [saving](requirements/play-and-save/saving.md).
- **A smaller v1** (owner): 43 features moved to a new v2, the old v2 became v3, accounts and publishing v4. See [scope.md](scope.md).
- **Every Lua function is top level** (owner), such as `spawn(path)`, never `world.spawn(path)`. Written into [scripts.md](requirements/scripts/scripts.md).
- **A component value is changed with `set_attribute`** (owner), next to the review's `get_attribute`. The full function list is in [the Lua API](requirements/scripts/lua-api.md), with [example scripts](requirements/scripts/lua-examples.md).
- **The Lua API proposal is approved** (owner), all seven answers yes: a script's own entity is `this`; settings are a `settings` table built with `<type>_field` functions; scripts share values only through custom events and variables; no vector type, plus `clamp` and `lerp`; builtin scripts share `damage`, `heal` and `died`; script events are the trigger events in snake_case; and the rest of the function list stands as written. See [scripts.md](requirements/scripts/scripts.md), [lua-api.md](requirements/scripts/lua-api.md) and [builtin content](requirements/assets/builtin-content.md). The proposal file is deleted.
- Small fixes: the glossary's Variable row no longer decides open question 3, and decisions made after the review are cited as `owner: <date>`.

## Next

1. **The owner goes through the open questions** below. Each answer is written into its topic file, and the question is removed from this list.
2. **One pass over the features without a version.** Each topic file ends with a "Not in the scope review" table with Claude's suggested version. The owner confirms or changes them, and each becomes a normal feature section or a row in [rejected.md](rejected.md).
3. **Talk through what went wrong in the first attempt's code**, so the new design avoids it.
4. **Plan the architecture and the stack**, then write `plan.md`. [tech-notes.md](tech-notes.md) has what the old research learned.

## How to change a requirement

- The format of a topic file is in [requirements/README.md](requirements/README.md).
- A new decision is written into the feature's rules, with its reason as `*Why: ...*`. Rewrite the text from the decision, don't patch it.
- If the decision replaces an idea, add a row to [rejected.md](rejected.md).
- If a feature changes version, change its heading, its row in the topic's README and its row in [scope.md](scope.md).
- Run `node tools/check-docs.js`, then commit.

The original text of any review question can be found with `git log -p -S'"ID"' -- review/open.js` in `ecs-game-v2`.

## Open questions for the owner

Found while rewriting. None was decided by Claude. Where the docs had to say something, they say what is written after "Written as".

### Words and components

1. **Transform or TransformComponent?** The principle says component names end in `Component`, but every source writes "Transform". Also assumed: `TagsComponent`.
2. **Does the camera have an eye?** The review says no, but the old draft used it to hide everything inside the camera.
3. **Can a variable hold text**, or only numbers?

### Editor

4. **Does the Joint tool stay active after placing a joint?** An early decision said yes. A later one says tools return to Select. Written as: all tools return, and tool lock keeps one active.
5. **Removing a component that others need.** The old rule removed the dependants too. With "nothing behind the user's back", suggested: remove only that one and let the other cards show their note.
6. **Adding physics in one click:** does it add the SurfaceComponent together with the BodyComponent?
7. **Text size by dragging a corner** was written before the text box existed. Keep?
8. **The "entities here" right-click list:** the review kept only Alt+click. Dropped?
9. **The Trigger zone tool** is in the tool list but has no version. Suggested v2, with triggers.
10. **The level's name:** where is it shown and edited in v1? Written as: in the top bar, suggested v1.

### Files and limits

11. **50 MB of files per level** (round 6) and a **256 MB level file** (round 11): do both stand?
12. **The old draft's other limits:** 2,000 files in a level and 250 MB unpacked. Keep, change or drop?
13. **Changing a builtin file:** assumed you copy it into your own folder first.

### Triggers and scripts

14. **Spawn settings:** what the trigger's Spawn action offers (position, speed), now that `spawn(path)` returns an id.
15. **Follow by tag:** can the camera's target be a tag, so a spawned player is found without a script?
16. **Inputs of a new level** (v2): suggested `left`, `right`, `up`, `down`, `jump`.

### Test play

20. **Leave on the end window, in test play:** written as "goes back to the editor".
21. **The end window's extras** from the old draft: the creator's own win and lose text, a score from a variable, the best time, an attempt count. The review kept a title, the time, Restart and Leave. Written as Later.
22. **Play as player** (a test run without debug tools) is written as dropped, because Play already hides the panels and v3 runs the play file. Agree?

### Versions

23. **Version history** was rejected in round 11, but the scope page listed it under "Not v1". Written as rejected.
24. **A main menu, component presets, level ids, thumbnails** are "not v1" with no version. Written as Later.
