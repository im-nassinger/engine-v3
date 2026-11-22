# v3 fixes

## TL;DR

What the owner asked to change while trying v3, in their words, and what became of each. Built straight away in the session the owner asked, not as orchestrator tasks, as v2's [fixes](../v2/fixes.md) were.

## 2026-11-22

| # | The owner's words | State |
|---|---|---|
| 1 | "I don't like the way we render triggers currently, with that strange icon that dont get scaled with the camera zoom. improve that" | **Built** (2026-11-22). The bolt is a faint filled bolt in the trigger's middle, sized from the trigger on screen, so it grows and shrinks with the zoom; it is left out when too small and on a line. See [level-view](../../design/level-view.md#v3-shapes-with-no-style) |
| 2 | "I cannot click on a trigger, only on its borders for some reason. fix that" | **Built** (2026-11-22). A shape with no StyleComponent, such as a trigger, is hit anywhere inside; a styled shape with no fill is still hit on its edge only. See [selection](../../requirements/editor/selection.md) |
