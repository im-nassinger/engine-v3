# Performance

## TL;DR

The requirements set speed targets for a level of 10,000 entities on a mid-range laptop: selecting shows within 0.05 s, moving 1,000 selected entities stays smooth, and the Layers panel opens in under 0.2 s and scrolls smoothly at any size. A level may hold 100,000 entities. **v1 builds** what those targets clearly need: derived values cached and marked stale per subtree, culling, drawing only on change, shapes rebuilt only when they change, a virtual Layers panel, incremental editor messages, and preloading for the first Play. **v1 only leaves a place** for what may not be needed: a spatial index for clicking, saving only what changed, and sharing drawings between identical shapes. A speed test checks each target, and decides whether those places get filled.

## What v1 builds

| Optimisation | What it does | Serves |
|---|---|---|
| **Cached world matrices** | Each entity's level matrix is kept until it or a parent changes. A change marks the subtree with one walk; nothing is computed until asked | Dragging 1,000 entities, drawing, hit testing |
| **Cached bounds** | Each entity's own bounds and its subtree's, kept the same way | Hit testing, the selection box, culling, F |
| **Cached hidden and locked state** | Whether an entity or a parent is hidden or locked, kept per entity | Hit testing, drawing, the dimmed eye in the Layers panel. The play copy carries it through the level data |
| **Cached collision pieces** | A shape is split into pieces once per change of its geometry, never on a move | Drawing, physics view, play start |
| **Culling** | On every pan, zoom or move, entities whose subtree bounds are off screen get `renderable = false` on their PixiJS node, so they cost nothing to draw. Groups fully off screen skip their whole subtree | Drawing large levels |
| **Drawing on change only** | The PixiJS ticker is off; one render per animation frame only when something changed | An idle editor uses no CPU |
| **Rebuilding a drawing only when its shape or style changes** | Moving an entity only changes its node's matrix | Dragging, test play |
| **Batching** | PixiJS batches `Graphics` that share the same kind of drawing state. v1 uses no filters, masks or blend modes per entity, which would break batches. Effects (v3) are the first to need a separate pass, as the scope says | Drawing many shapes |
| **A virtual Layers panel** | Only the rows on screen exist, at a fixed 24 px height. The flat list of visible rows is rebuilt only when the tree or the folded rows change | Opening in under 0.2 s, smooth scrolling |
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
| **Saving only what changed** | `LevelStore.save` takes the whole level today. A changed-entities list is already known from level updates | A save of a 10,000-entity level takes over 50 ms on the owner's laptop (this proposal's threshold for the tech notes' "if full saves make the editor stutter") |
| **Shared drawings for identical shapes** | `EntityDrawing` builds each `Graphics` from values; equal values could share one PixiJS `GraphicsContext` | Drawing time grows with copies of one platform |
| **Off-screen bodies updated less often in drawing** | The mirror applies every pose today | Test play drops frames with many off-screen bodies. Physics itself always runs every body: skipping any would break determinism |
| **A byte limit on history** | `HistoryStep` sizes can be measured | Files in the Assets panel (v2) make steps large |
| **Text redrawn at its real size** | `EntityDrawing` per kind of drawing | Text comes in v2 |

## Targets and their tests

| Target (from the requirements) | Test in `tests/performance/` | Level |
|---|---|---|
| Selecting shows within 0.05 s | Click on an entity, measure until the next frame with the outline | 10,000 entities |
| Moving 1,000 selected entities stays smooth | Drag them for 2 s, measure frame times: 95% under 16.7 ms | 10,000 entities |
| The Layers panel opens in under 0.2 s | Time from mount to the first painted rows | 10,000 entities |
| The Layers panel scrolls smoothly at any size | Scroll from top to bottom, frame times as above | 10,000 and 100,000 entities |
| A level holds 100,000 entities | Load, save, export and import it; measure each, no target given | 100,000 entities |

- **"Mid-range laptop" isn't measured in CI**, so the tests run on the owner's laptop before a stage closes, and their numbers are written into the stage's notes. CI runs them only to catch a large slowdown.
- The test levels are generated by a script in `tests/levels/` (grids of platforms, stacks of crates, nested groups), so they can be rebuilt at any size.
