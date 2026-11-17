# Stage 4 in steps: Drawing a level

## TL;DR

Written under the standing yes (2026-11-14), and all nine built by 2026-11-15. Each step ends with its tests, `npm run check` and a commit. The choices behind them are in [adapters.md](../architecture/adapters.md#stage-4s-choices).

| # | Step | Module | Ends with |
|---|---|---|---|
| 1 | These steps, and the choices in [adapters.md](../architecture/adapters.md#stage-4s-choices) | `docs/` | `node tools/check-docs.js` passes |
| 2 | `ViewState`: zoom 1% to 1000% about a point, pan, level and screen positions both ways, fitting a rectangle (F, the whole level, the camera frame), the pan limit and "the view holds nothing"; `ViewSettings`: the four View menu switches. Each with a `VersionCounter` | `editor/view` | Zooming keeps the point under the mouse still; zoom is clamped; fitting puts the rectangle in the middle with a margin; panning stops at the limit |
| 3 | `pixi.js` installed; `PixiLevelView`: the canvas on `mount`, its size from a `ResizeObserver`, its resolution from `devicePixelRatio`, the ticker off, one render on the next animation frame when something is dirty, the view's matrix from `ViewState`; `AnimationFrames` for the frame | `adapters/pixi`, `adapters/browser` | Browser tests in three browsers: the canvas follows the host's size, a new `devicePixelRatio` changes the resolution, an idle view renders nothing |
| 4 | `LevelDisplay`, `EntityNode`, `EntityDrawing`: one node per entity nested like the tree, shapes, lines and paths with their StyleComponent, round joins, the unstyled thin outline, hidden entities | `adapters/pixi` | A test level draws in three browsers; a style change rebuilds only that entity's drawing; a move changes only a matrix; adding, removing and moving entities between parents keeps the nodes like the tree |
| 5 | Culling from `BoundsCache` on every pan, zoom or change | `adapters/pixi` | Off-screen entities get `renderable = false`; a group fully off screen skips its subtree; panning back shows them again |
| 6 | `GridOverlay`, `BoundsOverlay`, `CameraFrameOverlay` | `adapters/pixi/overlays` | Lines every 50 px and the fainter ones only when 8 screen px apart; white lines on a dark background; the outside dimmed; the frame and its label at any zoom; each hidden by its switch |
| 7 | A joint's bounds in `BoundsCache`; `JointIconOverlay`, one icon per joint type; `PhysicsViewOverlay` from `PiecesCache` | `core/derived`, `adapters/pixi/overlays` | Icons keep their size on screen; the physics view draws hidden and see-through shapes' pieces too; both off with their switch |
| 8 | The page draws a test level through `PixiLevelView`, with the smallest wiring in `app` | `app`, `tests/e2e` | The Playwright test sees the level drawn; at a `devicePixelRatio` of 2 the canvas has twice the pixels |
| 9 | The docs: what the build showed, [stack.md](../architecture/stack.md)'s `pixi.js` row, `progress.md` | `docs/` | `node tools/check-docs.js` passes |
