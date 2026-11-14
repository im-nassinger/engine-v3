# Proposal: the Lua API

## TL;DR

**Not decided. Waiting for the owner.** The full function list is written in [the Lua API](../requirements/scripts/lua-api.md), with each function marked as named in the review or proposed, and whole example scripts are in [the examples](../requirements/scripts/lua-examples.md). This file holds the questions. Each answer is written into those pages, and this file is deleted when all are answered.

Already decided by the owner: **every function is top level**, and **a component value is changed with `set_attribute`** alongside the review's `get_attribute`.

## Questions for the owner

Each is one yes or no. A "no" means the old open point stays open.

**1. A script's own entity is `this`.**
The problem: with ids there is no `self` object, so a script needs its entity's id. The proposal reuses the trigger word: in a script, `this` is the id of the entity the script is on, and `other` is what a handler receives. Example: `destroy(this)`. Each entity runs its own copy, so `this` is always right.

**2. Settings are a `settings` table at the top, built with one `<type>_field` function per field type.**
The problem: "values the script declares at its top" was never written down. The proposal names one function per field type in the fixed list (`number_field`, `text_field`, `checkbox_field`, `choice_field`, `colour_field`, `vector_field`, `angle_field`, `entity_field`, `asset_field`, `variable_field`, `tags_field`, `list_field`). They are top level, like every function. The Inspector shows them in the order written, labelled from the name (`run_speed` reads "Run speed"). The script reads the entity's values as `settings.run_speed`. Example: `speed = number_field(400, { min = 0, max = 1500, unit = "px/s" })`.

**3. No new way to share values between scripts: custom events and variables cover it.**
The problem: the old draft had a table shared by an entity's scripts, and functions other scripts could call. The proposal adds neither: to ask an entity for something, fire a custom event, and for a level-wide value, use a variable. Example: a Damage script does `fire_event(other, "damage", 1)`, and the Health script on that entity decides what it means. The trade-off: one script can't read another entity's private state, such as an enemy's health for a health bar. Since the API only grows, a function for that can come later.

**4. No vector type. A point is two numbers, plus `clamp` and `lerp`.**
The problem: the old draft had a `vec` type with operators. A type is a concept of its own, with its own rules for printing and comparing. The proposal returns two numbers everywhere and adds only the two helpers almost every movement script writes by hand. Example: `local x, y = get_position(this)`. A vector type can still be added later without changing these functions.

**5. Builtin scripts share three custom events: `damage`, `heal` and `died`.**
The problem: the old draft listed `damage`, `heal`, `hurt`, `died`, `stun`, `activate`, `deactivate` and movement states, and none were reviewed. The proposal keeps the three the v3 builtin scripts need: `damage` and `heal` carry an amount, and the Health script fires `died` on its own entity at zero, so a trigger there can Destroy or Lose. Each builtin script's help lists the events it fires and hears. More come only when a builtin file needs one.

**6. Script event names are the trigger events in snake_case**, as in the events table of [the Lua API](../requirements/scripts/lua-api.md), and a handler gets `other` and the event's number.
The problem: EV1 named only `touched`, `tick` and custom events. Example: `on("no_longer_touched", function(other) ... end)`.

**7. The rest of the function list is approved as written.**
The problem: the review named only a few functions and the areas they cover. [The Lua API](../requirements/scripts/lua-api.md) fills each area with plain functions, every one marked "Proposed". A "yes" makes them the v2 and v3 list. A "no" can name the ones to change.
