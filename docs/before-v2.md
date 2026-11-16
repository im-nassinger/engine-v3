# Before v2

## TL;DR

Changes the owner asked for that must be built **after v1's 18 stages and before v2 starts**. Each is written into the requirements, the architecture and a stage of [plan.md](plan.md) when it is planned. Until then, the plan's stages stay as they are.

## The list

| # | Change | Asked | State |
|---|---|---|---|
| 1 | **Resizing changes the scale**, not the shape's values. Polygons and lines lose Width and Height | owner, 2026-11-16 | Outlines still open. See [progress.md](progress.md#pending-owner-change-resizing-changes-the-scale-owner-2026-11-16) |
| 2 | **Z and X rotate the selection**, Shift+Z and Shift+X by 10° | owner, 2026-11-16 | Settled; details below |

## 2. Rotating with Z and X

The owner's words: Z and X rotate the entities; Shift+Z or Shift+X rotate them 10°.

To build, matching the arrow keys' nudges (*proposal*, Claude's picks, for the owner to change):

- **Z turns counter-clockwise, X clockwise**, as Z sits left of X.
- **Z or X alone turns 1°**, as an arrow moves 1 px and Shift+arrow 10 px.
- A run of presses within 1 s is one step in the undo history, like a run of arrows. The step reads `Rotate <name>`.
- Each selected entity turns around its own bounds' centre, as the Select tool's rotate drag does, until v3 turns several entities around the selection box's centre. Locked entities, the World and the camera are skipped with the skip rule's status text.
- Ctrl+Z and Ctrl+X stay Undo and Cut.

To update when planned: `requirements/editor/selection.md` (Handles and arrow keys), `scope.md` (SE2), `architecture/editor/selection-and-tools.md` and `clipboard-and-shortcuts.md`, and the main menu's command list.
