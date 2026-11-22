# Testing

## TL;DR

**Three kinds of tests.** Fast unit tests in Node cover every rule in core and editor with fakes for every contract; they sit next to the file they test (owner, 2026-11-13). Browser tests (Vitest's browser mode, in Chromium, Firefox and WebKit) cover what only a browser can show: drawing, IndexedDB, Web Locks, the clipboard, workers, keys. Whole-game tests in `tests/` cover the determinism test, the speed targets and a few full journeys with Playwright. **The determinism test** runs test levels for 600 ticks with the real Box2D build and compares a hash of the state at every tick with hashes recorded in the repo, on x86 and ARM, in Node and in the three browsers.

## What gets which test

| Code | Test | Runs in |
|---|---|---|
| core: model, field types, schemas, geometry, deterministic maths, level data, simulation phases | Unit tests, `*.test.ts` beside the file | Node |
| editor: history, selection, tools, commands, Entity inspector and Entities viewer models, clipboard codec, shortcuts, autosave, pacer, watchdog | Unit tests with fakes (`FakeClock`, `FakeTimer`, `InMemoryLevelStore`, `DirectGameRunner`) | Node |
| adapters/box2d | Unit tests with the real `box2d3-wasm/compat` | Node |
| adapters/pixi, storage, browser, worker | `*.browser.test.ts` beside the file | Vitest browser mode: Chromium, Firefox, WebKit |
| ui components | Covered by the models' unit tests and the journeys below. A component holds no rules worth testing alone | |
| The whole game | `tests/determinism/`, `tests/performance/`, `tests/e2e/` | Node and the browsers |

**Why tools and commands are unit tests:** tools take `LevelPointerInput` in level positions and commands take ids, so a test can say "press at (100, 100), move to (150, 100), release" and check the level, the history and the selection, with no canvas.

## Tests every module has

- **Round trips:** every component and field type survives `write` then `read` unchanged, and a whole test level survives save, load, export, import, copy and paste.
- **Schemas:** each key is the camelCase of its label, attributes are unique per component, defaults are in range, and every field type's `parse` refuses wrong data (a test feeds it strings, `NaN`, `Infinity`, huge numbers, wrong shapes).
- **Undo:** every command is run, undone and redone, and the level's data must match exactly before and after each.
- **Limits:** every limit has a test just under and just over it.
- **Shortcuts:** the map uses none of the keys the requirements reserve for the browser.

## The determinism test

**What the requirement asks:** the same level, seed, inputs and clock time give the same run on any computer.

```typescript
// tests/determinism/determinism.test.ts (shape of it)
for (const testLevel of determinismLevels) {
    test(testLevel.name, async () => {
        const hashes = await runHeadless(testLevel.file, { ticks: 600, seed: 1, clockTimeMs: 0, inputs: testLevel.inputs });
        const recorded = await readRecordedHashes(testLevel.name);

        expect(firstDifferentTick(hashes, recorded)).toBeUndefined();
    });
}
```

- **`runHeadless`** builds a `Simulation` exactly as the game worker does (`LevelReader`, `PhysicsSceneBuilder`, `Box2dPhysicsWorld`, the v1 phases), with no page and no worker, and records `stateHash()` after every tick.
- **Test levels** (`tests/levels/determinism/`): a pyramid of crates, a car with merged shapes and hinged wheels, a rope bridge, springs, a self-crossing polygon falling on a line, bodies leaving through an open edge, a camera following a body. v2 adds levels with triggers, scripts, random numbers and inputs. *As built:* v3 adds `trigger-coins`, `trigger-timers` and `trigger-touch-groups`, run with the recorded inputs in `tests/levels/determinism/inputs/`; the World's variables are part of `stateHash` (see [v3's architecture](../versions/v3/architecture.md#determinism)).
- **Recorded hashes** live in the repo, one file per level. They are written only by `npm run determinism:record`, on purpose, never by a failing test. Recording again because the Box2D build changed also means raising the physics version.
- **Where it runs:**

| Check | Proves |
|---|---|
| Node on x86-64 and on ARM64 (CI: `ubuntu-24.04` and `ubuntu-24.04-arm`) | Different processors give the same run |
| Chromium, Firefox and WebKit, through Vitest's browser mode | Different JavaScript engines give the same run |
| The game worker against `runHeadless` in one browser | The worker path adds nothing |
| The same level twice in one process, and after a Stop and Play | No state leaks between runs |

- **When it fails**, the test names the first tick that differs and the first body whose numbers differ, which usually points at the cause.
- The tech notes' phone check (x86 against ARM in a phone browser) is a page in `tests/determinism/page/` that runs the same levels and shows the hashes. **A Playwright test runs it** at phone sizes and in Chromium on CI's ARM runner, since no check is done by hand (owner, 2026-11-14; standing yes, 2026-11-17, see [performance.md](performance.md#stage-17s-choices)). *As built (stage 17 step 7, standing yes, 2026-11-17):* the page has its own Vite config, `tests/determinism/page/vite.config.ts`, built into `dist-determinism-page/` so it never empties the game's `dist/` while Playwright builds both at once, and served on port 4174; it and `determinism.browser.test.ts` share the bundled levels and hashes in `tests/determinism/bundled/`. The Playwright projects `phone-chromium` (Pixel 7) and `phone-webkit` (iPhone 15) run only `tests/e2e/phone/`, and the desktop projects skip it; CI's `phone-arm` job runs `phone-chromium` on `ubuntu-24.04-arm` on every push. Each row of the page shows a level's ticks, its last hash and whether it matches.

## Browser tests

- **Rendering:** a test level draws without errors; culling hides off-screen nodes; drawing stays sharp when `devicePixelRatio` changes; a style change rebuilds only that entity's drawing.
- **Storage:** a save and a load round trip in IndexedDB; a failed write (quota) becomes `SaveState` `failed`; a second tab gets no lock.
- **Workers:** a Play, ten ticks and a Stop through the real `WorkerGameRunner`; a worker that never answers is ended by the watchdog.
- **Keys and clipboard:** reserved keys are left to the browser; AltGr never fires a Ctrl+Alt shortcut; copy and paste events carry the tagged text.
- **Gradients (v2):** `GradientDrawing.browser.test.ts` reads the pixels of a linear and a radial gradient on a rectangle, a turned one, a see-through stop over the background and a closed path; `GradientTextures` shares equal gradients and lets go of unused ones; the Points list turns virtual above 100 rows (`EntityInspector.pathPoints.browser.test.ts`).

The tech notes ask for keyboard layout tests (US, Brazilian ABNT2, and one AltGr-heavy layout). Browsers can't switch layout in a test, so `KeyChord` is unit-tested with recorded key data from each layout, and the layouts are checked by hand once per release.

## Whole-app journeys (`tests/e2e/`, Playwright)

1. Open the editor, draw a rectangle, add a Dynamic body and a SurfaceComponent, press Play, see it fall, press Stop: the level is exactly as before.
2. Build a car with a group, a body and two hinged wheels, export it, start a new level, import it: everything is back.
3. Reload the page: the level is still there.
4. Open a second tab: it says the level is open elsewhere and is read-only.

5. (v2) The pen draws an open path by clicks and drags, closes one on its first point, and continues an open path from its first end.
6. (v2) The Pencil draws a stroke that closes near its start and one that doesn't, at each smoothness.
7. (v2) A path's handle is dragged, a point is switched sharp and smooth, and a point is added on a curve.
8. (v2) A rectangle's fill goes Solid to Linear, gets a stop, has its end handle dragged, and Ctrl+Z puts each back; a gradient survives save, reload, copy and paste.

Journey 1 is in `test-play.spec.ts`, 2 in `car-journey.spec.ts` (stage 17), 3 and 4 in `saving.spec.ts`. 5 is in `pen-tool.spec.ts`, 6 in `pencil-tool.spec.ts`, 7 in `path-points.spec.ts`, 8 in `gradient-handles.spec.ts`; they run in Chromium, Firefox and WebKit like the rest. Journey 2 checks every entity and value by exporting the imported level again and comparing its `level.json` with the first export's.

## Guard tests (`tests/guards/`)

Each check that keeps an architecture rule (the type check, ESLint, dependency-cruiser) is handed a small file that breaks its rule and must refuse it. They run with the unit tests. The list is in [tooling.md](tooling.md#guard-tests) (owner, 2026-11-14).

## Speed tests

Described in [performance.md](performance.md#targets-and-their-tests), v2's four for a 2,000-point path among them. They run on demand and before a stage closes, not on every commit, with `npm run test:performance`, and in CI only to catch a large slowdown.

## In CI

On every push, in the public copy of the code (see [tooling.md](tooling.md#ci)): `npm run check:code` on x86 and ARM (type checks with each part's own `tsconfig`, ESLint, Prettier's check, dependency-cruiser, unit and guard tests; the docs check runs only on the laptop), and from stage 13 the determinism test in Node on both; browser tests in three browsers, the determinism test among them from stage 13. The journeys run on master, and the phone checks in Chromium on ARM on every push. The jobs are in [tooling.md](tooling.md#ci).
