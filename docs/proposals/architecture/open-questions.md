# Open questions

## TL;DR

**Round 2 answered the eight questions that came out of writing this proposal** (owner, 2026-11-13). Seven took the suggested answer; one, the level bounds, was changed by the owner: **the World has a rectangle ShapeComponent that is the level bounds.** That answer raised three smaller questions about the World's rectangle, numbered 25 to 27 in [progress.md](../../progress.md). **Round 3 answered 25 and round 4 answered 26 and 27** (owner, 2026-11-13): the rectangle is centred on the level's origin and resizes from its centre, one Walls checkbox makes all four edges walls or all open, and the World can never be solid. Nothing blocks plan stage 2 any more. The second table says which open questions in `progress.md` touch which part of this design.

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

## The open questions in progress.md, and what they touch

| # | Question | Touches | Blocks v1? |
|---|---|---|---|
| 3 | Can a variable hold text? | The VariablesComponent's value type, `get_variable` and `set_variable`, the "variable" field type | No, v2 |
| 4 | Does the Joint tool stay active after a joint? | `ToolController` returning to Select. Either answer is one line, because tool lock already exists | No. Written as: all tools return |
| 7 | Text size by dragging a corner | The Select tool's resize state for text | No, v2 |
| 8 | The "entities here" right-click list | `HitTester.allAt`, which v3's Alt+click needs anyway | No |
| 9 | The Trigger zone tool's version | A v2 tool class | No |
| 13 | Changing a builtin file | The Assets panel's read-only folder | No, v2 |
| 14 | Spawn settings | The trigger's Spawn action, `SpawnPhase` | No, v2 |
| 15 | Follow by tag | The CameraComponent's follow target: an entity field is stored as `{ "entity": id }`, so `{ "tag": "player" }` can join it | No: v1 follows an entity (owner, 2026-11-13) |
| 16 | Inputs of a new level | `Level.createNew` in v2 | No, v2 |
| 20 | Leave on the end window in test play | `PlaySession` | No, v2 |
| 21 | The end window's extras | The end window | No, Later |
| 22 | Play as player | `PlaySession` | No |
| 23, 24 | Version history; the main menu and others | Nothing in this design | No |
