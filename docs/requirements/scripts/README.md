# Scripts

## TL;DR

Code for what triggers can't do. **Nothing here is in v1.** **In v5** an entity's ScriptComponent lists `.lua` files, and each file lists the variables it needs on that entity; scripts listen with `on()`, work with entity ids, wait, and read and change component values; they are written in the Monaco editor and report to the Console. **v7** adds `spawn()`. **Later** come live values, suggestions and help in the editor, tutorial levels, Console filters, trigger lines and error hints. Core rules: handles, not references; scripts and triggers share one list of events; the Lua API only ever grows; and scripts can't touch files or the network.

## Files

| File | Covers |
|---|---|
| [scripts.md](scripts.md) | The ScriptComponent, `on()`, handles, component values, `spawn`, `wait`, the Lua API, safety, errors |
| [lua-api.md](lua-api.md) | Every Lua function, with its status: named in the review or decided by the owner |
| [lua-examples.md](lua-examples.md) | Whole example scripts: a coin, a door, walking, a turret, a score, health |
| [code-editor-and-console.md](code-editor-and-console.md) | Monaco, suggestions, help, the Console, debugging |

## Features and versions

| Feature | Version | File |
|---|---|---|
| The ScriptComponent with a list of `.lua` files, each listing the variables it needs | v5 | scripts |
| Events with `on()`, handles, component values | v5 | scripts |
| `wait(2)` | v5 | scripts |
| `spawn(path)` | v7 | scripts |
| Lua 5.4 with safe parts only, no work limit, the API only grows | v5 | scripts |
| Script errors in the Console, pause on the first error | v5 | scripts |
| The Monaco code editor | v5 | code-editor-and-console |
| Console lines, repeated lines with a count | v5 | code-editor-and-console |
| Debugging: `print()`, Pause and Step | v5 | code-editor-and-console |
| Debugging: live values behind the Panels button | Later | code-editor-and-console |
| Switching a script off, from its checkbox or a trigger | Later | scripts |
| Hints in script errors | Later | scripts |
| Suggestions and hover help | Later | code-editor-and-console |
| Script help and tutorial levels | Later | code-editor-and-console |
| Console filters, trigger lines | Later | code-editor-and-console |

The Lua functions are in [lua-api.md](lua-api.md).
