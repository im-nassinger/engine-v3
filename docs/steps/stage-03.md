# Stage 3 in steps: Geometry

## TL;DR

Written under the standing yes (2026-11-14), and all eight built on 2026-11-14. Each step ends with its tests, `npm run check` and a commit. The choices behind them are in [geometry.md](../architecture/core-model/geometry.md).

| # | Step | Module | Ends with |
|---|---|---|---|
| 1 | These steps, and the choices in [geometry.md](../architecture/core-model/geometry.md) | `docs/` | `node tools/check-docs.js` passes |
| 2 | `DeterministicMath.exp`, `Units` | `core/math` | `exp` within 1e-12 of `Math.exp`, relative, over −700 to 700; each unit converts both ways |
| 3 | `Bounds`; `clipper2-ts` installed and tried; `PolygonLibrary`, the one file that imports it: fill every enclosed area; `EarClipping`: triangulate, because the library's triangulation drops areas | `core/geometry` | A figure-of-eight gives two outlines, a one-stroke star its outline with the middle filled; the same input gives the same bits twice; the library's banned `Math` calls checked as in geometry.md |
| 4 | `ShapePieces`: rectangle, circle, the 32-point ellipse (a circle under an uneven matrix since 2026-11-15), the five polygon steps | `core/geometry` | A figure-of-eight and a star give the expected pieces; no piece over 8 points; every piece convex; pieces under 1 px dropped |
| 5 | `LineChains`: merging close points, cutting at crossings | `core/geometry` | A line crossing itself once gives three chains; a straight line one |
| 6 | `MassProperties`: area, mass and centre of mass of pieces, and of several combined | `core/geometry` | A 100 px square at density 1 is 4 kg; a circle's and a triangle's centres; a line has none |
| 7 | `PiecesCache`, `BoundsCache` | `core/derived` | Moving a shape keeps its pieces; a new outline width grows the bounds; moving a child moves its parent's subtree bounds |
| 8 | The docs: what the build showed, [stack.md](../architecture/stack.md)'s row for `clipper2-ts`, the polygon library's old "open question" pointer in [tooling.md](../architecture/tooling.md) and `eslint.config.ts`, `progress.md` | `docs/` | `node tools/check-docs.js` passes |
