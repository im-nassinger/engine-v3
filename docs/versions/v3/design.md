# v3 design

## TL;DR

**v3's screen parts are drawn in the [v3 mockup](../../design/mockups/v3.html)**, **approved by the owner (2026-11-22)** after one redraw of the trigger card. Its trigger cards and tags field work. Its rules are written into [controls.md, v3](../../design/controls.md#v3-triggers-tags-variables-inputs-and-the-end-window) and [level-view.md, v3](../../design/level-view.md#v3-shapes-with-no-style).

## What the mockup shows

| Moment | New parts |
|---|---|
| 1. The Trigger tool | The sixth tool button; a trigger drawn as a dashed edge with a small bolt in its corner, in the editor only |
| 2. A new trigger | The Triggers card: one block per trigger, its head (the name, which drags it, the on/off switch, `…`), then **four sections in one shape: When, If, Do and Repeat, each a small title over full-width rows, one sentence per row**, and an "Add check" or "Add action" row at the end of If and Do. A word that can change is underlined; an unset one is yellow, and a note says the trigger doesn't run |
| 3. Tags and a full trigger | The Tags card's tags field: tags as small blue pills with an ×, typed with Enter, the level's tags offered. A part using `other` is crossed out when the event has none |
| 4. The World | The Variables card (a name and a starting number per row) and the Inputs card (a name and its keys per row), each with an "Add" row; the World's own triggers |
| 5. No Surface | The warning note with its fix, "Add Surface as sensor" |
| 6. The end window | Over a scrim: "Level won" or "Level lost", the time, Leave and Restart; the Play bar reads ENDED |

## Proposals in it

These are Claude's, for the owner to keep or change:

- **A trigger is a block** in `--raised` inside the Triggers card, so several triggers read apart. **Its four sections share one shape**, a small-caps title (with a hint at the right, such as "all must be true") over rows; a row is a `--field` sentence with `--radius` corners and an × on hover. *Why: the owner found the first try's mix of labels beside and above values, and floating "+ If" and "+ Do", unclear (2026-11-22).*
- **A word that can change is `--accent-text` with a dotted underline**; an unset one is `--warning` in italics, saying what it needs.
- **A shape with no StyleComponent** is drawn in the editor as a dashed edge with a small bolt, so a trigger can be seen and selected by its edge. *Changed after the owner's try (2026-11-22): the bolt is in its middle and scales with the shape and the zoom, and a trigger is selected by clicking anywhere on it; see [fixes](fixes.md).*
- **The tool's icon** is a dashed rectangle with a bolt.
- **The end window** is a small centred window, not a full dialog, with Restart as the primary button.
