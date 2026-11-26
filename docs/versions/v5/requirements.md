# v5 requirements

## TL;DR

**v5 adds scripts, the code editor, the Console, and the Assets panel as one flat list of `.lua` files** (owner, round 12, 2026-11-20; split from images on 2026-11-26). With them come the variable types scripts need, number limits and the run's random seed. The rules are written once, in [requirements/](../../requirements/README.md), each feature marked `· v5`; this file lists them, what in v1 to v4 they touch, and what was decided to fill the gaps. **Waiting for the owner's review**, with one question below.

## The new features

| Feature | Rules | In short |
|---|---|---|
| The Assets panel | [files-and-sound.md](../../requirements/assets/files-and-sound.md#the-assets-panel--v5) | One flat list of `.lua` files, sorted by name. New script, rename (F2), delete (Del, asking with a count when in use), one Undo step each. Saved and exported with the level |
| The ScriptComponent | [scripts.md](../../requirements/scripts/scripts.md#the-scriptcomponent--v5) | A list of `.lua` files, added from the card's Add script menu (or New script). Rows run top to bottom; the same file twice runs twice. A deleted file's row shows `missing` |
| A script's variables | [scripts.md](../../requirements/scripts/scripts.md#the-scriptcomponent--v5), [lua-api.md](../../requirements/scripts/lua-api.md#variables--v5) | A script lists the variables it needs in a `variables` table; the card warns about missing ones with an Add variables button. `variables.speed` reads and writes them |
| Events with `on()` | [scripts.md](../../requirements/scripts/scripts.md#events-with-on--v5), [lua-api.md](../../requirements/scripts/lua-api.md#events--v5) | Scripts and triggers share one list of events. Held keys and timers are written with `is_down` in `tick` and `wait` |
| Handles and component values | [scripts.md](../../requirements/scripts/scripts.md#handles-not-references--v5) | Entity and component ids, `this` and `other`, `get_attribute` and `set_attribute` with the Entity inspector's names, metres and degrees |
| `wait(2)` | [scripts.md](../../requirements/scripts/scripts.md#wait2--v5) | Pauses that script in the level's time; destroying the entity cancels it |
| The Lua API | [lua-api.md](../../requirements/scripts/lua-api.md) | Every function marked v5 there. Top level, and it only ever grows |
| Safety | [scripts.md](../../requirements/scripts/scripts.md#lua-54-safe-parts-only--v5) | Lua 5.4 without files, network or loading code; read-only library tables; the game runs apart from the editor, so an endless loop never freezes it |
| Script errors | [scripts.md](../../requirements/scripts/scripts.md#script-errors--v5) | Stop only that script; test play pauses at the first and opens the Console |
| The code editor | [code-editor-and-console.md](../../requirements/scripts/code-editor-and-console.md#monaco--v5) | Monaco in a tab beside `Level`, Lua colours, find and replace, read-only during play, drafts kept every few seconds |
| The Console | [code-editor-and-console.md](../../requirements/scripts/code-editor-and-console.md#one-shape-for-every-line--v5) | Time, kind, entity, text; Error and Print lines; repeats shown once with a count; Clear, and cleared when Play starts |
| `print()` | [code-editor-and-console.md](../../requirements/scripts/code-editor-and-console.md#print-pause-and-step--v5) | A Print line in the Console |
| More variable types, number limits | [variables-and-inputs.md](../../requirements/triggers/variables-and-inputs.md#the-variable-types-scripts-need--v5) | Entity, asset, colour, vector, angle and tags; a number's minimum, maximum and unit, a value past a limit held at it |
| The random seed | [test-play.md](../../requirements/play-and-save/test-play.md#the-random-seed--v5) | A new seed each run; `math.random` uses it |

## What v5 touches in v1 to v4

| Part | Where | What v5 adds |
|---|---|---|
| The screen | [design/](../../design/README.md) | The Assets panel, the Console and the code editor's tabs need a place; that is v5's design, with a mockup |
| The Entity inspector | [inspector-and-undo.md](../../requirements/editor/inspector-and-undo.md) | The ScriptComponent's card, in the fixed card order above triggers, so on one entity scripts run before triggers for the same event |
| The VariablesComponent | [variables-and-inputs.md](../../requirements/triggers/variables-and-inputs.md) | Six more types in each row's type menu, with their own value boxes (an entity picker, a file menu, a colour, two numbers, degrees, tags), and limits on a number |
| The trigger card | [controls.md](../../design/controls.md) | Change value only sets the new types; the value check offers "is" and "is not" for them. A number set past its limits is held at them |
| Messages from play | [triggers.md](../../requirements/triggers/triggers.md#order-and-limits--v3), [variables-and-inputs.md](../../requirements/triggers/variables-and-inputs.md) | The 32-step warning and the unknown input warning move from the message pill to the Console. Custom events fired by scripts count toward the 32 steps |
| Fire custom event | [triggers.md](../../requirements/triggers/triggers.md#custom-events--v4) | Its number, which no trigger reads, reaches scripts as the handler's number |
| Test play | [test-play.md](../../requirements/play-and-save/test-play.md) | Scripts run in the tick with triggers, in Entities viewer order; Restart cancels waits and makes a new seed |
| Saving and export | [saving.md](../../requirements/play-and-save/saving.md) | A level's `.lua` files are saved with it and go into its package. A level saved in v4 opens with an empty Assets panel |
| The determinism test | [testing.md](../../architecture/testing.md#the-determinism-test) | Levels with scripts, a fixed seed and a fixed clock |

## Filled gaps (standing yes, 2026-11-26)

Each is written in its topic file with its reason, and listed in [decisions.md](../../decisions.md).

- **Making, renaming and deleting a `.lua` file:** New script makes `script.lua` with a short start and selects its name; a name ends in `.lua`, has no `/` or `\`, and is unique ignoring case; renaming keeps every use; deleting a used file asks with a count and leaves `missing` rows. A double-click opens a file (F2 renames), since the code editor's rules already said so.
- **Attaching a script:** from the card's Add script menu, which also has New script; works on several entities at once. Each row has Open, Move up, Move down and Remove.
- **Held keys and timers have no script events**, `is_down` and `wait` do it. Script-fired custom events count toward the 32 steps.
- **Convert to script (Later) runs the new script at the ScriptComponent's moment**, above the triggers, settling the open question from 2026-11-20.
- A stale line in [scripts.md](../../requirements/scripts/scripts.md#events-with-on--v5) said a script can't read another entity's variables; it now follows the owner's answer of 2026-11-26.

## Question for the owner

**The touch events' script names.** The rule is "script event names are the trigger events in snake_case", but the trigger's words changed on 2026-11-24 to "When other **starts** touching this" and "**stops** touching this", while the approved script names are still `"touched"` and `"no_longer_touched"`. Once v5 ships a name can never change. **Recommendation: `"starts_touching"` and `"stops_touching"`**, so the rule holds and a script reads like its trigger. Keeping the old names is also fine; then the rule gets an exception written down.

## Not in v5

- **Folders, file paths, importing images, the image fill and the World's background image** are v6. **Text** is v7. **`.entity` files, `spawn()`, the builtin folder and its example scripts** are v8.
- **Switching a script off, Convert to script, live values, suggestions and hover help, script help, Console filters, trigger lines, hints in errors, mistake warnings while typing, find in all scripts, dragging a file onto an entity, Replace file and where each file is used** are Later.
- **Choice and list variable types** and **Keep between runs** are Later.
- **Pinning the seed** is Later.
