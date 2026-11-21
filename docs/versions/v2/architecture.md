# v2 architecture

## TL;DR

**How v2 is built, approved by the owner on 2026-11-20** (Claude's draft). The tasks are in [tasks.md](tasks.md). v2 adds no new part and no new component. It adds: two tools, **`PenTool`** and **`PencilTool`**, each a class behind v1's tool contract; **`FillFieldType`** in place of `SolidFillFieldType` and **`PathPointFieldType`** for a path's Points; point editing on paths in the Select tool's `PointEditState`, with curve handles; **gradient handles** as a new Select tool state and overlay; and PixiJS's `FillGradient` for drawing. **Saved levels never change**: the path and the fill were stored in their v2 shape since v1. Every choice below is made under the standing yes and listed in [decisions.md](../../decisions.md) unless it names the owner. After v2 is built, its lasting parts move into [architecture/](../../architecture/README.md).

## What v1 already decided for v2

| Part | Already decided | Where |
|---|---|---|
| The path's stored shape | `{ closed, points: [{ x, y, handle_in, handle_out, corner }] }`, `corner` being `sharp`, `smooth` or `separate`. Saved levels never change | [components-and-fields.md](../../architecture/core-model/components-and-fields.md) |
| The path point field type | Built with the pen, in that stored shape. Until then a path's Points is a read-only count | [components-and-fields.md](../../architecture/core-model/components-and-fields.md), [inspector-and-entities.md](../../architecture/editor/inspector-and-entities.md) |
| The fill field type | `FillFieldType` replaces `SolidFillFieldType`, keeping its kind `'fill'` and its tagged value `{ kind: 'none' } \| { kind: 'solid', colour }`, plus the gradients | [components-and-fields.md](../../architecture/core-model/components-and-fields.md) |
| The new tools | The pen and the Pencil are new tool classes on keys 4 and 5; nothing else in the tool controller changes | [selection-and-tools.md](../../architecture/editor/selection-and-tools.md) |
| Point editing on paths | Waits for the pen: in v1 a double-click on a path only selects | [drawing-and-points.md](../../architecture/editor/drawing-and-points.md) |
| Drawing a path | `EntityDrawing` already traces a path's curves with `tracePath`, and fills it only when closed | [adapters.md](../../architecture/adapters.md) |
| Hit testing a path | `LocalOutlines.path` cuts each curve into 16 straight steps; `OwnBounds` covers the points and their handles | [selection-and-tools.md](../../architecture/editor/selection-and-tools.md#hit-testing) |

## Two things v1 left that v2 fixes first

- **The tool keys are swapped in the code.** `TOOL_KEYS` gives the Pencil 4 and the pen 5, but the [requirement](../../requirements/editor/workspace.md#seven-tools-on-number-keys--v1) and the [design](../../design/controls.md#v2-the-pen-the-pencil-and-gradients) give the pen 4 and the Pencil 5. The code follows the requirement. *Why: the code's keys were only placeholders, its own comment says so.*
- **One point limit serves shapes and paths.** `LevelLimits.maxPoints` is 1,000 for both, and a path may hold 2,000. It splits into `maxShapePoints` (1,000) and `maxPathPoints` (2,000); the reader's `overLimit` keeps the name `points` with the max of the kind it hit.

## Where things live

| Code | Folder | Part |
|---|---|---|
| `Fill`, `FillFieldType`, `PathPointFieldType`, `mixedColour` | `core/fields/` | core |
| `pathBox`, `splitCurve`, `nearestOnCurve`, `smoothHandles` | `core/geometry/path/` | core |
| `fitCurves` (the Pencil's fitting) | `core/geometry/fitting/` | core |
| `PenTool` and its states | `editor/tools/pen/` | editor |
| `PencilTool` | `editor/tools/pencil/` | editor |
| `createPath`, `extendPath` | `editor/commands/draw/` | editor |
| The path point edits (`moveHandle`, `setCorner`, and the v1 edits taught paths) | `editor/commands/points/` | editor |
| `GradientHandles`, `GradientDragState`, `moveGradientHandle` | `editor/tools/select/gradient/`, `editor/commands/fill/` | editor |
| `PixiFill`, `GradientTextures` | `adapters/pixi/` | adapters |
| `GradientHandleOverlay`, `planGradientHandles` | `adapters/pixi/overlays/gradient/` | adapters |
| `PencilOptions`, `PathPointRow`, `FillField` and the gradient editor | `ui/tool-options/`, `ui/fields/` | ui |
| `EditorGradientSource`, the new tools in `createTools` | `app/` | app |

Nothing crosses a part boundary that v1 didn't already cross: tools publish plain values, overlays read them through a source built in `app`, as `EditorDrawingSource` already does.

## The fill field type

```typescript
export type ColourStop = { readonly colour: string; readonly place: number };   // place 0 to 1, shown as %
export type Fill =
    | { readonly kind: 'none' }
    | { readonly kind: 'solid'; readonly colour: string }
    | { readonly kind: 'linear'; readonly stops: readonly ColourStop[]; readonly start: Point; readonly end: Point }
    | { readonly kind: 'radial'; readonly stops: readonly ColourStop[]; readonly centre: Point; readonly radius: number };
```

- **Stored as** `{ "kind": "linear", "stops": [{ "colour": "#4A90D9FF", "place": 0 }, …], "start": { "x": 0, "y": 0.5 }, "end": { "x": 1, "y": 0.5 } }`, and radial with `centre` and `radius`. The kinds `none` and `solid` are stored exactly as in v1, so no level is upgraded. *Why: v1 chose the tagged value for this.*
- **Positions are shares of the entity's box**, 0 to 1, as the requirement says, and may go past it (−10 to 11, so a handle dragged off the shape still makes sense). **The box** is the geometry, the outline left out: a rectangle's sides, a circle's square, a polygon's points' box, and a path's curve, exactly (`pathBox`, below). *Why the geometry: it is what Width and Height measure, so an outline width never moves a gradient.*
- **A radial gradient's radius is a share of the box's width along x and of its height along y**, so in a box that isn't square it is an ellipse, and 0.5 touches every side. *Why: a share of one side alone would spill out of a long shape or leave it half filled; Figma stretches it the same way.*
- **`parse` refuses** 1 or more than 8 stops, a place outside 0 to 1, and a radius of 0 or less. **`normalize` sorts the stops by place**, keeping the order of equal places, so the list always reads left to right.
- **`mixedColour(fill)`** gives one colour for a gradient: its stops mixed, each weighted by how much of the bar it covers, as the design asks of the minimap. The minimap and `levelBackground`'s dark test both use it, so a sky gradient on the World still picks a grid colour.
- **A gradient counts as filled** for hit testing, as a solid colour does, whatever its see-through stops. The hit areas don't change.
- `SolidFillFieldType` is deleted, and the StyleComponent's schema names `FillFieldType`: the one line [components-and-fields.md](../../architecture/core-model/components-and-fields.md) promised.

## Drawing a gradient

- **`PixiFill`** turns a `Fill` into what `Graphics.fill` takes: a colour, or a PixiJS `FillGradient` (linear, or radial with the inner radius 0 at the centre) with `textureSpace: 'local'`, which maps 0 to 1 onto the filled shape's bounds. Those bounds are the box above, since the outline is drawn by `stroke`, not `fill`. *Why local: the gradient turns, scales and resizes with the entity for free, and the ellipse of a radial gradient is PixiJS's own.*
- **The first task tries it** in a browser test that reads pixels: a linear and a radial gradient on a rectangle, a turned one, a see-through stop over the background, and a closed path. If PixiJS's bounds ever differ from `pathBox` by more than a pixel, `PixiFill` uses `textureSpace: 'global'` with a matrix from the box instead. The result goes into [tech-notes.md](../../tech-notes.md).
- **`GradientTextures` shares one `FillGradient` between equal fills**, counted, and destroys it when its last entity lets go. *Why: each `FillGradient` makes a texture, and a level of 10,000 copied platforms with one gradient would otherwise hold 10,000.*
- The play mirror draws through the same `EntityDrawing`, so gradients play as they show. A StyleComponent value can change during play (v1), and a changed fill rebuilds the drawing as before.

## The path point field type and the Points list

- **`PathPointFieldType`** (kind `'pathPoint'`) parses, stores, clones and compares one `PathPoint` in v1's stored shape. A sharp point's handles are `null`; a smooth or separate point keeps both, except the first point of an open path has no `handle_in` and the last no `handle_out`.
- **The PathComponent's Points becomes a derived `ListFieldType<PathPoint>`**, 2 to 2,000 items, writable. Its write refuses a closed path under 3 points, as the ShapeComponent's refuses a polygon. **On a Rope's or Spring's path it is read-only**, the way the World's Kind is, since the joint keeps it on its ends. *Why: the joint rewrites that path every time an end moves.*
- **What "smooth" keeps** (standing yes): a smooth point's two handles stay on one line through the point, and each keeps its own length. Moving one turns the other to the opposite side. The pen's drag makes them equal, and the Pencil's fitting doesn't. *Why: this is how Illustrator and Figma keep a smooth point, and the Pencil's curves need handles of different lengths.*
- **The list in the Entity inspector** shows one `PathPointRow` per point, as the design draws it. A sharp point has no fold arrow, since it has no handles; a missing end handle shows `None`. **The list renders its rows through TanStack Virtual** once it holds over 100, as the Entities viewer does. *Why: 2,000 rows of a vector and a choice each would take the 0.2 s the Entities viewer is allowed to open in.*
- **The rows of the selected points** come from `SelectTool.editedPoints`, which `ui` reads through `ToolController`: they show as the blue pill and unfolded, and the list scrolls to the first one. *Why: point editing already publishes them for the overlay, so the Entity inspector needs no second copy.*
- Typing a point, a handle or a corner is one step through `setFieldValue`, like any list item. Choosing Sharp drops the handles; choosing Smooth or Separate on a sharp point gives it `smoothHandles` (below).

## The pen

`PenTool` is a class behind the tool contract, with a drag state at a time, as the Select tool is built (the State pattern).

| State | Entered by | Ends with |
|---|---|---|
| `PenIdleState` | Picking the pen, or a point placed | |
| `PenPressState` | A press, until it moves 4 px or is released | A click: a sharp point |
| `PenHandleState` | The press moving 4 px | The release: a smooth point, or separate with Alt |

- **The drawing lives in the tool** until it is finished, as the Shape tool's polygon does: the points in the current group's own space, and the matrix to level positions. **Finishing runs `createPath`**, one step, `Draw Path 1`: a TransformComponent at the middle of the points' box, a PathComponent, a StyleComponent with v1's default look, and a NameComponent from `EntityNamer` with the word `Path`. The tool then returns to Select with the path selected, unless it is locked. *Why: one step per drawing, as the requirement asks, and the Entity inspector never shows something still being drawn.*
- **A click** adds a sharp point; it snaps as a point (`snapPoint`), Ctrl turns that off, and Shift turns the segment from the last point to a multiple of 15° in the current group's own space, as a polygon's does. A click on the last point's place adds nothing.
- **A drag** places a smooth point at the press and pulls its handle out to the mouse, the handle in mirrored. Shift keeps the handle to 15°. **Alt during the drag** makes the point separate and moves the handle out alone. **Space during the drag** moves the point being placed, with its handles, and letting go of Space goes back to pulling the handle. *Why Space here: the requirement asks for it.* `ShortcutDispatcher` already gives a tool its own keys before Space, so the pen takes Space only while its button is down, and Space pans as before the rest of the time.
- **Closing:** a press within 8 screen px of the first point, with 3 points or more, closes the path, as the polygon does; fewer, and the press is ignored. Dragging there shapes the closing curve: the first point becomes smooth and its handle in follows the mouse mirrored, or separate with Alt. Closing finishes the drawing.
- **Finishing open:** Enter, Esc, a double-click (its second click adds no point), a right-click, picking another tool and Play (through `deactivate`). Fewer than 2 points is dropped. Esc during a drag finishes with the points placed before it.
- **Ctrl+Z and Backspace** remove the last point through `undoDrawingStep`, as the polygon's do; removing the only point ends the drawing with nothing made.
- **The 2,001st point is refused** with `A path holds at most 2,000 points`, and the drawing goes on.
- **Continuing an open path:** when the pen is picked with one open path selected, `activate` keeps the selection and the tool shows rings on the path's two ends (refused on a Rope's or Spring's path, and inside a locked group, which clears the selection as usual). A press on either end starts drawing from it: the tool reverses the points when it is the first end, so it always adds at the end. A press on the other end closes the path. **Finishing runs `extendPath`**, one step, `Draw on Path 1`, which writes the whole path through `LiveEdit`'s commit, reversed back if it was reversed. Ctrl+Z while continuing stops at the path's own points. *Why reverse: one way of adding points for both ends, and the stored order stays the order the user drew.*
- **The preview** is plain data, `penDrawing`: the points in level positions, the segment to the mouse (a curve when the last point has a handle out), the handles of the point being placed, and whether a press would close. `planDrawing` draws it as [the level view's v2 table](../../design/level-view.md#v2-paths-and-gradient-handles) says. The hint: `Click for a corner, drag for a curve. Click the first point to close. Enter finishes.`

## The Pencil

- **`PencilTool`** collects the drag's level positions, turned into the current group's own space, at each move. A point closer than 1 screen px to the last one is skipped. A press that moves less than 4 px makes nothing.
- **On release, `fitCurves`** turns the points into a few cubic curves: the method in Schneider's *An Algorithm for Automatically Fitting Digitized Curves* (Graphics Gems, 1990), which Paper.js's `simplify` uses. It fits one curve, and where the drag strays further than the tolerance from it, splits there and fits each half, the two halves sharing the tangent at the split. Every point it makes is smooth. It uses only `+ − × ÷` and `Math.sqrt`, so the same drag gives the same path on any computer.
- **Smoothness is the tolerance**, measured on screen: **Low 1.5 px, Medium 4 px, High 10 px** (*proposal*), turned into the current group's own space through the zoom and the group's scale. *Why on screen: the same stroke then gives the same detail at any zoom.* If the fit still holds more than 2,000 points, the tolerance doubles until it fits, and the status text says `Smoothed to stay within 2,000 points`.
- **Closing:** a release within 12 screen px of the press closes the path; the last points inside those 12 px are dropped and the fit runs as a closed loop.
- **Finishing runs `createPath`**, the pen's edit, so the result is an ordinary path, named `Path 1`. With tool lock on, the Pencil stays active.
- **Esc during a drag** drops the stroke, since nothing is placed before the release (the Shape tool's drag does the same). Picking another tool or Play during a drag keeps it, through `deactivate`.
- **The smoothness menu** is `PencilOptions` in `ToolOptions`, like `ShapeOptions`, with the design's three line icons. The choice is kept in memory for the session, as the Shape tool's kind is.
- **The preview** is `pencilStroke`: the dragged points in level positions and whether the release would close. The overlay draws the 2 px accent line and the start's ring. The hint: `Drag to draw. End near the start to close.`

## Point editing on paths

v1's `PointEditState` and its edits learn paths. A path's double-click enters point editing as a polygon's does, except on a Rope's or Spring's path, which still only selects.

- **`PointsTarget`** reads a path's points as well as a polygon's, with the same level matrix turned around. `PointsMove`, `nudgePoints`, `addPoint` and `deletePoints` work on both; a path point carries its handles when it moves, since handles are measured from their point. The steps read `Move points of Path 1` and so on.
- **What a press hits, in order:** a handle of a selected point (within 6 screen px of its dot), then a point (6 px), then an edge (5 px). The curve's edge is v1's 16 steps a curve, from `LocalOutlines`.
- **`HandleDragState`** drags one handle, through `LiveEdit`, one step `Move a handle of Path 1`. A smooth point turns its other handle to stay opposite; a separate one moves alone; **Alt during the drag** makes a smooth point separate, as the pen's Alt does. Shift keeps the handle to 15°, the handle's end snaps as a point, Ctrl turns that off, Esc puts it back.
- **A double-click on a point** switches it between sharp and smooth, one step `Change a point of Path 1` (`setCorner`). A separate point becomes sharp. **`smoothHandles`** gives a point turned smooth its handles: along the line from the point before it to the point after, each a third of the way to its neighbour, as Inkscape does. An end point of an open path takes its one handle towards its one neighbour.
- **A double-click on an edge** adds a point there. On a curve, **`splitCurve`** cuts it at the share `nearestOnCurve` finds (de Casteljau's method), so the path's look doesn't change; the new point is smooth, and the two neighbours' handles shorten to match. On a straight segment the new point is sharp.
- **Deleting** stops at an open path's 2 points (`A path keeps at least 2 points`) and a closed path's 3 (`A closed path keeps at least 3 points`).
- **The overlay** draws sharp points as v1's 8 px squares and smooth or separate points as 9 px circles, and the handles of the selected points, as the v2 table says. `SelectTool.editedPoints` gains each point's corner and handles in level positions.

## Gradient handles

- **`GradientHandles.of`** gives the handles of the one selected entity, in level positions: a linear gradient's start and end, or a radial one's centre and radius dot (at the centre plus the radius along the box's own x), with the stops between them. It gives none unless **exactly one entity is selected, it is neither hidden nor locked, its fill is a gradient, and its StyleComponent's card is unfolded**, as the requirement asks ("its gradient is open in the Entity inspector"); `CardFolds` already says whether a card is folded. **None for a line or an open path** either, since their fill never paints.
- **The Select tool takes a press on a gradient handle first**, before the frame's handles and the entities, within 8 screen px of its middle. `GradientDragState` writes the fill through `LiveEdit`, one step `Change the fill of Rectangle 1`; the mouse goes into the entity's own space and then into shares of its box (`moveGradientHandle`). **Shift keeps a linear gradient's direction to 15° steps on screen**, around the end not dragged. A radial radius dot sets the radius from its distance to the centre, in shares. Esc puts it back. The stops' dots on the line only show where they are; stops move in the Entity inspector. *Why on screen: a box that isn't square makes 15° in shares look like another angle.*
- **`GradientHandleOverlay`** draws them over the selection overlay, with `planGradientHandles` tested in Node, as `planSelection` is. A radial gradient's dashed circle is an ellipse when the box isn't square. `EditorGradientSource` in `app` builds its source from the selection, the caches and `CardFolds`.

## The Fill's editor

- **`FillField`** replaces v1's colour field with its None switch. It is a choice pill (None, Solid, Linear, Radial), then v1's colour field for Solid or the gradient editor for a gradient, drawn as [controls.md](../../design/controls.md#v2-the-pen-the-pencil-and-gradients) says: `GradientBar`, `StopSwatches`, `StopEditor` (Colour, Place, `−`), `+ Add stop`, and `GradientPlacement` (Start and End, or Centre and Radius, in %).
- **Switching kind** is one step through `setFieldValue`, with the requirement's rules in one function, `switchFillKind` in `core/fields`: Solid to a gradient makes two stops, the colour and the same colour fully see-through, at 0% and 100%; Linear and Radial swap and keep the stops; a gradient to Solid keeps its first stop's colour. **None to a gradient or to Solid starts from v1's default fill, `#4A90D9`** (standing yes: the requirement only says where Solid goes). **A new linear gradient runs left to right across the middle**, start (0, 0.5) and end (1, 0.5), **and a new radial one sits in the middle with a radius of 0.5**. *Why: both fill the shape at once, and the handles appear where they are easy to grab.*
- **Adding a stop** (a click on the bar, or `+ Add stop` at the middle of the widest gap) takes the colour the gradient already has there, so the look doesn't change. Removing one, or typing its colour or place, is one step each.
- **Dragging a stop along the bar** is a live edit, as the number slider's is: v1's `FieldSlide` is widened from a number to any field value, begins a `LiveEdit` on the first move, and commits `Change Fill` on release. The chosen stop is the ui's own state, followed by its index as the stops re-sort.
- **Several entities selected** with different fills show `Mixed` in the choice pill and no editor under it; picking a kind sets it on each, each from its own fill. Equal fills show the editor, as equal values do in v1.

## The tests

- **Node:** `FillFieldType` and `PathPointFieldType` (parse, refuse, normalize, compare); `switchFillKind`; `mixedColour`; `pathBox`, `splitCurve` (the look kept: points on the old and the new curves match), `nearestOnCurve`, `smoothHandles`; `fitCurves` (every dragged point within the tolerance, a closed loop closes, a straight drag gives two points, and the same drag twice gives the same path); `PenTool`, `PencilTool` and the point editing of paths through `toolTestSession`, as v1's tools are tested; `planDrawing`, `planSelection` and `planGradientHandles`.
- **Browser (Vitest, three browsers):** `PixiFill`'s pixels, as the first task's try above; `GradientTextures` sharing and letting go; the virtual Points list.
- **Playwright journeys, in `tests/e2e/`:** the pen draws an open path by clicks and drags, closes one on its first point, and continues an open path from its first end; the Pencil draws a stroke that closes near its start and one that doesn't, at each smoothness; a path's handle is dragged, a point is switched sharp and smooth, and a point is added on a curve; a rectangle's fill goes Solid to Linear, gets a stop, has its end handle dragged, and Ctrl+Z puts each back; a gradient survives save, reload, copy and paste.
- **The speed targets** (*proposal*, since the requirements give none for paths), in `tests/performance/` on a level with one 2,000-point path among 10,000 entities: **selecting it within 0.05 s**, the v1 target; **dragging one of its points keeps 95% of frames within 16.7 ms**, the move target; **the Entity inspector shows its Points within 0.2 s**, the Entities viewer's target; and **the Pencil's fit of a 10 s stroke finishes within 0.1 s** of the release. Measured on the owner's laptop and written into the task's notes; CI fails them at 5 times, as v1's.

## Build order, for tasks.md

1. The tool keys, the split point limit, `FillFieldType` and `PixiFill` with the pixel try; gradients then draw from a typed level.
2. The Fill in the Entity inspector, then the gradient handles. **Try point:** gradients.
3. `PathPointFieldType`, the Points list, `createPath`, then the pen, then continuing a path. **Try point:** the pen.
4. Point editing on paths.
5. `fitCurves` and the Pencil. **Try point:** the Pencil and point editing.
6. The Playwright journeys and the speed tests, then the docs moved into [architecture/](../../architecture/README.md).
