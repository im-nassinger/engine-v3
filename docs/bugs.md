# Bugs

## TL;DR

Known bugs that aren't fixed yet, and how fixed ones were solved. A bug found while trying a version is also a row in that version's `fixes.md`. Bugs fixed before this file existed (2026-11-25) are in the fixes files and [decisions.md](decisions.md).

## The pen doesn't close a path ended on its first point (open, 2026-11-25)

- **Seen**: drawing with the Bézier pen and placing the last point very close to the first, or exactly on it, leaves the path open, so it gets no fill. The owner suggested a distance threshold.
- **What is known**: the pen already has one. A press within the first point's 12 screen px ring (with a little room, `PenTool.ts`) closes the path, from 3 points on. So the cause is somewhere else, not found yet; candidates to check are a path of only 2 points, grid snapping moving the press off the ring, and a drag or double-click that finishes the path instead.
- **Fix**: not yet. Asked as [v4 fix](versions/v4/fixes.md) 11.
