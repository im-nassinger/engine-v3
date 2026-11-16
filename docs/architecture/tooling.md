# Tooling

## TL;DR

The project's setup and the checks that keep the architecture's rules true from the first line of code, built in stage 0 (owner, 2026-11-14). **One command, `npm run check`, runs every fast check**, before every commit and in CI on x86 and ARM. Three tools keep the rules, each rule in exactly one of them: **TypeScript** keeps the browser out of core, editor and the workers, **ESLint** keeps what it can see in one file (which part and library an import names, banned calls, the owner's style), **dependency-cruiser** keeps what needs the whole import graph (module entries, circles). **Guard tests** prove each check still refuses what it should. Each part has its own `tsconfig.json` inside its folder, and the worker entry files sit in `src/app/workers/`. The packages and their versions are in [stack.md](stack.md).

## Files at a glance

```
.github/workflows/ci.yml      CI
.node-version                 the Node version, read by CI too
.npmrc                        exact versions, refuse a wrong Node
.gitignore                    adds dist/, test results, build caches
.prettierrc.json  .prettierignore
.dependency-cruiser.json      module entries and circles
eslint.config.ts              imports, banned calls, style
index.html                    the page
package.json  package-lock.json
playwright.config.ts          whole-app tests
tsconfig.json                 lists every config below, for `tsc -b`
tsconfig.base.json            the settings every part shares
tsconfig.node.json            the config files themselves
vite.config.ts                the build, and both kinds of Vitest tests
src/
  core/      tsconfig.json + one index.ts per module
  editor/    tsconfig.json + one index.ts per module
  adapters/  tsconfig.json + one index.ts per module
  ui/        tsconfig.json + one index.ts per module
  app/       tsconfig.json, main.tsx
    workers/ tsconfig.json, game.worker.ts, import.worker.ts
tests/
  tsconfig.json
  guards/    the guard tests and their sample files
  e2e/       whole-app tests
```

`tools/check-docs.js` and `tools/check-sources.js` stay as they are, in JavaScript. ESLint and Prettier skip them. **`tools/package.json`** holds only `"type": "commonjs"`: the project's `package.json` says `"type": "module"`, which would make Node refuse the two tools' `require` (found in stage 0).

**The package manager is npm.** `package-lock.json` is committed and CI installs from it with `npm ci`. `.npmrc` sets `save-exact=true`, so an install can't write a version range, and `engine-strict=true`, so a wrong Node version stops the install instead of failing later in a strange way.

## Scripts

| Script | Runs | When |
|---|---|---|
| `npm run dev` | The Vite dev server | Working on the page |
| `npm run build` | `tsc -b`, then the Vite build | |
| `npm run preview` | Serves the built page | Playwright starts it by itself |
| `npm run typecheck` | `tsc -b`: every part with its own config | |
| `npm run lint` | ESLint on everything | |
| `npm run format` | Prettier, writing | |
| `npm run format:check` | Prettier, only checking | |
| `npm run deps` | dependency-cruiser | |
| `npm test` | Vitest in Node: the unit tests and the guard tests | |
| `npm run test:browser` | Vitest in Chromium, Firefox and WebKit | Before a stage closes, and in CI |
| `npm run test:performance` | Vitest's speed tests in Chromium alone, with the GPU, one at a time (see [performance.md](performance.md#targets-and-their-tests)) | Before a stage closes, and in CI |
| `npm run test:e2e` | Playwright against the built page | Before a stage closes, and in CI on master |
| `npm run docs:check` | `node tools/check-docs.js` | |
| **`npm run check`** | `typecheck`, `lint`, `format:check`, `deps`, `test`, `docs:check`, in that order | **Before every commit** |

`npm run check` holds everything fast enough to run every time. It is the one command a session needs to know, and CI runs the same one. There is no git hook: the rule is in `CLAUDE.md`.

## TypeScript

**`tsconfig.base.json`**, shared by all. The settings in [stack.md](stack.md#settings-that-matter), plus what a bundler setup needs:

| Setting | Value | Why |
|---|---|---|
| `target` | `ES2023` | Matches the `lib` |
| `module`, `moduleResolution` | `ESNext`, `bundler` | Vite compiles |
| `moduleDetection` | `force` | An `index.ts` that exports nothing yet is still a module |
| `jsx` | `react-jsx` | |
| `resolveJsonModule` | true | A test compares with a recorded `level.json`, imported as JSON *(standing yes, 2026-11-14)* |
| `skipLibCheck` | true | Don't type-check the packages' own files |
| `types` | `[]` | No package's global types reach a part unless its config names them. Only `tests/tsconfig.json` and `tsconfig.node.json` name `node` |

**One config per part, inside its folder**, each only naming its `lib`:

| Config | `lib` | Covers |
|---|---|---|
| `src/core/tsconfig.json` | `ES2023` | core |
| `src/editor/tsconfig.json` | `ES2023` | editor |
| `src/adapters/tsconfig.json` | `ES2023`, `DOM`, `DOM.Iterable` | adapters |
| `src/ui/tsconfig.json` | `ES2023`, `DOM`, `DOM.Iterable` | ui |
| `src/app/tsconfig.json` | `ES2023`, `DOM`, `DOM.Iterable` | The page's composition root. Leaves out `workers/` |
| `src/app/workers/tsconfig.json` | `ES2023`, `WebWorker` | The game worker and the import worker, and everything they import |
| `tests/tsconfig.json` | `ES2023`, `DOM`, plus the Node types | The guard tests and the whole-app tests |
| `tsconfig.node.json` | `ES2023`, plus the Node types | `vite.config.ts`, `eslint.config.ts`, `playwright.config.ts` |

- **Why the worker files have their own folder:** `DOM` and `WebWorker` can't be in one config (they declare the same names differently), and `main.tsx` needs one while the worker files need the other. With a config inside each folder, the code editor, `tsc` and ESLint all find the nearest `tsconfig.json` by themselves, so nothing keeps a list of files.
- **A worker file is checked with everything it imports**, all without `DOM`. So the game worker can never import code that needs the page.
- **The root `tsconfig.json`** holds no files, only the list of the configs above. `tsc -b` checks them all in one run and remembers what it checked, so a second run is quick.
- **A part's config doesn't stop a wrong-direction import.** core importing an editor file compiles, because TypeScript just follows the import. Making the compiler refuse it would mean writing type files for every part, so direction stays with ESLint.
- **Tests don't let timers in.** With test files in core's config and the Node types installed, `setTimeout` in core still fails the type check.

## The folders and the page

- **Every module of the [folder tree](parts-and-folders.md#the-folder-tree)** is created in stage 0, with an `index.ts` holding `export {};`: 47 files, 10 in core, 17 in editor, 6 in adapters, 14 in ui. Folders inside modules (one per component, one per React component, `testing/`, `rules/`) come with the stage that writes their first file.
- **`src/app/main.tsx`** finds `#root` and renders the project's name inside React's `StrictMode`, until `EditorShell` replaces it in stage 6. `EditorComposition.ts` comes with stage 5.
- **`src/app/workers/game.worker.ts` and `import.worker.ts`** hold `export {};` until stages 16 and 12.
- **`index.html`:** a `#root` element and one script tag for `src/app/main.tsx`. No styles until `theme.css` in stage 6.
- **`vite.config.ts`:** `react()` plus `babel({ presets: [reactCompilerPreset()] })`. The tests are set up in the same file as two Vitest projects, so tests see the same code as the app:

| Project | Files | Runs in |
|---|---|---|
| `node` | `src/**/*.test.ts` and `tests/guards/**/*.test.ts`, without the browser ones | Node |
| `browser` | `**/*.browser.test.ts` | Chromium, Firefox and WebKit, headless |

- **`playwright.config.ts`:** runs `tests/e2e/` against `vite preview` of the built page, in Chromium. More browsers when the journeys of stage 17 need them.
- **Prettier:** 4 spaces, single quotes, 120 columns, as the stack says. It skips `docs/` (the tables and `review.html` are laid out by hand), `tools/*.js`, `dist/` and `package-lock.json`.

## Which tool keeps which rule

| Rule | Tool | Why this tool |
|---|---|---|
| No `window`, `document`, `localStorage`, `setTimeout` in core and editor | TypeScript: no `DOM` in their config | The names don't exist, so nothing can be forgotten |
| No `document` or `window` in a worker, or in anything a worker imports | TypeScript: `WebWorker` without `DOM` | Same |
| Imports point inward: app → ui and adapters → editor → core | ESLint | The folder is in the import's text, and the code editor shows the error while typing |
| Which libraries a part may import | ESLint | A library is named in the import's text |
| Banned calls in core and editor | ESLint | It is about one line of code |
| The owner's TypeScript style | ESLint and Prettier | Same |
| A promise nobody waits for | ESLint, reading types | |
| Another module is entered only through its `index.ts` | dependency-cruiser | Needs to know what a path leads to |
| No circle of imports, between files or between modules | dependency-cruiser | Needs the whole graph |
| Every schema is valid | A unit test in `core/components` | Stage 2 |

## ESLint

One file, `eslint.config.ts`, with one block per part. ESLint needs `jiti` to read a TypeScript config. It starts from ESLint's recommended rules, the TypeScript rules that read types (`recommendedTypeChecked`), and the React hooks rules (which carry the React Compiler's checks).

**Why it reads types:** saving, importing and the workers are all promises. A save whose promise is dropped fails without a word, and the requirements say a failed save is never silent. The cost is a few seconds on a full run.

### Imports per part

| Part | Other parts it may import | Libraries it may import |
|---|---|---|
| core | none | `clipper2-ts`, the polygon library, named in one constant in `eslint.config.ts` and imported only by `PolygonLibrary` (see [geometry](core-model/geometry.md#the-polygon-pipeline)) |
| editor | core | none |
| adapters | core, editor | `pixi.js`, `box2d3-wasm/compat`, `idb`, `fflate` |
| ui | core, editor | `react`, `react-dom`, `@tanstack/react-virtual`, `lucide-react` (stage 6). The font comes in through `theme.css`, which ESLint doesn't read |
| app | all | all |

- **Test files** (`*.test.ts`) may also import `vitest` and the `testing/` fakes. A `testing/` helper shared by tests, such as `ui/entities-panel/EntitiesPanel/testing/panelPage.ts`, may import other modules' `testing/` fakes too, but not `vitest`, since ESLint's test rule looks at the file's name *(standing yes, 2026-11-15)*. The direction stays the same for them. *Why: a rule on the import's text can't tell a test from the code, so without this exception core couldn't have tests next to its files.*
- **`box2d3-wasm` without `/compat` is refused everywhere**, with the stack's reason in the message: the default import may pick a different build per computer, which breaks determinism.
- **`node:` imports** are refused in every part. Only `tests/` and the config files run in Node.
- Each refusal's message says the rule in plain words ("core imports only core"), so the fix is clear without opening the config.

### Banned calls

| Where | Refused | Instead |
|---|---|---|
| core | All 22 `Math` functions the JavaScript standard lets a browser approximate (`sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh`, `exp`, `expm1`, `log`, `log1p`, `log2`, `log10`, `cbrt`, `pow`, `hypot`), and `Math.random` | `DeterministicMath`, and the seeded random of v2 |
| core | The `**` operator, which is `Math.pow` written another way | Multiplying, or `DeterministicMath` |
| core | `Date` and `Intl` whole, and the methods that follow the computer's language (`localeCompare`, `toLocaleString` and their family) | The clock time comes in with the run's start |
| core | `for ... in`, whose order over numeric and text keys differs from the order they were added | `for ... of` over a known order |
| editor | `Date`, `Math.random` | The `Clock` contract. The type check catches `setTimeout` in editor, but `Date.now()` compiles without the browser's types |

- **Allowed in core:** `abs`, `sign`, `min`, `max`, `floor`, `ceil`, `round`, `trunc`, `sqrt`, `fround`, `f16round`, `imul`, `clz32` and the constants. These are exact by the standard. `f16round` is new in Node 26 and was found by the `Math` list guard in stage 0; like `fround` it rounds exactly. core's `lib` (`ES2023`) doesn't declare it yet anyway.
- The two lists live in `eslint.config.ts` as `BANNED_MATH_IN_CORE` and `ALLOWED_MATH_IN_CORE`, which the `Math` list guard imports.
- **The editor may use `Math.sin` and the rest:** what it works out is stored in the level, and stored values are the same everywhere.

### Style

The owner's TypeScript style, where ESLint has a built-in rule: no `export default` (except the config files, whose tools require one), `type` instead of `interface`, no `any`, no ternary inside a ternary, nesting at most three deep, braces except on a one-line early exit, `import type` for types. Rules with no built-in check (names, one thing per line, comments) stay with the reader.

## dependency-cruiser

One file, `.dependency-cruiser.json`, with three rules:

| Rule | Refuses |
|---|---|
| Modules through `index.ts` | An import from one module into a file of another module that isn't its `index.ts`. Within a part and across parts |
| No circles between files | `A.ts` → `B.ts` → `A.ts`, however long the chain |
| No circles between modules | `core/level` → `core/components` → `core/level`, even when no single file is in a circle |

- **Why a second tool:** ESLint reads one import's text, so it can't know what a path leads to or follow a chain. `eslint-plugin-import-x` finds circles between files only, and a trial showed a circle between two modules with no circle between single files (module A's file imports B's `index.ts`, another of B's files imports A). That case is the likely one here: entities and components will want to know each other.
- **How the circle between modules is found:** a rule with `"scope": "folder"`. Folder dependencies roll up from subfolders, so `core/components/BodyComponent/` reaching another module counts as `core/components` reaching it, and a module and its own subfolders are never reported as a circle. Two subfolders of one module that import each other are reported, so files that need each other, tests included, share a folder. `--collapse` was tried first and doesn't work: it only changes the report, the rules still run on files (stage 0).
- **The config is `.json`** and works. dependency-cruiser refuses a regular expression it thinks may be slow (such as `(.+/)?`), so the patterns stay simple.
- **Imports of types count too.** Two modules that only know each other's types are still tied together. The answer is the one in [parts-and-folders.md](parts-and-folders.md#modules-and-their-public-entry): move the shared piece to a third module, or let one side declare a contract.

## Guard tests

In `tests/guards/`, run by `npm test`. Each hands a check a small sample that breaks one rule and expects the refusal, and a correct sample and expects silence. *Why: a check tried once by hand is true on that day only. A later edit to a config can switch a rule off, and a check that checks nothing still passes. Determinism and the import direction, which the whole architecture leans on, are both kept by configs.*

| Guard test | Samples | Expects |
|---|---|---|
| Import direction | core importing editor; editor importing adapters; ui importing adapters; adapters importing ui | ESLint refuses each. editor importing core passes |
| Libraries | core importing `react`; editor importing `pixi.js`; ui importing `pixi.js`; anything importing `box2d3-wasm` | ESLint refuses each. A core test importing `vitest` passes |
| Banned calls | `Math.sin`, `x ** 2`, `new Date()`, `Date.now()`, `for ... in` in core; `Date.now()` in editor | ESLint refuses each. `Math.sqrt` in core and `Math.sin` in editor pass |
| The `Math` list | Every member `Math` has in this Node | Each is either allowed or banned, none unknown, so a `Math` function added to JavaScript later can't slip in |
| No browser in the rules | A file using `window` and `setTimeout`, compiled with core's config, and again with editor's | The type check fails on both names |
| No page in a worker | A file using `document`, compiled with the workers' config | The type check fails |
| Module entries and circles | A tiny tree of two modules with one deep import and one circle | dependency-cruiser reports both, and nothing on the fixed tree |

The ESLint guards hand ESLint the sample's text with a path such as `src/core/sample.ts`, so no broken file ever sits in `src/`. They switch off the rules that read types (`disableTypeChecked`), because the type-aware project service only finds files that exist on disk. The rules they test read one import or one line and need no types.

Each guard was seen to fail with its check switched off (stage 0).

## The first real tests

One per test runner, so each pipeline is proven before stage 1 needs it:

| Runner | Test | Checks |
|---|---|---|
| Vitest in Node | The guard tests above | |
| Vitest in three browsers | `tests/guards/browser-features.browser.test.ts` | Each browser has what v1 uses: IndexedDB, Web Locks, workers, WebAssembly |
| Playwright | `tests/e2e/empty-page.spec.ts` | The built page opens, shows the project's name, and logs no error |

## CI

One workflow, `.github/workflows/ci.yml`:

| Job | Runs on | Does | When |
|---|---|---|---|
| check | `ubuntu-24.04` and `ubuntu-24.04-arm` | `npm ci`, `npm run check` | Every push |
| browser | `ubuntu-24.04` | Installs the three browsers, `npm run test:browser`, `npm run test:performance`, `npm run build` | Every push |
| journeys | `ubuntu-24.04` | `npm run test:e2e` | Pushes to master |

- Node comes from `.node-version`. The actions are `actions/checkout@v7` and `actions/setup-node@v7`, with npm's cache.
- `npx playwright install --with-deps` installs the browsers' system packages on the runner. On the laptop WebKit needed three (`libevent-2.1-7t64`, `libavif16`, `libmanette-0.2-0`), installed once with apt.
- `tools/check-sources.js` doesn't run in CI: it reads `~/projects/ecs-game-v2`, which only the laptop has.
- The determinism test joins the check job in stage 13. Running the job on ARM from stage 0 means the ARM runner is known to work long before that test depends on it.

## Not tried yet

Stage 0 built and ran every setup above on 2026-11-14, except **CI**, which needs a push. The browser tests run in all three browsers, and the dependency-cruiser details are settled above.

`npm audit` reports a moderate advisory in a `minimatch` that `typescript-eslint` 8.72.2 brings in. It only runs inside ESLint on our own files, and the suggested fix is an older `typescript-eslint`, so nothing was changed.
