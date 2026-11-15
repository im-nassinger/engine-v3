# Geometry and deterministic maths

## TL;DR

`src/core/geometry` holds the maths every part shares: the **`Matrix2D`** of a TransformComponent and how to keep an entity in place when it changes parent, **bounds**, and the **polygon pipeline** that cuts each shape into **collision pieces**: convex pieces of at most 8 points, Box2D's limit. Drawing, Box2D, clicking, the physics view and the read-only Mass all use those same pieces, so what you see is what collides (owner, 2026-11-13). `src/core/math` holds **`DeterministicMath`**, the game's own sine, cosine, arctangent and exponent, built from arithmetic and square roots only, because the browser's `Math.sin` may differ between computers. Units are fixed: 50 px per metre, degrees clockwise on screen, y pointing down.

## Units

| Quantity | In the game, the Inspector and Lua | In Box2D | Converted by |
|---|---|---|---|
| Length, position | pixels | metres: px ÷ 50 | `Units.toMetres`, `Units.toPixels` |
| Angle | degrees, clockwise on screen | radians | `Units.toRadians`, `Units.toDegrees` |
| Speed | px/s, °/s | m/s, rad/s | The same four functions: a speed converts like its length or angle |
| Gravity | m/s² | m/s² | none |
| Mass | kg | kg | none |

- **y points down everywhere, Box2D included.** In a y-down frame, Box2D's positive (counter-clockwise in y-up) rotation is clockwise on screen, which is the game's convention. So no sign is ever flipped. This settles the tech note "Clockwise ... Confirm".
- Gravity "Down" is the vector (0, +strength).
- Only the Box2D adapter converts to metres and radians. Everything else works in pixels and degrees.

## Matrix2D and the TransformComponent

```typescript
export class Matrix2D {
    readonly a: number; readonly b: number;
    readonly c: number; readonly d: number;
    readonly tx: number; readonly ty: number;

    static identity(): Matrix2D;
    static fromTransform(values: TransformValues): Matrix2D;
    multiply(other: Matrix2D): Matrix2D;
    invert(): Matrix2D | undefined;          // undefined when the scale is 0
    apply(point: Point): Point;
    determinant(): number;                   // negative when mirrored
    decompose(): TransformValues;            // the inverse of fromTransform
}
```

