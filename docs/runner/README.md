# The runner

## TL;DR

**The runner builds v1 without the owner**: one fresh Claude session per step of [plan.md](../plan.md), each with one prompt, then a Discord message with what the step did and v1's %. It waits out the usage limit, sends what needs `sudo` to Discord, and stops when v1 is done. **This folder is the handoff for a session that works on the runner itself**, not on the game. Start with [progress.md](progress.md).

## What the runner is responsible for

- Keep v1 being built, step after step, with no one typing "continue".
- Give each step a new session with one prompt, never reusing a session.
- Tell the owner on Discord, briefly: what each step did and v1's %, the usage limit at 90% and when it's reached, anything that needs `sudo`, and when it's paused or done.
- Never decide what the game does. The sessions it starts follow the project's CLAUDE.md and `docs/` like any session.

## Files

| File | What it's for |
|---|---|
| [progress.md](progress.md) | Where the runner stands, its known issues, and what's next for it (the Discord bot) |
| [how-it-works.md](how-it-works.md) | The loop, the Discord messages, how it detects the limit, its files and the commands to start, stop and resume it |
| [decisions.md](decisions.md) | The owner's decisions about the runner, and why |
