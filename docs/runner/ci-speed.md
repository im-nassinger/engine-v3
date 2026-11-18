# Faster CI

## TL;DR

**Parts 1 to 3 are built (2026-11-18), their timings not measured yet.** The runner waits for CI after every step, and CI took 18 to 42 minutes on 2026-11-18, because a download stalled in every run. Without the stalls a run takes about 9 minutes. Part 1 stops the stalls from costing much and part 2 splits the journey tests across 3 machines, for an estimated 5 minutes per run. Part 3 makes the wait visible on Discord. Part 4, not waiting for CI at all, is the owner's decision, is not recommended for now and is not built.

## What was measured

The four runs in `im-nassinger/engine-v3-ci` on 2026-11-18:

| Run | Commit | Total | What stalled | Normal time of that step |
|---|---|---|---|---|
| 44409059377 | `95dac8b` | 42 min | `playwright install --with-deps` in `journeys` (2,072 s) and `browser` (1,984 s) | 47 s |
| 44388621045 | `b343a1f` | 18 min | `setup-node` in `journeys`: 605 s, most likely downloading the npm cache | 7 s |
| 44380988751 | `8b6cb7b` | 32 min | `playwright install --with-deps` in `browser`: 1,719 s | 47 s |
| 44374954683 | `26360a3` | cancelled at 31 min | `playwright install --with-deps` in one job (see [public-ci.md](public-ci.md)) | 47 s |

Where a run's time goes when nothing stalls. The jobs run side by side, so the longest one sets the total:

| Job | Time | Its biggest part |
|---|---|---|
| `journeys` | about 9.5 min | 268 Playwright tests, 6.7 to 8.4 min, with 2 workers |
| `browser` | about 5 min | Performance tests about 2 min, browser tests about 1.5 min |
| `check` (x86 and ARM) | about 2 min | `npm run check:code` |
| `phone-arm` | about 1.5 min | |

## Part 1: stop a stalled download from costing much

All in `.github/workflows/ci.yml`, in every job that has these steps.

**The npm cache.** Give `setup-node` a 1-minute limit per download. When it runs out, the step goes on without the cache, and `npm ci` still works: it took 34 s in the stalled run.

```yaml
- uses: actions/setup-node@v7
  env:
      SEGMENT_DOWNLOAD_TIMEOUT_MINS: 1
  with:
      node-version-file: .node-version
      cache: npm
```

Confirmed in `setup-node@v7`'s bundled code: it reads this variable, and its default is 10 minutes, which matches the 605 s stall.

**The browser install.** Two tries of 3 minutes, then a last one of 30, repairing any interrupted `apt` work between tries. `phone-arm` does the same with `chromium` only. *Why the long last try (standing yes, 2026-11-18): this plan first had three tries of 3 minutes, but on a slow mirror those all fail, CI turns red with no code wrong, and three red runs pause the runner. `apt` keeps what it downloaded, so a later try starts ahead.*

```yaml
- name: Install browsers
  run: |
      for limit in 180 180 1800; do
          timeout -k 15 "$limit" npx playwright install --with-deps chromium firefox webkit && exit 0
          echo "Browser install did not finish within $limit s"
          sudo dpkg --configure -a || true
      done
      exit 1
```

Two risks to watch:

- A retry may reach the same slow mirror, and then the run still takes about as long as before. If retries don't help, run these jobs in Playwright's own image, `mcr.microsoft.com/playwright:v1.65.1-noble`, which already holds the browsers and their packages. Its tag must follow the `@playwright/test` version in `package.json`.
- If all three tries fail, which now takes 36 minutes, CI is red and the next session is told to fix it, though no code is wrong. If this happens, the runner should rerun the failed job (`gh run rerun <run> --failed --repo im-nassinger/engine-v3-ci`) when `Install browsers` is the only failed step.

## Part 2: split the journey tests across 3 machines

Parallel jobs are free in a public repo. Each machine runs a third of the tests, so `journeys` should drop to about 4 minutes, and `browser` becomes the longest job. These are estimates until a run is measured.

1. **`.github/workflows/ci.yml`:** give `journeys` a matrix, and have each machine upload its part of the report.

   ```yaml
   journeys:
       if: ${{ !github.event.repository.private && github.ref == 'refs/heads/master' }}
       runs-on: ubuntu-24.04
       strategy:
           fail-fast: false
           matrix:
               shard: [1, 2, 3]
       steps:
           # checkout, setup-node, npm ci and Install browsers, as in part 1
           - run: npm run test:e2e -- --shard=${{ matrix.shard }}/3
           - uses: actions/upload-artifact@v7
             if: ${{ !cancelled() }}
             with:
                 name: blob-report-${{ matrix.shard }}
                 path: blob-report/
                 retention-days: 1
   ```

2. **`playwright.config.ts`:** in CI, use the `blob` reporter instead of `html`: `[['list'], ['blob']]`.
3. **`.github/workflows/ci.yml`:** add a `journeys-report` job with `needs: journeys`, `if: ${{ !cancelled() && !github.event.repository.private && github.ref == 'refs/heads/master' }}` and `continue-on-error: true`. It downloads every `blob-report-*` artifact into one folder (`merge-multiple: true`), runs `npx playwright merge-reports --reporter html <folder>`, and uploads `playwright-report/` as `playwright-report` for 30 days, as today. The layout checks' screenshots stay in that report. `continue-on-error` is there so a problem with the report never turns CI red.
4. **Docs:** `docs/architecture/testing.md` and `docs/architecture/tooling.md` mention these tests or their report. Update them if what they say changes.

`CiChecker` needs no change: it reads the run's result and names failed steps as `job > step`, so a failure reads `journeys (2) > Run npm run test:e2e ...`.

## Part 3: say on Discord what the runner is waiting for

In `tools/runner/run.ts`, and then the message table in [how-it-works.md](how-it-works.md). Today nothing is sent between the ✅ message and the next one, so a normal CI wait looks like a stall.

| When | Message |
|---|---|
| A step's ✅ message | Ends with "Waiting for CI." |
| CI passes, in `checkCi` | 🟢 CI passed, starting step N of T. It replaced "CI passes again" |
| CI's result can't be read, in `checkCi` (now only logged) | ⚠️ CI result unknown (the reason), starting the next step anyway |

## Part 4, the owner's decision: stop waiting for CI

The next session would start right after the push, and CI's result would be read when that session ends. It saves the whole wait, but a failure is then found one step late, with another step built on top of the broken commit. It reverses the 2026-11-16 decision in [decisions.md](decisions.md), and it needs a change to the loop in `run.ts`.

**Recommendation: don't, for now.** With parts 1 and 2 the wait is about 5 minutes against about 45 for a step.

## How it was applied

- Parts 1 and 2 touch files outside the runner's own (`ci.yml`, `playwright.config.ts`, `tooling.md`). The owner said yes on 2026-11-18, and only those files were committed, by naming them in `git commit -- <paths>`.
- Part 3 applies itself: the runner restarts between sessions when its code changes.
- The next published commit is the test, since CI runs on what the runner publishes.

## Still to check

- Three runs in a row finish in about 6 minutes or less, or about 8 when a download stalls.
- The `playwright-report` artifact still opens and holds all 268 tests.
- Discord shows a message when CI passes.
- [public-ci.md](public-ci.md) describes the new timings, and this plan is marked built.
