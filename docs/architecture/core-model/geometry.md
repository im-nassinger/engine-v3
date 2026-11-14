# Geometry and deterministic maths

## TL;DR

`src/core/geometry` holds the maths every part shares: the **`Matrix2D`** of a TransformComponent and how to keep an entity in place when it changes parent, **bounds**, and the **polygon pipeline** that cuts each shape into **collision pieces**: convex pieces of at most 8 points, Box2D's limit. Drawing, Box2D, clicking, the physics view and the read-only Mass all use those same pieces, so what you see is what collides (owner, 2026-11-13). `src/core/math` holds **`DeterministicMath`**, the game's own sine, cosine, arctangent and exponent, built from arithmetic and square roots only, because the browser's `Math.sin` may differ between computers. Units are fixed: 50 px per metre, degrees clockwise on screen, y pointing down.

## Units

| Quantity | In the game, the Inspector and Lua | In Box2D | Converted by |
|---|---|---|---|
| Length, position | pixels | metres: px ÷ 50 | `Units.toMetres`, `Units.toPixels` |
| Angle | degrees, clockwise on screen | radians | `Units.toRadians` |
| Speed | px/s, °/s | m/s, rad/s | `Units` |
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

- **The order is `M = T(position) · R(rotation) · K(skew) · S(scale)`**, where `K` slants horizontally: `[[1, tan(skew)], [0, 1]]`. Position, rotation, two scales and one skew are six numbers, exactly the six numbers of any 2D matrix, so **any** combination of parents can be expressed. That is what the requirement "moving between groups keeps the place on screen, skew included" needs.
- **Moving an entity to a new parent** keeps its level matrix: `newLocal = inverse(newParentWorld) · oldWorld`, then `decompose()`. A new parent with scale 0 can't be inverted, so the command refuses the move. The scale field already refuses 0.
- Matrices are values: every operation returns a new one.
- The editor may use `Math` in `decompose()`, because its result is stored in the level and the stored numbers are what the run reads. Code that runs during a tick uses `DeterministicMath`.

## Bounds

- `Bounds` is an axis-aligned rectangle in level positions.
- **An entity's own bounds** cover what it draws, its outline included (half the outline width beyond the shape), or, with no StyleComponent, its shape's edge. A joint's bounds are its icon's, the camera's its frame's.
- **Subtree bounds** are the union of its own and its children's. Hit testing, the selection box, culling and F (zoom to selection) all read `BoundsCache`.

## The polygon pipeline

`ShapePieces.build(geometry)` turns one ShapeComponent's geometry into its collision pieces, in the shape's own space. The result is cached per shape and rebuilt only when its geometry changes, never when it moves.

| Shape | Pieces |
|---|---|
| Rectangle | One 4-point piece |
| Ellipse with equal width and height | One circle. It stays a circle in play only if the entity's level matrix scales it evenly with no skew; otherwise the many-sided polygon below |
| Any other ellipse | A polygon of **32 points**, a fixed count because it affects determinism, then the polygon steps below |
| Polygon (closed, may cross itself) | Steps 1 to 5 below |
| Line (open) | A cleaned chain, see below. Never pieces |

Polygon steps:

1. **Clean.** Merge points closer than 0.25 px, drop points lying on the straight line between their neighbours. The tech notes warn that such points break convex splitting.
2. **Fill every enclosed area.** `clipper2-js` unions the outline with itself (non-zero rule), which cuts it at its crossings. Every outer outline it returns is kept; every hole it returns is dropped, because the requirement fills every enclosed area and polygons have no holes. A figure-of-eight gives two outlines; a star drawn in one stroke gives its outline with the middle filled.
3. **Triangulate** each outline with `clipper2-js`.
4. **Merge triangles into convex pieces** of at most 8 points (Hertel-Mehlhorn: remove a shared edge whenever the result stays convex and has 8 points or fewer).
5. **Drop pieces too small to collide**: under 1 px on their short side, the requirement's limit.

- Clipper2 works in whole numbers internally (coordinates scaled by 1,000), so steps 2 and 3 give the same result on every computer. Steps 1, 4 and 5 use only `+ − × ÷` and comparisons.
- **Drawing uses step 2's outlines** for the fill, which avoids the self-crossing fill artefacts the tech notes warn about, and the original outline for the outline. **Box2D and the physics view use step 5's pieces.** Hit testing uses step 2's outlines.
- In play, each piece is moved into its body's space by one matrix. A matrix keeps a convex piece convex. A mirrored matrix flips the order of the points, so the pieces are reversed to keep the order Box2D expects.

**Lines.** A line becomes Box2D chains: one chain in each direction, so it collides from both sides with no ghost bumps at its joins, the option the tech notes list. Points closer than 0.25 px are merged first, and a line that crosses itself is cut into separate chains at each crossing, because chains can't cross themselves. A line has no area, so it has no mass.

**What the editor can't draw:** a polygon whose every piece is too small has no collision. The v3 warning "Too small to collide" reads the same pipeline.

## Mass

- `MassProperties.of(pieces, density)` returns area, mass and centre of mass. Mass is area in square metres times density: a 100 px square at density 1 is 2 m × 2 m = 4 kg, as the requirement's example says.
- The BodyComponent's read-only Mass adds up every surface that belongs to the body, merged shapes included. The tech notes require editor mass to come from shared geometry code, not from the physics engine, so it matches play.
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
- Accuracy target: within 1e-12 of `Math` over the range the game uses, checked by a test. Exactness matters less than sameness.
- Random numbers (v2) come from `SeededRandom` in the same module: a small integer generator (xoshiro128**) seeded from the run's seed.
