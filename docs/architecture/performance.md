# Performance

## TL;DR

The requirements set speed targets for a level of 10,000 entities on a mid-range laptop: selecting shows within 0.05 s, moving 1,000 selected entities stays smooth, and the Entities panel opens in under 0.2 s and scrolls smoothly at any size. A level may hold 100,000 entities. **v1 builds** what those targets clearly need: derived values cached and marked stale per subtree, culling, drawing only on change, shapes rebuilt only when they change, a virtual Entities panel, incremental editor messages, and preloading for the first Play. **v1 only leaves a place** for what may not be needed: a spatial index for clicking, saving only what changed, and sharing drawings between identical shapes. A speed test checks each target, and decides whether those places get filled.

## What v1 builds

| Optimisation | What it does | Serves |
|---|---|---|
| **Cached world matrices** | Each entity's level matrix is kept until it or a parent changes. A change marks the subtree with one walk; nothing is computed until asked | Dragging 1,000 entities, drawing, hit testing |
| **Cached bounds** | Each entity's own bounds and its subtree's, kept the same way | Hit testing, the selection box, culling, F |
| **Cached hidden and locked state** | Whether an entity or a parent is hidden or locked, kept per entity | Hit testing, drawing, the dimmed eye in the Entities panel. The play copy carries it through the level data |
| **Cached collision pieces** | A shape is split into pieces once per change of its geometry, never on a move | Drawing, physics view, play start |
| **Culling** | On every render (so after every pan, zoom or move), entities whose subtree bounds are off screen get `renderable = false` on their PixiJS node, so they cost nothing to draw. Groups fully off screen skip their whole subtree. While the visible area stays, only changed entities and their parents are culled again. Built in stage 4, see [adapters.md](adapters.md#stage-4s-choices), and made incremental in stage 9 | Drawing large levels |
| **Drawing on change only** | The PixiJS ticker is off; one render per animation frame only when something changed | An idle editor uses no CPU |
| **Rebuilding a drawing only when its shape or style changes** | Moving an entity only changes its node's matrix | Dragging, test play |
| **Batching** | PixiJS batches `Graphics` that share the same kind of drawing state. The World's children are split into render chunks, so a move uploads only its own render chunk's shapes. v1 uses no filters, masks or blend modes per entity, which would break batches. Effects (v3) are the first to need a separate pass, as the scope says | Drawing many shapes |
| **A virtual Entities panel** | Only the rows on screen exist, at a fixed 28 px height, the `--row` token. The flat list of visible rows is rebuilt only when the tree or the folded rows change | Opening in under 0.2 s, smooth scrolling |
| **Per-entity versions for React** | A change wakes only that entity's row and card | Dragging, editing values |
| **Incremental editor messages** | Rules re-run only for entities that changed, once per frame | Editing big levels |
| **Many selected entities** | Above 500 selected, outlines are replaced by the shared box and a count, as the requirement says | Selecting thousands |
| **Only moved bodies in tick reports** | The worker sends the poses of bodies Box2D reports as moved, in one transferred buffer | Test play with many bodies |
| **Interpolated drawing** | The page draws between the last two ticks, so a 144 Hz screen stays smooth without more ticks | Test play |
| **Preloading** | Box2D's wasm and a spare game worker are ready when the editor opens | "Play starts as fast as possible" |
| **One render per frame for the status bar's mouse position** | Throttled to the frame | Moving the mouse |

## What only gets a place

| Optimisation | The place left for it | Built when |
|---|---|---|
| **A spatial index for clicking and the selection box** | The `SpatialIndex` contract. v1's `LinearSpatialIndex` checks every entity's cached bounds, well under a millisecond at 10,000 | The selection speed test fails, or v3's hover outlines and snapping to entities need more queries per frame |
| **Saving only what changed** | `LevelStore.save` takes the whole level today. A changed-entities list is already known from level updates | A save of a 10,000-entity level takes over 50 ms on the owner's laptop (the architecture's threshold for the tech notes' "if full saves make the editor stutter") |
| **Shared drawings for identical shapes** | `EntityDrawing` builds each `Graphics` from values; equal values could share one PixiJS `GraphicsContext` | Drawing time grows with copies of one platform |
| **Off-screen bodies updated less often in drawing** | The mirror applies every pose today | Test play drops frames with many off-screen bodies. Physics itself always runs every body: skipping any would break determinism |
| **A byte limit on history** | `HistoryStep` sizes can be measured | Files in the Assets panel (v2) make steps large |
| **Text redrawn at its real size** | `EntityDrawing` per kind of drawing | Text comes in v2 |

## Targets and their tests

| Target (from the requirements) | Test in `tests/performance/` | Level |
|---|---|---|
| Selecting shows within 0.05 s | Click on an entity, measure until the next frame with the outline | 10,000 entities |
| Moving 1,000 selected entities stays smooth | Drag them for 2 s, measure frame times: 95% under 16.7 ms | 10,000 entities |
| The Entities panel opens in under 0.2 s | Time from mount to the first painted rows | 10,000 entities |
| The Entities panel scrolls smoothly at any size | Scroll from top to bottom, frame times as above | 10,000 and 100,000 entities |
| A level holds 100,000 entities | Load, save, export and import it; measure each, no target given | 100,000 entities |

- **Measured so far:** the Entities panel paints its first rows 21 to 42 ms after mounting at 10,000 entities (stage 7, 2026-11-15, the owner's laptop, Chromium, Firefox and WebKit). Its test is a browser test, `EntitiesPanel.reveal.browser.test.ts`, which builds the level in the test, because the page can't load a level before Import in stage 12.
- **Measured in stage 9** (2026-11-16, the owner's laptop, an AMD Ryzen with Radeon graphics, Chromium with the GPU, three runs): a click shows the selection within **15 to 16 ms** at 10,000 entities, so `LinearSpatialIndex` stays. Dragging 1,000 of them keeps 95% of frames within **22 to 23 ms, missing the 16.7 ms target.** In each such frame the Select tool's move takes about 4 ms, culling (`LevelDisplay.prepare` and `cull`, which walk every entity) about 4 ms, the overlays 2 ms, and PixiJS's render about 11 ms, most of it re-packing the moved shapes and uploading the level's whole vertex buffer. Making the level view's layer its own render group, so the overlays drawn again no longer rebuild the level's draw instructions, already took the render from 27 ms to 11 ms. Stage 9's step 16 makes the drag meet its target, below.
- **Step 16 met the drag target** (standing yes, 2026-11-16, the owner's laptop as above, three runs): **95% of drag frames within 14.0 to 14.8 ms**, and selecting within 12.7 to 13.2 ms. Two changes, from the frame's parts: PixiJS uploaded the level's whole vertex buffer, 18 MB at 10,000 entities with round outline joins, for every frame with a moved shape, so **the World's children are split into render chunks** (`ChunkedChildren` in `adapters/pixi`, at most 128 children each), and only the render chunks holding moved entities upload; the render went from 8 ms to under 4 ms. And **culling visits only what changed while the visible area stays the same**: the entities whose components changed, their subtrees and their parents, a parent that comes back on screen being culled whole; any change to the tree, a hidden switch or the visible area culls everything, as before. Culling went from 4 ms to under 2 ms. The Select tool's move, about 3 ms, was left as it is. *A level that puts everything inside one group gets a single render chunk; the render chunks would then have to go a level down.*
- **How the speed tests measure:** `tests/performance/` runs as its own Vitest project, `npm run test:performance`: Chromium alone, one test at a time, with the GPU switched on where there is one. A test drives the Select tool through `ToolController` on the editor's real level view, built on `ManualFrames`, and times the input with the frame it causes. *Why: a headless browser's own animation frames come at a fixed rate whatever the work, and three browsers at once compete for the processor.* After each timed frame the test waits, untimed, for the GPU to draw it (`waitForDrawing` reads a pixel back). *Why: Chromium draws in another process, so frames run back to back pile up there; without a GPU, CI's queue from a 2 s drag took over 30 s to clear and held up the next step (2026-11-16).* The level comes from `buildTestLevel` in `tests/levels/generator/`: blocks of ten entities (a platform, a stack of four crates, and a cart holding a box of two crates and one more), 40 to a row, inside a new level's World rectangle.
- **"Mid-range laptop" isn't measured in CI**, so the tests run on the owner's laptop before a stage closes, and their numbers are written into the stage's notes. CI runs them only to catch a large slowdown: a test there fails at 5 times its target, since CI's browsers draw without a GPU.
- The test levels are generated by `buildTestLevel` in `tests/levels/generator/` (grids of platforms, stacks of crates, nested groups), so they can be rebuilt at any size.
