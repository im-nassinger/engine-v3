# How the runner works

## TL;DR

A Node script, `tools/runner/run.ts`, run as a systemd user service. It loops: start a fresh `claude -p` session with the prompt in `tools/runner/prompt.md`, read its stream, post one Discord message through the webhook, start the next. Each session gets one prompt and is never used again. It reads the usage limit from the CLI's own output, waits out the reset, and stops when stage 17 of [plan.md](../plan.md) is done.

## What it sends to Discord

| Message | When |
|---|---|
| ✅ **v1: N%** · the stage and step, then one sentence on what the step did | After each step |
| ⚠️ N% of the usage limit used | Once per limit window, at 90% |
| 🛑 Usage limit reached, resuming at a time | When the limit is hit. A ▶️ follows when it resumes |
| 🔑 Needs your password | When something needs `sudo`. The work goes on without it |
| ⏸️ Paused | When Claude is blocked, or three sessions in a row fail. Nothing runs until you resume |
| 🎉 v1 is finished | The end. The runner stops |

## How it knows

- **Progress:** every session ends with `STATUS`, `STAGE`, `STEP`, `SUMMARY` and `NEEDS` lines. The % is (stage + finished steps ÷ steps in the stage) ÷ 18 stages.
- **The usage limit:** `claude -p --output-format stream-json` prints a `rate_limit_event` line with how much of the 5-hour and 7-day windows is used and when each resets. The CLI prints it, not the model, so the runner sees the limit even when the model is cut off mid-step. The next session finishes the cut-off step first.
- **A change to the runner's own code:** it restarts itself between sessions, so the change applies without stopping a step.
- **A hung session:** no output for 30 minutes ends it, and it counts as a failure.

## Files

| Where | What |
|---|---|
| `tools/runner/run.ts` | The loop |
| `tools/runner/prompt.md` | What each session is told |
| `tools/runner/engine-v3-runner.service` | The systemd unit. It names the Node version from nvm, so update it after a Node upgrade |
| `.claude/settings.json` | Allows `git push`, refuses `sudo`, `pkexec` and force pushes. Sessions run with `--permission-mode auto` |
| `~/.config/engine-v3-runner/env` | `DISCORD_WEBHOOK_URL`. Secret, outside the repo |
| `~/.local/state/engine-v3-runner/sessions/` | Every session's full output, one `.jsonl` file each |

## Commands

| To | Run |
|---|---|
| Install | `mkdir -p ~/.config/systemd/user && ln -sf ~/projects/engine-v3/tools/runner/engine-v3-runner.service ~/.config/systemd/user/ && systemctl --user daemon-reload` |
| Keep it running after logout | `sudo loginctl enable-linger $USER` (once) |
| Start, and start on boot | `systemctl --user enable --now engine-v3-runner` |
| Stop | `systemctl --user stop engine-v3-runner` |
| Resume after a pause | `rm ~/.local/state/engine-v3-runner/paused` |
| Watch it | `journalctl --user -u engine-v3-runner -f` |
