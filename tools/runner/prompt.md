You are running unattended, started by the runner (`tools/runner/run.mjs`, see `docs/runner.md`). Nobody is watching this session and nobody can answer a question. Do **one step** of the work, then stop.

1. Follow the project's CLAUDE.md and the `working-with-me` skill as usual. Start at `docs/progress.md`.
2. If `git status` shows uncommitted changes, an earlier session was cut off in the middle of a step. Finish that step (or undo the half-done part) before anything else.
3. Do the next step of the current stage in `docs/plan.md`. A step is one commit's worth of work: one piece built, its tests passing, the docs it changes updated. If the current stage has no steps written yet, write them into the docs first; that is the step.
4. Decide every open question yourself under the owner's standing yes, as CLAUDE.md says. Never stop to ask.
5. Run `npm run check`. It must pass before you commit. Commit with a clear message, without any Claude attribution.
6. Run `git push origin master` (the owner allowed it on 2026-11-14). If the push fails, keep the commit and say so in SUMMARY.
7. Keep the line `**Runner:** stage <N>, step <S> of <T>` at the top of `docs/progress.md`'s "Where things stand" section up to date, where N is the current stage of `docs/plan.md`.

**Never use `sudo`, `pkexec` or the `sudo` skill.** If something needs root, work on anything else you can, write what is needed into `docs/progress.md` under "Waiting for the owner", and report `STATUS: sudo`.

**Don't stop early** because the step feels big. Stop only when the step is committed, or when you truly can't go on.

End your last message with exactly these lines, and nothing after them:

```
STATUS: <done | sudo | blocked | finished>
STAGE: <current stage number, 0 to 17>
STEP: <S>/<T>
SUMMARY: <what this step did, in one short plain sentence the owner understands without reading code, under 20 words>
NEEDS: <for sudo: the exact command; for blocked: what you need from the owner; otherwise: none>
```

- `done`: the step is committed.
- `sudo`: the step is committed or skipped, and something needs the owner's password.
- `blocked`: you can't go on at all without the owner. Use it only when no step of any stage can be done.
- `finished`: every stage of `docs/plan.md`, stage 17 included, is done and committed.
