# Stack

## TL;DR

Every package, pinned to an exact version checked on npm on 2026-11-13. **Fixed** means the owner chose it; **recommended** means the architecture chose it (all were approved in review card D11). Five things are fixed: TypeScript, Vite, React, PixiJS 8 and Box2D v3. Beside them: Vitest and Playwright for tests, ESLint and Prettier for code quality, `box2d3-wasm` for Box2D, `clipper2-ts` for polygons (tried in stage 3), `fflate` for zips, `idb` for browser storage, TanStack Virtual for the Entities panel, and the React Compiler, with `jiti` and `dependency-cruiser` for the checks in [tooling.md](tooling.md). **Node.js 26** runs the tools. **Each library is installed by the stage that first uses it**, at the version here, checked again on that day. Lua and Monaco come with v2 and aren't installed in v1. **TypeScript is 6.0, not 7**, because the ESLint TypeScript tools don't support 7 yet.

## Fixed

| Package | Version | Note |
|---|---|---|
| `typescript` | 6.0.3 | 7.0 is out, but `typescript-eslint` 8.72 requires `<6.1.0`. Move to 7 when it supports it |
| `vite` | 8.3.8 | Dev server and build |
| `react`, `react-dom` | 19.3.1 | The panels only. React never holds the level, see [ui.md](ui.md) |
| `@types/react`, `@types/react-dom` | 19.3.0 | |
| `pixi.js` | 8.23.0, installed in stage 4 | Draws the level view, see [adapters.md](adapters.md). Used without an `Application`, through `autoDetectRenderer` with WebGL first and the canvas renderer second, never WebGPU, so there is no ticker and one path is tested in all three browsers (standing yes, 2026-11-14). See [adapters.md](adapters.md#stage-4s-choices) |
| `box2d3-wasm` | 6.0.0 | Box2D v3.2 built to wasm. **Always imported as `box2d3-wasm/compat`**, see below |

### Why `box2d3-wasm/compat`

- The package's default import picks its SIMD and multi-threaded build when the page allows it, and its plain build otherwise. Two builds could give two results, which breaks [determinism](../requirements/play-and-save/test-play.md#the-determinism-test--v1).
- `compat` is the same build everywhere: the browser, the game worker and Node (where the determinism test runs). It needs no cross-origin isolation headers, so any static host works.
- It is single precision. That is enough: the level ends 100,000 px (2,000 m) from the origin at most, which the package says is fine "within a few kilometres".
- *Why not our own Emscripten build:* it adds a C toolchain to the project for no gain in v1. If the package stops being kept up, building it ourselves from the same Box2D commit is the fallback, and the physics version marks the change.

## Recommended

| Package | Version | Job | Why this one |
|---|---|---|---|
| `@vitejs/plugin-react` | 6.3.0 | React in Vite | The official plugin for Vite 8 |
| `babel-plugin-react-compiler` | 1.0.0 | The React Compiler | Panels stay fast without hand-written `useMemo` and `memo`. The stable Babel version, not the experimental Rust one |
| `@rolldown/plugin-babel` | 0.3.1 | Runs Babel inside Vite 8 | Required by the plugin for the compiler |
| `@babel/core` | 8.1.2 | Babel itself | Same reason |
| `vitest` | 5.1.0 | Unit tests | Uses the Vite config, so tests see the same code as the app |
| `@vitest/browser-playwright` | 5.1.0 | Tests that need a real browser | Runs Vitest tests in Chromium, Firefox and WebKit |
| `playwright`, `@playwright/test` | 1.65.1 | Browsers for tests, whole-app tests | One tool for both |
| `eslint` | 10.15.0 | Checks the code | The import direction and banned calls are ESLint rules, see [parts-and-folders.md](parts-and-folders.md) |
| `@eslint/js` | 10.0.1 | ESLint's base rules | |
| `typescript-eslint` | 8.72.2 | TypeScript rules for ESLint | |
| `eslint-plugin-react-hooks` | 7.1.1 | Hook rules and the React Compiler's checks | |
| `prettier` | 3.10.1 | One code format | Formatting is never a review topic. Settings: 4 spaces, single quotes, 120 columns, matching the owner's TypeScript style |
| `clipper2-ts` | 2.0.1-19, installed in stage 3 | Cuts self-crossing polygons and fills what they enclose | Integer arithmetic inside, so its results are the same on every computer. Tried first in stage 3 (owner, 2026-11-14), because `clipper2-js` 1.2.4 has no triangulation and brings Angular 15. **Only its fill is used**: its triangulation drops areas, so the game triangulates with its own `EarClipping` (standing yes, 2026-11-14). See [geometry](core-model/geometry.md) |
| `fflate` | 0.8.3 | Makes and reads the `.editable` zip | Small, fast, and can stop unpacking at a size limit |
| `idb` | 8.0.4 | A thin promise layer over IndexedDB | IndexedDB's own API is callback-based. `idb` adds no storage logic of its own |
| `@tanstack/react-virtual` | 3.14.26, installed in stage 7 | Builds only the visible Entities panel rows | Fixed row height, no styling of its own, so drag and drop stays ours. The panel builds 8 rows past each edge, and the list opts out of the React Compiler, since the virtualizer changes inside one object (standing yes, 2026-11-15). See [inspector-and-entities.md](editor/inspector-and-entities.md#stage-7s-choices) |
| `lucide-react` | 1.73.0, installed in stage 6 | The editor's outline icons | The open outline set the owner named; one React component per icon, so only the icons used are bundled (standing yes, 2026-11-15) |
| `@fontsource/jetbrains-mono` | 5.3.0, installed in stage 6 | The editor's font, hosted with the game | Vite bundles its files, so the font never comes from another site; only weights 400, 500 and 600 are imported (standing yes, 2026-11-15) |
| `@types/node` | 26.6.6 | Types for the Node tools and tests | Matches Node 26 |
| `jiti` | 2.7.0 | Lets ESLint read `eslint.config.ts` | ESLint 10 refuses a TypeScript config without it (owner, 2026-11-14) |
| `dependency-cruiser` | 18.7.2 | Checks the import graph: module entries and circles | ESLint reads one import at a time and can't see a circle between modules. See [tooling.md](tooling.md#dependency-cruiser) (owner, 2026-11-14) |

**Node.js 26** runs the tools, the version on the owner's laptop, so a CI failure can be repeated there (owner, 2026-11-14). Every package accepts it. `.node-version` holds the number, and CI reads it.

**Installed when its stage comes** (owner, 2026-11-14): stage 0 installs the tools plus `react` and `react-dom`. `clipper2-ts` waits for stage 3, `pixi.js` for stage 4, `lucide-react` and `@fontsource/jetbrains-mono` for stage 6, `@tanstack/react-virtual` for stage 7, `fflate` and `idb` for stage 12, `box2d3-wasm` for stage 13. *Why: `package.json` lists only what the code uses, and each library gets a real look when a stage starts using it.* The whole v1 stack was checked to install together with no conflict on 2026-11-14.

### Not installed until v2

| Package | Version today | Job |
|---|---|---|
| `wasmoon` | 1.16.0 | Lua 5.4 in wasm, for scripts and for reading the variables a script needs |
| `monaco-editor` | 0.57.0 | The code editor |

Their versions are checked again when v2 starts.

### Left out on purpose

| Not used | Why |
|---|---|
| A state library (Redux, Zustand, MobX) | The core classes own their state and send change signals. React reads them through `useSyncExternalStore`, see [ui.md](ui.md) |
| A CSS framework, CSS-in-JS, CSS Modules | Each React component has its own plain `.css` file scoped under its root class, as the owner's component rules say |
| A UI component library | The editor needs a few plain controls (buttons, menus, number fields), and how each one works is in the requirements |
| An ECS library | Entities and components are the game's own model with the owner's rules (one of each type, a tree, Entities panel order). A library would bring its own rules |
| `poly-decomp`, `earcut` | One polygon library. The game's own `EarClipping` triangulates, because `clipper2-ts`'s triangulation drops areas (standing yes, 2026-11-14) |
| Box2D's debug draw | The physics view draws the game's own collision pieces (owner, 2026-11-13) |
| `fake-indexeddb` and other browser imitations | Browser storage is tested in real browsers, see [testing.md](testing.md) |

## Settings that matter

**TypeScript** (`tsconfig.base.json`, and one config inside each part's folder, see [tooling.md](tooling.md#typescript)):

| Setting | Value | Why |
|---|---|---|
| `strict` | true | |
| `erasableSyntaxOnly` | true | The owner's style: no `enum`, no parameter properties |
| `verbatimModuleSyntax` | true | Forces `import type` |
| `allowImportingTsExtensions`, `noEmit` | true | Imports end in `.ts` and `.tsx`, Vite compiles |
| `noUncheckedIndexedAccess` | true | `array[i]` may be `undefined` |
| `lib` for `src/core` and `src/editor` | `["ES2023"]`, no `DOM` | **The compiler itself refuses `window`, `document` or `HTMLElement` in the rules** |
| `lib` for `src/app/workers` (the game worker and the import worker) | `["ES2023", "WebWorker"]` | No `DOM`, so nothing a worker imports can need the page |
| `lib` for `src/ui`, `src/adapters`, `src/app` (without `workers/`) | `["ES2023", "DOM", "DOM.Iterable"]` | |

**Vite:** `react()` plus `babel({ presets: [reactCompilerPreset()] })`. Workers are built with Vite's `new Worker(new URL(...), { type: 'module' })`. The `.wasm` file is served as an asset and fetched on editor open, see [simulation.md](simulation.md).

**Hosting** isn't decided yet. The `compat` build needs no special headers, so any static host works in v1. The tech notes' reason for Cloudflare (headers by path) only matters if a later version needs cross-origin isolation.
