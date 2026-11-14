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
  "entities": [
    { "id": 1, "parent": null, "hidden": false, "locked": false,
      "components": {
        "NameComponent": { "name": "World" },
        "TransformComponent": { "position": { "x": 0, "y": 0 }, "rotation": 0, "scale": { "x": 1, "y": 1 }, "skew": 0 },
        "ShapeComponent": { "geometry": { "kind": "rectangle", "width": 20000, "height": 10000 } },
        "StyleComponent": { "fill": { "kind": "solid", "colour": "#BFE3F5FF" }, "outline_colour": "#1F3552FF", "outline_width": 0, "opacity": 1 },
        "PhysicsWorldComponent": { "gravity_strength": 9.8, "gravity_direction": "down", "gravity_angle": 90, "walls": false }
      } },
    { "id": 2, "parent": 1, "hidden": false, "locked": false,
      "components": { "...": {} } },
    { "id": 7, "parent": 1, "hidden": false, "locked": false,
      "components": {
        "BodyComponent": { "type": "dynamic", "gravity_scale": 1, "linear_damping": 0, "merge": true },
        "JointComponent": { "type": "hinge", "a": { "entity": 5 }, "b": null }
      } }
  ]
}
```

- The World and the camera of a new level are written exactly as in `src/core/level-data/LevelWriter.newLevel.json`, which a test compares with the writer's output. Entity 7 is an illustration, with some values left out.
- **Entities are a flat list in Entities panel order** (pre-order, top row first). Each names its parent, which must appear before it; the order of the list is the order of each parent's children. A flat list is easy to check for cycles and depth, and reads well in a diff.
- **Components are keyed by type name, in card order. Their values are keyed by attribute name** (the field's label in snake_case), the same names Lua uses, then the stored values under their key in snake_case (a shape's `geometry`). Values are written by each type's `serialize`.
- **The writer writes every value, defaults included** *(standing yes, 2026-11-14)*: the file says exactly what the level held, and a later change of a default can't change an old level.
- **Editor-only data** is `editor` (grid size, folded rows) and each entity's `locked`. The v3 play file drops them; `hidden` stays.
- **A missing value reads as its default**, so a field added to a component later needs no upgrade code. An unknown component type or an unknown value makes the file "damaged".
- **The physics version** is a whole number that goes up whenever the game's Box2D build changes. A table in `core/level-data/PhysicsVersions.ts` names the build for each number (1: `box2d3-wasm` 6.0.0, Box2D 3.2). v1 only records it, as the requirement says.

## Reading and writing

`core/level-data` holds the types (`LevelData`, `EntityData`, `ComponentData`, `EditorData`), `LEVEL_FORMAT` and `CURRENT_FORMAT_VERSION`, `LevelLimits` with `V1_LEVEL_LIMITS` (100,000 entities, 256 deep, 1,000 points, 256 MB), `PhysicsVersions`, `FormatUpgrader` and the writer and reader. Limits are a plain object passed in, so a test can use small ones.

```typescript
export class LevelWriter {
    write(level: Level): LevelData;
    writeSubtree(entities: readonly Entity[]): readonly EntityData[];
}

export class LevelReader {
    constructor(registry: ComponentRegistry, limits: LevelLimits, upgrader: FormatUpgrader);
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
