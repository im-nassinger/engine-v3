# Open questions

## TL;DR

**Round 2 answered the eight questions that came out of writing this proposal** (owner, 2026-11-13). Seven took the suggested answer; one, the level bounds, was changed by the owner: **the World has a rectangle ShapeComponent that is the level bounds.** That answer raised three smaller questions about the World's rectangle, numbered 25 to 27 in [progress.md](../../progress.md). **Round 3 answered 25 and round 4 answered 26 and 27** (owner, 2026-11-13): the rectangle is centred on the level's origin and resizes from its centre, one Walls checkbox makes all four edges walls or all open, and the World can never be solid. Nothing blocks plan stage 2 any more. Rounds 5 and 6 answered the open questions in `progress.md`; round 7 answered 29 and 30; 31 is about v2.

## Answered in round 2

| # | Question | Answer | Written into |
|---|---|---|---|
| A1 | Where does the background colour live? | The fill of a StyleComponent on the World | [world](../../requirements/physics/world.md), [components](core-model/components-and-fields.md) |
| A2 | Where do the level bounds live? | **Changed by the owner:** a rectangle ShapeComponent on the World. Its width and height are the bounds' size | [world](../../requirements/physics/world.md), [components](core-model/components-and-fields.md) |
| A3 | Which component holds Merge? | A checkbox on the BodyComponent, on by default | [bodies](../../requirements/physics/bodies.md) |
| A4 | Is the TagsComponent in v1? | No, v2 | [glossary](../../glossary.md) |
| A5 | Does the World show a TransformComponent card? | It has one, fixed at zero, and the card isn't shown | [inspector and undo](../../requirements/editor/inspector-and-undo.md) |
| A6 | The texts of partner notes | "Needs a X to Y. [Add X]" | [inspector and undo](../../requirements/editor/inspector-and-undo.md) |
| A7 | Links to outside entities after a reload | Kept within one opening of the level, missing after a reload, New or Import | [inspector and undo](../../requirements/editor/inspector-and-undo.md) |
| A8 | Is changing the grid size a step? | Yes. Showing the grid isn't | [workspace](../../requirements/editor/workspace.md), [inspector and undo](../../requirements/editor/inspector-and-undo.md) |
| S1 | TypeScript 6.0 or 7? | 6.0.3, until `typescript-eslint` supports 7 | [stack](stack.md) |

## Raised by A2, answered in rounds 3 and 4

| # | Question | Answer | Written into |
|---|---|---|---|
| 25 | Where does the World's rectangle sit, and how do its handles resize it? | Centred on the level's origin. Dragging one edge moves the opposite edge by the same amount. A new level's camera starts at the origin | [world](../../requirements/physics/world.md), [camera](../../requirements/camera.md), [components](core-model/components-and-fields.md), [selection and tools](editor/selection-and-tools.md) |
| 26 | Where do you choose Wall or Open for the edges? | **Changed by the owner:** one Walls checkbox on the PhysicsWorldComponent, off by default. All four edges are walls, or all open | [world](../../requirements/physics/world.md), [components](core-model/components-and-fields.md), [simulation](simulation.md) |
| 27 | Can the World's rectangle be solid? | No. The World can't take a BodyComponent or a SurfaceComponent; the Add Component menu shows them disabled with the reason | [world](../../requirements/physics/world.md), [components](core-model/components-and-fields.md) |

## The open questions in progress.md

**Rounds 5 and 6 answered every one** (owner, 2026-11-13 and 2026-11-14); the answers are written into the requirements. None changed this design's parts. Three new questions came out of round 6. Round 7 answered 29 and 30 (owner, 2026-11-14): Spawn measures from the trigger's entity, and its values replace the `.entity` file's. One is left:

| # | Question | Touches | Blocks v1? |
|---|---|---|---|
| 31 | A Flip choice for boolean variables | Change value, the VariablesComponent | No, v2 |
