# Stage 1 plan: the model

## TL;DR

**A proposal, waiting for the owner's answer. Nothing here is built.** Stage 1 builds the classes in `src/core` that hold a level: signals, ids, `Entity`, `Level`, the field types, `ComponentSchema`, `Component`, TransformComponent, NameComponent, `Matrix2D`, and the matrix and hidden caches. It follows [core-model/](../architecture/core-model/README.md) except in **three places**, where the approved docs couldn't be built as written. **Change 1 is settled** (owner, 2026-11-14) and written into the architecture. **Change 2 must be answered before the work starts; change 3 can wait until step 4.**

## Where the plan differs from the docs

### 1. Components imported entities: settled

**Settled by the owner on 2026-11-14 and already written into the architecture.** The docs had components and fields reading `Entity` in four places, which made a circle between modules. The owner asked for a clean direction instead of contracts that hide it, so **imports go one way, entities → components → fields → events**:

- `Component` raises its own `changed` signal; `Entity` listens. A component never knows which entity holds it.
- `PartnerRule` is plain data (`partner`, `onlyWith`, `noteText`); the editor's `MissingPartnerRule` checks the entity.
- Derived fields (Width, Height, Points) read the component's own values. Mass isn't a field: `BodyMass` in `core/physics` works it out, and the Inspector shows it as a read-only row on the BodyComponent's card.
- The Add Component menu is worked out in the Inspector, not the registry.
- `ComponentSchema` moves to `core/components`; `EntityId` is declared in `core/fields`.

See [components-and-fields.md](../architecture/core-model/components-and-fields.md#componentschema-and-component).

### 2. Part of `DeterministicMath` moves from stage 3 to stage 1

**The problem.** `Matrix2D.fromTransform` needs sine, cosine and tangent, and `decompose` needs arctangent. ESLint refuses `Math.sin`, `Math.tan` and `Math.atan2` in core. [geometry.md](../architecture/core-model/geometry.md) says "the editor may use `Math` in `decompose()`", but `decompose` lives in core, so the rule refuses it.

**Recommendation.** Stage 1 builds `DeterministicMath.sin`, `cos`, `atan2` and `sinCos`, with the 1e-12 accuracy test. `exp` stays in stage 3. Tangent is `sin ÷ cos` inside `Matrix2D`, so `DeterministicMath` gets no new function. `decompose` uses `DeterministicMath` like everything else in core, and the sentence about the editor using `Math` is removed.

### 3. The skew's range

**The problem.** The TransformComponent's Skew field has no range in the docs. A skew of exactly 90° or −90° has no tangent: the matrix would hold an infinite number and could never be inverted. A skew past 90° is the same slant as a smaller one with the scale flipped, so two Inspector values would mean one look.

**Recommendation.** **Skew is strictly between −90° and 90°.** The field refuses 90°, −90° and anything past them with a status text, the way Scale refuses 0. It doesn't clamp, because clamping 90° to 89.99° would quietly change the shape. `decompose` always returns a skew inside that range, so moving an entity between groups never hits the limit. `AngleFieldType` gets one option for this, `refuseLimits`.

## What stays for later stages

By the plan's rule ("a stage never builds something a later stage owns"), stage 1 builds the smallest version of these:

- **`Level.createNew`** makes the World and the camera with only a TransformComponent and a NameComponent. Stage 2 adds their other components when the classes exist, and adds the `registry` parameter then.
- **`SolidFillFieldType`** comes with the StyleComponent in stage 2. The eight field types of the plan are all built now.
- **`LevelEditorData`** (grid size, folded rows) comes with the first stage that reads it. The docs give no grid size default, so stage 1 has nothing to put in it.
- **`BoundsCache` and `PiecesCache`** are stage 3.

## The order of work

Each step ends with its tests, `npm run check` and a commit.

| # | Step | Module | Tested by |
|---|---|---|---|
| 1 | `Signal`, `VersionCounter`, `Unsubscribe` | `core/events` | Listeners run in order; unsubscribing during an emit is safe |
| 2 | `DeterministicMath`: `sin`, `cos`, `atan2`, `sinCos` | `core/math` | Within 1e-12 of `Math` over the angles the game uses; `sinCos` exact at 0, 90, 180 and 270 |
| 3 | `Point`, `Matrix2D` | `core/geometry` | `fromTransform` then `decompose` gives back the values; `invert` of a scale 0 is `undefined`; `determinant` is negative when mirrored |
| 4 | `EntityId`, `ValueType`, `ParseOutcome`, the eight field types, `FieldDefinition`, `Unit` | `core/fields` | Each type's `parse` refuses bad data, `normalize` clamps and rounds, `clone` never shares a list |
| 5 | `ComponentSchema`, `PartnerRule`, `DerivedFieldDefinition`, `Component` with its `changed` signal, TransformComponent, NameComponent | `core/components` | The schema test: keys are the camelCase of labels, no two attributes clash, defaults sit in range; `set` returns the stored value and signals only on a change; `copy` shares nothing |
| 6 | `EntityIdAllocator`, `LevelSignals`, `EntityVersions`, `LevelTree`, `Entity`, `Level` (with `rename`) | `core/entities` | The tree's rules below; a removed component's changes no longer reach the level |
| 7 | `WorldMatrixCache`, `HiddenCache` | `core/derived` | Marking a parent marks the subtree; values are computed only when asked |
| 8 | The docs: changes 2 and 3 written into the architecture, `progress.md`, this file deleted | `docs/` | `node tools/check-docs.js` passes |

### The tree's rules, as tests

- A new level's World is id 1 and its camera id 2; ids only count up; a removed id is never handed out again; `restoreEntity` with a known id raises the highest.
- A second component of one type is refused.
- `moveEntity` refuses each of its four reasons: a cycle, past 256 deep, moving the World, and the camera anywhere but directly inside the World.
- The World and the camera can't be removed. Removing an entity removes its whole subtree.
- Panel order is the pre-order walk, top row first; draw order is the same walk backwards.
- Each change raises the right `LevelUpdate`; the tree version moves on any add, remove or move; a change to one entity wakes only that entity's listeners.
- **Moving an entity between parents keeps its level matrix**, with skew in both parents: `inverse(newParentWorld) · oldWorld`, then `decompose`, gives the same level matrix to within 1e-9.

## Done when

The plan's own: unit tests for the tree's rules, ids, signals and matrices, including moving between parents with skew. Plus `npm run check` passes and the docs say what was built.

## Docs that change if you say yes

| Doc | Change |
|---|---|
| [components-and-fields.md](../architecture/core-model/components-and-fields.md) | Skew's range |
| [geometry.md](../architecture/core-model/geometry.md) | `decompose` uses `DeterministicMath`; skew strictly between −90° and 90° |
| [plan.md](../plan.md) | `DeterministicMath`'s `sin`, `cos`, `atan2` in stage 1; `exp` stays in stage 3 |
