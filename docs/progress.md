# Progress

## TL;DR

The requirements are finished and both checks pass. No code exists. **v1 is a level you build and watch**, with all logic in v2 (owner, 2026-11-13). **The architecture proposal is written** in [proposals/architecture/](proposals/architecture/README.md), after the owner approved its outline and its 24 review cards on 2026-11-13. Round 2 of its review is answered. **Waiting for the owner:** questions 25 to 27 about the World's rectangle (round 3 of the review page), a review of the proposal, and the other open questions below.

## Where things stand

| Part | State |
|---|---|
| [overview.md](overview.md), [glossary.md](glossary.md), [principles.md](principles.md), [scope.md](scope.md), [decisions.md](decisions.md) | Done |
| [requirements/](requirements/README.md): editor, drawing, assets, physics, camera, triggers, scripts, play-and-save, later | Done |
| [rejected.md](rejected.md), [tech-notes.md](tech-notes.md) | Done |
| `tools/check-docs.js`, `tools/check-sources.js` | Done, both pass |
| The smaller v1: v1 build and watch, v2 logic and play, v3 polish, v4 accounts and publishing | Done, applied everywhere. See [decisions.md](decisions.md) |
| The Lua API: [lua-api.md](requirements/scripts/lua-api.md), [lua-examples.md](requirements/scripts/lua-examples.md) | Done, approved by the owner |
| The architecture proposal: [proposals/architecture/](proposals/architecture/README.md) | Written. Waiting for the owner's review |
| Open questions below | Waiting for the owner |
| Code | Not started |

The source, `~/projects/ecs-game-v2`, was left as it is. `tools/check-sources.js` reads it, so that check only works while it exists. It is a finished one-time proof; decisions made after the review are cited as `owner: <date>`.

### Settled on 2026-11-13

- **Box2D v3 and Lua run in the browser with wasm.** No proof needed. See [tech-notes.md](tech-notes.md).
- **Every level file records its physics version from v1.** Claude's call after the owner said "you decide". See [saving](requirements/play-and-save/saving.md).
- **A smaller v1** (owner): 43 features moved to a new v2, the old v2 became v3, accounts and publishing v4. See [scope.md](scope.md).
- **The Lua API is approved** (owner): every function is top level, `this` is the script's entity, settings are a `settings` table, and component values change with `set_attribute`. See [scripts.md](requirements/scripts/scripts.md) and [lua-api.md](requirements/scripts/lua-api.md).
- **The architecture review, round 1** (owner): all 24 cards answered yes. Its decisions are in the [architecture proposal](proposals/architecture/README.md). The ones that changed requirements:
  - The component is called **TransformComponent** everywhere, also on its card and in Lua (was open question 1).
  - **The camera has an eye** like every row, hiding everything inside it (was open question 2).
  - **Removing a component removes only that one**, and the cards left show their partner note (was open question 5).
  - **Adding physics adds only the BodyComponent**, with a note and a button for the SurfaceComponent (was open question 6).
  - **The level's name** is v1, shown and edited in the top bar, saved in the project file (was open question 10).
  - **Limits:** 64 MB of imported files per level (v3), and one 256 MB limit counted unpacked. The old 2,000 files and 250 MB limits are dropped (were open questions 11 and 12).
  - **The camera follows an entity in v1.** Following by tag can come later (open question 15 stays open for v2).
  - **Undo keeps 512 steps**, not 500.
  - **In v1 a fill is a colour field that can be emptied.** Gradients add a fill field type in v2.
  - **The physics view draws the game's own collision pieces**, not Box2D's drawing.
  - **The "Suggested v1" rows** in the "Not in the scope review" tables are built in v1, each marked as waiting for the owner until confirmed.
- **The architecture review, round 2** (owner): eight yes, one changed.
  - **The background colour is the World's StyleComponent fill.** In v3 an image fill is the background image.
  - **The level bounds are a rectangle ShapeComponent on the World** (the owner's change to the suggestion of fields on the PhysicsWorldComponent). Three details follow from it, below.
  - **Merge** is a checkbox on the BodyComponent. **The TagsComponent is v2.** The World's TransformComponent card isn't shown. Partner notes read "Needs a X to Y. [Add X]". Links to outside entities last one opening of the level. Changing the grid size is an undo step. TypeScript is pinned to 6.0.3.

## Next

1. **The owner reviews the architecture proposal.** Once approved, its files move into the main docs, and `plan.md` becomes the project's plan.
2. **The owner goes through the open questions** below. Each answer is written into its topic file, and the question is removed from this list.
3. **One pass over the features without a version.** Each topic file ends with a "Not in the scope review" table with Claude's suggested version.

## How to change a requirement

- The format of a topic file is in [requirements/README.md](requirements/README.md).
- A new decision is written into the feature's rules, with its reason as `*Why: ...*`. Rewrite the text from the decision, don't patch it.
- If the decision replaces an idea, add a row to [rejected.md](rejected.md).
- If a feature changes version, change its heading, its row in the topic's README and its row in [scope.md](scope.md).
- Run `node tools/check-docs.js`, then commit.

The original text of any review question can be found with `git log -p -S'"ID"' -- review/open.js` in `ecs-game-v2`.

## Open questions for the owner

Found while rewriting. None was decided by Claude. Where the docs had to say something, they say what is written after "Written as". Which parts of the architecture each one touches is in the proposal's [open questions](proposals/architecture/open-questions.md).

### The World's rectangle (from round 2)

25. **Where the World's rectangle sits, and how its handles resize it.** The World never moves, so its rectangle can't move either. Suggested: centred on the level's origin, and dragging one side moves the opposite side by the same amount.
26. **Where the four edge settings (wall or open) live.** A ShapeComponent has no such settings. Suggested: four choices on the PhysicsWorldComponent.
27. **Physics on the World's rectangle.** Suggested: the World can't take a BodyComponent or a SurfaceComponent, so the background never collides.

### Words and components

3. **Can a variable hold text**, or only numbers?

### Editor

4. **Does the Joint tool stay active after placing a joint?** An early decision said yes. A later one says tools return to Select. Written as: all tools return, and tool lock keeps one active.
7. **Text size by dragging a corner** was written before the text box existed. Keep?
8. **The "entities here" right-click list:** the review kept only Alt+click. Dropped?
9. **The Trigger zone tool** is in the tool list but has no version. Suggested v2, with triggers.

### Files and limits

13. **Changing a builtin file:** assumed you copy it into your own folder first.

### Triggers and scripts

14. **Spawn settings:** what the trigger's Spawn action offers (position, speed), now that `spawn(path)` returns an id.
15. **Follow by tag:** can the camera's target be a tag, so a spawned player is found without a script? Not in v1 (owner, 2026-11-13). Still open for v2.
16. **Inputs of a new level** (v2): suggested `left`, `right`, `up`, `down`, `jump`.

### Test play

20. **Leave on the end window, in test play:** written as "goes back to the editor".
21. **The end window's extras** from the old draft: the creator's own win and lose text, a score from a variable, the best time, an attempt count. The review kept a title, the time, Restart and Leave. Written as Later.
22. **Play as player** (a test run without debug tools) is written as dropped, because Play already hides the panels and v3 runs the play file. Agree?

### Versions

23. **Version history** was rejected in round 11, but the scope page listed it under "Not v1". Written as rejected.
24. **A main menu, component presets, level ids, thumbnails** are "not v1" with no version. Written as Later.
