# Assets: files and sound

## TL;DR

The Assets panel is a small file system: folders of raw files, each with a path, plus a read-only `builtin` folder. **v2:** the panel with folders, holding `.lua` and `.entity` files, and paths that update themselves when a file moves. **v3:** importing images and sounds, playing sounds from triggers and scripts, replacing and deleting files safely, search and sort, packages, and the My files folder. **Later:** trimming a sound. Core rule: **an asset is only the raw file.** Its settings live where it is used.

## The Assets panel

### Folders of files · v2

- Each level has its own files, shown in the Assets panel as folders, like a file system. In v2 they are `.lua` files and `.entity` files. Images and sounds join in v3.
- Entities point to files and never hold their own copies. Fixing a file fixes every use.
- **An asset is only the raw file. Settings never live on the asset.** They live where it is used: on an image fill, on a "Play sound" action. *Why: you never wonder where a setting is, and two places can use one file with different settings without copying it.*
- A read-only **`builtin` folder** holds the files that come with the game. See [builtin-content.md](builtin-content.md).
- Selecting a file shows its details at the bottom of the panel, not in the Inspector, so the selection in the level is kept.
- F2 or a double-click renames a file. Del deletes it.
- The panel is read-only during play.
- *Why v2: it holds .lua and .entity files, which both come in v2.*

Source: scope AS1; round 1: C13, C14; round 3: D67; round 5: 04 2.1; round 6: ST3, SND1; old: AS-01, AS-02, AS-05, AS-09; owner: 2026-11-13

### File paths that update themselves · v2

- Every path starts from the top of the Assets panel, such as `images/coin.png` or `pickups/coin.entity`.
- Files are moved and renamed only in the Assets panel, which then updates every path that points to them, in the level and inside `.entity` files.
- No two files can have the same path.
- *Why paths: paths from the top mean moving an `.entity` file never breaks it, and auto-updating covers moving what it points to, like code editors updating imports. Hidden ids would never break either, but the files would stop being readable text.*
- *Why v2: it comes with the Assets panel.*

Source: scope AS2; round 8: AP1; owner: 2026-11-13

### Search and sort · v3

- A search box filters by name. Sort by name, newest, size or most used.

Source: scope AS3; round 5: 04 2.1; old: AS-04

### Replacing and deleting · v3

- **Replace file** keeps the path and every use. Same kind of file only. Builtin files can't be replaced.
- **Deleting a file in use warns with a count**, such as "14 entities use coin.lua. Delete it?". Deleting never deletes entities: their uses become missing. Undo restores everything.
- A use of a missing file shows a warning where it is used.
- Each file shows where it is used. Clicking a line selects that entity.

Source: scope AS7; round 1: D30; round 5: 04 2.4; old: AS-08, AS-26, AS-29 to AS-31

### Packages · v3

- An `.entity` file is always plain text that points to its files by path. It never carries them inside.
- To share one, **Export package** makes a `.zip` with the `.entity` file and every file it points to, in their folders. It works on a folder too.
- Importing a `.zip` adds its files, already linked. If a path is already used, the editor asks: Keep both or Replace.
- *Why: the owner rejected an earlier idea where one file type behaved two ways, with packing happening for no visible reason. Now there are two things with two names, and the packing is a command you run and see.*
- A level's own files work the same way, see [saving](../play-and-save/saving.md).

Source: scope AS8; round 6: E4, FMT2; round 8: AP1

### The My files folder · v3

- A **My files** folder in the Assets panel is shared by every level in this browser.
- *Why v3: v1 holds one level, so there is nothing to share it with yet.*

Source: scope AS9; round 2: O6; decisions: D59

## Images

### Importing images · v3

Images ship in v3 together with the image fill, see [drawing](../drawing.md).

