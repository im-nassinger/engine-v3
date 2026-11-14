# Stage 0: the checks

## TL;DR

Three tools keep the architecture's rules, and each rule lives in exactly one of them. **TypeScript** keeps the browser out of core, editor and the workers. **ESLint** keeps what it can see in one file: which part and which library an import names, banned calls, the code style. **dependency-cruiser** keeps what needs the whole graph: module entries and circles. **Guard tests** prove each of those checks still refuses what it should. `npm run check` runs them all, and CI runs it on x86 and ARM. Numbers in brackets point at the changes in [changes.md](changes.md).

## Which tool keeps which rule

| Rule | Tool | Why this tool |
|---|---|---|
| No `window`, `document`, `localStorage`, `setTimeout` in core and editor | TypeScript: no `DOM` in their config | The names don't exist, so nothing can be forgotten |
| No `document` or `window` in a worker, or in anything a worker imports | TypeScript: `WebWorker` without `DOM` [3] | Same |
| Imports point inward: app → ui and adapters → editor → core | ESLint | The folder is in the import's text, and the editor shows the error while typing |
| Which libraries a part may import | ESLint | A library is named in the import's text |
| Banned calls in core and editor | ESLint | It is about one line of code |
| The owner's TypeScript style [8] | ESLint and Prettier | Same |
| A promise nobody waits for [6] | ESLint, reading types | |
| Another module is entered only through its `index.ts` [4] | dependency-cruiser | Needs to know what a path leads to |
| No circle of imports, between files or between modules [4] | dependency-cruiser | Needs the whole graph |
| Every schema is valid | A unit test in `core/components` | Stage 2, as the docs say |

## ESLint

One file, `eslint.config.ts`, with one block per part. It starts from ESLint's recommended rules, the TypeScript rules that read types [6], and the React hooks rules (which carry the React Compiler's checks).

### Imports per part

| Part | Other parts it may import | Libraries it may import |
|---|---|---|
| core | none | The polygon library, kept in one constant (see the [open question](changes.md#found-on-the-way-clipper2-js)) |
| editor | core | none |
| adapters | core, editor | `pixi.js`, `box2d3-wasm/compat`, `idb`, `fflate` |
| ui | core, editor | `react`, `react-dom`, `@tanstack/react-virtual` |
| app | all | all |

- **Test files** (`*.test.ts`) may also import `vitest`. The direction stays the same for them [2].
- **`box2d3-wasm` without `/compat` is refused everywhere**, with the stack's reason in the message: the default import may pick a different build per computer, which breaks determinism.
- **`node:` imports** are refused in every part. Only `tests/` and the config files run in Node.
- Each refusal's message says the rule in plain words ("core imports only core"), so the fix is clear without opening this file.

### Banned calls

| Where | Refused | Instead |
|---|---|---|
| core | The 22 `Math` functions a browser may approximate, and `Math.random` [5] | `DeterministicMath`, and the seeded random of v2 |
| core | The `**` operator [5] | Multiplying, or `DeterministicMath` |
| core | `Date` and `Intl`, and the methods that follow the computer's language [5] | The clock time comes in with the run's start |
| core | `for ... in` | `for ... of` over a known order |
| editor | `Date`, `Math.random` [5] | The `Clock` contract |

### Style

Built-in rules only [8]: no `export default` (the config files are the exception, their tools require one), `type` instead of `interface`, no `any`, no ternary inside a ternary, nesting at most three deep, braces except on a one-line early exit, `import type` for types.

## dependency-cruiser

One file, `.dependency-cruiser.json`, with three rules:

| Rule | Refuses |
|---|---|
| Modules through `index.ts` | An import from one module into a file of another module that isn't its `index.ts`. Within a part and across parts |
| No circles between files | `A.ts` → `B.ts` → `A.ts`, however long the chain |
| No circles between modules | `core/entities` → `core/components` → `core/entities`, even when no single file is in a circle |

Imports of types count too. Two modules that only know each other's types are still tied together, and the docs' answer applies: move the shared piece to a third module, or let one side declare a contract.

## Guard tests

In `tests/guards/`, run by `npm test`. Each one hands a check a small sample that breaks one rule and expects the refusal, and hands it a correct sample and expects silence [7].

| Guard test | Samples | Expects |
|---|---|---|
| Import direction | core importing editor; editor importing adapters; ui importing adapters; adapters importing ui | ESLint refuses each. editor importing core passes |
| Libraries | core importing `react`; editor importing `pixi.js`; ui importing `pixi.js`; anything importing `box2d3-wasm` | ESLint refuses each. A core test importing `vitest` passes |
| Banned calls | `Math.sin`, `x ** 2`, `new Date()`, `Date.now()`, `for ... in` in core; `Date.now()` in editor | ESLint refuses each. `Math.sqrt` in core and `Math.sin` in editor pass |
| The `Math` list | Every member `Math` has in this Node | Each is either allowed or banned, none unknown |
| No browser in the rules | A file using `window` and `setTimeout`, compiled with core's config, and again with editor's | The type check fails on both names |
| No page in a worker | A file using `document`, compiled with the workers' config | The type check fails |
| Module entries and circles | A tiny tree of two modules with one deep import and one circle | dependency-cruiser reports both, and nothing on the fixed tree |

The ESLint guards hand ESLint the sample's text with a path such as `src/core/sample.ts`, so no broken file ever sits in `src/`.

## The first real tests

One per test runner, so each pipeline is proven before stage 1 needs it:

| Runner | Test | Checks |
|---|---|---|
| Vitest in Node | The guard tests above | |
| Vitest in three browsers | `tests/guards/browser-features.browser.test.ts` | Each browser has what v1 uses: IndexedDB, Web Locks, workers, WebAssembly |
| Playwright | `tests/e2e/empty-page.spec.ts` | The built page opens, shows the project's name, and logs no error |

## CI

One workflow, `.github/workflows/ci.yml`, as [testing.md](../../architecture/testing.md#in-ci) describes:

| Job | Runs on | Does | When |
|---|---|---|---|
| check | `ubuntu-24.04` and `ubuntu-24.04-arm` | `npm ci`, `npm run check` | Every push |
| browser | `ubuntu-24.04` | Installs the three browsers, `npm run test:browser`, `npm run build` | Every push |
| journeys | `ubuntu-24.04` | `npm run test:e2e` | Pushes to master |

- Node comes from `.node-version`.
- `tools/check-sources.js` doesn't run in CI: it reads `~/projects/ecs-game-v2`, which only the laptop has.
- The determinism test joins the check job in stage 13. Running the job on ARM from stage 0 means the ARM runner is known to work long before that test depends on it.
