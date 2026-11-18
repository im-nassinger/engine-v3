# Runner progress

## TL;DR

**The runner is built and running** (since 2026-11-14) as the systemd user service `engine-v3-runner`. **Pushing works** since 2026-11-15, after the owner gave the GitHub login the `workflow` scope. **Since 2026-11-16 it waits for CI after each push**, and a failing CI is fixed before the next step. **Since 2026-11-18 CI runs in a public copy**, because GitHub stopped starting CI in the private repo when its free minutes ran out; see [public-ci.md](public-ci.md). **Next: a Discord bot** to replace the webhook, waiting for the owner's answers below.

## Where it stands

| Part | State |
|---|---|
| The loop, the prompt, the Discord webhook messages | Done, running |
| Detecting the usage limit and waiting for the reset | Built; not yet seen hitting a real limit |
| Restarting itself when its own code changes | Done |
| Pushing after each step | Works since 2026-11-15. The first push started CI. Since 2026-11-15 the runner pushes, not the session |
| Acting on CI | Since 2026-11-16: waits for CI after each push; a red CI makes the next session fix it, and three failed fixes pause the runner |
| Stopping before v2 | Since 2026-11-18: stage 19, the redesign, is the last, and the runner stops only after it (before: stage 18, the before-v2 changes) |
| Ending a session that won't exit | Since 2026-11-18: a minute after its result line, the runner ends the session and everything it left running |
| CI in a public copy | Done, passing since 2026-11-18, see [public-ci.md](public-ci.md). The private repo's CI stopped that day: no free minutes left |
| An update at least every 10 minutes | Since 2026-11-18, the owner's rule. It starts when the runner next restarts itself |
| The short prompt | Since 2026-11-15: context, the step's loop, and `STATUS`, `SUMMARY`, `NEEDS` |

## Known issues

- **The laptop must stay awake.** On 2026-11-15 it went to sleep on battery at 00:23 and woke at 10:19, so nothing ran overnight. The runner now blocks sleep when the computer is idle, but closing the lid still sleeps it, and on battery it can run flat. Keep it plugged in with the lid open.
- **The systemd unit names Node 26.13.0 from nvm.** After a Node upgrade, update `tools/runner/engine-v3-runner.service` and run `systemctl --user daemon-reload`.

## Faster CI: built, not measured

CI took 18 to 42 minutes per run on 2026-11-18 because of stalled downloads, and the runner waits for it after every step. Parts 1 to 3 of [ci-speed.md](ci-speed.md) are built. **Next:** read the first three runs' times and whether the `playwright-report` artifact holds all the tests, then record them there and in [public-ci.md](public-ci.md).

## Next: the Discord bot

The owner wants to talk to the runner from Discord. Discussed on 2026-11-15, not built. The plan so far:

- A bot replaces the webhook for every message.
- `/claude <text>` starts a new session with the text as its one prompt, and the bot posts the answer back.
- Only the owner's Discord account, in one channel, can use it, because a session can run commands on this PC.

Open questions for the owner:

1. When a step is running: queue the `/claude` session after it (Claude's pick), answer read-only right away, or both?
2. Follow-ups: a fresh session every time, or a reply in the message's thread continues the same session?
3. Add `/status`, `/pause` and `/resume`?
4. Where the bot's library (discord.js) goes, so it stays out of the game's `package.json`.

The owner will need to create the bot in Discord's developer portal and give its token, their Discord user ID and the channel.