- Import PNG, JPEG, WebP or GIF with the Import button, by dropping files on the panel or the level, or by pasting.
- An animated GIF or WebP imports its first frame only, with a note. The kind of file is read from its contents, not its name. SVG is refused: "Export it as PNG".
- Files import one by one. Each succeeds or fails alone, and a summary names each failure and its reason. One import is one undo step.
- Importing a file that is already there adds nothing and selects the existing one. A new file with a used name gets a number.
- An image with a side over 4096 px offers "Scale down and import".
- Dropping an image on the level imports it and places it at its real size: 1 image pixel is 1 level pixel.
- A missing image draws a grey placeholder in the editor and nothing in play, with a warning.

Source: scope DR11; round 1: D30; round 5: 04 2.2, 04 2.3; old: AS-10 to AS-24, AS-31

## Sound

### Playing sounds · v3

- **Sounds are played by triggers and scripts, never by a component.** There is no sound component and no music setting on the World.
- Import WAV, MP3 or OGG, the same ways as images.
- A sound asset is only the raw file. **Volume, loop, and start and end times are set on each "Play sound" action or Lua call.** Defaults: 100%, no loop, the whole file.
- **All sound is one kind of audio.** There is no Music group and no Sound effects group. *Why: simpler to build and explain. The trade-off, that music can't be turned down alone, can be undone later with one more "Play sound" setting without breaking levels.*
- Triggers have **Play sound** and **Stop sound** actions. Scripts play and stop sounds through the Lua API.
- At most 32 sounds play at once. The oldest sound that isn't looping ends to make room.
- All sounds stop when test play stops. Pause holds them and resume continues them.
- No left/right or distance effect: a sound is equally loud wherever it starts.
- A sound can be played from its row in the Assets panel without starting test play.
- Players get one Volume slider and Mute, in the pause menu's Settings page.
- Browsers need a click before sound can play. Pressing Play counts. If sound is still blocked, the game keeps running silently and shows "Click to enable sound".
- A sound the browser can't play shows a warning on its row and is silent in play.

Source: scope AS4; round 5: 04 2.2, 04 2.12; round 6: SND1, 04 2.13; round 7: 04 2.14; round 8: FX3; old: AS-104, AS-105, AS-111, AS-118 to AS-120, AS-127

### Use as level music · v3

- Right-click a sound: **Use as level music**. It adds a trigger on the World that plays the sound on a loop at level start. It is an ordinary trigger, visible and editable.

Source: scope AS5; round 2: R10; round 6: SND1; round 8: FX3; old: AS-110

### Trim a sound · Later

- A Trim command in the Assets panel saves a new, shorter file.
- *Why Later: any sound editor already does it.*

Source: scope AS6; round 6: SND1

## Limits

### Limits per level · v3

They matter once images and sounds exist. All are starting values.

| Limit | Value |
|---|---|
| Imported files per level, in total | 50 MB |
| Files per level | 500 |
| One sound | 10 MB and 10 minutes |
| One image | 8 MB, and 4096 px on its longest side |

- An import that would pass a limit is refused. Files that still fit are imported.
- Limits never block saving, playing or exporting a level that already exists.
- Builtin files don't count.

Source: round 1: D34; round 6: 04 2.15; old: AS-128 to AS-130

## Not in the scope review

Accepted in the requirements review but never given a version, or left over from the old draft. The last column is Claude's suggestion, not a decision.

| Feature | Rule | Suggested |
|---|---|---|
| Extra "Play sound" settings | The old draft had pitch, random pitch, fade in, and "if already playing: play another, restart, keep playing". The review kept only volume, loop, and start and end times | Later |
| Too many of one sound | One file starts at most 3 times per tick, so 20 coins picked up together don't spike the volume | v3 |
| Usage bar | The panel shows "23.4 of 50 MB, 142 of 500 files", and turns amber at 80% | v3 |
| Remove unused | Lists files with no uses and removes the ticked ones | v3 |
| Swap with another file | Points every use of one file to another of the same kind | v3 |
| Mute in test play | A mute switch on the Play bar, saved in the browser | v3 |

Source: old: AS-28, AS-32, AS-112, AS-118, AS-126, AS-129
