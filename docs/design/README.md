# Design

## TL;DR

How the editor looks. **Settled before any code, and approved by the owner on 2026-11-14:** a Figma-like feel, cool blue-grey panels, a blue accent colour, medium density, 4 px corners, panels flush with the window's edges, outline icons, and JetBrains Mono for all of the editor's text. **The Inspector is on the left and the Entities panel on the right.** The owner picked direction A of the [mockups](mockups/index.html), and the design system below follows it. Nothing here changes what the game does: the places, sizes and contents of the panels come from the [requirements](../requirements/editor/workspace.md). In stage 6 the [tokens](tokens.md) become `ui/theme.css`.

## Files

| File | What it's for |
|---|---|
| [tokens.md](tokens.md) | Every design token: colours, the font, sizes, spacing, corners, shadows. **Start here when writing CSS** |
| [controls.md](controls.md) | How each control looks in each state: buttons, tools, fields, cards, rows, menus, dialogs, bars; the icons v1 needs |
| [level-view.md](level-view.md) | What the editor draws over the level: the grid, the camera frame, joint icons, selections, the drawing preview, the physics view |
| [mockups/index.html](mockups/index.html) | Six views of v1 with a sample level: five moments and a sheet of every state. Open it in a browser. Nothing in it works |

## Decided in round 8

All from the owner, 2026-11-14, on the [review page](../review.html).

| Question | Answer | Note |
|---|---|---|
| The feel | **Figma**: calm, flat, made for drawing shapes, a tree of shapes and values side by side | |
| Panel grey | **Cool blue-grey**, as in Godot and VS Code | Claude suggested neutral grey |
| Accent colour | **Blue**: the active tool, selected rows, the focused field, the selection outline and handles in the level view | Claude suggested orange, because a new shape is blue (`#4A90D9`) on a light blue background. The mockups show how the blue selection reads on it |
| Density | **Medium**: about 28 px rows and 12 px text, as in Figma | |
| Corners | **Slightly rounded, 4 px**, for buttons, fields, menus and cards | |
| Panels | **Flush** with the window's edges, a thin line between a panel and the level view | |
| Icons | **Outline icons**, from one open set such as Lucide | Stage 6 picked `lucide-react` (standing yes, 2026-11-15), see [ui.md](../architecture/ui.md#stage-6s-choices) |
| Font | **JetBrains Mono for the whole editor** (the owner's change to Inter) | Texts in levels keep their own fonts: Inter by default, see [drawing](../requirements/drawing.md) |
| Mockups | **Five moments of v1, in two directions** | See below |

**After the mockups** (owner, 2026-11-14): **the Inspector is on the left and the Entities panel on the right**, a change to [workspace.md](../requirements/editor/workspace.md). Later the same day the owner renamed that panel to the **Entities panel** (the old name is in the glossary's dropped words). The three conflicts below were settled as Claude suggested.

Already decided before round 8 and not asked again: one dark theme ([rejected.md](../rejected.md) lists a light theme), the panels' places and starting sizes, a yellow icon for a warning and a blue one for a tip, and the default look of a new shape and of the background.

## The two directions

The owner compared two directions and **picked A** (2026-11-14): exactly the round 8 answers. Direction B (neutral grey, Inter for labels, a white edge around the selection) was dropped from the mockups.

## The moments in the mockups

1. **A new level:** the empty editor, the World and the camera in the Entities panel, the World's cards in the Inspector.
2. **A selected shape:** a new shape in the default blue look, selected on the light blue background, its cards in the Inspector, its row selected in the Entities panel.
3. **Drawing:** the Shape tool drawing a polygon, its options strip, the faded preview.
4. **The main menu and a dialog:** the main menu open on Edit, and the "Replace the open level?" question before New.
5. **Test play:** the panels hidden, the camera's box with black bars, the Play bar.
6. **States:** every control in each state, and the level view's overlays. Some states are Claude's proposals, marked in [controls.md](controls.md) and [level-view.md](level-view.md).

## Found while drawing the mockups

Three places where the requirements disagreed. All settled by the owner on 2026-11-14 and written into the requirements and the glossary:

- **The save state and the zoom are in the top bar.** The glossary's "Status bar" and [saving.md](../requirements/play-and-save/saving.md) used to say the status bar.
- **The tools are in the toolbar strip on the left**, as [workspace.md](../requirements/editor/workspace.md) says. The glossary's "Top bar" used to list them.
- **v1 has no lock icon.** Lock is v3, so a row and the Inspector's header show only the eye until then.
