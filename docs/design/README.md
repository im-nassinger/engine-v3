# Design

## TL;DR

How the editor looks. **Since the redesign** (owner, 2026-11-17, planned as stage 19 on 2026-11-18): **islands floating over a full-window level view**, Slate colours with a bright blue accent, no borders or lines, 14 px island corners and one soft shadow, ☰ alone at the top left holding every command, a tool column, the **Entity inspector** beside it and the **Entities viewer** at the top right, a minimap with a debug box under it, and a dark level view outside the level bounds. JetBrains Mono for all of the editor's text. [redesign.md](redesign.md) is the source, and [tokens.md](tokens.md), [controls.md](controls.md) and [level-view.md](level-view.md) are written from it; stage 19 builds them. **Round 8's design** (direction A of the [first mockups](mockups/index.html), approved 2026-11-14) is kept below as the record of what came before. Nothing here changes what the game does: the places, sizes and contents of the parts come from the [requirements](../requirements/editor/workspace.md).

## Files

| File | What it's for |
|---|---|
| [tokens.md](tokens.md) | Every design token of the redesign: colours, the font, sizes, spacing, corners, the shadow. **Start here when writing CSS** |
| [controls.md](controls.md) | How each control looks in each state: islands, buttons, tools, fields, cards, rows, menus, the kinds menus, dialogs, the Play bar; the icons v1 needs |
| [level-view.md](level-view.md) | What the editor draws over the level: the dark outside, the grid, the bounds' label, the camera frame, joint icons, selections, the drawing preview, the physics view |
| [mockups/index.html](mockups/index.html) | Round 8's mockups: six views of v1 with a sample level. Replaced by the redesign's. Nothing in it works |
| [redesign.md](redesign.md) | **The redesign (owner, 2026-11-17), the source of this folder:** its 29 settled points in order, and the tokens of the pick |
| [mockups/redesign.html](mockups/redesign.html) | The redesign's mockup page: a selected shape, the whole level, drawing, the main menu, a dialog, test play, and every part side by side |
| [mockups/collision-grid.html](mockups/collision-grid.html) | A v3 example made to show a friend (owner, 2026-11-16): the World's "Edit collision grid" button and the collision grid window, which works. Claude's proposal for the look, not decided. The rules come from [world.md](../requirements/physics/world.md#the-collision-grid--v3) |

## Decided in round 8 (replaced by the redesign)

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

**After the mockups** (owner, 2026-11-14): **the Entity inspector is on the left and the Entities viewer on the right**, a change to [workspace.md](../requirements/editor/workspace.md). Later the same day the owner renamed that panel to the **Entities viewer** (the old name is in the glossary's dropped words). The three conflicts below were settled as Claude suggested.

Already decided before round 8 and not asked again: one dark theme ([rejected.md](../rejected.md) lists a light theme), the panels' places and starting sizes, a yellow icon for a warning and a blue one for a tip, and the default look of a new shape and of the background.

## The two directions

The owner compared two directions and **picked A** (2026-11-14): exactly the round 8 answers. Direction B (neutral grey, Inter for labels, a white edge around the selection) was dropped from the mockups.

## The moments in the mockups

1. **A new level:** the empty editor, the World and the camera in the Entities viewer, the World's cards in the Entity inspector.
2. **A selected shape:** a new shape in the default blue look, selected on the light blue background, its cards in the Entity inspector, its row selected in the Entities viewer.
3. **Drawing:** the Shape tool drawing a polygon, the faded preview, the Entity inspector hidden and the options strip with Polygon on in its place (owner, 2026-11-15).
4. **The main menu and a dialog:** the main menu open on Edit, and the "Replace the open level?" question before New.
5. **Test play:** the panels hidden, the camera's box with black bars, the Play bar.
6. **States:** every control in each state, and the level view's overlays. Some states are Claude's proposals, marked in [controls.md](controls.md) and [level-view.md](level-view.md).

## Found while drawing the mockups

Three places where the requirements disagreed. All settled by the owner on 2026-11-14 and written into the requirements and the glossary:

- **The save state and the zoom are in the top bar.** The glossary's "Status bar" and [saving.md](../requirements/play-and-save/saving.md) used to say the status bar.
- **The tools are in the toolbar strip on the left**, as [workspace.md](../requirements/editor/workspace.md) says. The glossary's "Top bar" used to list them.
- **v1 has no lock icon.** Lock is v3, so a row and the Entity inspector's header show only the eye until then.
