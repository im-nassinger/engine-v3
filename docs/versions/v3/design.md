# v3 design

## TL;DR

**v3's screen parts are drawn in the [v3 mockup](../../design/mockups/v3.html)**, Claude's proposal waiting for the owner's try (2026-11-22). Its trigger cards and tags field work, so the owner can click through a trigger before anything is built. Once approved, its rules are written into [controls.md](../../design/controls.md) and [level-view.md](../../design/level-view.md), as v2's were, and this file only points at them.

## What the mockup shows

| Moment | New parts |
|---|---|
| 1. The Trigger tool | The sixth tool button; a trigger drawn as a dashed edge with a small bolt in its corner, in the editor only |
| 2. A new trigger | The Triggers card: one trigger per block, a head (drag grip, on/off switch, name, `…`), then the When, If, Do and Repeat lines, each part a pill. An unset part is yellow, and a note says the trigger doesn't run |
| 3. Tags and a full trigger | The Tags card's tags field: tags as small blue pills with an ×, typed with Enter, the level's tags offered. A part using `other` is crossed out when the event has none |
| 4. The World | The Variables card (a name and a starting number per row) and the Inputs card (each input's keys as pills); the World's own triggers |
| 5. No Surface | The warning note with its fix, "Add Surface as sensor" |
| 6. The end window | Over a scrim: "Level won" or "Level lost", the time, Leave and Restart; the Play bar reads ENDED |

## Proposals in it

These are Claude's, for the owner to keep or change:

- **A part of a trigger is a pill** in `--field` with `--accent-text` words; an unset one is tinted `--warning` at 14%, in italics, saying what it needs.
- **Each trigger is a block** in `--raised` inside the Triggers card, so several triggers read apart.
- **A shape with no StyleComponent** is drawn in the editor as a dashed edge with a small bolt, so a trigger can be seen and selected by its edge.
- **The tool's icon** is a dashed rectangle with a bolt.
- **The end window** is a small centred window, not a full dialog, with Restart as the primary button.
