# Bugs

## TL;DR

Known bugs that aren't fixed yet, and how fixed ones were solved. A bug found while trying a version is also a row in that version's `fixes.md`. Bugs fixed before this file existed (2026-11-25) are in the fixes files and [decisions.md](decisions.md).

## A polygon press that snaps onto the first point adds a point there (open, 2026-11-25)

- **Seen**: not seen by the owner; found in the code while fixing [the pen's](#the-pen-doesnt-close-a-path-ended-on-its-first-point).
- **What is known**: the Shape tool's polygon has the same check the pen had. `ShapeTool.pointerDown` closes only when the raw press is within its 8 px `CLOSE_PX`; a press further away is snapped by `nextPoint` and can land exactly on the first point, where it is added as a new point. The polygon is still closed by a later click on the first point, but then holds a doubled corner.
- **Fix**: not yet. The pen's fix (`endsOnFirst`) would carry over: close when the snapped place is the first point too.

## The pen doesn't close a path ended on its first point (fixed, 2026-11-25)

- **Seen**: drawing with the Bézier pen and placing the last point very close to the first, or exactly on it, leaves the path open, so it gets no fill. The owner suggested a distance threshold.
- **Cause**: grid snapping, as the tip guessed. The pen already closed a path on a press within `CLOSE_PX` (8 screen px, `PenTool.ts`) of the first point, from 3 points on, but it measured the raw press. A press further away went to `nextPlace`, which snapped it exactly onto the first point's grid spot, and it was added there as a new point: the path ended on its first point and stayed open. The preview even drew the next point on the first one without the close ring, so it looked "perfectly on top". A unit test with a 50 px snap step and a browser test with a 100 px grid both failed before the fix.
- **Fix**: `PenTool.endsOnFirst` closes the path when the press is within the 8 px ring *or* its snapped place is the first point; the press itself (`PenIdleState`) and the preview's close ring (`nextOf`) both use it. With fewer than 3 points such a press is still ignored, and the message pill now says "A path closes from 3 points on" instead of nothing happening. The ring stays 8 px: with snapping on, the close area is now the whole grid cell around the first point, and with it off, 8 px is the Shape tool's ring too. Pinned by `PenTool.test.ts` ("PenTool closing") and two tests in `tests/e2e/pen-tool.spec.ts`, one with grid snapping off and one with it on. [v4 fix](versions/v4/fixes.md) 11.
