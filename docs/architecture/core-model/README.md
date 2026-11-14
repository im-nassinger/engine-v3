# Core model

## TL;DR

The classes in `src/core` that describe a level: **`Level`** owns the tree of entities and hands out ids, **`Entity`** owns its components and its eye and lock switches, and each **component** is a class whose values are declared once in a **schema**. A schema lists fields, each with a field type from the one fixed list, and that list drives the Inspector, undo, saving, copy and paste, and later Lua and Change value. The World and the camera are ordinary entities that the level creates and protects. Geometry (matrices, bounds, collision pieces, mass) and deterministic maths sit beside the model, shared by the editor, the renderer and the simulation.

## Files

| File | Covers |
|---|---|
| [entities-and-level.md](entities-and-level.md) | `Entity`, `Level`, ids, the tree and its order, the World and the camera, change signals, derived caches |
| [components-and-fields.md](components-and-fields.md) | `Component`, value types, the field types, `FieldDefinition`, `ComponentSchema`, the registry, every v1 component and its fields |
| [geometry.md](geometry.md) | `Matrix2D`, the TransformComponent's maths, the collision pieces, bounds, mass, `DeterministicMath`, units |

## The model in one picture

```
Level ──owns──> LevelTree (parent and ordered children of every entity)
  │               └─ World ─┬─ camera
  │                         ├─ Car (group) ─┬─ Body shape
  │                         │               └─ Wheel
  │                         └─ Hinge 1 (joint)
  ├──owns──> EntityIdAllocator (never reuses an id)
  ├──owns──> LevelSignals (who changed what, plus version counters for React)
  └──owns──> LevelEditorData (grid size, folded rows)

Entity ──owns──> components by type name, its hidden and locked switches
Component ──owns──> its values, validated by its ComponentSchema
ComponentSchema ──lists──> FieldDefinitions ──use──> FieldTypes
```

## Rules the model keeps

| Rule (from the requirements) | Kept by |
|---|---|
| An entity has at most one component of each type | `Entity.addComponent` refuses a second one |
| Every entity can hold children, groups nest up to 256 deep | `Level.moveEntity` refuses a cycle or a depth past 256 |
| One World, the root, never moved, deleted or copied | `Level` creates it and refuses to move or remove it |
| One camera, always directly inside the World | `Level` creates it and refuses to move it anywhere else |
| The top row is drawn in front | Children are kept in Entities panel order, index 0 is the top row |
| A level holds at most 100,000 entities | `LevelLimits`, checked by every command and by the reader before anything changes |
| An id never points at a newer entity | `EntityIdAllocator` only counts up |
| Values stay in their range | Every write goes through the field type, which clamps or refuses |
