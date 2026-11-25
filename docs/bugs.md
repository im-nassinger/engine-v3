# Bugs

## TL;DR

Known bugs that aren't fixed yet, and how fixed ones were solved. A bug found while trying a version is also a row in that version's `fixes.md`. Bugs fixed before this file existed (2026-11-25) are in the fixes files and [decisions.md](decisions.md).

## The pen doesn't close a path ended on its first point (open, 2026-11-25)

- **Seen**: drawing with the Bézier pen and placing the last point very close to the first, or exactly on it, leaves the path open, so it gets no fill. The owner suggested a distance threshold.
- **What is known**: the pen already has a threshold. `PenIdleState.pointerDown` closes the path when `host.isNearFirst` says the press is within `CLOSE_PX` (8 screen px, `PenTool.ts`) of the first point, and only from 3 points on.
- **Tips for whoever fixes it** (Claude's reading of the code, not checked in the browser):
  1. **Most likely, grid snapping.** `isNearFirst` measures the raw press, but a press that misses the 8 px goes to `host.nextPlace`, which snaps it. With snapping on (the default), a press a little further away snaps exactly onto the first point's grid spot and is placed there as a new point, so the path ends on its first point and stays open. That matches "even perfectly on top". A fix: also close when the placed point (after snapping) is the first point.
  2. **A path of 2 points.** A press near the first point with fewer than 3 points returns and does nothing, with no message, so it looks like closing failed.
  3. **8 px is small.** The comment says "the 12 px ring with a little room", but the value is 8, a radius; a bigger radius may help too.
- **Fix**: not yet. Asked as [v4 fix](versions/v4/fixes.md) 11.
