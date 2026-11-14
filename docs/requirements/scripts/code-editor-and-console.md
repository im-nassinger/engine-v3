# The code editor, the Console and debugging

## TL;DR

Where scripts are written and where a run reports back. **v2:** the Monaco code editor with colours and find and replace, the Console with one line shape (time, kind, entity, text), repeated lines shown once with a count, and the rest of the agreed debugging set: live values behind the Panels button and `print()`. Pause and Step are already in v1. **v3:** suggestions and hover help for the game's own functions, built-in script help with tutorial levels, Console filters, and trigger lines. Core rule: no feature appears for the first time inside another one, so debugging is exactly this set and nothing more.

## The code editor

### Monaco · v2

- The built-in code editor is **Monaco**, the editor inside VS Code. *Why: the owner's choice. It gives colours and find and replace for free.*
- A `.lua` file opens as a tab beside the `Level` tab, by double-click in the Assets panel, from the file's row on the ScriptComponent, or from an error line in the Console.
- Lua code is coloured. Find and replace work inside a file.
- **The code editor is read-only during play.**
- Text has its own undo while you type. An edit reaches the level's undo history when it is committed: on leaving the editor, changing tabs, or pressing Play.
- There is no hot reload: Play runs a copy, and a changed script takes effect on the next Play.
- Ctrl+Enter plays, also from inside the code editor.

Source: scope LU2; round 3: D76; round 9: 10 2.13; old: LU-100 to LU-104, LU-115, LU-118, LU-119; owner: 2026-11-13

### Suggestions and hover help · v3

- As you type, the editor suggests the game's own functions. Hovering one shows what it takes, its units and a short example.
- *Why v3: it needs a written description of every function in the Lua API, which is easier once the API settles.*

Source: scope LU3; round 9: 10 2.13; old: LU-106 to LU-108

### Script help and tutorial levels · v3

- Script help is built into the editor and works offline. It comes from the same descriptions as the suggestions.
- Short tutorial levels teach scripting step by step.
- The builtin scripts can be read as examples.
- *Why v3: it comes after the Lua API settles.*

Source: scope LU4; round 9: 10 2.18; old: LU-138 to LU-142

## The Console

### One shape for every line · v2

- **Every Console line has four parts: time, kind, entity, text.**
- **Three kinds: Error, Print, Trigger.** Trigger lines come in v3.
- An error's file and line open the code editor at that line. Clicking the entity selects it.
- Editor messages are not in the Console. They stay on their cards.
- *Why one shape: each kind comes from a different place. One shape keeps the Console easy to read and filter.*
- During play the Console is hidden, like every panel, until you press Panels. A script error opens it by itself.
- **After Stop, the Console keeps the run's lines.** *Why: you often don't need Panels at all.*
- The oldest lines drop when there are too many, with a note.

Source: round 10: CN1, UI1; round 11: CN3, PN1; old: LU-123 to LU-130; owner: 2026-11-13

### Repeated lines show once with a count · v2

- A message repeated many times shows once with a count, such as "Coin not found ×12".
- *Why v2: a `print()` that runs every tick would otherwise bury everything else.*

Source: scope LU6; round 9: 10 2.15; round 10: CN2; old: LU-128; owner: 2026-11-13

### Filters · v3

- The Console can be filtered by kind of line and by entity.

Source: scope LU7; round 10: CN1; round 11: CN3; old: LU-127

### Trigger lines · v3

- During test play the Console can list **every trigger that fires**, with the entity, the trigger and the time, such as "Coin 3: When touched, 12.4 s". Off by default.
- When a trigger's When happens but an If check fails, a line names the check.
- *Why: it shows which trigger made something happen, or why it didn't. v3 because Pause, Step and live values already show what happened.*

Source: scope LU8; round 9: 09 2.17; round 10: TL1, TL2; round 11: PN1; old: TR-140, TR-144

## Debugging

### Live values, `print()`, Pause and Step · v2

- **Debugging is exactly three things:** live values in the Inspector and the Layers panel (behind the Panels button), `print()` in the Console, and Pause and Step on the Play bar.
- **Pause and Step are in v1. Live values and `print()` come in v2**, with scripts. *Why: the owner's smaller v1 has no scripts, and Pause and Step are enough to watch physics.*
- **Not included:** watched values, a Variables tab, breakpoints, and shapes drawn from scripts. *Why: the owner's rule that no feature appears inside a question without being discussed. "Shapes a script draws" had been slipped into a debugging question.*
- Pause, Step and Panels are described in [test play](../play-and-save/test-play.md).

Source: round 10: DB1, PS1; round 11: DB2, PN1; old: LU-133, LU-134; owner: 2026-11-13

## Not in the scope review

Left over from the old draft. The last column is Claude's suggestion, not a decision.

| Feature | Rule | Suggested |
|---|---|---|
| Mistake warnings while typing | Syntax errors are underlined shortly after you stop typing. Unknown function names and misspelled event names get a warning. The review accepted "mistake warnings" without a version | v3 |
| Suggestions from the level | Inside quotes, the editor suggests the level's inputs, tags, variables and file paths | v3 |
| Find in all scripts | Search every `.lua` file of the level | v3 |
| Drafts | Uncommitted text is kept every few seconds, so a crash loses seconds at most | v2 |
| Clear the Console | A Clear button, and clearing when Play starts | v2 |
| Pitfalls for newcomers to Lua | Lists start at 1, `~=` for "not equal", `..` joins text. Taught through hints and help | v3 |

Source: old: LU-107, LU-109, LU-110, LU-112, LU-116, LU-129, LU-141, LU-142
