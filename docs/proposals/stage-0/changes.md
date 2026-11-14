# Where the plan differs from the docs

## TL;DR

Ten changes to what [stack.md](../../architecture/stack.md), [parts-and-folders.md](../../architecture/parts-and-folders.md) and [testing.md](../../architecture/testing.md) describe, each with what the docs say, what the trial showed and why the change is better. **Three fix something that doesn't work as written** (1, 2, 3), **four close gaps in the checks** (4, 5, 6, 7), **three are choices about the setup** (8, 9, 10). None changes a requirement or the shape of the architecture. At the end: one finding about `clipper2-js` that belongs to stage 3 but is now an open question, and the list of docs that change if you say yes.

## The changes in one table

| # | Change | Kind | New package |
|---|---|---|---|
| 1 | Add `jiti`, which ESLint needs to read `eslint.config.ts` | Fix | `jiti` 2.7.0 |
| 2 | Let test files next to core code import `vitest` | Fix | |
| 3 | Worker entry files move to `src/app/workers/`, and each part's TypeScript config sits inside its folder | Fix | |
| 4 | A second tool checks the import graph: module entries and circles | Gap | `dependency-cruiser` 18.7.2 |
| 5 | A fuller list of banned calls in core, and two in editor | Gap | |
| 6 | ESLint reads types, so a promise nobody waits for is an error | Gap | |
| 7 | Guard tests: every check is tested against a file that breaks its rule | Gap | |
| 8 | ESLint enforces the owner's TypeScript style where a built-in rule exists | Choice | |
| 9 | Node 26 instead of 24 | Choice (yours) | `@types/node` 26.6.6 instead of 24.19.2 |
| 10 | Install a library in the stage that first uses it | Choice | |

## 1. Add `jiti`

- **The docs say:** the ESLint config is `eslint.config.ts`.
- **The trial showed:** ESLint 10.15.0 stops with "The 'jiti' library is required for loading TypeScript configuration files". The stack doesn't list it.
- **The plan:** add `jiti` 2.7.0 as a dev package. The other way out is a JavaScript config, which goes against "TypeScript always".

## 2. Test files in core may import `vitest`

- **The docs say:** core imports no library except `clipper2-js`, by a pattern on the import's text. Tests sit next to the file they test.
- **The trial showed:** the rule as written refuses `import { test } from 'vitest'` in `src/core/things/Thing.test.ts`. It can't tell a test from the code.
- **The plan:** the library rule applies to code files. Test files (`*.test.ts`) may also import `vitest` and the `testing/` fakes, and nothing else new. The direction rule (core never imports editor) stays the same for tests.

## 3. Where the TypeScript configs and the worker files sit

- **The docs say:** one config per part. The game worker compiles with the `WebWorker` types, the page with `DOM`. The worker entry files are `src/app/game.worker.ts` and `src/app/import.worker.ts`, next to `main.tsx`.
- **The problem:** `DOM` and `WebWorker` can't be in one config (they declare the same names differently), and `main.tsx` needs one while the worker files need the other. So `src/app` needs two configs, and something has to say which file belongs to which.
- **The plan:** each part gets a `tsconfig.json` inside its own folder, and the worker entry files move to `src/app/workers/` with their own. The editor, `tsc` and ESLint all find the nearest `tsconfig.json` by themselves, so nothing needs a list of files.
- **The trial showed:** `tsc -b` checks all of them in one run. A `window` or a `setTimeout` in core fails, and a `document` in a worker file fails. Test files and the Node types being installed don't weaken this.
- **A side effect worth having:** a worker entry file pulls in everything it imports, and all of it is checked without `DOM`. So the game worker can never import code that needs the page.

## 4. A second tool for the import graph

