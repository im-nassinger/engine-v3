# Saving and files

## TL;DR

Where a level lives and how it leaves the browser. **v1:** one level at a time, saved in the browser after every change, exported and imported as a project file (`.editable`); a warning when saving fails; the game asks the browser to keep its data; a second tab is read-only; every file records its file format version and its physics version; a level holds at most 100,000 entities and 256 MB. **v3:** the play file (`.playable`) with a way to run it without the editor, and the warning after 10,000 entities. Core rules: the level lives in one browser that may delete it, so the game is honest about that and only an exported file is a real backup; there is no list of levels, no level id and no version history in v1.

A main menu with a list of levels, thumbnails, accounts and publishing are in [later.md](../later.md).

## The saved level

### One level, saved in the browser · v1

- **v1 holds one level at a time:** the one open in the editor. It is saved in the browser, so a reload or a crash loses nothing.
- To keep several levels, export them.
- **New and Import replace the open level** after asking: "Replace the open level? Export it first if you want to keep it."
- The app opens straight on the editor with the saved level, or a new one on a first visit.
- *Why: a list of levels isn't v1, so there is nothing to compare an import against. Without the browser copy, closing the tab would lose work.*

Source: round 11: 12 A1, 12 A11; round 12: LV1; old: SV-16, SV-32

### The level saves itself · v1

- **The level saves itself in the browser after every change:** 2 seconds after the last change, or at most 20 seconds after the first unsaved one. *Why these numbers: the owner's timing.*
- During a drag it waits until the drag ends.
- It also saves when the tab is hidden, when you press Play and before an export.
- **A save is all or nothing.** It either fully replaces the last save or leaves it as it was.
- Saving never needs the internet.
- **Undo history is not saved.** Reopening the level starts a fresh history. *Why: every past change would have to load forever, making files big and fragile across versions.*
- Test play never saves its own state and never changes the saved level.
- The top bar shows the save state, see [the workspace](../editor/workspace.md) (owner: 2026-11-14).

Source: round 5: FMT1; round 11: 12 A3; old: SV-17 to SV-19, SV-22, SV-23, SV-31; owner: 2026-11-14

### A warning when saving fails · v1

- If saving in the browser fails, such as when storage is full or a private window blocks it, **a warning in the status bar says so.**
- You keep working, the game keeps trying, and **Export still works**, because it doesn't need the browser's storage. Nothing is deleted.
- If the browser's storage can't be opened at all, the editor still runs on a new level and says that nothing will be saved.
- *Why v1: otherwise you'd find out you lost work only after a reload.*

Source: scope SA3; round 12: SV2; old: SV-28, SV-29, SV-46

### Ask the browser to keep the saved level · v1

- The game asks the browser once to keep what it has saved (`navigator.storage.persist()`). Some browsers ask the user with a popup, others decide alone.
- **No backup reminders.** *Why: the owner doesn't want them.*
- *Why ask: otherwise a browser may delete the data on its own, such as when the disk is nearly full, or Safari after 7 days without a visit. It is one call.*

Source: scope SA2; round 11: 12 A6; round 12: ST1; old: SV-38

### A second tab is read-only · v1

- If the level is already open in another tab, the second tab says so and stays read-only.
- *Why: with one saved level, two tabs editing it would both save, and the last one would silently overwrite the other.*

Source: scope SA1; round 11: 12 A7; round 12: TB1; old: SV-47

### The level's name · v1

- A level has a name of 1 to 60 characters, `Untitled level` at first.
- It is shown and edited in the top bar, see [the workspace](../editor/workspace.md), and saved in the project file. Renaming is an undo step.
- It is the default file name on export, with characters no file system allows replaced.

Source: owner: 2026-11-13

## Level files

### The project file: Export and Import · v1

- **The project file, `.editable`, is the level as you edit it.** Example: `castle.editable`.
- It is a package: a `.zip` inside, under its own extension, holding the level and every file it uses. *Why its own extension: it says what the file is for, and it stops someone importing a random `.zip`.*
- **Ctrl+S exports the project file**, the same as the Export button. *Why: version history was dropped. If Ctrl+S did nothing, people pressing it out of habit would think they had saved.*
- In the file: the level, its files (also unused ones), and editor-only data such as the grid size, locks and folded Entities panel rows.
- Not in the file: undo history, and what stays in the browser: the view position, the zoom, the pinned seed and the values of kept variables.
- **Import checks a file before loading it**, and is all or nothing: a file with a problem changes nothing and gets a plain message. The cases: not a level file, too big, damaged, made by a newer version of the game, missing a file it lists, over a limit.
- A level file that lists a file it doesn't contain is refused. A use of a file that doesn't exist is only a warning.
- **A level from someone else is untrusted.** Its scripts get the same safe set of functions as any script, see [scripts](../scripts/scripts.md). Importing never starts play.
- *Why v1: with one level in the browser, the project file is how you keep and move levels.*

