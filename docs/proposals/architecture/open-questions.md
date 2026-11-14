# Open questions

## TL;DR

Questions the architecture needs answered that the requirements don't settle, each with a suggested answer. **None is decided:** the design is written so each suggestion can be swapped without moving anything else. A1 to A3 shape the v1 components and should be answered before plan stage 2; A4 to A8 can wait until their stage. The second table says which of the open questions in [progress.md](../../progress.md) touch which part of this design. Questions about requirements that come up later go to `progress.md`, not here.

## New questions from the architecture

| # | Question | Why it matters | Suggested answer | Needed by |
|---|---|---|---|---|
| A1 | **Where does the World's background colour live?** The requirements put it "on the World" but name no component, and the PhysicsWorldComponent is for physics | The file format and the World's cards | A **StyleComponent on the World**, whose fill is the background. In v3 its image fill becomes the background image with no new setting, and a missing image falls back to the colour, as the requirement says | Stage 2 |
| A2 | **Where do the level bounds live, and where is their corner?** The requirements give the size (20000 × 10000), the four edges and the handles, but no component and no position | The file format, the bounds handles, the camera's limits | Fields on the **PhysicsWorldComponent**: Bounds position (the top-left corner, default 0, 0), Bounds size (20000 × 10000), and four choices, Top, Bottom, Left and Right edge: Wall or Open, all Open. The default camera then sits at (960, 540), in the top-left corner of the bounds | Stage 2 |
| A3 | **Which component holds "merge"?** The requirements say "whether a child merges is a setting on a component. On by default" | The file format, `BodyMembership` | A **Merge** checkbox on the **BodyComponent**, on by default. A shape with a SurfaceComponent and no BodyComponent always merges into the body above it, and gets its own body by adding a BodyComponent with Merge off. This matches "a merged shape keeps its own body settings, greyed" | Stage 2 |
| A4 | **Is the TagsComponent in v1?** It is in the glossary with no version, and nothing in v1 reads tags | The v1 component list | **v2**, with triggers and scripts, which are the first to read tags | Stage 2 |
| A5 | **Does the World show a TransformComponent card?** Every entity has a TransformComponent, but the World can't move | The Inspector | The World keeps a TransformComponent fixed at zero, so the "every entity" rule holds, and its **card is not shown**, because none of its values can change | Stage 8 |
| A6 | **The exact texts of partner notes.** The requirements give two ("Needs a ShapeComponent to draw anything", "Needs a SurfaceComponent to notice touching") | The schemas | One pattern, **"Needs a X to Y. [Add X]"**, with Y written per partner in the schema: StyleComponent "to draw anything", SurfaceComponent "to collide", BodyComponent "to collide" | Stage 8 |
| A7 | **Links to outside entities after a reload.** A paste keeps a link to an entity outside the copied set "in the same level". v1 has no level id, so the editor can only tell "the same open level" | The clipboard | Links are kept within one opening of the level. After a reload, New or Import they become missing. Level ids are Later | Stage 11 |
| A8 | **Is changing the grid size an undo step?** It is saved in the project file, but the requirement's table lists neither way | History | **A step**, like every other value saved in the level. Showing or hiding the grid stays a view setting | Stage 5 |

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
