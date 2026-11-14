# Overview

## TL;DR

A 2D physics game for the browser, built around a level editor. A creator builds a level out of shapes, text, physics bodies, joints, triggers and Lua scripts, presses Play to test it, and exports it as a file. These docs hold the functional requirements (what the game does), the scope (which version each feature ships in), the [architecture](architecture/README.md) and the [plan](plan.md) the code is built from. Stage 0, the project setup, is done. v1 is the smallest thing that can be tested: build one level, watch it run, export it. Logic, and so playing a level, comes in v2.

## What it is

- **A level editor and the game it makes levels for, in one page.** It opens straight on the editor. Target: a desktop browser, with mouse and keyboard.
- **A level is a tree of entities.** Each entity is only what its components make it: a shape, a text, a body, a joint, the camera. One World entity sits at the top and holds the level's settings.
- **Three ways to make things happen**, from easiest to most free: ready-made builtin files, triggers (no code: When, If, Do), and Lua scripts.
- **Play runs a copy of the level.** Stop puts the editor back exactly as it was.
- **The level lives in the browser** and leaves it as a file. Accounts and publishing come later.

## The ideas everything follows

The full list, with the review decision behind each, is in [principles.md](principles.md). The ones that shape the most:

- **Everything is an entity with components.** A feature is a component or a setting on one, never a separate kind of thing. A joint is an entity, an image is a shape with an image fill, the HUD is just the entities inside the camera.
- **Fewer concepts.** If something is just a file, it stays a file: a saved entity is an `.entity` file and a ready-made script is a `.lua` file.
- **There is no special player.** The builtin player is an `.entity` file with a script, which any creator could rebuild with what they have.
- **Nothing happens behind the user's back.** The editor shows a note with a button instead of quietly adding or changing something.
- **Determinism is a tested requirement.** The same level, seed, inputs and clock time give the same run on any computer.

## Versions

| Version | What it is | In short |
|---|---|---|
| **v1** | Build and watch. The smallest thing that can be tested | One level of coloured shapes, physics with three joints, the camera following an entity, Play, Stop, Pause and Step, the determinism test, saving in the browser, export and import. Nothing reacts to keys |
| **v2** | Logic and play | Triggers, variables, inputs, scripts with the code editor and the Console, the Assets panel, `.entity` files and spawning, the builtin player, Win and Lose, the pause menu, text, paths, gradients |
| **v3** | Polish and content | Images, sound, four more joints, the collision grid, Flex and Fill window, linked copies, the builtin library, remapping and gamepads, editor comforts, the play file |
| **v4** | Accounts and publishing | Not designed yet |
| **Later** | Not designed yet | A main menu with a list of levels, component presets, replays, sprite sheets |

117 features went through the scope review. The owner then made v1 smaller, so today: 31 in v1, 20 in v2, 65 in v3, 1 Later, plus the features settled outside the review. Every one is listed in [scope.md](scope.md) with its reason.

## How to read these docs

They go from high level to detail, so you can stop at the depth you need:

1. This page: the whole game in one page.
2. [scope.md](scope.md): every feature in one line, with its version and why.
3. A topic's README or TL;DR in [requirements/](requirements/README.md): the topic in a paragraph and a table.
4. The topic's feature sections: the exact rules, each with its version, its reason and its source.

Use the words in [glossary.md](glossary.md) exactly. Before proposing anything, read [principles.md](principles.md) and check [rejected.md](rejected.md).
