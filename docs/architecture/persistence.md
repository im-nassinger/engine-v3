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

- **Parse at the boundary:** `raw` is `unknown` until `LevelReader` has checked every entity, its children, components and values with their field types. After that, the rules trust the types.
- **Upgrading:** `FormatUpgrader` holds a list of steps, each turning version N's JSON into N+1's, so the latest version is one more than the number of steps. v1 has none. A file with a higher `formatVersion` than the game knows is refused with "made by a newer version of the game". Versions are never rolled back, as the tech notes warn.
- **As built (2026-11-14), the reader's rules** *(standing yes, 2026-11-14)*:
  - **The top of the file and each entity must hold exactly their keys**: `format`, `formatVersion`, `physicsVersion`, `name`, `editor`, `world`, and `id`, `hidden`, `locked`, `components`, `children`. The writer always writes them all, and a later change to these shapes is a format version with an upgrade step. Only component values read as their defaults when missing.
  - **A physics version above the game's own is refused as `newerVersion`**, with the file's format version: only a newer game can write one.
  - **The World is the `world` entity**, and must hold its ShapeComponent (a rectangle), StyleComponent and PhysicsWorldComponent, and no BodyComponent or SurfaceComponent. **The camera is the one entity with a CameraComponent.** A missing TransformComponent or NameComponent is made with its defaults, on any entity.
  - **The reader counts the depth as it goes down** and refuses the file as `overLimit` on reaching 257 levels, before reading further *(standing yes, 2026-11-15)*. *Why: a nested file is read by going down into it, so a file nested thousands deep must stop at the limit, not run out of stack.* As built (stage 9 step 2), the entity count is kept the same way, and a test reads a file nested 50,000 deep and stops at the limit.
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

    constructor(options: { session: EditorSession; store: LevelStore; writer: LevelWriter; timer: Timer; clock: Clock });
    readonly state: SaveState;            // saved, saving, unsaved, failed
    saveNow(): Promise<void>;             // the tab hidden, Play, an export
}
```

- It watches `levelVersion`. A change starts the quiet delay (2 s, restarted by each change) and, if not already running, the longest wait (20 s from the first unsaved change). It waits while a drag is in progress, read from `LiveEdit`. It also saves when the tab is hidden, on Play and before an export.
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

## Stage 12's choices

Made under the standing yes (2026-11-16), before building. The [plan](../plan.md#stage-12-in-steps) has the steps.

- **Where things live:** `Autosave`, `SaveState`, `EditorSettings`, `LevelOpener`, `ProjectFile`, the import's checks (`ImportCheck`, run by `ImportWorkerHost`) and the contracts `LevelStore`, `SettingsStore`, `TabGuard`, `StoragePersistence`, `ZipCodec`, `ZipReader`, `FileImporter`, `FileExporter` and `FilePicker` are in `editor/saving/`, one subfolder per job (`autosave/`, `settings/`, `opening/`, `project-file/`, `import/`, `contracts/`, `testing/` for the fakes). The New, Import and Export commands are in a new `editor/commands/file/`, in the File menu. The adapters are in `adapters/storage/`, `adapters/zip/`, `adapters/worker/` and a new `adapters/browser/files/` (`FileDownload`, `BrowserFilePicker`, dropping). *Why: the commands are what the menu and keys run, the rest is saving's own rules, as stage 11 split the clipboard.* `EditorSession` gains no `SaveCoordinator`: the composition holds `Autosave` and `LevelOpener`, and the commands get them as `FileParts`, as the clipboard commands get `ClipboardParts`. *Why: `editor/session` importing `editor/saving`, which reads the session's open level, would be a cycle.*
- **`Autosave` follows the session, not one level**: it reads `session.openLevel.level.version` and starts over on `openLevelChanged`, so New and Import need no new `Autosave`. *Why: the page builds it once, like the rest of the composition.*
- **One save at a time:** a change during a save marks the level unsaved again, and the next save starts when the running one ends, by the same timers. `saveNow` waits for a running save, then saves if anything is unsaved, and resolves when it is written or failed.
- **As built (step 2)** *(standing yes, 2026-11-16)*: `saveNow()` takes no reason, since it does the same for the tab hidden, Play and an export. The level open when `Autosave` is built counts as saved; a level opened later counts as unsaved until it is saved, because the store still holds the old one, and a save of the old level ending after it opens doesn't mark it saved. The contracts are `LevelStore` (`load`, `save` answering `replaced` or `wroteNew`), `SettingsStore` (one text, `read` and `write`, never throwing), `TabGuard` (`acquire` resolving whether this tab has the lock) and `StoragePersistence` (`persist`), with `InMemoryLevelStore`, which can refuse saves or hold them until a test finishes them, `InMemorySettingsStore`, `FakeTabGuard` and `FakePersistence` in `editor/saving/testing/`. The `damaged` record joins `LevelStore` in step 7.
- **As built (step 3)** *(standing yes, 2026-11-16)*: a failed save keeps `SaveState` at `failed` through later changes, and only a save that works makes it `saved` again, because the top bar must keep saying the browser holds an older level. The level-wide message is under the source `saving` in `EditorMessages`, and is set again on a level opened while it stands. A level over 256 MB is not tried again every 10 s, since only a change can make it fit; the next change saves by the usual delays. The size is counted from the text's UTF-16 units without making the bytes (`utf8Length`), skipped when three bytes for each unit still fit. `wroteNew` counts as site data cleared only after a save worked in this session, so the first save into an empty browser says nothing; a record cleared before this session's first save goes unnoticed, which costs nothing because the save writes it again anyway. `persistAsked` is kept by `PersistAskedSetting` in `editor/saving/settings/`, which changes only that key of the settings' JSON; `EditorSettings` takes it over in step 5. `Autosave` takes it as a `PersistAskedRecord`, with the `StoragePersistence` and the `LevelLimits` (V1's when not given).
- **As built (step 4)** *(standing yes, 2026-11-16)*: the adapters are in `adapters/storage/`, one subfolder each (`level/`, `settings/`, `tabs/`, `persistence/`), with `idb` 8.0.4 installed. `IndexedDbLevelStore` keeps the level under the key `level` in the store `level` (out-of-line keys, so step 7's `damaged` record is a second key, with no new database version), and reads whether a record was there in the same strict transaction as the write. The database is opened on first use and opened again after a failed opening or after the browser closes it, so the 10 s retry can work once storage is back. A record of the wrong shape loads with its whole JSON text as `levelJson`, so `LevelReader` refuses it as damaged and step 7 keeps its data. `WebLockTabGuard` gives the lock when the browser has no Web Locks or refuses the request, because a tab that can't tell must still be able to edit. `BrowserPersistence` answers no when the API is missing or fails. Each takes its browser object as an optional getter, so the tests can give one that throws; the database, key and lock name can be changed only so tests don't share them. In Firefox, `persist()` waits for the user's answer to a prompt, which `Autosave` never awaits.
- **As built (step 5)** *(standing yes, 2026-11-16)*: `EditorSettings` in `editor/saving/settings/` reads the JSON once when built, before the session and the first draw, and gives the session its `ViewSettings` (`createViewSettings`) and its `FoldStore`, and `Autosave` its `PersistAskedRecord`, which replaces step 3's `PersistAskedSetting`. **The grid shown is the `grid` switch inside `viewSwitches`**, not a key of its own, because it already is one of the View menu's switches. The view is saved as `view: { x, y, zoom }`, the level position at the view's middle; it is damaged as a whole when a number isn't finite or the zoom is outside 1% to 1,000%. Each view switch is checked on its own, and a folded card entry that isn't a component type's name drops alone. `follow(session)` puts the saved view back and answers whether it did; the page fits the camera frame only when it didn't. Changes are written on the next frame, but `persistAsked` is written at once, because it follows a save that may run in a hidden tab, where the browser runs no frames. Keys it doesn't know, like step 7's `sessionOpen` and `lastSavedAtMs`, are kept as they were. `PersistAskedRecord` moved to `contracts/`, since `settings/` importing it from `autosave/` made a cycle with `Autosave`'s tests.
- **As built (step 6)** *(standing yes, 2026-11-16)*: `EditorSession.readOnly` reads a `ReadOnlyMode` in `editor/history`, which the session shares with every `OpenLevel` it builds, so New and Import stay read-only; `makeReadOnly()` turns it on and nothing turns it off, since v1 has no "Edit here instead". *Why: `editor/history` can't import the session, and one shared flag can't be forgotten by a level opened later.* `LevelEditor.edit` refuses with `READ_ONLY_REASON` before running the edit, and `undo` and `redo` do nothing, because undoing a step made before the tab turned read-only would change the level too. `LiveEdit.begin` answers `false` with nothing begun, and every caller (the nudges, the points, the Inspector's slider, the Select tool's move, resize, rotate and point drags) starts no drag and shows the reason. The registry's commands that edit (Undo, Redo, Duplicate, Delete, Rename, Hide or show, Group, Ungroup, the nudges) are wrapped in one `ReadOnlyGuard`, which disables and refuses them with the reason before their own rules; Cut and Paste check for themselves, because `ClipboardEvents` calls their `cut()` and `pasteText()` directly, and a read-only Cut copies nothing, since a cut that only copied would look as if it had deleted. Copy, Select all, Go into group, the View menu and About stay as they are. The Shape tool starts no drawing, saying why, like inside a locked group. `Autosave` checks `readOnly` too and never writes, so a read-only session is safe even if the page builds it. *Why: the step asks that no save is written, and a check in `Autosave` is what the tests can prove.*
- **As built (step 7)** *(standing yes, 2026-11-16)*: `LevelOpener` in `editor/saving/opening/` runs before the session is built, and `open()` answers an `Opening`: the `Level`, `readOnly`, `canSave` (false when read-only, when storage can't open, or when a damaged record couldn't be kept apart), `isNew` (the view fits the camera frame), the `damaged` record's raw text and notice, and the status text. *Why: `EditorSession` is built with its level, so opening first saves building a throwaway level.* **The crash note's time is the saved record's `savedAtMs`**, so `lastSavedAtMs` is dropped from the settings. *Why: the record already holds when it was written, and a second copy could disagree with it.* `sessionOpen` is a `SessionOpenRecord` kept by `EditorSettings`, written at once; only the tab with the lock reads and sets it. *Why: the second tab finds it set by the first, which is no crash, and clearing it as it closes would hide the first tab's crash.* A read-only tab opens the saved level and writes nothing: a damaged record gives it the notice but no copy, which the tab with the lock makes. A damaged record is copied with `LevelStore.keepDamaged` (the key `damaged` in `IndexedDbLevelStore`), then a new level is saved over the main record at once; if the copy fails, saving stays off for the session, with `Nothing will be saved in this browser`, because `Autosave` would overwrite the only copy. If only the new level's save fails, the next change saves it. The notice names the reason in plain words (`it is damaged`, `it isn't a level`, `it was made by a newer version of the game`, `it has more than 100,000 entities`), never the reader's detail. The local time comes through a new `TimeOfDay` contract in `editor/time`, `LocalTimeOfDay` in the page and `FixedZoneTimeOfDay` in tests, since the editor never uses `Date`. Building `SaveState`'s `failed` for storage that can't open, and clearing `sessionOpen` on `pagehide`, wait for step 11's page.
- **As built (step 8)** *(standing yes, 2026-11-16)*: `ZipCodec.pack` takes `ZipEntry`s whose data is bytes or text, and the codec writes text as UTF-8. *Why: the editor's code has no `TextEncoder`, and the adapter has a fast one.* `FflateZipCodec` in `adapters/zip/` uses `fflate`'s asynchronous `zip`, which packs in its own workers, so a big level doesn't freeze the page; it is tested in Node, as it is pure. The flow is `LevelExport` in `editor/saving/project-file/`: `saveNow()` (any `SavesNow`), then `ProjectFile.pack`, then `FileExporter.exportFile` with the name from `projectFileName` and the type `application/zip`. `ExportCommand` in `editor/commands/file/` gets it through `FileParts`, is in the File menu's first section (New and Import join it), is never disabled, even read-only, since Export only reads, and works everywhere, as the shortcut table says. Its run returns at once; the status text `Exported castle.editable`, or `Export failed. Try again` (*proposal*) if packing fails, comes when the file is handed out. `FileDownload` in `adapters/browser/files/` clicks a hidden link with `download` to a Blob's object URL and frees the URL after 60 s, so every browser has started reading it. Until step 11 builds `Autosave` in the page, the page's Export has nothing to save first. `StoredZipCodec` and `FakeFiles` are the fakes in `editor/saving/testing/`.
- **As built (step 9)** *(standing yes, 2026-11-16)*: reading a zip is its own contract, `ZipReader` in `editor/saving/contracts/`, not more of `ZipCodec`. *Why: the page only packs and the worker only reads, so neither carries the other's half.* `FflateZipReader` in `adapters/zip/` reads the central directory itself (`readZipDirectory`), since `fflate` has no way to list a zip without unpacking it; a zip64 size counts as more than any limit, because v1 never writes one and a level fits in 32 bits. It unpacks with `fflate`'s streaming `Unzip`, fed 16 KB at a time, so one piece gives at most about 17 MB and the count stops a 300 MB bomb just past 256 MB in under a second. `ImportCheck` in `editor/saving/import/` is synchronous, since it runs in the worker. **Too big is the reader's own `overLimit` refusal with the limit `size`**, not a new reason, so step 10 has one refusal type to turn into a message. A zip without `level.json` isn't a level; `level.json` that isn't UTF-8 or JSON, or data that won't unpack, is damaged. The answer is the level written again by `LevelWriter`, so the page gets current-format `LevelData` even from an older file. The page reaches the worker through a new `FileImporter` contract; `ImportWorkerClient` in `adapters/worker/import/` starts **a new worker for each file** and ends it after the answer, so a big file's memory is given back at once. *Why: imports are rare, and a worker starts in milliseconds.* A check that throws answers `failed`, and the client rejects. `createImportWorker` in `app` starts it in the form Vite builds; the page wires it in step 10. `FakeZipReader` is the fake.
- **As built (step 10)** *(standing yes, 2026-11-16)*: `FilePicker.pickFile()` answers a `PickedFile` (its name and `read()` for the bytes) or `undefined` for a cancel; `BrowserFilePicker` clicks a hidden file input offering `.editable`, inside the Replace button's click, which the browser needs before it shows its dialog, so the question comes first and the picker after. *Why: a picker opened after an await is refused by the browser.* `LevelImport` in `editor/saving/import/` sends the bytes to the `FileImporter` and reads the answer again into a `Level`; a file the browser can't read or a worker that fails counts as damaged, so it has the same message. **The damaged message has no detail**: `This level file is damaged`, not `...: <detail>` as the earlier proposal had it. *Why: `ReadRefusal`'s detail is for developers and is never shown, as the opening's notice already does.* The refusals show in a notice titled `Can't import` (*proposal*); `importRefusalText` writes them, and an over-limit one names the limit with the opening's own words (`This level is over a limit: it has more than 100,000 entities`). `LevelReplacement` in `editor/commands/file/` holds what New, Import and dropping share: the question (`New level` or `Import` as its title, the requirement's text, `Replace` as its button), then `replaceOpenLevel`, the view fitted to the new camera frame and `saveNow`. Import shows `Importing castle.editable`, then `Imported castle.editable` (*proposal*); New shows `New level`. **New is wrapped in `ReadOnlyGuard`; Import checks a read-only tab itself**, like Cut and Paste, because `FileDropEvents` calls its `importDropped` directly. *Why: a read-only tab must not replace the level another tab saves.* An answer that comes after the command has returned (the refusal's notice) goes through a new `LateOutcomes` in `FileParts`, which the `CommandRunner` fulfils, so the composition builds the runner before the registry. **Dropping listens on the window**, in `FileDropTarget` in `adapters/browser/files/`, not in `ui/level-view-host` as the step said. *Why: the requirement says dropping on the editor, and a file dropped on a panel would otherwise be opened by the browser in place of the editor.* A drag carrying files is taken as a copy; other drags stay the browser's; only the first file is used; nothing happens while a dialog is open. Until step 11 builds `Autosave` in the page, the page's `saveNow` does nothing.
- **As built (step 11)** *(standing yes, 2026-11-16)*: `SaveIndicator` in `editor/saving/indicator/` is what the page shows of saving, built by `SaveIndicator.forOpening` from the `Opening` and the `Autosave` (if any): the top bar's label and the explanation on click (`Saved`, `Saving`, `Unsaved changes`, `Save failed` with `Autosave`'s message, `Read-only` with `The level is open in another tab`), and `hasUnsavedChanges` for the `*` and the leave prompt. A read-only tab never counts as unsaved, since leaving it loses nothing; storage that can't open shows `Save failed` for good and always counts as unsaved, since leaving loses the level. *Why: one object answers the label, the title and the prompt, so they can't disagree.* `SaveStateButton` in `ui/top-bar/` reads it from `SaveIndicatorContext` (`ui/save-state/`); its explanation is a popup that Esc and a press outside close, with `Menu`'s closing moved to `usePopupClosing` in `ui/shared/popup-closing/` so both share it. `TabTitle` and `PageSavingEvents` are in `adapters/browser/page/`: the title is `*castle - engine-v3` while unsaved (it moved out of `LevelName`); a hidden tab writes the settings and saves at once; `pagehide` does the same and clears `sessionOpen`, which `pageshow` from the back-forward cache sets again; the `beforeunload` listener is added only while unsaved, since an always-on one keeps some browsers from caching the page. A read-only tab gets no `sessionOpen`, so its closing can't hide the other tab's crash. `EditorComposition` runs `LevelOpener` before building the session, with one registry and reader for both; makes the session read-only when the lock was refused; starts `Autosave` only when the opening `canSave`; and shows the opening's status text, or the read-only reason, then the damaged level's notice (`Export raw data` and `Close`, the cancel button's label now set by the `Question`). `ExportedFile` carries bytes or text, which `FileDownload` writes as UTF-8, so `damaged-level.json` needs no encoder in the editor. **A new opening fits the camera frame even when the settings hold a view.** *Why: a view kept from an earlier, now replaced level would show nothing of the new one.*
- **As built (step 12)** *(standing yes, 2026-11-16)*: the five Playwright tests are in `tests/e2e/saving.spec.ts`. **They import by dropping the file, not through the picker.** *Why: Playwright's Firefox fires the file input's `cancel` before `setFiles`'s `change`, so the picker gives nothing there; a person at the dialog isn't affected (see [tech-notes.md](../tech-notes.md)).* The exported file's name is not compared in WebKit, whose downloads report spaces as underscores. The full disk is an init script that makes `IDBObjectStore.put` fail with a `QuotaExceededError`; the zip bomb's directory lies about its size, and the test checks that the page still draws frames while the worker refuses it.
- **The drag:** `Autosave` reads `LiveEdit`'s `isActive` (a new `VersionCounter` on it) instead of a `setDragging` call. *Why: every drag already goes through `LiveEdit`, so nothing can forget to say it started.* A save due during a drag waits for the drag's end; the longest wait still counts from the first unsaved change.
- **The 256 MB check on save** measures the UTF-8 length of the text it already has. Over the limit, the save is not written, `SaveState` is `failed`, and the level-wide message reads `This level is over 256 MB and can't be saved. Delete something to save it again`. *Why: the requirement says the editor checks limits before each change, but in v1 nothing but points and entities adds size, and both are already limited, so this only guards a case the limits should prevent.*
- **The failed save's message**, level-wide in `EditorMessages`: `Saving in this browser failed. Your changes are kept while this tab is open, and Export still works` (*proposal*). The retry runs every 10 s while `failed`, and a change still saves sooner, by the usual delays.
- **Site data cleared:** `LevelStore.save` reports whether a record was there before (`replaced` or `wroteNew`). A `wroteNew` after the first save of this opening shows the status text `The browser's saved data was cleared. The level was saved again` (*proposal*).
- **Asking to persist** happens once, after the first save that works, and `persistAsked` in the settings stops it being asked again in any later session. A refusal is not shown. *Why: the requirement says ask once, and a browser that refuses needs no message.*
- **The settings** are one JSON object in `localStorage` under `engine-v3/settings`: `view` (position and zoom), `viewSwitches` (with the grid shown), `foldedCards`, `persistAsked` and `sessionOpen`. Each key is checked on its own; a missing or damaged key gives its default. Writes are batched to one per frame. The view's position is the level's, so a reload shows the same place.
- **The crash note:** `sessionOpen` is set true when the editor opens and false on `pagehide`. Opening with it already true and a saved record shows `Recovered from your last save at 14:32. The last few seconds may be missing.`, the time from the saved record's `savedAtMs` in the browser's local time, written as 24-hour `HH:MM` (*proposal*).
- **A second tab is read-only:** `EditorSession.readOnly` is set by the composition when `TabGuard` gives no lock. `LevelEditor.edit` and `LiveEdit.begin` refuse with `The level is open in another tab`, the commands that edit are disabled with that reason, and the tools start no edit. Selecting, panning, zooming, the View menu and Copy work. `Autosave` isn't started. The top bar shows `Read-only` in the save state's place, with the same text on click. *Why: the level can be looked at and copied from, which is all a second tab can safely do.*
- **A saved record that won't open** is copied to the store's second record, `damaged`, with its read refusal, before anything else is saved; the main record is then the new level. A notice says `The saved level couldn't be opened: <reason>. It is kept, and you can export its raw data.` with `Export raw data` and `Close`. The raw data downloads as `damaged-level.json` (*proposal*). A later damaged record replaces the kept one. *Why: the requirement says never delete it; keeping it in its own record lets the editor save the new level without losing it.*
- **Storage that can't open** (IndexedDB missing or refusing) gives a new level, `SaveState` `failed` with the status text `Nothing will be saved in this browser`, and Export works.
- **The import worker answers with plain `LevelData`**, already checked by `LevelReader.read` inside the worker; the page runs `read` again to build the `Level`. *Why: a `Level` can't cross to the page, and reading 100,000 entities twice costs less than a second, against a check that never freezes the page.* The worker reads an `ArrayBuffer` that is transferred, not copied.
- **The import's checks** are in `ImportCheck` in `editor/saving/import/`, run by `ImportWorkerHost` with a `ZipReader`, so Node tests cover every refusal. The running count uses `fflate`'s streaming `Unzip`, which stops the moment the count passes 256 MB. A file whose name doesn't end in `.editable` is still read; only what is inside decides. *Why: the extension says what a file is for, but a renamed good file is no harm.*
- **The import's messages**, in a notice dialog (*proposal*): `This file isn't a level`, `This file is too big: a level holds at most 256 MB`, `This level file is damaged` (step 10 dropped the detail), `This level was made by a newer version of the game`, `This level is over a limit: <limit>`.
- **New and Import always ask first**, as the requirement says, even for an empty level. After replacing, the new level is saved at once through `saveNow`, the view fits the camera frame, and the history is empty. New is menu-only, since Ctrl+N doesn't reach pages.
- **The file name** replaces `\ / : * ? " < > |` and control characters with `_`, trims spaces and dots from both ends, and falls back to `level` when nothing is left.
- **Export saves to the browser first, then packs** whatever the save gave, even `failed`, so a full disk never blocks it.
- **The leave prompt** is `beforeunload`'s `preventDefault`, added only while `SaveState` isn't `saved` and removed when it is. *Why: an always-on listener stops some browsers keeping the page in their back-forward cache.*
- **Saving when hidden** listens to `visibilitychange`; `pagehide` also clears `sessionOpen`. Play's `saveNow()` comes with stage 16.
- **The tests:** `Autosave`, `LevelOpener`, `EditorSettings` and `ImportCheck` in Node with fakes and `ManualTimer`; the adapters in Vitest's browser mode in three browsers; the full disk in Playwright by an init script that makes IndexedDB's `put` fail with a `QuotaExceededError`. *Why: browsers have no setting to fill the disk, and testing.md rules out `fake-indexeddb`.*
