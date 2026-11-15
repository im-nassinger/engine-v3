# Persistence

## TL;DR

**One data shape, `LevelData`, is the level as plain data.** `LevelWriter` makes it and `LevelReader` reads it back with every check an import needs; nothing else turns a level into data. **`level.json`** is that data as JSON. It starts with the file format version and the physics version, both whole numbers starting at 1. **The project file** (`.editable`) is a zip holding `level.json` and, from v2, the level's files. **In the browser** the level lives in IndexedDB as the same `level.json` text, saved by `Autosave` 2 seconds after the last change or at most 20 seconds after the first unsaved one, all or nothing. Small editor settings live in `localStorage`. **Import** runs in a worker, checks everything before changing anything, and refuses a file that unpacks past 256 MB.

## level.json

```json
{
  "format": "engine-v3-level",
  "formatVersion": 1,
  "physicsVersion": 1,
  "name": "Castle",
  "editor": { "gridSize": 50, "foldedRows": [12, 40] },
  "world": {
    "id": 1, "hidden": false, "locked": false,
    "components": {
      "NameComponent": { "name": "World" },
      "TransformComponent": { "position": { "x": 0, "y": 0 }, "rotation": 0, "scale": { "x": 1, "y": 1 }, "skew": 0 },
      "ShapeComponent": { "geometry": { "kind": "rectangle", "width": 20000, "height": 10000 } },
      "StyleComponent": { "fill": { "kind": "solid", "colour": "#BFE3F5FF" }, "outline_colour": "#1F3552FF", "outline_width": 0, "opacity": 1 },
      "PhysicsWorldComponent": { "gravity": { "x": 0, "y": 9.8 }, "walls": false }
    },
    "children": [
      { "id": 2, "hidden": false, "locked": false,
        "components": { "...": {} },
        "children": [] },
      { "id": 7, "hidden": false, "locked": false,
        "components": {
          "BodyComponent": { "type": "dynamic", "gravity_scale": 1, "linear_damping": 0, "merge": true },
          "JointComponent": { "type": "hinge", "a": { "entity": 5 }, "b": null }
        },
        "children": [] }
    ]
  }
}
```

- The World and the camera of a new level are written exactly as in `src/core/level-data/LevelWriter.newLevel.json`, which a test compares with the writer's output. Entity 7 is an illustration, with some values left out.
- **Entities are nested** (owner, 2026-11-15): the file holds one `world` entity, and each entity holds its `children` in Entities panel order, top row first. An entity has no `parent` key; its parent is the entity it sits in. *Why: the file's shape is the tree, so a missing parent, a parent listed after its child, an entity inside itself and a second World can't be written at all, and the World is the one entity at the top.* This replaces a flat list where each entity named its parent.
- **`children` is always written**, `[]` when there are none *(standing yes, 2026-11-15)*. *Why: every entity holds exactly the same keys, as the reader requires.*
- **Components are keyed by type name, in card order. Their values are keyed by attribute name** (the field's label in snake_case), the same names Lua uses, then the stored values under their key in snake_case (a shape's `geometry`). Values are written by each type's `serialize`.
- **The writer writes every value, defaults included** *(standing yes, 2026-11-14)*: the file says exactly what the level held, and a later change of a default can't change an old level.
- **Editor-only data** is `editor` (grid size, folded rows) and each entity's `locked`. The v3 play file drops them; `hidden` stays.
- **A missing value reads as its default**, so a field added to a component later needs no upgrade code. An unknown component type or an unknown value makes the file "damaged".
- **The physics version** is a whole number that goes up whenever the game's Box2D build changes. A table in `core/level-data/versions/PhysicsVersions.ts` names the build for each number (1: `box2d3-wasm` 6.0.0, Box2D 3.2). v1 only records it, as the requirement says.

## Reading and writing

`core/level-data` holds the types (`LevelData`, `EntityData`, `ComponentData`, `EditorData`), `LEVEL_FORMAT` and `CURRENT_FORMAT_VERSION`, `LevelLimits` with `V1_LEVEL_LIMITS` (100,000 entities, 256 deep, 1,000 points, 256 MB), `PhysicsVersions`, `FormatUpgrader` and the writer and reader. Limits are a plain object passed in, so a test can use small ones.

