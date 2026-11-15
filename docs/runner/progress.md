# Runner progress

## TL;DR

**The runner is built and running** (since 2026-11-14) as the systemd user service `engine-v3-runner`. **Pushing fails** until the owner gives the GitHub login the `workflow` scope. **Next for the runner: a Discord bot** to replace the webhook, waiting for the owner's answers below.

## Where it stands

| Part | State |
|---|---|
| The loop, the prompt, the Discord webhook messages | Done, running |
| Detecting the usage limit and waiting for the reset | Built; not yet seen hitting a real limit |
| Restarting itself when its own code changes | Done |
| Pushing after each step | Fails, see below |

## Known issues

- **Push is refused:** the commits include `.github/workflows/`, and the GitHub token has no `workflow` scope. Fix, by the owner: `gh auth refresh -h github.com -s workflow`. Each session's push then sends every waiting commit.
- **The systemd unit names Node 26.13.0 from nvm.** After a Node upgrade, update `tools/runner/engine-v3-runner.service` and run `systemctl --user daemon-reload`.

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
