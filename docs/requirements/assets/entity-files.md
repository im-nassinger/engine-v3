# Assets: .entity files and spawning

## TL;DR

An `.entity` file is a saved entity with its children and components, as a text file in the Assets panel. There is no "prefab": it is just a file. **v7:** save a selection as an `.entity` file, drag one into the level to place a plain copy, and spawn from one during play. **Later:** linked copies that update when the file changes, and placing several copies in a row. Core rules: files are found by path, never by name, and a spawned entity lasts one run.

## .entity files

### Save and place · v7

- **There is no "prefab".** A saved entity is a text file with the `.entity` extension, kept in the Assets panel. *Why: if something is just a file, it stays a file.*
- **Save as .entity file** saves the selection: the entity with its children and all their components, triggers, scripts, variables and tags. Several selected entities are wrapped in a new group. The World and the camera can't be saved this way.
- **Overwrite file** replaces an `.entity` file's contents with the selection.
- Saving warns about links to things outside the selection, listing each one. Those links become missing in the file. A joint keeps the rule for copying: an end that points outside the selection becomes missing.
- **Dragging an `.entity` file into the level places a copy**: the entity with its children and components, in the group you are inside, on top, selected. One undo step.
- In v7 the placed copy is a plain copy. Changing it changes nothing else, and changing the file doesn't change it.
- The file points to the other files it uses (scripts, and later images and sounds) by path.
- An `.entity` file may point to other `.entity` files, such as a turret that spawns a bolt.
- Overwriting a file while test play runs doesn't affect the running copy.
- *Why v7: it was v1 for spawning, which only triggers and scripts do. Copy and paste cover reuse inside one level.*

Source: scope EF1; round 1: C14; round 6: E4; round 7: 08 2.1, 08 2.3; round 8: JC1; old: PP-01 to PP-03, PP-23 to PP-31; owner: 2026-11-13

### Linked copies · Later

- Dragging an `.entity` file into the level creates a **linked copy**, marked by an **AssetComponent** that records which file it came from.
- In a linked copy, only the TransformComponent, the name and the tags can be edited. Everything else is read-only.
- Editing the `.entity` file in its own tab and saving updates every copy.
- **Make unique** removes the AssetComponent, and that is all it does. The copy is then a plain entity.
- *Why Later: linking needs a second editing tab and read-only fields. Plain copies are enough to test spawning.*

Source: scope EF2; round 2: O1a, O1b, O1c, O1d

### Placing several copies, and previews · Later

- The Assets panel shows a preview of each `.entity` file.
- Select an `.entity` file, then click in the level once per copy. A faded preview follows the mouse and snaps like anything else. Esc ends it.

Source: scope EF3; round 7: 08 2.2; old: PP-17, PP-18

## Spawning

### Spawning during play · v7

- Triggers and scripts create entities during play from `.entity` files. **They spawn by path, never by name.** *Why: two `.entity` files could hold entities with the same name, but no two files can have the same path.*
- In a script, `spawn(path)` returns the new entity's id, which can be used straight away, such as to set its speed.
- No hidden entity has to sit in the level to be copied.
- **A spawned entity lasts one run.** It never reaches the level or the undo history, and Stop or Restart removes it.
- A spawned entity lives until something destroys it. Destroying the entity that spawned it doesn't destroy it, unless that entity is its parent.
- Limits: **up to 2,000 spawned entities at once, and 200 per tick.** An `.entity` file with 5 entities counts as 5.
- At the limit a spawn is refused whole and nothing existing is removed. A script gets nothing back, and a trigger's Spawn action is skipped. In test play the first refusal puts a warning in the Console.
- Spawned entities run their triggers and scripts where they sit in the tree, like any other entity.
- A "level start" trigger inside a spawned entity fires once, when it spawns.
- A spawn that names a missing file does nothing and puts an error in the Console. The script keeps running. A trigger whose Spawn action points to a missing file shows a warning in the editor.
- A level's package keeps every path, so spawns still find their files after export.
- *Why v7: only triggers and scripts spawn.*

Source: scope TR7; round 3: D67; round 7: 08 2.11; round 9: 10 2.4; round 10: OR1; old: PP-78 to PP-89; owner: 2026-11-13

## Small features

Small features from the old draft and review that the scope review never asked about. The owner gave each its version in round 7 of the architecture review.

| Feature | Rule | Version |
|---|---|---|
| Origin of an .entity file | The point that lands on the mouse when placed, and on the given position when spawned. Default: the centre of the selection | v7 |
| Where a spawned entity sits | At the top level of the tree, above the level's entities, unless a parent is given. A spawned entity never merges into a body above it, so a bullet never becomes part of its shooter | v7 |
| Replace selection with an .entity file | Swaps selected entities for a chosen file, keeping each one's place. Linked copies cover most of the need | Later |

Source: old: PP-20, PP-22, PP-28, PP-80 to PP-84; owner: 2026-11-14
