# Versions

## TL;DR

One folder per version after v1, each planned in four files the way the `orchestrator-workflow` skill describes (owner, 2026-11-20): what it does, how it looks, how it is built, and its tasks. **The orchestrator builds a version from its `tasks.md`**, whose ticks are the only record of that version's progress. v1 was planned before this folder existed, in [plan.md](../plan.md) and [steps/](../steps/README.md), and stays there as it was built.

## The folders

| Version | What it adds | State |
|---|---|---|
| [v2/](v2/requirements.md) | Curves and gradients: the Bézier pen, the Pencil, gradients | Done (owner, 2026-11-22): built, tried by the owner, its [fixes](v2/fixes.md) built and tested |
| v3/ | A first game without code | Being planned |

Only the next version is planned. v3 to v7 stay one line each in [scope.md](../scope.md) until their turn.

## What each folder holds

| File | Holds |
|---|---|
| `requirements.md` | What the version does. **The rules stay in [requirements/](../requirements/README.md)**, each feature marked with its version, so this file lists the version's features and links to them instead of copying them |
| `design.md` | How it looks, if it adds anything to the screen. It points at the version's mockup and the parts of [design/](../design/README.md) it adds |
| `architecture.md` | What the version adds to the code and how it connects. When the version is built, its lasting parts move into [architecture/](../architecture/README.md) |
| `tasks.md` | The tasks in the orchestrator's format: numbered, each with **Read** and **Done when**, and **Try points** for the owner |
| `fixes.md` | After the owner tries the version: what to change, in the owner's words. Each fix becomes a task at the end of `tasks.md` |

**`tasks.md` is written last**, once the other three have the owner's yes. A version folder without it can't be started by mistake: `orchestrator start` refuses it.

## Closing a version

1. The docs are updated to match what was built: the version's architecture moves into [architecture/](../architecture/README.md), and anything decided while building is written where it belongs.
2. [progress.md](../progress.md) is trimmed to where things stand and what's next.
3. The next version is planned.
