# Testing

## TL;DR

**Three kinds of tests.** Fast unit tests in Node cover every rule in core and editor with fakes for every contract; they sit next to the file they test (owner, 2026-11-13). Browser tests (Vitest's browser mode, in Chromium, Firefox and WebKit) cover what only a browser can show: drawing, IndexedDB, Web Locks, the clipboard, workers, keys. Whole-game tests in `tests/` cover the determinism test, the speed targets and a few full journeys with Playwright. **The determinism test** runs test levels for 600 ticks with the real Box2D build and compares a hash of the state at every tick with hashes recorded in the repo, on x86 and ARM, in Node and in the three browsers.

## What gets which test

| Code | Test | Runs in |
|---|---|---|
| core: model, field types, schemas, geometry, deterministic maths, level data, simulation phases | Unit tests, `*.test.ts` beside the file | Node |
| editor: history, selection, tools, commands, Inspector and Entities panel models, clipboard codec, shortcuts, autosave, pacer, watchdog | Unit tests with fakes (`FakeClock`, `FakeTimer`, `InMemoryLevelStore`, `DirectGameRunner`) | Node |
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
- **Test levels** (`tests/levels/determinism/`): a pyramid of crates, a car with merged shapes and hinged wheels, a rope bridge, springs, a self-crossing polygon falling on a line, bodies leaving through an open edge, a camera following a body. v2 adds levels with triggers, scripts, random numbers and inputs.
- **Recorded hashes** live in the repo, one file per level. They are written only by `npm run determinism:record`, on purpose, never by a failing test. Recording again because the Box2D build changed also means raising the physics version.
- **Where it runs:**

| Check | Proves |
|---|---|
| Node on x86-64 and on ARM64 (CI: `ubuntu-24.04` and `ubuntu-24.04-arm`) | Different processors give the same run |
| Chromium, Firefox and WebKit, through Vitest's browser mode | Different JavaScript engines give the same run |
| The game worker against `runHeadless` in one browser | The worker path adds nothing |
| The same level twice in one process, and after a Stop and Play | No state leaks between runs |

- **When it fails**, the test names the first tick that differs and the first body whose numbers differ, which usually points at the cause.
- The tech notes' phone check (x86 against ARM in a phone browser) is a page in `tests/determinism/page/` that runs the same levels and shows the hashes; it is run by hand before a release.

## Browser tests

- **Rendering:** a test level draws without errors; culling hides off-screen nodes; drawing stays sharp when `devicePixelRatio` changes; a style change rebuilds only that entity's drawing.
- **Storage:** a save and a load round trip in IndexedDB; a failed write (quota) becomes `SaveState` `failed`; a second tab gets no lock.
- **Workers:** a Play, ten ticks and a Stop through the real `WorkerGameRunner`; a worker that never answers is ended by the watchdog.
- **Keys and clipboard:** reserved keys are left to the browser; AltGr never fires a Ctrl+Alt shortcut; copy and paste events carry the tagged text.

The tech notes ask for keyboard layout tests (US, Brazilian ABNT2, and one AltGr-heavy layout). Browsers can't switch layout in a test, so `KeyChord` is unit-tested with recorded key data from each layout, and the layouts are checked by hand once per release.

## Whole-app journeys (`tests/e2e/`, Playwright)

1. Open the editor, draw a rectangle, add a Dynamic body and a SurfaceComponent, press Play, see it fall, press Stop: the level is exactly as before.
2. Build a car with a group, a body and two hinged wheels, export it, start a new level, import it: everything is back.
3. Reload the page: the level is still there.
4. Open a second tab: it says the level is open elsewhere and is read-only.

## Guard tests (`tests/guards/`)

Each check that keeps an architecture rule (the type check, ESLint, dependency-cruiser) is handed a small file that breaks its rule and must refuse it. They run with the unit tests. The list is in [tooling.md](tooling.md#guard-tests) (owner, 2026-11-14).

## Speed tests

Described in [performance.md](performance.md#targets-and-their-tests). They run on demand and before a stage closes, not on every commit, with `npm run test:performance`, and in CI only to catch a large slowdown.

## In CI

On every push: `npm run check` on x86 and ARM (type checks with each part's own `tsconfig`, ESLint, Prettier's check, dependency-cruiser, unit and guard tests, `node tools/check-docs.js`), and from stage 13 the determinism test in Node on both; browser tests in three browsers, the determinism test among them from stage 13. The journeys run on master. The jobs are in [tooling.md](tooling.md#ci).
