# Requirements

## TL;DR

What the game does, in eight topics: editor, drawing, assets, physics, camera, triggers, scripts, play and save. **These are functional requirements only:** what a creator or player does and sees, never how it is built. Every feature is marked with its version, v1 to v7, or Later when it is in no planned version yet, with the reason where the review recorded one. Read a topic's TL;DR first, then its feature table, then the rules. For every feature and its version on one page, see [scope.md](../scope.md).

## Topics

| Topic | Covers |
|---|---|
| [editor/](editor/README.md) | The workspace, tools, shortcuts, the Entity inspector, undo, selecting, groups, the Entities viewer |
| [drawing.md](drawing.md) | Shapes, paths, point editing, fill and outline, text, images, effects |
| [assets/](assets/README.md) | The Assets panel, files, sound, `.entity` files, spawning, the builtin folder |
| [physics/](physics/README.md) | Bodies, surfaces, merging, the World's settings, the collision grid, level bounds, joints |
| [camera.md](camera.md) | The camera, following, Fixed size and Fill window, entities inside the camera, Flex |
| [triggers/](triggers/README.md) | Triggers (When, If, Do), events, actions, variables, inputs |
| [scripts/](scripts/README.md) | The ScriptComponent, the Lua API, the code editor, the Console, debugging |
| [play-and-save/](play-and-save/README.md) | Test play, the pause menu, the end window, determinism, saving, level files |
| [later.md](later.md) | Later features that aren't designed yet: a main menu, publishing, accounts, replays |

A small topic is one file. A bigger one is a folder whose `README.md` lists its files and every feature with its version.

## How a topic file is written

- A TL;DR, then one `###` heading per feature, ending in its version: `### The grid · v1`.
- Rules as short bullets, in the words of the [glossary](../glossary.md). The rules that matter most are in bold.
- A reason is added in italics, as `*Why: ...*`, only where the review recorded one. A reason is never invented.
- A `Source:` line closes each feature and says where it came from, so any rule can be traced back:

  `Source: scope ED4; round 3: 01 2.6; decisions: D12; old: WS-53`

  | Part | Points to, in `ecs-game-v2` |
  |---|---|
  | `scope ED4` | The scope review: an item in `review/scope.js` |
  | `round 3: 01 2.6` | A row in `docs/requirements/review-decisions/round-3.md` |
  | `decisions: D12` | A row in `docs/requirements/00-decisions.md` that no round repeated |
  | `old: WS-53` | A requirement id in the old topic file |
  | `owner: 2026-11-13` | A decision the owner made after the review, on that date. It is recorded in this repo's history, not in `ecs-game-v2` |

  A decision that is Claude's call after the owner said "you decide" also uses `owner:`, and its rules say so in the `*Why: ...*` line.

- Each file ends with a **Small features** table: small features from the old draft that the scope review never asked about, each with the version the owner gave it in round 7 (owner, 2026-11-14). They are listed in [scope.md](../scope.md) only as a count.
- What was decided against goes to [rejected.md](../rejected.md). How something is built goes to [architecture/](../architecture/README.md); facts and warnings about browsers, Box2D and Lua go to [tech-notes.md](../tech-notes.md).

## Checks

Run both from the project root after changing a requirement:

- `node tools/check-docs.js`: every doc has a TL;DR and stays under 300 lines, links resolve, every feature heading has a version and a `Source:` line, and no dropped word is used.
- `node tools/check-sources.js`: every decision of the review and every scope id is cited somewhere. It reads `../ecs-game-v2`. **It is a finished one-time proof** that nothing was lost in the rewrite. It still runs, so a citation can't be deleted by accident, but it doesn't read `owner:` sources and new decisions don't need it.
