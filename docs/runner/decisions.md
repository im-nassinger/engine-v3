# Runner decisions

## TL;DR

What the owner decided about the runner, newest last. The changes the runner made to the game's plan are also in the project's [decisions.md](../decisions.md).

| Date | Decision | Why |
|---|---|---|
| 2026-11-14 | The runner exists: one fresh session per step, progress to Discord, waits out the usage limit | The owner was typing "continue from where we left off" by hand |
| 2026-11-14 | Claude pushes `master` after each step | CI needs a push, and the runner must finish v1 alone |
| 2026-11-15 | The runner pushes, not the session, and reads the stage and step from `docs/progress.md`; the prompt shrinks to context, the step's loop and three report lines | The owner found the prompt too long and wanted sessions to focus on the code |
| 2026-11-14 | Stage 17's layout and phone checks are Playwright tests, not checks by hand | Same reason |
| 2026-11-14 | Anything that needs `sudo` goes to Discord, and the work goes on without it | The owner isn't there to type a password |
| 2026-11-14 | The usage limit is read by the runner from the CLI's output, not reported by the model | A model cut off by the limit can't report it |
| 2026-11-14 | Each session gets exactly one prompt and is never used again | The owner's rule: a new session always continues the work |
| 2026-11-14 | The runner doesn't wait for other Claude sessions in the project to close | The owner keeps a chat session open in this folder to talk to Claude |
| 2026-11-14 | Discord messages are one line of % and stage, then one plain sentence on what the step did | The owner wants them short and clear |
| 2026-11-15 | The runner blocks the computer's idle sleep while it runs, and waits by the wall clock | The laptop slept through the night and the limit's reset, and the runner's timer didn't count the time asleep |
| 2026-11-15 | The runner's docs live in `docs/runner/` in this repo, not in a project of its own | The owner's choice |
| 2026-11-15 | The runner writes its own state into `docs/runner/status.md`, not in git | A session looking after the runner should learn everything from the docs, not from the journal, the logs and git |
| 2026-11-15 | Keep the webhook for now; the Discord bot comes later | The owner's choice. The bot's open questions are in [progress.md](progress.md) |
| 2026-11-15 | Every session loads `working-with-me`, `typescript-style` and `clean-architecture`, and checks the folders it added files to before committing | No session had loaded `clean-architecture`, so the folder rule in it never applied |
| 2026-11-15 | Only one runner, and one of its sessions, may run at a time | The owner's rule: two sessions must never work on the same thing at once |
| 2026-11-16 | Keep CI, and the runner acts on it: it waits for CI after each push, the next session fixes a failure before a new step, and three failed fixes pause it | CI had failed on every push since stage 9's speed tests, and no session knew; removing CI would hide breakage that `npm run check` doesn't catch |
