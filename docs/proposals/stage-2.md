# Stage 2 plan: the v1 components and the file format

## TL;DR

**Approved under the standing yes with round 10 (2026-11-14), and being built: steps 1 to 7 are done.** Stage 2 builds the eight other v1 components (ShapeComponent, PathComponent, StyleComponent, BodyComponent, SurfaceComponent, JointComponent, CameraComponent, PhysicsWorldComponent), the registry, the World's and the camera's full set of components, and `level.json`: `LevelWriter`, `LevelReader`, the limits, an empty `FormatUpgrader` and the physics version table. It follows [components-and-fields.md](../architecture/core-model/components-and-fields.md) and [persistence.md](../architecture/persistence.md) except in **eight places**, below, where the docs can't be built as written. **The values the requirements don't give** (the background colour, the camera's ranges, the grid size's range and more) are asked on the [review page](../review.html), round 10. All of it must be answered before step 2.

## Where the plan differs from the docs

### 1. A shape's kind and size are one stored value

**The problem.** The docs give the ShapeComponent a Kind field ("choice, read-only") beside a stored geometry. Kept apart, a file could say `"kind": "rectangle"` with a list of points, and every reader of the shape would have to check that the two agree. `FieldDefinition` also has no way to be read-only.

**Recommendation.** One stored value, `geometry`, holds the kind and what that kind needs:

```json
"ShapeComponent": { "geometry": { "kind": "rectangle", "width": 200, "height": 100 } }
"ShapeComponent": { "geometry": { "kind": "line", "points": [{ "x": 0, "y": 0 }, { "x": 300, "y": 40 }] } }
```

Kind, Width, Height and Points are derived fields read from it. Kind and Points have no `write`, so they are read-only, which is how the docs already make a derived field read-only. A rectangle can never hold points.

### 2. `StoredValueDefinition`

**The problem.** The docs name it for the ShapeComponent but don't describe it.