```typescript
export class LevelWriter {
    write(level: Level): LevelData;
    writeSubtree(entities: readonly Entity[]): readonly EntityData[];   // one nested EntityData per root
    writeNewEntity(id: EntityId, components: readonly AnyComponent[]): EntityData;  // not in a level yet, no children
}

export class LevelReader {
    constructor(registry: ComponentRegistry, limits: LevelLimits, upgrader: FormatUpgrader);
    readJson(text: string): ReadOutcome<Level>;                   // level.json's text; not JSON is notALevel
    read(raw: unknown): ReadOutcome<Level>;                       // a whole level
    readFragment(raw: unknown): ReadOutcome<EntityFragment>;      // the clipboard, .entity files (v2)
}

export type ReadOutcome<T> = { ok: true; value: T } | { ok: false; refusal: ReadRefusal };

export type ReadRefusal =
    | { reason: 'notALevel' }
    | { reason: 'damaged'; detail: string }
    | { reason: 'newerVersion'; fileVersion: number }
    | { reason: 'overLimit'; limit: 'entities' | 'depth' | 'points' | 'size'; max: number }
    | { reason: 'missingFile'; path: string };                    // v2
```

- **Parse at the boundary:** `raw` is `unknown` until `LevelReader` has checked every entity, parent, component and value with its field type. After that, the rules trust the types.
- **Upgrading:** `FormatUpgrader` holds a list of steps, each turning version N's JSON into N+1's, so the latest version is one more than the number of steps. v1 has none. A file with a higher `formatVersion` than the game knows is refused with "made by a newer version of the game". Versions are never rolled back, as the tech notes warn.
- **As built (2026-11-14), the reader's rules** *(standing yes, 2026-11-14)*:
  - **The top of the file and each entity must hold exactly their keys**: `format`, `formatVersion`, `physicsVersion`, `name`, `editor`, `world`, and `id`, `hidden`, `locked`, `components`, `children`. The writer always writes them all, and a later change to these shapes is a format version with an upgrade step. Only component values read as their defaults when missing.
  - **A physics version above the game's own is refused as `newerVersion`**, with the file's format version: only a newer game can write one.
  - **The World is the `world` entity**, and must hold its ShapeComponent (a rectangle), StyleComponent and PhysicsWorldComponent, and no BodyComponent or SurfaceComponent. **The camera is the one entity with a CameraComponent.** A missing TransformComponent or NameComponent is made with its defaults, on any entity.
  - **The reader counts the depth as it goes down** and refuses the file as `overLimit` on reaching 257 levels, before reading further *(standing yes, 2026-11-15)*. *Why: a nested file is read by going down into it, so a file nested thousands deep must stop at the limit, not run out of stack.*
  - **A value goes through the component's `writeValue`**, so its type's `parse` refuses it and its `normalize` clamps it, exactly as when the user types it. The point limit is checked on the parsed ShapeComponent and PathComponent.
  - **A folded row whose entity isn't in the file is dropped**, because deleting an entity doesn't unfold its row. The grid size is clamped to 5 to 1,000 px like any other change.
  - **The level is built only once everything is checked**, with `Level.createEmpty(worldId, cameraId)`, so a refused file never makes half a level. The camera is moved to its place among the World's children last.
  - Inside, each check throws a `ReadRefused` that `read` turns into the refusal, so no exception leaves the reader for a bad file.
  - **A joint's A or B that names an id not in the file is kept**, and the field shows `missing entity`, as the joints rules say.
  - `readFragment` (the clipboard, `.entity` files) is built with the clipboard, in stage 11.
- **What the reader refuses**, each with a test:

  | Case | Refusal |
  |---|---|
  | Not JSON, or no `"format": "engine-v3-level"` | `notALevel` |
  | `formatVersion` or `physicsVersion` above the game's own | `newerVersion` |
  | A missing or extra key at the top or on an entity | `damaged` |
  | An id that isn't a whole number from 1, or used twice | `damaged` |
  | A `world` or an entity that isn't an object, or `children` that isn't a list | `damaged` |
  | Not exactly one CameraComponent, or the camera not directly inside the World | `damaged` |
  | A PhysicsWorldComponent anywhere but the World, the World missing one of its components, a World shape that isn't a rectangle, or a BodyComponent or SurfaceComponent on the World | `damaged` |
  | An unknown component, or an unknown value inside one | `damaged` |
  | A value its value type refuses, such as an empty name or a scale of 0 | `damaged` |
  | Over 100,000 entities, deeper than 256, more than 1,000 points in a shape or path | `overLimit` |

