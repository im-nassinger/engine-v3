# Plan: v4 fixes 9 to 13

## TL;DR

The last of v4 before v5 is planned (owner, 2026-11-25). Smallest first: push and deploy, write down the owner's answers, the pen bug, the trigger card changes, then metres. Steps 1 and 2 are done by Claude; steps 3 to 7 are built by the orchestrator, one session per task, as tasks 28 to 35 of [tasks.md](tasks.md) (owner, 2026-11-25, to save tokens). **Steps 3 to 7 are built** (tasks 28 to 35, 2026-11-26), waiting for the owner's try (task 36). The owner then tries fixes 9 to 13, and v5 (scripts) is planned after that.

## Steps

1. **Push and deploy.** Push fixes 5 to 8 and publish the app to Netlify, so the owner tries the current code.
2. **Write down the owner's answers** (2026-11-25):
   - Fix 4's try (task 27) is done; the trigger card is ok.
   - Grid snapping is ok; it comes off "Waiting for the owner".
   - The open question is settled: the game's card says "When other starts touching this", like the mockup. This becomes fix 13 in [fixes.md](fixes.md).
3. **Fix 11, the pen doesn't close a path** ([bugs.md](../../bugs.md#the-pen-doesnt-close-a-path-ended-on-its-first-point)). First reproduce it in the browser. The likely cause is grid snapping: a press just outside the 8 px ring snaps onto the first point and is placed as a new point. Fix: also close the path when the placed point, after snapping, is the first point. Then check whether 8 px is too small. A test pins it.
4. **Fix 9, always show "Every entity tagged"** in the target menu, even with no tag in the level, with a short hint that there are no tags yet.
5. **Fix 13, "other" in the event block**: the card's touching events say "other" instead of "something"; the requirements are changed to match.
6. **Fix 10, multiply, divide and variables in value boxes:**
   - Change value gets Multiply and Divide beside Set, Add and Subtract (numbers and vectors only).
   - Every value box in every block (actions and the If's amount and component values) can hold a variable of the matching type instead of a typed value.
   - Dividing by 0 leaves the value as it was (already in the requirements).
7. **Fix 12, lengths in metres** ([workspace.md](../../requirements/editor/workspace.md#lengths-in-metres--v4)), the biggest:
   - A *Pixels per metre* field on the World's PhysicsWorldComponent, default 100; the physics uses it.
   - Every length the editor shows is in metres (positions, sizes, the grid size, speeds in m/s, the trigger blocks, the debug box); the grid's default becomes 1 m.
   - ☰ offers metres or pixels, saved in the browser, metres by default.
   - Old levels aren't converted (the [principle](../../principles.md) of 2026-11-25).
8. **The owner tries fixes 9 to 13.** Their asks become new fixes.

## How it is built

By the orchestrator, from tasks 28 to 36 in [tasks.md](tasks.md); fix 10 and fix 12 are split into several tasks so each fits one session. Each task's picks go in [decisions.md](../../decisions.md), and lasting rules go in the requirements, [controls.md](../../design/controls.md) and [architecture/](../../architecture/README.md).
