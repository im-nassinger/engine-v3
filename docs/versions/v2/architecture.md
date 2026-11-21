# v2 architecture

## TL;DR

**Not written yet: it is the next step of planning v2.** v1's [architecture](../../architecture/README.md) already left room for v2 in several places, listed below, so this file starts from them. When written, it says what v2 adds to the code and how it connects, then goes to the owner for a yes. After v2 is built, its lasting parts move into [architecture/](../../architecture/README.md).

## What v1 already decided for v2

| Part | Already decided | Where |
|---|---|---|
| The path's stored shape | `{ closed, points: [{ x, y, handle_in, handle_out, corner }] }`, `corner` being `sharp`, `smooth` or `separate`. Saved levels never change | [components-and-fields.md](../../architecture/core-model/components-and-fields.md) |
| The path point field type | Built with the pen, in that stored shape. Until then a path's Points is a read-only count | [components-and-fields.md](../../architecture/core-model/components-and-fields.md), [inspector-and-entities.md](../../architecture/editor/inspector-and-entities.md) |
| The fill field type | `FillFieldType` replaces `SolidFillFieldType`, keeping its kind `'fill'` and its tagged value `{ kind: 'none' } \| { kind: 'solid', colour }`, plus the gradients | [components-and-fields.md](../../architecture/core-model/components-and-fields.md) |
| The new tools | The pen and the Pencil are new tool classes on keys 4 and 5; nothing else in the tool controller changes | [selection-and-tools.md](../../architecture/editor/selection-and-tools.md) |
| Point editing on paths | Waits for the pen: in v1 a double-click on a path only selects | [drawing-and-points.md](../../architecture/editor/drawing-and-points.md) |
| Drawing a path | `EntityDrawing` already builds a `Graphics` from the PathComponent and the StyleComponent | [adapters.md](../../architecture/adapters.md) |

## To decide

- The pen's and the Pencil's states in the tool controller, and their drawing preview.
- How the Pencil turns a drag into a few curve points, at each smoothness.
- Point editing on paths: the curve handles, and switching sharp and smooth.
- Drawing a gradient with PixiJS, and the gradient handles' overlay.
- The gradient editor in the Entity inspector, and the path point list.
- The tests: the speed targets for a 2,000-point path, and the Playwright journeys.