- **The docs say:** other modules import only from a module's `index.ts`, and there are no import cycles. ESLint enforces the deep-import rule "across parts".
- **The gap:** nothing checks a deep import between two modules of the same part (`core/entities` reaching into `core/geometry/Matrix2D.ts`), and nothing checks circles at all. ESLint's import rule reads the text of one import, so it can't know what a path leads to or follow a chain of imports.
- **The plan:** add `dependency-cruiser` 18.7.2. It reads the real graph of files. It gets exactly these two rules, and ESLint keeps direction and libraries, so each rule lives in one tool.
- **The trial showed:** it caught a deep import, and it caught a circle between two modules that had no circle between single files (module A's file imports B's `index.ts`, and another of B's files imports A). That second case is the likely one here: entities and components will want to know each other.
- **Why not an ESLint plugin:** `eslint-plugin-import-x` finds circles between files only, which the trial showed is not enough. `eslint-plugin-boundaries` could check module entries (not tried), but a graph tool is needed for the circles anyway, and one tool for both rules is simpler than two.

## 5. A fuller list of banned calls

- **The docs say:** in core, ESLint refuses `Math.random`, `sin`, `cos`, `tan`, `atan2`, `exp`, `log`, `pow`, `hypot`, `Date.now`, `new Date()` and `for ... in`.
- **The gap:** the JavaScript standard lets a browser approximate 22 `Math` functions, and the list names 8 of them. The other 14 (`asin`, `acos`, `atan`, `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh`, `cbrt`, `expm1`, `log1p`, `log2`, `log10`) can differ between computers just the same. So can the `**` operator, which is `Math.pow` written another way.
- **The plan, in core:**
  - Ban all 22 and `Math.random`. Allowed: `abs`, `sign`, `min`, `max`, `floor`, `ceil`, `round`, `trunc`, `sqrt`, `fround`, `imul`, `clz32` and the constants. These are exact by the standard.
  - Ban `**`.
  - Ban `Date` and `Intl` whole, and the methods that depend on the computer's language (`localeCompare`, `toLocaleString` and their family).
  - A guard test lists every member of `Math` and fails if one is neither allowed nor banned, so a `Math` function added to JavaScript later can't slip in.
- **The plan, in editor:** ban `Date` and `Math.random`. The architecture already says the editor never reads the clock itself and takes a `Clock`. The type check catches `setTimeout` there, but `Date.now()` compiles without the browser's types, so today nothing would stop it.
- The editor may still use `Math.sin` and the rest: what it works out is stored in the level, and stored values are the same everywhere.

## 6. ESLint reads types

- **The docs say:** ESLint with the TypeScript rules.
- **The plan:** use the rule set that reads types (`recommendedTypeChecked`). Its most useful rule here: a promise nobody waits for is an error.
- **Why:** saving, importing and the workers are all promises. A save whose promise is dropped fails without a word, and the requirements say a failed save is never silent. The trial showed the rule catching exactly that.
- **The cost:** ESLint gets slower, a few seconds on a full run. Acceptable until it isn't.

## 7. Guard tests

- **The docs say:** stage 0 is done when a wrong import fails ESLint and a `window` in core fails the type check.
- **The gap:** tried once by hand, that is true on the day. A later edit to a config can switch a rule off and nothing notices, because a check that checks nothing still passes.
- **The plan:** a folder `tests/guards/`. Each guard test hands a check one small file that breaks one rule and expects the refusal. They run with the unit tests, in about a second each at most. The list is in [checks.md](checks.md#guard-tests).
- **Why it matters here:** determinism and the import direction are the two things the whole architecture leans on, and both are kept by configs.

## 8. The owner's TypeScript style in ESLint

- **The docs say:** Prettier keeps the format.
- **The plan:** add the style rules that ESLint already has built in, with no new package: no `export default`, `type` instead of `interface`, no `any`, no ternary inside a ternary, at most three levels of nesting, braces except on a one-line early exit, `import type` for types.
- **Why:** a rule the tool keeps is one nobody has to remember, in any session. Rules without a built-in check (names, one thing per line, comments) stay with the reader.

## 9. Node 26 instead of 24

- **The docs say:** Node.js 24 runs the tools, with `@types/node` 24.19.2.
- **What is true today:** your laptop has Node 26.13.0. Every package in the stack accepts both.
- **The plan:** use 26 everywhere: a `.node-version` file that CI reads too, and `@types/node` 26.6.6.
- **Why:** when CI fails, you can repeat it at home on the same Node. The other way is to install Node 24 on the laptop. **This one is yours to decide**, because it changes a version in the approved stack.

## 10. Install a library when its stage comes

- **The docs say:** nothing either way. The stack lists every v1 package.
- **The plan:** stage 0 installs the tools plus `react` and `react-dom` for the empty page. `clipper2-js` waits for stage 3, `pixi.js` for stage 4, `@tanstack/react-virtual` for stage 7, `fflate` and `idb` for stage 12, `box2d3-wasm` for stage 13. Each at the version in the stack, checked again on that day.
- **Why:** `package.json` then lists only what the code uses, and each library gets a real look when a stage starts using it. The finding below shows what such a look can turn up.
- **Checked now, so nothing is hiding:** the whole v1 stack installs together with no conflict.

## Found on the way: `clipper2-js`

Not part of stage 0, but stage 0 writes the rule that names the one library core may import.

- **[geometry.md](../../architecture/core-model/geometry.md) says:** step 3 of the polygon pipeline is "Triangulate each outline with `clipper2-js`", and the stack says it "already triangulates".
- **What the package holds:** version 1.2.4 has no triangulation at all. It was last published on 2024-01-01. It also asks for Angular 15, so installing it brings Angular into the project (its code never uses it).
- **A candidate:** `clipper2-ts` 2.0.1-19, published 2026-11-07, has triangulation and asks for nothing else. Not tried beyond reading its files. Its version number has a build suffix, which wants a closer look.
- **Also for stage 3:** both packages call `Math.sin`, `Math.cos` and others somewhere in their code. Stage 3 must check that the functions the pipeline uses never reach those calls.
- **What happens now:** it is an open question in [progress.md](../../progress.md). Stage 0 keeps the library's name in one constant, so the answer changes one line.

## Docs that change if you say yes

| Doc | Change |
|---|---|
| [stack.md](../../architecture/stack.md) | Add `jiti` and `dependency-cruiser`; Node and `@types/node` (change 9); a line saying a library is installed by its stage |
| [parts-and-folders.md](../../architecture/parts-and-folders.md) | `app/workers/` in the folder tree; `tests/guards/`; the "How the rules are enforced" table with the new checks and the fuller banned list; the test-file exception |
| [testing.md](../../architecture/testing.md) | The guard tests; `npm run check` under "In CI" |
| [adapters.md](../../architecture/adapters.md) | The worker entry files' new path |
| [plan.md](../../plan.md) | Stage 0's row: what it builds and its "done when" |
| [progress.md](../../progress.md) | Stage 0 done, next is stage 1 |
| `CLAUDE.md` | "There is no code yet" goes; `npm run check` before every commit joins the rules |
