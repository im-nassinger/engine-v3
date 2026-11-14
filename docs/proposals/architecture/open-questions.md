# Open questions

## TL;DR

**Round 2 answered the eight questions that came out of writing this proposal** (owner, 2026-11-13). Seven took the suggested answer; one, the level bounds, was changed by the owner: **the World has a rectangle ShapeComponent that is the level bounds.** That answer raised three smaller questions about the World's rectangle, now numbered 25 to 27 in [progress.md](../../progress.md) and asked on the [review page](review.html) as round 3. They must be answered before plan stage 2. The second table says which open questions in `progress.md` touch which part of this design.

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

## Raised by A2, asked in round 3

| # | Question | Touches | Suggested answer |
|---|---|---|---|
| 25 | Where does the World's rectangle sit, and how do its handles resize it? The World never moves, so the rectangle can't move with it | The ShapeComponent's geometry on the World, the Select tool's resize state, the camera's default position | Centred on the level's origin. Dragging one side moves the opposite side by the same amount, so the centre stays at the origin. A new level's camera then starts at the origin, in the middle of the level |
| 26 | Where do the four edge settings (wall or open) live? A ShapeComponent has no such setting | The PhysicsWorldComponent's schema, `LevelBoundsPhase`, the walls in `PhysicsSceneBuilder` | Four choices on the PhysicsWorldComponent: Top edge, Bottom edge, Left edge, Right edge, each Wall or Open, all Open |
| 27 | Can the World's rectangle collide? | The Add Component menu on the World | No: the World can't take a BodyComponent or a SurfaceComponent, so the background never collides. Walls come only from the edge settings |

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
| 25, 26, 27 | The World's rectangle | See above | **Yes, before plan stage 2** |
