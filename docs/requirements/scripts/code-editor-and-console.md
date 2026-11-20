# The code editor, the Console and debugging

## TL;DR

Where scripts are written and where a run reports back. **v5:** the Monaco code editor with colours and find and replace, the Console with one line shape (time, kind, entity, text), repeated lines shown once with a count, and `print()`. Pause and Step are already in v1. **Later:** live values behind the Panels button, suggestions and hover help for the game's own functions, built-in script help with tutorial levels, Console filters, and trigger lines. Core rule: no feature appears for the first time inside another one, so debugging is exactly this set and nothing more.

## The code editor

### Monaco · v5

- The built-in code editor is **Monaco**, the editor inside VS Code. *Why: the owner's choice. It gives colours and find and replace for free.*
- A `.lua` file opens as a tab beside the `Level` tab, by double-click in the Assets panel, from the file's row on the ScriptComponent, or from an error line in the Console.
- Lua code is coloured. Find and replace work inside a file.
- **The code editor is read-only during play.**
- Text has its own undo while you type. An edit reaches the level's undo history when it is committed: on leaving the editor, changing tabs, or pressing Play.
- There is no hot reload: Play runs a copy, and a changed script takes effect on the next Play.
- Ctrl+Enter plays, also from inside the code editor.

Source: scope LU2; round 3: D76; round 9: 10 2.13; old: LU-100 to LU-104, LU-115, LU-118, LU-119; owner: 2026-11-13

### Suggestions and hover help · Later

- As you type, the editor suggests the game's own functions. Hovering one shows what it takes, its units and a short example.
- *Why Later: it needs a written description of every function in the Lua API, which is easier once the API settles.*

Source: scope LU3; round 9: 10 2.13; old: LU-106 to LU-108

### Script help and tutorial levels · Later

- Script help is built into the editor and works offline. It comes from the same descriptions as the suggestions.
- Short tutorial levels teach scripting step by step.
- The builtin scripts can be read as examples.
- *Why Later: it comes after the Lua API settles.*

Source: scope LU4; round 9: 10 2.18; old: LU-138 to LU-142

## The Console

### One shape for every line · v5

- **Every Console line has four parts: time, kind, entity, text.**
- **Three kinds: Error, Print, Trigger.** Trigger lines come Later.
- An error's file and line open the code editor at that line. Clicking the entity selects it.
- Editor messages are not in the Console. They stay on their cards.
- *Why one shape: each kind comes from a different place. One shape keeps the Console easy to read and filter.*
- During play the Console is hidden, like every panel, until you press Panels. A script error opens it by itself.
- **After Stop, the Console keeps the run's lines.** *Why: you often don't need Panels at all.*
- The oldest lines drop when there are too many, with a note.

Source: round 10: CN1, UI1; round 11: CN3, PN1; old: LU-123 to LU-130; owner: 2026-11-13

### Repeated lines show once with a count · v5

- A message repeated many times shows once with a count, such as "Coin not found ×12".
- *Why v5: a `print()` that runs every tick would otherwise bury everything else.*

Source: scope LU6; round 9: 10 2.15; round 10: CN2; old: LU-128; owner: 2026-11-13

### Filters · Later

- The Console can be filtered by kind of line and by entity.

Source: scope LU7; round 10: CN1; round 11: CN3; old: LU-127

### Trigger lines · Later

- During test play the Console can list **every trigger that fires**, with the entity, the trigger and the time, such as "Coin 3: When touched, 12.4 s". Off by default.
- When a trigger's When happens but an If check fails, a line names the check.
- *Why: it shows which trigger made something happen, or why it didn't. Later because Pause, Step and live values already show what happened.*

Source: scope LU8; round 9: 09 2.17; round 10: TL1, TL2; round 11: PN1; old: TR-140, TR-144

## Debugging

### `print()`, Pause and Step · v5

- **Debugging is exactly three things:** live values in the Entity inspector and the Entities viewer (behind the Panels button), `print()` in the Console, and Pause and Step on the Play bar.
- **Pause and Step are in v1, `print()` comes in v5 with scripts, and live values Later.** *Why: the owner's smaller v1 has no scripts, and Pause and Step are enough to watch physics. Live values are the most work of the set: a read-only Entity inspector fed from the running game (owner: 2026-11-20).*
- **Not included:** watched values, a Variables tab, breakpoints, and shapes drawn from scripts. *Why: the owner's rule that no feature appears inside a question without being discussed. "Shapes a script draws" had been slipped into a debugging question.*
- Pause, Step and Panels are described in [test play](../play-and-save/test-play.md).

Source: round 10: DB1, PS1; round 11: DB2, PN1; old: LU-133, LU-134; owner: 2026-11-13

## Small features

Small features from the old draft and review that the scope review never asked about. The owner gave each its version in round 7 of the architecture review.

| Feature | Rule | Version |
|---|---|---|
| Mistake warnings while typing | Syntax errors are underlined shortly after you stop typing. Unknown function names and misspelled event names get a warning. The review accepted "mistake warnings" without a version | Later |
| Suggestions from the level | Inside quotes, the editor suggests the level's inputs, tags, variables and file paths | Later |
| Find in all scripts | Search every `.lua` file of the level | Later |
| Drafts | Uncommitted text is kept every few seconds, so a crash loses seconds at most | v5 |
| Clear the Console | A Clear button, and clearing when Play starts | v5 |
| Pitfalls for newcomers to Lua | Lists start at 1, `~=` for "not equal", `..` joins text. Taught through hints and help | Later |

Source: old: LU-107, LU-109, LU-110, LU-112, LU-116, LU-129, LU-141, LU-142; owner: 2026-11-14