**Recommendation.** A stored value is a field the Inspector never shows: a `key`, a `ValueType` and a default. It is saved under its key's snake_case like a field, and `readValue` and `writeValue` reach it the same way, so undo, copy and the reader need nothing new. The v1 stored values: the ShapeComponent's `geometry`, the PathComponent's `path`, the JointComponent's `ends` (the two ends, in the joint's own space) and the CameraComponent's `mode` (`fixedSize`).

### 3. The PathComponent stores what v2's pen needs

**The problem.** In v1 a path only comes from a Rope or a Spring, as straight points. In v2 the pen adds curve handles. If v1 stored bare points, v2 would have to change saved files.

**Recommendation.** v1 stores the full shape now: `{ "closed": false, "points": [{ "x", "y", "handle_in", "handle_out", "corner" }] }`, where `corner` is sharp, smooth, or smooth with handles that move separately, as [point editing](../requirements/drawing.md#point-editing--v1) names them. A rope's points are all sharp, with no handles.

### 4. The fill's field kind is `'fill'`

**The problem.** The Inspector picks a field's control by its kind. A `'colour'` field holds text (`#4A90D9FF`), but `SolidFillFieldType` holds `{ kind: 'none' } | { kind: 'solid', colour }`. Sharing the kind would give the colour control a value it can't read.

**Recommendation.** `SolidFillFieldType` has kind `'fill'`, the kind v2's `FillFieldType` takes over. The user still sees exactly what the owner decided: a colour field that can be emptied. In v2 the same control gains gradients, and no kind changes.

### 5. A partner note that either of two components ends

**The problem.** The StyleComponent's note shows when the entity has neither a ShapeComponent nor a PathComponent, but `PartnerRule` names one partner.

**Recommendation.** `PartnerRule` gets `alsoSatisfiedBy`, a list of other components that end the note. `partner` stays the one the button adds: "Needs a ShapeComponent to draw anything. [Add ShapeComponent]". v2 adds the TextComponent to the list.

### 6. `Level.createNew` takes no registry

**The problem.** The docs give it a registry parameter, but `core/entities` already imports `core/components`, so it can make the World's and the camera's components directly.

**Recommendation.** No parameter. The registry is for code that finds a component by its name: the reader, and later the Add Component menu and Lua.

### 7. The 256 MB limit is checked where the bytes are

**The problem.** `LevelReader.read` takes data already parsed from JSON, so it can't count bytes, and measuring the whole level after each change would be slow.

**Recommendation.** `LevelLimits` holds all the numbers. The reader checks entities (100,000), depth (256) and points (1,000 per polygon or line). The size is checked in stage 12, where the bytes exist: the import worker, and the save, which already has the text.

### 8. `LevelEditorData` comes now

**The problem.** Stage 1 left it out because nothing read it. `LevelWriter` writes it.

**Recommendation.** Stage 2 builds it with the grid size (50 px) and the folded rows (none). Nothing in the editor uses it until stages 7 and 9.

## What the reader refuses

Every refusal gets a test, as [testing.md](../architecture/testing.md) asks.

| Case | Refusal |
|---|---|
| Not JSON, or no `"format": "engine-v3-level"` | `notALevel` |
| `formatVersion` above 1 | `newerVersion` |
| An id that isn't a whole number from 1, or used twice | `damaged` |
| A parent that doesn't appear earlier in the list | `damaged` |
| No World first, or a second entity without a parent | `damaged` |
| Not exactly one CameraComponent, or the camera not directly inside the World | `damaged` |
| A PhysicsWorldComponent anywhere but the World, or the World missing one of its components, or a World shape that isn't a rectangle | `damaged` |
| An unknown component, or an unknown value inside one | `damaged` |
| A value its value type refuses, such as an empty name or a scale of 0 | `damaged` |
| Over 100,000 entities, deeper than 256, more than 1,000 points | `overLimit` |

A joint whose A or B names an id not in the file is kept: the field shows `missing entity`, as the rules say.

## The order of work

Each step ends with its tests, `npm run check` and a commit.

| # | Step | Module | Tested by |
|---|---|---|---|
| 1 | `SolidFillFieldType`, `StoredValueDefinition`, the three internal value types (`ShapeGeometryValue`, `PathGeometryValue`, `JointEndsValue`), `alsoSatisfiedBy` | `core/fields`, `core/components` | Each type's `parse` refuses bad data; a polygon needs 3 points and a line 2; a rectangle at least 1 px each side |
| 2 | ShapeComponent, PathComponent, StyleComponent | `core/components` | The schema test; Width and Height rescale a polygon's points; Kind and Points refuse writes |
| 3 | BodyComponent, SurfaceComponent, JointComponent | `core/components` | The schema test; `appliesWhen` greys what the body type or joint type doesn't use |
| 4 | CameraComponent, PhysicsWorldComponent | `core/components` | The schema test; Gravity angle applies only when Custom |
| 5 | `ComponentRegistry`, `createV1Registry`, `LevelEditorData`; `Level.createNew` gives the World and the camera their components | `core/components`, `core/entities` | The schema test runs over the registry; a new level's World has a 20000 × 10000 rectangle and the background fill |
| 6 | `LevelData`, `LevelLimits`, `PhysicsVersions`, `FormatUpgrader` (empty), `LevelWriter` | `core/level-data` | The writer's output for a new level matches a recorded `level.json` |
| 7 | `LevelReader` | `core/level-data` | Round trips of every component; each refusal above, and each limit just under and just over |
| 8 | The docs: the changes above written into the architecture, `progress.md`, this file deleted | `docs/` | `node tools/check-docs.js` passes |

## Done when

The plan's own: round trips of every component, the schema tests, and the reader refusing each bad case. Plus `npm run check` passes and the docs say what was built.

## Docs that change if you say yes

| Doc | Change |
|---|---|
| [components-and-fields.md](../architecture/core-model/components-and-fields.md) | The ShapeComponent's geometry and derived fields; `StoredValueDefinition`; the path's stored shape; the fill's kind; `alsoSatisfiedBy`; round 10's values |
| [entities-and-level.md](../architecture/core-model/entities-and-level.md) | `Level.createNew` without a registry; `LevelEditorData` built |
| [persistence.md](../architecture/persistence.md) | The `level.json` example; where the size limit is checked; the reader's refusals |
| The requirements | Round 10's answers, in the feature each one belongs to |
