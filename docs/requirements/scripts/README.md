# Scripts

## TL;DR

Code for what triggers can't do. **Nothing here is in v1.** **In v2** an entity's ScriptComponent lists `.lua` files whose settings show as Inspector fields; scripts listen with `on()`, work with entity ids, spawn, wait, and read and change component values; they are written in the Monaco editor and report to the Console. **In v3** come suggestions and help in the editor, tutorial levels, Console filters, trigger lines and error hints. Core rules: handles, not references; scripts and triggers share one list of events; the Lua API only ever grows; and scripts can't touch files or the network.

## Files

| File | Covers |
|---|---|
| [scripts.md](scripts.md) | The ScriptComponent, `on()`, handles, component values, `spawn`, `wait`, the Lua API, safety, errors |
| [lua-api.md](lua-api.md) | Every Lua function, with its status: named in the review or proposed |
| [lua-examples.md](lua-examples.md) | Whole example scripts: a coin, a door, walking, a turret, a score, health |
| [code-editor-and-console.md](code-editor-and-console.md) | Monaco, suggestions, help, the Console, debugging |

## Features and versions

| Feature | Version | File |
|---|---|---|
| The ScriptComponent with a list of `.lua` files | v2 | scripts |
| Events with `on()`, handles, component values | v2 | scripts |
| `spawn(path)`, `wait(2)` | v2 | scripts |
| Lua 5.4 with safe parts only, no work limit, the API only grows | v2 | scripts |
| Script errors in the Console, pause on the first error | v2 | scripts |
| The Monaco code editor | v2 | code-editor-and-console |
| Console lines, repeated lines with a count | v2 | code-editor-and-console |
| Debugging: live values, `print()`, Pause and Step | v2 | code-editor-and-console |
| Hints in script errors | v3 | scripts |
| Suggestions and hover help | v3 | code-editor-and-console |
| Script help and tutorial levels | v3 | code-editor-and-console |
| Console filters, trigger lines | v3 | code-editor-and-console |

The Lua functions are in [lua-api.md](lua-api.md). Most of them wait for the owner's answers in [the Lua API proposal](../../proposals/lua-api.md).
