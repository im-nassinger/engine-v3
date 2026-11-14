# Stage 0: the files

## TL;DR

Every file stage 0 creates and what goes in it: the packages and scripts, the TypeScript configs (one shared base, one inside each part), the folders with their `index.ts`, the empty page, Vite with the tests, Prettier, and the small files around them. The checks themselves (ESLint, dependency-cruiser, the guard tests, CI) are in [checks.md](checks.md). Numbers in brackets point at the changes in [changes.md](changes.md).

## New files at a glance

```
.github/workflows/ci.yml      CI, see checks.md
.node-version                 the Node version, read by CI too [9]
.npmrc                        exact versions, refuse a wrong Node
.gitignore                    adds dist/, test results, build caches
.prettierrc.json  .prettierignore
.dependency-cruiser.json      see checks.md [4]
eslint.config.ts              see checks.md
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
    workers/ tsconfig.json, game.worker.ts, import.worker.ts [3]
tests/
  tsconfig.json
  guards/    the guard tests and their sample files [7]
  e2e/       one whole-app test
```

`tools/check-docs.js` and `tools/check-sources.js` stay as they are, in JavaScript. ESLint and Prettier skip them.

## Packages

Installed by stage 0, all as exact versions:

| Package | Version | From |
|---|---|---|
| `react`, `react-dom` | 19.3.1 | stack |
| `@types/react`, `@types/react-dom` | 19.3.0 | stack |
| `typescript` | 6.0.3 | stack |
| `vite` | 8.3.8 | stack |
| `@vitejs/plugin-react` | 6.3.0 | stack |
| `babel-plugin-react-compiler` | 1.0.0 | stack |
| `@rolldown/plugin-babel` | 0.3.1 | stack |
| `@babel/core` | 8.1.2 | stack |
| `vitest`, `@vitest/browser-playwright` | 5.1.0 | stack |
| `playwright`, `@playwright/test` | 1.65.1 | stack |
| `eslint` | 10.15.0 | stack |
| `@eslint/js` | 10.0.1 | stack |
| `typescript-eslint` | 8.72.2 | stack |
| `eslint-plugin-react-hooks` | 7.1.1 | stack |
| `prettier` | 3.10.1 | stack |
| `@types/node` | 26.6.6, or 24.19.2 if Node stays 24 | [9] |
| `jiti` | 2.7.0 | new [1] |
| `dependency-cruiser` | 18.7.2 | new [4] |

Left for their stage [10]: `clipper2-js` (3, see the open question), `pixi.js` (4), `@tanstack/react-virtual` (7), `fflate` and `idb` (12), `box2d3-wasm` (13).

**The package manager is npm**, which is what the laptop has. `package-lock.json` is committed and CI installs from it with `npm ci`. `.npmrc` sets `save-exact=true`, so a later install can't write a version range, and `engine-strict=true`, so a wrong Node version stops the install instead of failing later in a strange way.

## Scripts

| Script | Runs | When |
|---|---|---|
| `npm run dev` | The Vite dev server | Working on the page |
| `npm run build` | `tsc -b`, then the Vite build | |
| `npm run typecheck` | `tsc -b`: every part with its own config | |
| `npm run lint` | ESLint on everything | |
| `npm run format` | Prettier, writing | |
| `npm run format:check` | Prettier, only checking | |
| `npm run deps` | dependency-cruiser | |
| `npm test` | Vitest in Node: the unit tests and the guard tests | |
| `npm run test:browser` | Vitest in Chromium, Firefox and WebKit | Before a stage closes, and in CI |
| `npm run test:e2e` | Playwright against the built page | Before a stage closes, and in CI on master |
| `npm run docs:check` | `node tools/check-docs.js` | |
| **`npm run check`** | `typecheck`, `lint`, `format:check`, `deps`, `test`, `docs:check`, in that order | **Before every commit** |

`npm run check` holds everything fast enough to run every time. It is the one command a session needs to know, and CI runs the same one. There is no git hook: the rule goes into `CLAUDE.md` instead.

## TypeScript

**`tsconfig.base.json`**, shared by all. The stack's settings plus what a bundler setup needs:

| Setting | Value | From |
|---|---|---|
| `strict`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, `noEmit`, `noUncheckedIndexedAccess` | true | stack |
| `target` | `ES2023` | Matches the stack's `lib` |
| `module`, `moduleResolution` | `ESNext`, `bundler` | Vite compiles |
| `moduleDetection` | `force` | An `index.ts` that exports nothing yet is still a module |
| `jsx` | `react-jsx` | |
| `skipLibCheck` | true | Don't type-check the packages' own files |

**One config per part**, inside its folder, each only naming its `lib` [3]:

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

**`tsconfig.json`** at the root holds no files, only the list of the configs above. `tsc -b` checks them all in one run and remembers what it checked, so a second run is quick.

Two things the trial settled:

- **A part's config doesn't stop a wrong-direction import.** core importing an editor file compiles without a word, because TypeScript just follows the import. Making the compiler refuse it is possible, but it would have to write type files for every part, which is machinery for something ESLint already catches. So direction stays with ESLint, as the docs say.
- **Tests don't let timers in.** With test files in core's config and the Node types installed, `setTimeout` in core still fails the type check.

## The folders

Every folder directly under a part in the [folder tree](../../architecture/parts-and-folders.md#the-folder-tree) is created, with an `index.ts` holding `export {};`. That is 47 files: 10 in core, 17 in editor, 6 in adapters, 14 in ui. The folders inside them (one per component, one per React component, `testing/`, `rules/`) come with the stage that writes their first file.

The three composition roots:

| File | In stage 0 |
|---|---|
| `src/app/main.tsx` | Finds `#root`, renders the project's name inside React's `StrictMode`. `EditorShell` replaces it in stage 6 |
| `src/app/workers/game.worker.ts` | `export {};` until stage 16 |
| `src/app/workers/import.worker.ts` | `export {};` until stage 12 |

`EditorComposition.ts` comes with stage 5, when there is something to compose.

## The page and Vite

- **`index.html`:** a `#root` element and one script tag for `src/app/main.tsx`. No styles yet: `theme.css` comes with the editor shell in stage 6.
- **`vite.config.ts`:** `react()` plus `babel({ presets: [reactCompilerPreset()] })`, exactly as the stack says. The trial built a React page with it.
- **The tests are configured in the same file**, as two Vitest projects, so tests see the same code as the app:

| Project | Files | Runs in |
|---|---|---|
| `node` | `src/**/*.test.ts` and `tests/guards/**/*.test.ts`, without the browser ones | Node |
| `browser` | `**/*.browser.test.ts` | Chromium, Firefox and WebKit, headless |

- **`playwright.config.ts`:** runs `tests/e2e/` against `vite preview` of the built page, in Chromium. More browsers when the journeys of stage 17 need them.

## Prettier and the small files

- **`.prettierrc.json`:** 4 spaces, single quotes, 120 columns, as the stack says.
- **`.prettierignore`:** `docs/` (the tables and `review.html` are laid out by hand), `tools/*.js`, `dist/`, `package-lock.json`.
- **`.gitignore`** adds `dist/`, `test-results/`, `playwright-report/` and Vitest's failure screenshots.
- **`.node-version`:** one line with the Node version. CI reads it, so the number lives in one place.
