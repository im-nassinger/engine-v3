# CI in a public copy

## TL;DR

**Built and running (2026-11-18).** GitHub stopped starting CI in the private repo, `im-nassinger/engine-v3`: a private repo gets about 2,000 free Actions minutes a month, and about 190 pushes of five jobs each used them up in four days. CI is free and unlimited in a public repo, ARM machines included, so the runner now publishes a **public copy** of each pushed commit to `im-nassinger/engine-v3-ci` and waits for CI there. The copy holds only what CI needs: never `docs/`, `CLAUDE.md`, `.claude/`, the runner, or the git history.

## Why

- **The owner's choice (2026-11-18):** keep CI on GitHub, ARM included, for free, without making the docs, the history or any `/home/...` path public. The game's code (`src/`, `tests/`) does become public: CI can't test what it can't see. The repo has no license, so the code can be read but not reused.
- Rejected: making `engine-v3` public (publishes the docs and the history); running CI only on the laptop (loses the ARM check); paying for minutes; a self-hosted runner (no ARM, more to look after); emulating ARM in Docker with QEMU (works, but slower and more to set up than a free real ARM machine).
- How the minutes ran out was a planning miss: when CI was set up in stage 0 and the runner started pushing after every step, nobody checked the private-repo limit.

## How it works

1. After a session, the runner pushes `master` to the private repo as before.
2. **It builds the copy** of the pushed commit: `git archive` of the listed paths only, into a fresh folder. Listed, not excluded, so a new top-level folder stays private until someone adds it to the list. The list is in `tools/runner/PublicCopy.ts`.
3. **The guard:** every file in the copy is searched for `ixcsoft`, `/home/` and `ecs-game-v2`. One hit and nothing is pushed: the runner posts ⚠️ to Discord naming the files and goes on without CI for that step.
4. **It pushes the copy** as one commit with no parent, force-pushed over `master` in the public repo. Its message is the private commit's hash, so old commits and commit messages never reach the public repo.
5. **CI runs there** with the same workflow, `.github/workflows/ci.yml`. Each job has `if: ${{ !github.event.repository.private }}`, so in the private repo every job is skipped and uses no minutes.
6. `CiChecker` reads the run from the public repo (`gh run list --repo im-nassinger/engine-v3-ci --commit <public hash>`). A failure is reported and fixed exactly as before, naming the private commit.

`npm run check` reads `docs/`, which the copy doesn't have, so it is split: **`npm run check:code`** runs everything but the docs check, and CI runs that. `npm run check` is `check:code` plus `docs:check`, unchanged for sessions.

## What the copy holds

`src/`, `tests/`, `index.html`, `package.json`, `package-lock.json`, `.npmrc`, `.node-version`, `.gitignore`, `.prettierrc.json`, `.prettierignore`, `.dependency-cruiser.json`, `eslint.config.ts`, `playwright.config.ts`, `vite.config.ts`, the `tsconfig` files, `tools/package.json` and `.github/workflows/ci.yml`.

Never: `docs/`, `CLAUDE.md`, `.claude/`, `tools/runner/`, `tools/check-docs.js`, `tools/check-sources.js`.

## Where the build stands

| Step | State |
|---|---|
| 1. This plan in `docs/runner/` | Done |
| 2. `check:code` in `package.json`; the jobs skip in a private repo | Done. The one test that reads `docs/` (`tests/guards/theme-tokens.test.ts`) skips the docs comparison when `docs/` is missing |
| 3. `tools/runner/PublicCopy.ts`: build, guard, push | Done. A copy of 1,232 files passes the guard and `check:code` |
| 4. `CiChecker` reads the public repo; `run.ts` publishes after pushing | Done |
| 5. Create `im-nassinger/engine-v3-ci` (public) with `gh repo create` | Done |
| 6. One publish by hand, then the runner resumes | Done. The owner had the runner resumed on 2026-11-18, and its first publish, `8b6cb7b`, passed all five jobs as run 44380988751 |
| 7. Update [how-it-works.md](how-it-works.md) and [progress.md](progress.md), mark this file built | Done |

## Reading a slow run

- **Look at the step's start time, not the job's.** GitHub gives a job's log only after the job ends, but `gh api repos/im-nassinger/engine-v3-ci/actions/runs/<run>/jobs` shows each step's times while it runs. Cancel a run only when one step is clearly stuck. *Why: on 2026-11-18 run 44374954683 was cancelled for its 30 minutes, with 266 of 268 Playwright tests passed and none failed.*
- **`playwright install --with-deps` can take about 25 minutes**, when Ubuntu's package mirror is slow (94 kB/s on 2026-11-18), against under a minute normally. It hit one job in each of the first two runs. A run past the runner's 45 minutes counts as unknown and the work goes on. Since 2026-11-18 the install has limits, see [ci-speed.md](ci-speed.md).
