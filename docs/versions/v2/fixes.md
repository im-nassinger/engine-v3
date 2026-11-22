# v2 fixes

## TL;DR

What the owner asked to change while trying v2, in their words, and what became of each. All were built straight away in the session the owner asked (2026-11-21), not as orchestrator tasks, because the owner asked for them to be fixed at once; the fourth after the owner answered how it should work.

## 2026-11-21

| # | The owner's words | State |
|---|---|---|
| 1 | "when I do - or +, it should zoom in/out based on the current position of the mouse, just like the mouse wheel zoom does" | **Built** (2026-11-21). + and - zoom at the mouse while it is over the level view, else about the middle. See [workspace](../../requirements/editor/workspace.md#pan-and-zoom--v1) |
| 2 | "the grid should not appear during gameplay... only on the editor, before testing the level" | **Built** (2026-11-21). The grid is never drawn in play, whatever its switch. See [test play](../../requirements/play-and-save/test-play.md) |
| 3 | "we should render the joints a better way: their size should be affected by the zoom of the camera, instead of always having the same size" | **Built** (2026-11-21). Joint icons are 14 level px across, scaled with the zoom, never under 8 screen px. See [joints](../../requirements/physics/joints.md) |
| 4 | "some kind of joints have paths but their paths dont get updated when I change the position of the joint" | **Built** (2026-11-21), after the owner agreed the ends should follow their bodies. A Rope's or Spring's ends now stay on the entities they join when those move, turn or resize, in the same undo step; moving the joint alone still carries both ends. See [joints](../../requirements/physics/joints.md#only-what-is-selected-moves-or-copies--v1) |
| 5 | "the same thing I said about the grid also applies to the frames such as the world frame and the camera frame: they shouldn't appear during gameplay" | **Built** (2026-11-21). The camera frame is never drawn in play either; the level bounds' frame already wasn't. See [test play](../../requirements/play-and-save/test-play.md) |
| 6 | "the "rotate" icon doesnt appear when I hover near the edges of things... no icon appears so the user has no visual feedback that the mouse is on the correct place" | **Built** (2026-11-21). A turning-arrow cursor just outside a corner, and resize arrows on the handles too, since the architecture already promised "the cursor shows which". See [selection](../../requirements/editor/selection.md#handles-and-arrow-keys--v1) |
| 7 | "we need to style scrollbars: currently the ones on the entity inspector and entities viewer are the default builtin browser one" | **Built** (2026-11-21). Every scrolling list has a thin round thumb on no track, in the new `--scrollbar` tokens. See [tokens](../../design/tokens.md#colours) |
| 8 | "we need to update joint paths when the joint is moved around" | **Built** (2026-11-21), the way the owner described: a Rope or Spring sits at its end A, and moving it moves end A only, its path drawn again to end B. See [joints](../../requirements/physics/joints.md#only-what-is-selected-moves-or-copies--v1) |
| 9 | "when editing a paths made with the bézier pen, and holding the alt key, if you move the bezier handle near the point, the handle should be removed" | **Built** (2026-11-21). Alt with the handle's end within 6 screen px of its point removes the handle. See [drawing](../../requirements/drawing.md#point-editing--v1) |
