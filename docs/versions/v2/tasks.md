# v2 tasks

## TL;DR

The tasks that build v2 (curves and gradients), in the orchestrator's format: each fits one session, has a **Done when** the session can check, and names what it must **Read**. They follow the [architecture's](architecture.md#build-order-for-tasksmd) build order: gradients first, then the pen, point editing on paths, the Pencil, and the closing tests and docs. **Try points** stop the orchestrator so the owner can try what is built. Every task also needs `npm run check` to pass. Approved by the owner on 2026-11-20.

## Tasks

- [x] 1. Fix the tool keys and split the point limit
  - Read: versions/v2/architecture.md#two-things-v1-left-that-v2-fixes-first
  - Done when: `TOOL_KEYS` gives the pen 4 and the Pencil 5; `LevelLimits` has `maxShapePoints` 1,000 and `maxPathPoints` 2,000, and the reader refuses a shape over 1,000 points and a path over 2,000 as `overLimit` `points` with the max of its kind; their tests pass
- [x] 2. Build the fill field type
  - Read: versions/v2/architecture.md#the-fill-field-type, requirements/drawing.md#gradients--v2
  - Done when: `Fill`, `FillFieldType`, `switchFillKind` and `mixedColour` are in `core/fields` with Node tests (parse, refusals, sorting the stops, every switch the requirement lists); the StyleComponent uses `FillFieldType` and `SolidFillFieldType` is gone; `levelBackground` and the minimap use `mixedColour`; every v1 test and saved test level still passes unchanged
- [ ] 3. Draw gradients with PixiJS
  - Read: versions/v2/architecture.md#drawing-a-gradient, tech-notes.md
  - Done when: `PixiFill` and `GradientTextures` are in `adapters/pixi` and `EntityDrawing` draws linear and radial fills; a browser test in Chromium, Firefox and WebKit reads the pixels of a linear and a radial gradient on a rectangle, a turned one, a see-through stop over the background and a closed path; equal fills share one texture, released when unused; what PixiJS did is written in tech-notes.md
- [ ] 4. The Fill's choice and the gradient editor's fields
  - Read: versions/v2/architecture.md#the-fills-editor, design/controls.md#v2-the-pen-the-pencil-and-gradients, design/mockups/v2.html
  - Done when: `FillField` shows the None, Solid, Linear and Radial choice, Solid's colour field, and for a gradient the stop swatches, the chosen stop's Colour and Place, `−`, `+ Add stop`, and Start and End or Centre and Radius in %; each change is one step; several selected entities show `Mixed` as the architecture says; browser tests pass
- [ ] 5. The gradient bar: add a stop by clicking, move one by dragging
  - Read: versions/v2/architecture.md#the-fills-editor
  - Done when: clicking the bar adds a stop with the colour already there, so the look doesn't change; dragging a stop is a live edit through the widened `FieldSlide`, one step on release, put back by Esc; the chosen stop stays chosen as the stops re-sort; tests pass
- [ ] 6. Gradient handles on the level view
  - Read: versions/v2/architecture.md#gradient-handles, design/level-view.md#v2-paths-and-gradient-handles
  - Done when: `GradientHandles.of`, `GradientDragState`, `moveGradientHandle`, `GradientHandleOverlay` with `planGradientHandles`, and `EditorGradientSource` are built; the handles show only in the cases the architecture lists; dragging one is one step, Shift keeps a linear gradient to 15° on screen, Esc puts it back; Node tests and a Playwright test (Solid to Linear, drag the end handle, Ctrl+Z) pass
- [ ] 7. Try point: make gradients on shapes and the World, in the Entity inspector and with the handles
- [ ] 8. The path point field type and a path's Points list
  - Read: versions/v2/architecture.md#the-path-point-field-type-and-the-points-list, design/controls.md#v2-the-pen-the-pencil-and-gradients
  - Done when: `PathPointFieldType` is built; the PathComponent's Points is a writable list of 2 to 2,000 path points, refusing a closed path under 3, and read-only on a Rope's or Spring's path; `PathPointRow` shows as the design draws it; the list is virtual above 100 rows; choosing a corner gives or drops handles through `smoothHandles`; tests pass
- [ ] 9. The pen draws a new path
  - Read: versions/v2/architecture.md#the-pen, requirements/drawing.md#the-bézier-pen--v2
  - Done when: `PenTool` and its states and the `createPath` edit are built: clicks, drags, Alt, Space and Shift during a drag, snapping, closing on the first point, every way of finishing, Ctrl+Z and Backspace, the 2,001st point refused; the new path is one step, named `Path 1`, and selected; Node tests through `toolTestSession` pass
- [ ] 10. The pen on the page
  - Read: versions/v2/architecture.md#the-pen, design/level-view.md#v2-paths-and-gradient-handles, design/controls.md#v2-the-pen-the-pencil-and-gradients
  - Done when: the pen's button and key 4 pick it and it hides the Entity inspector; `planDrawing` draws `penDrawing` as the design's table says; the hint shows; a Playwright test draws an open path by clicks and drags and closes another on its first point
- [ ] 11. The pen continues an open path
  - Read: versions/v2/architecture.md#the-pen
  - Done when: picking the pen with one open path selected keeps it and shows rings on its ends; drawing from either end and closing on the other works, through `extendPath`, one step `Draw on Path 1`; Ctrl+Z stops at the path's own points; a Rope's or Spring's path and a locked group are refused; Node tests and a Playwright test pass
- [ ] 12. Try point: draw paths with the pen, open and closed, and continue one
- [ ] 13. Point editing on paths: points
  - Read: versions/v2/architecture.md#point-editing-on-paths, requirements/drawing.md#point-editing--v1
  - Done when: a double-click on a path enters point editing (a Rope's or Spring's only selects); points move, nudge and delete with the path's limits; a double-click on a curve adds a point through `splitCurve` without changing the look; a double-click on a point switches sharp and smooth; sharp points draw as squares and smooth ones as circles; Node tests pass
- [ ] 14. Point editing on paths: curve handles
  - Read: versions/v2/architecture.md#point-editing-on-paths, design/level-view.md#v2-paths-and-gradient-handles
  - Done when: the selected points' handles show and `HandleDragState` drags them, one step each, smooth points keeping theirs opposite, Alt making a point separate, Shift, snapping and Esc as the architecture says; the selected points' rows in the Points list show as the blue pill, unfolded; Node tests and a Playwright test (drag a handle, switch a point, add a point on a curve) pass
- [ ] 15. Fit a drag into curves
  - Read: versions/v2/architecture.md#the-pencil
  - Done when: `fitCurves` is in `core/geometry/fitting/` with Node tests: every dragged point within the tolerance, a closed loop closes, a straight drag gives two points, the same drag twice gives the same path, and an over-detailed fit stays within 2,000 points
- [ ] 16. The Pencil
  - Read: versions/v2/architecture.md#the-pencil, requirements/drawing.md#the-pencil--v2, design/controls.md#v2-the-pen-the-pencil-and-gradients
  - Done when: `PencilTool`, `PencilOptions` and the stroke's preview are built; key 5 and the button pick it; a release near the start closes the path; Esc drops a stroke; the smoothness is kept for the session; Node tests and a Playwright test (a closed and an open stroke at each smoothness) pass
- [ ] 17. Try point: draw with the Pencil and edit the points and handles of paths
- [ ] 18. The rest of v2's Playwright journeys
  - Read: versions/v2/architecture.md#the-tests
  - Done when: every journey the architecture lists is in `tests/e2e/` and passes in Chromium, Firefox and WebKit, including a gradient kept through save, reload, copy and paste
- [ ] 19. The speed tests for a 2,000-point path
  - Read: versions/v2/architecture.md#the-tests, architecture/performance.md
  - Done when: the four tests are in `tests/performance/` on a level with one 2,000-point path among 10,000 entities; they meet their targets on this machine, or what misses and why is written in performance.md; the numbers are written in performance.md
- [ ] 20. Close v2's docs
  - Read: versions/README.md#closing-a-version, versions/v2/architecture.md
  - Done when: v2's lasting parts are moved into architecture/ (components-and-fields, drawing-and-points, selection-and-tools, adapters, persistence's point limits, performance, testing) and architecture.md says so; progress.md is trimmed to where things stand and what's next; `node tools/check-sources.js` passes
- [ ] 21. Try point: try the whole of v2
