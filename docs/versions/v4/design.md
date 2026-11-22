# v4 design

## TL;DR

**v4 has two new screen parts: the shortcut list, and new rows in cards that already exist.** The owner went to sleep after saying to plan and build v4 (2026-11-22), so these are Claude's proposals under the standing yes, built from v3's approved look with nothing new to learn. Task 1 drew them in the [v4 mockup](../../design/mockups/v4.html) and wrote the rules into [controls.md, v4](../../design/controls.md#v4-the-shortcut-list-the-new-trigger-rows-and-typed-variables); the owner sees them in the morning try, and any change becomes a fix.

## The parts

| Part | What it looks like |
|---|---|
| **The shortcut list** | `?`, or Help › Shortcuts in the main menu, opens a sheet docked at the right of the level view, 320 px wide, in `--panel` with `--radius-island` corners and the `--shade`, like the other islands. At the top, a search field ("Search shortcuts") with focus, and a × that closes it. Under it, one section per area (Tools, Selecting, Editing, View, Test play, ...), the section title in the card head's small-caps style, then one row per shortcut: what it does on the left in `--text`, the keys on the right as small `--raised` key caps. Typing filters the rows by name or key; an area with no match is hidden; no match at all says "No shortcut matches". It stays open while you work, and `?` or Esc closes it |
| **Tooltips** | Every icon button shows its name and shortcut, as the tools already do (`Trigger 6`); a button without a shortcut shows its name only |
| **New Whens** | In the When menu, after v3's: "When this hits something", "When this gets [pick a name]", "When this is destroyed", "When [pick a variable] changes". The variable's condition is a second clickable part, "becomes [10 or more]" or "(any change)" |
| **New checks** | Add check offers "this [pick a value] is more than [0]" beside v3's two. The value menu lists components, each opening the target's number values; the body's live values are under BodyComponent as Speed, Velocity x, Velocity y |
| **New actions** | Add action offers "Fire [pick a name] on [this]" (a number, optional, after "with") and "Wait [1] s". A Do list with a Wait shows a faint line under the Wait's row. Change value on a boolean offers Set and Flip; on a string, Set only |
| **The variable menu** | Two groups: "The level's" (the World's variables) first, then the target's own, titled with the target ("this", "other", the entity's name). Each row shows the variable's type as a small `--faint` word at the right: number, string, boolean |
| **The Variables card** | Each row gains a type menu between the name and the value: Number, String, Boolean. A string's value is a text field, a boolean's a checkbox |

## Proposals in it

These are Claude's (standing yes, 2026-11-22), for the owner to keep or change:

- **The shortcut list is a sheet, not a dialog**, so it stays open while you work, as the requirement says, and it covers only the level view's right edge. It hides the Entities viewer while open. *Why: two islands in one corner would overlap.* **Corrected in task 1 (standing yes, 2026-11-22):** this said the Entity inspector, but the top right holds the Entities viewer; the sheet takes its place and reaches down to 10 px above the minimap. The main menu's entry is **Help › Keyboard shortcuts**, the name [workspace.md](../../requirements/editor/workspace.md) gives it.
- **Key caps** are drawn as small `--raised` boxes with `--radius` corners, one per key, joined by a `+`.
- **A Wait's faint line** shows where the delay falls in the Do list, so "wait, then destroy" reads as two moments.
