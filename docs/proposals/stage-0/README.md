# Stage 0 plan: project setup

## TL;DR

**A proposal, waiting for the owner's answer. Nothing here is built.** Stage 0 writes no game code. It sets up the tools, the five parts with their folders, an empty page that builds, and the checks that keep the architecture's rules true from the first line of code. One command, `npm run check`, runs every fast check, and CI runs the same on x86 and ARM. The plan follows [stack.md](../../architecture/stack.md) and [parts-and-folders.md](../../architecture/parts-and-folders.md) except in **ten places**, listed with the reason for each in [changes.md](changes.md). Every setup below was tried in a throwaway folder outside the project on 2026-11-14, so the plan rests on what the tools did, not on what their manuals say. One finding is outside stage 0 but shouldn't wait: **`clipper2-js` can't do what stage 3 needs** (see [changes.md](changes.md#found-on-the-way-clipper2-js)).

## Files

| File | What it's for |
|---|---|
| [changes.md](changes.md) | Where the plan differs from the approved docs, what was tested, and which docs change if you say yes. **Read this one first** |
| [setup.md](setup.md) | Every file stage 0 creates: packages, TypeScript configs, the empty page, the folders |
| [checks.md](checks.md) | Which tool keeps which rule, the tests that prove the checks work, and CI |

## What stage 0 builds

- **The packages** stage 0 itself uses, pinned to the exact versions in the stack. Libraries the game uses later are installed by the stage that first uses them.
- **TypeScript**, with one config inside each part's folder. core and editor compile without the browser's types.
- **The folders:** every module of the folder tree, each with an `index.ts` that exports nothing yet.
- **An empty page:** `index.html` and `src/app/main.tsx`, built by Vite with the React Compiler.
- **ESLint and Prettier:** the import rules per part, the banned calls, and the owner's TypeScript style.
- **dependency-cruiser:** modules are entered only through their `index.ts`, and nothing imports in a circle.
- **Tests:** Vitest in Node and in three browsers, Playwright for whole-app tests, each with one real test so the pipeline is proven.
- **Guard tests:** tests that feed each check a file that breaks its rule and expect the check to refuse it.
- **CI** on GitHub Actions, on x86 and ARM.

## Done when

The plan's own three, each proven by a guard test instead of by trying it once by hand:

1. A wrong import fails ESLint.
2. A `window` in core fails the type check.
3. An empty page builds.

And four more this plan adds:

4. A deep import past another module's `index.ts`, and a circle of imports between two modules, fail `npm run check`.
5. `Math.sin`, `**` and `Date` in core fail ESLint.
6. `npm run check` passes on a clean tree, and so does CI on x86 and ARM.
7. The architecture docs say what was really built (see "Docs that change" in [changes.md](changes.md)).

## The order of work

Each step ends with its checks passing and a commit.

| # | Step | Ends with |
|---|---|---|
| 1 | `package.json`, `.npmrc`, `.node-version`, `.gitignore`, the TypeScript configs, the folders with their `index.ts` | `npm run typecheck` passes |
| 2 | The empty page: `index.html`, `vite.config.ts`, `src/app/main.tsx` | `npm run build` and `npm run dev` work |
| 3 | ESLint and Prettier | `npm run lint` and `npm run format:check` pass |
| 4 | dependency-cruiser | `npm run deps` passes |
| 5 | Vitest in Node, and the guard tests | `npm test` passes, every guard test sees its check refuse |
| 6 | Vitest in three browsers, Playwright with one whole-app test | `npm run test:browser` and `npm run test:e2e` pass |
| 7 | The CI workflow | Green on x86 and ARM (needs a push, see below) |
| 8 | The docs: the architecture files, `plan.md`, `progress.md`, `CLAUDE.md`. This proposal is deleted, as [proposals](../README.md) says | `node tools/check-docs.js` passes |

## What I need from you

1. **Yes or no to the plan**, or to each change in [changes.md](changes.md). You can strike any of them and the rest still works.
2. **Node 24 or 26** (change 9). The docs say 24, your laptop runs 26.13.0.
3. **A push when step 7 is reached.** CI only runs on GitHub, and I push only when you ask. The repo is private, so CI minutes count against your GitHub plan, and whether your plan includes the ARM runner shows on the first run.
4. **Maybe your password once, in step 6.** Playwright 1.65.1 needs its own browser builds (the ones on your laptop are from an older Playwright), and WebKit may ask for system packages on Ubuntu 26.04.

If you prefer the changes as yes/no cards on the [review page](../../review.html), say so and I'll put them there.

## Not checked yet

- **The browser tests didn't run in the trial.** The config loaded and tried to start all three browsers, then stopped because Playwright 1.65.1's browser builds aren't downloaded. Step 6 downloads them.
- **CI** can't be tried without a push.
- **Two details of dependency-cruiser.** The trial used a JavaScript config, and the plan wants a `.json` one. And a module with subfolders (such as `core/components/` with one folder per component) may need the circle rule limited to whole modules. Both are settled in step 4.
