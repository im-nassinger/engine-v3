# v2 requirements

## TL;DR

**v2 draws curves:** the Bézier pen, the Pencil and gradients (owner, round 12, 2026-11-20). The rules are written once, in [requirements/](../../requirements/README.md), each feature marked `· v2`; this file lists them and what in v1 they touch. They were checked against what v1 built on 2026-11-20 (planning v2, step 1). A path never collides in v2: it is decoration only, until Convert to polygon (Later).

## The new features

| Feature | Rules | In short |
|---|---|---|
| The Bézier pen | [drawing.md](../../requirements/drawing.md#the-bézier-pen--v2) | Key 4. Click for a corner point, drag for a curve point; closes on the first point; continues an open path from either end. Up to 2,000 points |
| The Pencil | [drawing.md](../../requirements/drawing.md#the-pencil--v2) | Key 5. Drag freehand; on release it becomes a path with few curve points. Smoothness Low, Medium or High |
| Gradients | [drawing.md](../../requirements/drawing.md#gradients--v2) | A fill becomes None, Solid, Linear or Radial, with 2 to 8 colour stops, edited in the Entity inspector and with gradient handles on the level |

## v1 rules that v2 makes reachable

These are v1 features whose rules already cover paths, but nothing in v1 made a path with points:

| Rule | Where | What v2 adds |
|---|---|---|
| Point editing on a path: curve handles, sharp and smooth points | [drawing.md](../../requirements/drawing.md#point-editing--v1) | Paths now have points to edit |
| A path's Points as one list field | [drawing.md](../../requirements/drawing.md#resizing-changes-the-scale--v1) | A list of path points in the Entity inspector |
| The StyleComponent on a path: a fill paints only when the path is closed | [drawing.md](../../requirements/drawing.md#the-stylecomponent--v1) | Closed paths are filled |
| The tool keys 4 and 5 | [workspace.md](../../requirements/editor/workspace.md#seven-tools-on-number-keys--v1) | The pen and the Pencil join Select, Shape and Joint |

## Not in v2

- **Convert a path to a polygon** is Later, so a path never collides. See [drawing.md](../../requirements/drawing.md#convert-a-path-to-a-polygon--later).
- **Image fills** are Later. The fill field type is built so they can be added.
- The outline stays a solid colour.