- **The 256 MB limit is checked where the bytes are** (stage 2, standing yes, 2026-11-14), not by the reader: `read` takes data already parsed from JSON, so it can't count bytes, and measuring the level after each change would be slow. `LevelLimits` holds the number; the import worker counts the unpacked bytes and the save measures the text it already has, both in stage 12.
- **The same reader** reads imports, the browser's saved level, the clipboard, the play copy in the worker and (v2) `.entity` files. So a damaged saved level and a damaged import fail the same way.

## The project file

```
castle.editable          a zip, under its own extension
  level.json
  files/                 from v2: the Assets panel's files, by their path
    scripts/coin.lua
```

```typescript
export class ProjectFile {
    constructor(writer: LevelWriter, zip: ZipCodec);
    pack(level: Level): Promise<Uint8Array>;
}
```

- **Export and Ctrl+S** save the level to the browser first, as the requirement says, then pack it and hand it to `FileExporter`, named after the level with characters no file system allows replaced.
- **Import** asks first ("Replace the open level? Export it first if you want to keep it."), then sends the file to the import worker:
  1. Check the zip's directory without unpacking. The sizes it declares must add up to 256 MB or less (owner, 2026-11-13: the limit counts the unpacked size).
  2. Unpack with a running count, stopping the moment it passes 256 MB, whatever the directory said. This stops zip bombs without freezing the page.
  3. Check that `level.json` exists and parses, then run `LevelReader.read`.
  4. Answer with the `LevelData` or a refusal. The page then replaces the open level, all or nothing.
- **Dropping** an `.editable` file on the editor imports it after the same question.
- **The editor checks the same limits** before any change, so anything the editor can save, the same version can import.

## In the browser

| What | Where | When |
|---|---|---|
| The level | IndexedDB `engine-v3`, store `level`, one record: `{ levelJson, savedAtMs }` | Autosave |
| The level's files (v2) | The same database, store `files`, each stored once by its hash, as the tech notes suggest | With the level |
| Editor settings: view position and zoom, grid shown, View menu switches, folded cards, "persist already asked" | `localStorage`, `engine-v3/settings`, JSON | When they change |
| Kept variables (v3), the pinned seed (v3) | `localStorage` | When they change |

**Autosave:**

```typescript
export class Autosave {
    static readonly quietDelayMs = 2_000;
    static readonly longestWaitMs = 20_000;

    constructor(level: Level, store: LevelStore, writer: LevelWriter, timer: Timer, clock: Clock);
    readonly state: SaveState;            // saved, saving, unsaved, failed
    saveNow(reason: 'hidden' | 'play' | 'export'): Promise<void>;
    setDragging(isDragging: boolean): void;
}
```

- It watches `levelVersion`. A change starts the quiet delay (2 s, restarted by each change) and, if not already running, the longest wait (20 s from the first unsaved change). It waits while a drag is in progress. It also saves when the tab is hidden, on Play and before an export.
- **A save is all or nothing:** the whole `level.json` is written in one IndexedDB transaction with strict durability, so it either fully replaces the last save or leaves it as it was.
- **A failed save** sets `SaveState` to `failed`, adds the level-wide editor message, and keeps retrying every 10 seconds. Export still works because it doesn't touch storage.
- **The leave prompt** is armed only while `SaveState` isn't `saved`, as the requirement says.

**Opening the editor:**

1. `WebLockTabGuard` asks for the level's lock. Without it, the tab says the level is open elsewhere and stays read-only.
2. `IndexedDbLevelStore.load()` reads the record. If storage can't be opened at all, the editor runs on a new level and says nothing will be saved.
3. `LevelReader.read()` checks it like an import. If it fails, the editor offers to export the raw data, starts a new level, and never deletes the saved record.
4. With no saved level, a new one is made with the World and the camera, and the view fits the camera frame.
5. After a crash (the last session didn't close cleanly, noted in `localStorage`), the status text says when the level was last saved.

**Site data cleared while open:** the next save finds the store empty, writes the level again, and says so.
