# Design

## TL;DR

How the editor looks. **Being settled now, before any code** (owner, 2026-11-14). Round 8 answered the big choices: **a Figma-like feel, cool blue-grey panels, a blue accent colour, medium density, 4 px corners, panels flush with the window's edges, outline icons, and JetBrains Mono for all of the editor's text.** Next: two directions as [mockups](mockups/index.html), then the design system written here. Nothing here changes what the game does: the places, sizes and contents of the panels come from the [requirements](../requirements/editor/workspace.md).

## Files

| File | What it's for |
|---|---|
| [mockups/index.html](mockups/index.html) | The mockups: two directions, five moments of v1, with a sample level. Open it in a browser. Nothing in it works |

## Decided in round 8

All from the owner, 2026-11-14, on the [review page](../review.html).

| Question | Answer | Note |
|---|---|---|
| The feel | **Figma**: calm, flat, made for drawing shapes, a Layers panel on the left and values on the right | |
| Panel grey | **Cool blue-grey**, as in Godot and VS Code | Claude suggested neutral grey |
| Accent colour | **Blue**: the active tool, selected rows, the focused field, the selection outline and handles in the level view | Claude suggested orange, because a new shape is blue (`#4A90D9`) on a light blue background. The mockups show how the blue selection reads on it |
| Density | **Medium**: about 28 px rows and 12 px text, as in Figma | |
| Corners | **Slightly rounded, 4 px**, for buttons, fields, menus and cards | |
| Panels | **Flush** with the window's edges, a thin line between a panel and the level view | |
| Icons | **Outline icons**, from one open set such as Lucide | The package is proposed in stage 6, when the first icon is drawn |
| Font | **JetBrains Mono for the whole editor** (the owner's change to Inter) | Texts in levels keep their own fonts: Inter by default, see [drawing](../requirements/drawing.md) |
| Mockups | **Five moments of v1, in two directions** | See below |

Already decided before round 8 and not asked again: one dark theme ([rejected.md](../rejected.md) lists a light theme), the panels' places and starting sizes, a yellow icon for a warning and a blue one for a tip, and the default look of a new shape and of the background.

## The two directions

| | Direction A | Direction B |
|---|---|---|
| What it is | Exactly the round 8 answers | Changes the answers Claude was least sure of, to compare |
| Panel grey | Cool blue-grey | Neutral grey |
| Selection in the level view | Blue outline and handles | Blue outline with a thin white edge on both sides, so it stays visible on blue shapes |
| Font | JetBrains Mono everywhere | JetBrains Mono for values and numbers, Inter for labels and menus |

Everything else is the same in both.

## The five moments

1. **A new level:** the empty editor, the World and the camera in the Layers panel, the World's cards in the Inspector.
2. **A selected shape:** a new shape in the default blue look, selected on the light blue background, its cards in the Inspector, its row selected in the Layers panel.
3. **Drawing:** the Shape tool drawing a polygon, its options strip, the faded preview.
4. **The main menu and a dialog:** the main menu open on Edit, and the "Replace the open level?" question before New.
5. **Test play:** the panels hidden, the camera's box with black bars, the Play bar.

## Found while drawing the mockups

Three places where the requirements disagree with each other. The mockups follow [workspace.md](../requirements/editor/workspace.md), the topic file for the layout. All three are open questions in [progress.md](../progress.md#open-questions-for-the-owner).

- **Where the save state and the zoom sit.** workspace.md puts both in the top bar. The glossary's "Status bar" and [saving.md](../requirements/play-and-save/saving.md) put the save state in the status bar.
- **Where the tools sit.** workspace.md puts them in the toolbar strip on the left. The glossary's "Top bar" says the top bar holds the tools.
- **The lock icon on a row.** [selection.md](../requirements/editor/selection.md) says a v1 row has "an eye and a lock", and the Inspector's header "its hide and lock switches", but Lock is v3. The mockups show only the eye.
