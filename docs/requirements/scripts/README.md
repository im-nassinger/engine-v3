# Scripts

## TL;DR

Code for what triggers can't do. **In v1** an entity's ScriptComponent lists `.lua` files whose settings show as Inspector fields; scripts listen with `on()`, work with entity ids, spawn, wait, and read and change component values; they are written in the Monaco editor and report to the Console. **In v2** come suggestions and help in the editor, tutorial levels, Console filters, trigger lines and error hints. Core rules: handles, not references; scripts and triggers share one list of events; the Lua API only ever grows; and scripts can't touch files or the network.

## Files

| File | Covers |
|---|---|
| [scripts.md](scripts.md) | The ScriptComponent, `on()`, handles, component values, `spawn`, `wait`, the Lua API, safety, errors |
| [code-editor-and-console.md](code-editor-and-console.md) | Monaco, suggestions, help, the Console, debugging |

## Features and versions

| Feature | Version | File |
|---|---|---|
| The ScriptComponent with a list of `.lua` files | v1 | scripts |
| Events with `on()`, handles, component values | v1 | scripts |
| `spawn(path)`, `wait(2)` | v1 | scripts |
| Lua 5.4 with safe parts only, no work limit, the API only grows | v1 | scripts |
| Script errors in the Console, pause on the first error | v1 | scripts |
| The Monaco code editor | v1 | code-editor-and-console |
| Console lines, repeated lines with a count | v1 | code-editor-and-console |
| Debugging: live values, `print()`, Pause and Step | v1 | code-editor-and-console |
| Hints in script errors | v2 | scripts |
| Suggestions and hover help | v2 | code-editor-and-console |
| Script help and tutorial levels | v2 | code-editor-and-console |
| Console filters, trigger lines | v2 | code-editor-and-console |

The exact list of Lua functions is not written yet. See the last table in [scripts.md](scripts.md).
