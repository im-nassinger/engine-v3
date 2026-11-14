# Progress

## TL;DR

**The docs rewrite is finished** (2026-11-13). All eight requirement topics are written, with the glossary, principles, scope, rejected list, later features and technical notes, and both checks pass: the form of the docs, and "nothing lost" (all 556 review decisions and scope ids are cited). No code exists. **Next:** the owner answers the open questions below, then we talk through what went wrong in the first attempt's code, then plan the architecture and the stack.

## Where things stand

| Part | State |
|---|---|
| [overview.md](overview.md), [glossary.md](glossary.md), [principles.md](principles.md), [scope.md](scope.md), [decisions.md](decisions.md) | Done |
| [requirements/](requirements/README.md): editor, drawing, assets, physics, camera, triggers, scripts, play-and-save, later | Done |
| [rejected.md](rejected.md), [tech-notes.md](tech-notes.md) | Done |
| `tools/check-docs.js`, `tools/check-sources.js` | Done, both pass |
| Open questions below | Waiting for the owner |
| Architecture, stack, `plan.md`, code | Not started |

The source, `~/projects/ecs-game-v2`, was left as it is. `tools/check-sources.js` reads it, so that check only works while it exists. It is a finished one-time proof; decisions made after the review are cited as `owner: <date>`.

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
9. **The Trigger zone tool** is in the tool list but has no version. Suggested v1.
10. **The level's name:** where is it shown and edited in v1? Written as: in the top bar, suggested v1.

### Files and limits

11. **50 MB of files per level** (round 6) and a **256 MB level file** (round 11): do both stand?
12. **The old draft's other limits:** 2,000 files in a level and 250 MB unpacked. Keep, change or drop?
13. **Changing a builtin file:** assumed you copy it into your own folder first.

### Triggers and scripts

15. **Spawn settings:** what the trigger's Spawn action offers (position, speed), now that `spawn(path)` returns an id.
16. **Follow by tag:** can the camera's target be a tag, so a spawned player is found without a script?
17. **Inputs of a new level:** suggested `left`, `right`, `up`, `down`, `jump`.
18. **The Lua function list** has to be rewritten as functions that take ids. The old one used an object style the review rejected.
19. **How a script declares its settings, and how it names its own entity**, were never written.
20. **Events between builtin scripts** (`damage`, `heal` and so on) were never reviewed.

### Test play

21. **Leave on the end window, in test play:** written as "goes back to the editor".
22. **The end window's extras** from the old draft: the creator's own win and lose text, a score from a variable, the best time, an attempt count. The review kept a title, the time, Restart and Leave. Written as Later.
23. **Play as player** (a test run without debug tools) is written as dropped, because Play already hides the panels and v2 runs the play file. Agree?

### Versions

24. **Version history** was rejected in round 11, but the scope page listed it under "Not v1". Written as rejected.
25. **A main menu, component presets, level ids, thumbnails** are "not v1" with no version. Written as Later.