- **The order is `M = T(position) · R(rotation) · K(skew) · S(scale)`**, where `K` slants horizontally: `[[1, tan(skew)], [0, 1]]`. **Skew is strictly between −90° and 90°** (owner, 2026-11-14): at ±90° the tangent is infinite and the matrix can't be inverted, and past 90° the same slant is a smaller skew with the scale flipped. `decompose()` always returns a skew inside that range. Tangent is `sin ÷ cos` inside `Matrix2D`. Position, rotation, two scales and one skew are six numbers, exactly the six numbers of any 2D matrix, so **any** combination of parents can be expressed. That is what the requirement "moving between groups keeps the place on screen, skew included" needs.
- **Moving an entity to a new parent** keeps its level matrix: `newLocal = inverse(newParentWorld) · oldWorld`, then `decompose()`. A new parent with scale 0 can't be inverted, so the command refuses the move. The scale field already refuses 0.
- **What `decompose()` returns** (Claude's call while building stage 1): the x scale is always positive, so a mirror shows as a negative y scale (a scale of (−1, 1) comes back as rotation 180° and scale (1, −1), the same matrix). Rotation comes back above −180° and at most 180°, and no value is ever −0.
- Matrices are values: every operation returns a new one.
- `fromTransform()` and `decompose()` use `DeterministicMath`, like all of core (owner, 2026-11-14). ESLint bans `Math.sin` and the others in core, so there is no exception for the editor.

## Bounds

- `Bounds` is an axis-aligned rectangle in level positions: `left`, `top`, `right`, `bottom`, with y down. It is a value like `Matrix2D`. `Bounds.around(points)` gives `undefined` for no points; `union`, `expandedBy` (half an outline width), `overlaps` and `contains` count touching edges as inside, so a selection box that just reaches an entity selects it; `transformedBy(matrix)` covers the four moved corners. *(standing yes, 2026-11-14)*
- **An entity's own bounds** cover what it draws, its outline included (half the outline width beyond the shape), or, with no StyleComponent, its shape's edge. A joint's bounds are its icon's, the camera's its frame's. Stage 3 builds every kind but the joint's, which comes with the joint icons in stage 4, because the icon's size is a drawing choice (standing yes, 2026-11-14).
- **Subtree bounds** are the union of its own and its children's. Hit testing, the selection box, culling and F (zoom to selection) all read `BoundsCache`.

## The polygon pipeline

`ShapePieces.build(geometry)` turns one ShapeComponent's geometry into its collision pieces, in the shape's own space. The result is cached per shape and rebuilt only when its geometry changes, never when it moves.

| Shape | Pieces |
|---|---|
| Rectangle | One 4-point piece |
| Ellipse with equal width and height | One circle. It stays a circle in play only if the entity's level matrix scales it evenly with no skew; otherwise the many-sided polygon below, which the play copy asks `ShapePieces` for (standing yes, 2026-11-14: the cache keeps only the circle, because whether the matrix is even is known only in play) |
| Any other ellipse | A polygon of **32 points**, a fixed count because it affects determinism, then the polygon steps below |
| Polygon (closed, may cross itself) | Steps 1 to 5 below |
| Line (open) | A cleaned chain, see below. Never pieces |

Polygon steps:

1. **Clean.** Merge points closer than 0.25 px, drop points lying on the straight line between their neighbours. The tech notes warn that such points break convex splitting.
2. **Fill every enclosed area.** The polygon library unions the outline with itself (non-zero rule), which cuts it at its crossings. Every outer outline it returns is kept; every hole it returns is dropped, because the requirement fills every enclosed area and polygons have no holes. A figure-of-eight gives two outlines; a star drawn in one stroke gives its outline with the middle filled.
3. **Triangulate** each outline with `EarClipping`, the game's own, in `core/geometry`.
4. **Merge triangles into convex pieces** of at most 8 points (Hertel-Mehlhorn: remove a shared edge whenever the result stays convex and has 8 points or fewer).
5. **Drop pieces too small to collide**: under 1 px on their short side, the requirement's limit.

**The polygon library** (owner, 2026-11-14): stage 3 tries `clipper2-ts` first, because `clipper2-js` 1.2.4 has no triangulation. It must triangulate, pass the determinism tests, and never reach a banned `Math` function from the functions core calls. If it fails, the owner is asked again.

**What the try showed** (standing yes, 2026-11-14): **`clipper2-ts` fills, but the game triangulates itself.** Its `union` passes every test: a figure-of-eight, a one-stroke star, holes, the same bits twice, and no banned `Math` function reached. **Its triangulation drops areas**: the one-stroke star comes back as four of its five tips with no middle, and about 1.4% of random polygons lose area (2.0.1-19; the older 2.0.1 release loses area on 19 of 7,938). It reports success either way, so the pipeline can't tell. Asking the owner isn't possible in an unattended run, so the closest fix to their decision is taken: keep `clipper2-ts`, use only its fill, and triangulate with **`EarClipping`**, about 100 lines in `core/geometry`. *Why: a missing middle means a shape that looks solid but doesn't collide. Ear clipping is simple and exact enough here because step 2's outlines have no holes and no crossings. No other library is needed, so "one polygon library" still holds.* The owner can overturn this in [decisions.md](../../decisions.md#decided-under-the-standing-yes).

- **`PolygonLibrary` is the only file that imports `clipper2-ts`** (standing yes, 2026-11-14), in `core/geometry`. Its one function, `fillEnclosedAreas(outline)`, scales pixels by 1,000 into whole numbers, unions with the non-zero rule, drops the holes, then unions what is left once more, so an outline lying inside a dropped hole merges into the outline around it. Outlines come back with a positive shoelace area, which is clockwise on screen with y down, the order Box2D wants with no sign flipped. It uses only the whole-number functions (`union` on `Paths64`), never the `D` ones, which call `Math.pow`. *Why: one file to change if the library is swapped, and the whole-number path is the one that is the same on every computer.* A test replaces every banned `Math` function with one that throws and runs 200 random polygons through it; none is reached, `Math.atan2` included (the one call found in a first look is in the triangulation, which isn't used).
- **`EarClipping.triangulate(outline)`** cuts off ears one at a time, always searching from the first point, so the result depends only on the input. It uses only `+ − ×` and comparisons. Points in the same place as a triangle's corner don't block an ear, because a filled outline can touch itself at a point. A test checks that the triangles of 500 random polygons' outlines add up to each outline's area, n − 2 triangles each, the same twice. Its time grows with the cube of the point count at worst, fine for drawn outlines of a few hundred points.
- Clipper2 works in whole numbers internally, so step 2 gives the same result on every computer. Steps 1, 3, 4 and 5 use only `+ − × ÷` and comparisons.
- **Drawing uses step 2's outlines** for the fill, which avoids the self-crossing fill artefacts the tech notes warn about, and the original outline for the outline. **Box2D and the physics view use step 5's pieces.** Hit testing uses step 2's outlines.
- In play, each piece is moved into its body's space by one matrix. A matrix keeps a convex piece convex. A mirrored matrix flips the order of the points, so the pieces are reversed to keep the order Box2D expects.

**Lines.** A line becomes Box2D chains: one chain in each direction, so it collides from both sides with no ghost bumps at its joins, the option the tech notes list. Points closer than 0.25 px are merged first, and a line that crosses itself is cut into separate chains at each crossing, because chains can't cross themselves. A line has no area, so it has no mass.

**What the editor can't draw:** a polygon whose every piece is too small has no collision. The v3 warning "Too small to collide" reads the same pipeline.

## Mass

- `MassProperties.of(pieces, density)` returns area, mass and centre of mass. Mass is area in square metres times density: a 100 px square at density 1 is 2 m × 2 m = 4 kg, as the requirement's example says.
- The BodyComponent's read-only Mass adds up every surface that belongs to the body, merged shapes included. Stage 3 builds `MassProperties.combine`, which adds several up; which surfaces belong to a body is `BodyMass` in `core/physics`, built by the first stage that shows Mass, the Inspector's (standing yes, 2026-11-14: the merging rules it follows belong to `core/physics`). The tech notes require editor mass to come from shared geometry code, not from the physics engine, so it matches play.
- A Dynamic body whose surfaces add up to 0 kg is given 1 kg when the body is built, as the tech notes advise.

## DeterministicMath

```typescript
export class DeterministicMath {
    static sin(radians: number): number;
    static cos(radians: number): number;
    static atan2(y: number, x: number): number;
    static exp(value: number): number;
    static sinCos(degrees: number): { sin: number; cos: number };   // exact at 0, 90, 180 and 270
}
```

- Built only from `+ − × ÷` and `Math.sqrt`, which IEEE 754 defines exactly, so every computer gives the same bits. `Math.sin` and friends are not exactly defined and may differ between browsers and processors.
- Used by everything that runs during a tick and by everything that builds the play copy: ellipse points, the matrices of bodies, camera smoothing (`exp`), joint angles. An ESLint rule bans `Math.sin`, `Math.cos`, `Math.atan2`, `Math.exp`, `Math.pow` and `Math.random` in `src/core`, see [parts-and-folders.md](../parts-and-folders.md).
- Box2D does its own trigonometry inside the wasm build, which is the same everywhere.
- `exp` is fdlibm's `e_exp`, like `sin`, `cos` and `atan2` are fdlibm's: the argument is split into k · ln 2 + r, a polynomial gives eʳ, and 2ᵏ is built by exact multiplication of powers of two, not by setting the number's bits. It gives Infinity above about 709.78 and 0 below about −745.1, like `Math.exp`, and can be one bit away from V8's (`exp(1)` is). *(standing yes, 2026-11-14)*
- Accuracy target: within 1e-12 of `Math` over the range the game uses, checked by a test. For `exp` that is relative, over −700 to 700, where the result neither overflows nor reaches 0 (standing yes, 2026-11-14). Exactness matters less than sameness.
- Random numbers (v2) come from `SeededRandom` in the same module: a small integer generator (xoshiro128**) seeded from the run's seed.
