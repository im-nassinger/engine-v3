# Play and save

## TL;DR

Running a level and keeping it. **In v1** Play runs a copy of the level with the panels hidden and a small Play bar (Stop, Pause, Step); the level saves itself in the browser, one level at a time, and is exported and imported as a project file (`.editable`). **In v2** come Panels with live values, Win and Lose with the end window, the pause menu with Resume and Restart, and the random seed. **In v3** come the rest of the pause menu, the speed menu, pinning the seed, full screen, and the play file (`.playable`) that runs without the editor. Core rules: test play never changes the level, determinism is tested from the first day, and only an exported file is a real backup.

## Files

| File | Covers |
|---|---|
| [test-play.md](test-play.md) | Play and Stop, the Play bar, Pause and Step, Panels, the end window, the pause menu, ticks and time, focus, the seed, determinism, test tools, what players see |
| [saving.md](saving.md) | The saved level, autosave, failed saves, tabs, the project file, the play file, the file format version, the physics version, limits |

## Features and versions

| Feature | Version | File |
|---|---|---|
| Play and Stop, the Play bar | v1 | test-play |
| Pause and Step | v1 | test-play |
| The Panels button and live values | v2 | test-play |
| Win and Lose: the end window | v2 | test-play |
| The pause menu on Tab, Resume and Restart | v2 | test-play |
| 60 ticks per second, the level's time | v1 | test-play |
| Switching tabs pauses, keys never stick | v1 | test-play |
| The determinism test | v1 | test-play |
| The random seed | v2 | test-play |
| One level, saved in the browser | v1 | saving |
| The level's name | v1 | saving |
| The level saves itself | v1 | saving |
| A warning when saving fails | v1 | saving |
| Ask the browser to keep the saved level | v1 | saving |
| A second tab is read-only | v1 | saving |
| The project file: Export, Import, Ctrl+S | v1 | saving |
| The file format version | v1 | saving |
| The physics version | v1 | saving |
| Limits: 100,000 entities, 256 MB | v1 | saving |
| The pause menu's Controls and Settings pages | v3 | test-play |
| Pin the seed | v3 | test-play |
| The speed menu | v3 | test-play |
| View menu switches during play | v3 | test-play |
| A full screen button | v3 | test-play |
| Players can slow the game | v3 | test-play |
| Playing outside the editor | v3 | test-play |
| The play file | v3 | saving |
| The warning after 10,000 entities | v3 | saving |

Inputs, raw keys and remapping are in [variables and inputs](../triggers/variables-and-inputs.md). The Console is in [the code editor and the Console](../scripts/code-editor-and-console.md).
