# The runner

## TL;DR

**The runner builds v1 without the owner**: one fresh Claude session per step of [plan.md](../plan.md), each with one prompt, then a Discord message with what the step did and v1's %. It waits out the usage limit, sends what needs `sudo` to Discord, and stops when v1 and the [before-v2](../before-v2.md) changes (stage 18) are done, before v2. **This folder is the handoff for a session that looks after the runner**, not the game: it holds everything such a session needs, so it reads nothing else to catch up.

## What the runner is responsible for

- Keep v1 being built, step after step, with no one typing "continue".
- Give each step a new session with one prompt, never reusing a session.
- Tell the owner on Discord, briefly: what each step did and v1's %, the usage limit at 90% and when it's reached, anything that needs `sudo`, and when it's paused or done.
- Never decide what the game does. The sessions it starts follow the project's CLAUDE.md and `docs/` like any session.

## Starting a session that looks after the runner

1. Read `status.md` in this folder: what the runner is doing right now, v1's %, the usage limit, and its last 30 events. The runner writes it itself whenever something changes; it isn't in git. If it's missing, the runner has never run on this computer.
2. Read [progress.md](progress.md): the runner's known issues and what's next for it.
3. Tell the owner briefly how it's going.

Rules for the session:

- **Don't change the game's code or the game's docs.** The runner's sessions are editing them.
- When you change the runner, update this folder in the same commit, and commit only the runner's files (`tools/runner/`, `docs/runner/`) by naming them in `git commit -- <paths>`, never with `git add -A`.
- `tools/runner/` code changes apply on their own: the runner restarts itself between sessions. **Never restart or stop the service to apply a change**: that kills the session in the middle of a step, with its work half done and not committed.

## Files

| File | What it's for |
|---|---|
| `status.md` | Written by the runner: what it's doing now, v1's %, the usage limit, the last 30 events. Not in git |
| [progress.md](progress.md) | Where the runner stands, its known issues, and what's next for it (the Discord bot) |
| [how-it-works.md](how-it-works.md) | The loop, the Discord messages, how it detects the limit, its files and the commands to start, stop and resume it |
| [decisions.md](decisions.md) | The owner's decisions about the runner, and why |