Source: round 1: D30; round 3: D79; round 5: FMT1; round 11: 12 A10; round 12: SV1, EXT1; old: SV-61, SV-64, SV-65, SV-68, SV-72, SV-82, SV-83

### The file format version · v1

- **Every level file records the file format version it was saved with.**
- Opening an older file upgrades it on load. The file on disk is untouched, so it is the backup.
- A level from a newer version of the game is refused with a message saying so.
- **Game updates never change how a level plays.**
- The code that upgrades old files is written when the format first changes.
- *Why this way: upgrading on load is how most editors handle old files, and leaving the original file alone means no separate backup is needed. This was Claude's call, after the owner said "you decide".*
- *Why v1: one field now. Without it, files saved by v1 can't be upgraded safely later.*

Source: scope SA5; round 10: API1; round 11: 12 A12; old: SV-13, SV-85, SV-90, SV-91

### The physics version · v1

- **Every level file also records the physics version it was saved with**, next to the file format version: which version of the game's physics the level was built and tested on.
- v1 only records it. What the game does with it, such as letting an old level keep its old physics after an update, is [Later](../later.md#level-ids-and-other-version-numbers-later).
- *Why: "game updates never change how a level plays" breaks on the first update of the physics engine unless each level says which physics it was made with. It is one field. This was Claude's call, after the owner said "you decide".*

Source: owner: 2026-11-13; round 1: D8; old: SV-15

### Limits · v1

- A level holds at most **100,000 entities**, and at most **256 MB**. *Why: the owner's numbers.*
- **The 256 MB counts the unpacked size:** the level and every file it holds, before zipping. *Why: import needs a limit on the unpacked size anyway, to refuse a file that unpacks into far more than it looks. Files are never smaller unpacked, so one number covers both, and the editor can check it without zipping (owner: 2026-11-13).*
- There is no separate limit on the number of files in v1. From v3, a level holds at most 500 files, see [files and sound](../assets/files-and-sound.md).
- **The editor and Import use the same limits**, so anything the editor can save, the same version can import.
- An action that would pass a limit is refused with a message that names the limit. The level stays valid and saved.
- Limits on a level's own files are in [files and sound](../assets/files-and-sound.md).

Source: round 11: 12 A8; old: SV-52, SV-54; owner: 2026-11-13

### The warning after 10,000 entities · v3

- Past 10,000 entities a small warning appears, which you can dismiss.
- *Why v3: test levels stay far below it. The 100,000 limit holds in v1 either way.*

Source: scope SA6; round 11: 12 A8

### The play file · v3

- **The play file, `.playable`, is made from the project file and holds only what is needed to play.** Example: `castle.playable`.
- It drops editor-only data: the grid size, locks, folded Entities panel rows. Hidden is not editor-only, so it stays. *Why: the grid serves no purpose to a player.*
- It is a package too: a `.zip` inside with the level and every file it uses. *Why: one packing idea for everything, instead of a second rule.*
- v3 also adds a way to open a play file and run the level without the editor, see [test play](test-play.md).
- *Why v3: before publishing, nobody else plays your levels. The project file already keeps and moves them.*

Source: scope SA4; round 5: FMT1; round 6: FMT2; round 11: 12 A10; round 12: EXT1

## Small features

Small features from the old draft and review that the scope review never asked about. The owner gave each its version in round 7 of the architecture review.

| Feature | Rule | Version |
|---|---|---|
| Import by dropping | Dropping a level file on the editor imports it, after the same question as Import | v1 |
| A note after a crash | Reopening after a crash loads the last save and says: "Recovered from your last save at 14:32. The last few seconds may be missing." | v1 |
| A saved level that won't open | It is checked like an import. If it fails, the game offers to export the raw data and never deletes it | v1 |
| Site data cleared while the level is open | The open level is still in memory, so the game saves it again and says so | v1 |
| Edit here instead | A button in the read-only tab that takes over editing. The other tab saves and turns read-only | v3 |
| An Export dialog | The file name, counts of entities and files, the size and one button | v3 |
| A note about scripts on import | "Contains 4 scripts. They can't reach your files or other levels." Never a blocking question | v3 |
| Update available | When a new version of the game is out, an open tab offers Reload and never reloads by itself | v3 |
| Level details | Description, author, instructions and level tags, in a Level info window. They are for a level's page | Later |

Source: old: SV-10, SV-11, SV-14, SV-33, SV-48, SV-62, SV-63, SV-69, SV-84, SV-93; owner: 2026-11-14
