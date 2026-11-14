# Entities and the level

## TL;DR

**`Level` owns the tree:** which entity sits in which parent, in which order. **`Entity` owns its components and its own hidden and locked switches.** Every change raises a change signal, which the derived caches, the renderer and React listen to. Ids are whole numbers from an `EntityIdAllocator` that only counts up, so an id is never reused in a session or a run. Children are kept in Entities panel order, so a pre-order walk of the tree is both the run order and, read backwards, the draw order. Copies, undo of a delete, saving, the clipboard and the play copy all use one data shape, `EntityData`, from [the level data format](../persistence.md).

## Ids

- `type EntityId = number`, declared in `core/fields` beside `EntityFieldType`, the lowest code that needs it, and exported again by `core/entities`. Whole numbers starting at 1. A new level's World is 1 and its camera 2.
- `EntityIdAllocator.next()` returns the highest id ever seen plus one. Loading a level, or restoring an entity on undo, calls `reserve(id)`, which only raises the highest.
- **Never reused in a session:** a deleted entity's id stays free, so undo brings the entity back with the same id and every link to it works again. After a reload the history is gone, so reusing a deleted id is harmless.
- **The play copy keeps the editor's ids** (owner, 2026-11-13). Spawned entities (v2) get ids from the run's own allocator, which starts above the level's highest id.
- Entity fields (a joint's A and B, the camera's follow target) store an `EntityId`. An id that no longer exists reads as `missing entity`.
- Component ids for Lua (v2): each component type gets a fixed index in the registry, so a component id can be computed from the entity id and that index. Nothing is stored.

## Entity

```typescript
export type EntityId = number;

export class Entity {
    readonly id: EntityId;
    private readonly tree: LevelTree;
    private readonly signals: LevelSignals;
    private readonly componentsByType: Map<ComponentTypeName, Component>;
    private hiddenSwitch: boolean;
    private lockedSwitch: boolean;

    // Only Level constructs entities.
    constructor(id: EntityId, tree: LevelTree, signals: LevelSignals);

    get parent(): Entity | undefined;
    get children(): readonly Entity[];          // Entities panel order, index 0 is the top row
    get depth(): number;
    isAncestorOf(entity: Entity): boolean;

    get isHidden(): boolean;                    // its own eye, not its parents'
    setHidden(isHidden: boolean): void;
    get isLocked(): boolean;
    setLocked(isLocked: boolean): void;

    get components(): readonly Component[];     // in the fixed card order
    getComponent<T extends Component>(componentClass: ComponentClass<T>): T | undefined;
    requireComponent<T extends Component>(componentClass: ComponentClass<T>): T;
    hasComponent(componentClass: ComponentClass<Component>): boolean;
    addComponent(component: Component): AddComponentOutcome;      // refuses a second of one type
    removeComponent(componentClass: ComponentClass<Component>): Component | undefined;
}
```

- **As built (2026-11-14), the entity differs from the code above in three details:**
  - **`Entity` raises its own `changed` signal** (`EntityChange`: a component added, removed or changed, a switch changed), and `Level` listens and forwards it as a `LevelUpdate` with the entity added. Its constructor is `(id, tree)`, without `LevelSignals`. *Why: `LevelUpdate` names `Entity`, so an entity that imports `LevelSignals` makes a circle of imports, which dependency-cruiser refuses. It is the same pattern as `Component`.*
  - **`LevelTree<Node>` is generic over its node**, for the same reason: it never imports `Entity`.
  - **Component lookups and the map use `AnyComponent`**, and `ComponentClass<T extends AnyComponent>` lives in `core/components`, see [components-and-fields.md](components-and-fields.md#componentschema-and-component).
- `addComponent` subscribes to the component's `changed` signal and raises `valueChanged` for it; `removeComponent` unsubscribes. The component itself never knows its entity, see [components-and-fields.md](components-and-fields.md#componentschema-and-component).
- An entity on its own is just an id. What it is comes from its components, as the glossary says. There are no subclasses such as `JointEntity`.
- Whether the World, the camera or a joint allows a command is read from its components (the World's PhysicsWorldComponent, the CameraComponent, the JointComponent), never from a kind field.
- `name` lives in the NameComponent like any other value. `entity.requireComponent(NameComponent).get('name')` is wrapped by a small helper, `entityName(entity)`.

## Level

```typescript
export class Level {
    readonly world: Entity;
    readonly signals: LevelSignals;
    readonly editorData: LevelEditorData;       // grid size, folded rows: saved, never undone
    private readonly tree: LevelTree;
    private readonly entitiesById: Map<EntityId, Entity>;
    private readonly idAllocator: EntityIdAllocator;
    private levelName: string;

    static createNew(registry: ComponentRegistry): Level;   // World, camera, defaults

    get name(): string;
    rename(name: string): RenameOutcome;        // 1 to 60 characters, trimmed
    get camera(): Entity;
    get entityCount(): number;

    findEntity(id: EntityId): Entity | undefined;
    requireEntity(id: EntityId): Entity;

    createEntity(parent: Entity, index: number): Entity;                  // a new id
    restoreEntity(id: EntityId, parent: Entity, index: number): Entity;   // a known id: undo, loading
    moveEntity(entity: Entity, newParent: Entity, index: number): MoveOutcome;
    removeEntity(entity: Entity): void;                                   // with all its children

    entitiesInPanelOrder(): Iterable<Entity>;  // pre-order, top row first: the run order
    entitiesInDrawOrder(): Iterable<Entity>;    // back to front
}
```

- `MoveOutcome` is `{ moved: true } | { moved: false, reason: 'cycle' | 'tooDeep' | 'world' | 'cameraOutsideWorld' }`. The command turns a reason into the status text, see [errors.md](../errors.md).
- **Depth counts the parents above an entity:** the World is 0 deep, an entity directly inside it 1, and nothing goes past 256. A move is refused when the deepest entity of the moved subtree would end up past 256. `createEntity` and `restoreEntity` past 256 throw, because every command checks the limit first.
- The `index` of `moveEntity` is the entity's position among its new siblings once it has moved.
- `RenameOutcome` is `{ renamed: true, name } | { renamed: false, reason: 'empty' | 'tooLong' }`, counting characters (code points) after trimming.
- **Removing the World or the camera throws**, and so does `restoreEntity` with an id already in the level: commands never ask for either.
- **As built (2026-11-14), `Level.createNew` takes no registry**, because `core/entities` already imports every component (stage 2 plan, change 6). It gives the World a TransformComponent, a NameComponent (`World`), a ShapeComponent (a 20000 × 10000 rectangle centred on the origin), a StyleComponent (fill `#BFE3F5`, outline width 0) and a PhysicsWorldComponent, and the camera a TransformComponent, a NameComponent (`Camera`) and a CameraComponent, all at their defaults otherwise.
- **`LevelEditorData`** (built 2026-11-14) holds `gridSize` (50 px; `setGridSize` rounds to a whole number and clamps to 5 to 1,000 px, returning the size kept) and the folded rows (`isFolded`, `setFolded`, and `foldedRows()`, lowest id first, so the same folds always write the same file). Its `version` counter moves on each real change, and `Level` forwards it to `levelVersion`, so autosave sees a new grid size or a fold. It raises no `LevelUpdate`: nothing in the tree changed. *Why: autosave watches only `levelVersion`, and folds must be saved (standing yes, 2026-11-14).* Folded ids of removed entities stay in the set; the writer leaves out ids not in the level.
- `Level` changes only the tree. **Keeping an entity in place on screen when it changes parent is the command's job** (it rewrites the TransformComponent with the maths in [geometry.md](geometry.md)), because the rule is an editor rule.
- What other entities a removal affects (joints attached to a deleted entity) is also the command's job. `Level.removeEntity` removes exactly the subtree it is given.
- `LevelTree` is a small internal class holding the parent of each entity and the ordered children of each entity. It isn't exported from the module.

### Order

- **Children are a plain ordered array per entity**, top row first. Inserting at an index is an array splice. There are no fractional order keys, so nothing ever needs rebalancing.
- **Run order** (v2: triggers and scripts) is the pre-order walk, top row first. **Draw order** is the World first, because its fill is the background, then the same walk read backwards, so the top row ends up in front.
- The Entities panel's visible rows and the run order are both cached and rebuilt only when the tree version changes, see [performance.md](../performance.md).

### The World and the camera

| | World | Camera |
|---|---|---|
| Made by | `Level.createNew`, or the reader from the file | The same |
| Components | TransformComponent (fixed at zero, no card), NameComponent, ShapeComponent (a rectangle: the level bounds), StyleComponent (its fill: the background), PhysicsWorldComponent, and in v2 VariablesComponent, InputComponent and its triggers and scripts | TransformComponent, NameComponent, CameraComponent |
| Protected by | `Level`: can't be moved, removed or put under a parent | `Level`: always directly inside the World, can't be removed |
| Commands that skip it | Copy, cut, duplicate, delete, group, hide, rename | Copy, cut, duplicate, delete, group |

The World draws its rectangle with its fill, which is the background. Clicks never hit it: clicking empty space already shows the World in the Inspector.

## Change signals

Every class that owns state announces changes the same way.

```typescript
export class Signal<Payload> {
    subscribe(listener: (payload: Payload) => void): Unsubscribe;
    emit(payload: Payload): void;
}

export class VersionCounter {
    get version(): number;
    increment(): void;
    subscribe(listener: () => void): Unsubscribe;
}

export type LevelUpdate =
    | { kind: 'entityAdded'; entity: Entity }
    | { kind: 'entityRemoved'; entity: Entity; formerParent: Entity }
    | { kind: 'entityMoved'; entity: Entity; formerParent: Entity }
    | { kind: 'componentAdded' | 'componentRemoved'; entity: Entity; component: Component }
    | { kind: 'valueChanged'; entity: Entity; component: Component; key: string }
    | { kind: 'switchChanged'; entity: Entity; switchName: 'hidden' | 'locked' }
    | { kind: 'levelRenamed' };

export class LevelSignals {
    readonly updated: Signal<LevelUpdate>;
    readonly treeVersion: VersionCounter;      // any add, remove or move
    readonly entityVersions: EntityVersions;   // one counter per entity, for one Entities panel row or card
    readonly levelVersion: VersionCounter;     // anything at all: used by autosave
}
```

- Signals are synchronous. Listeners must not change the level while handling one. A listener that needs to react marks itself dirty and does its work later (on the next frame, or when asked).
- `EntityVersions` keeps listeners per entity id, so a change to one crate wakes only that crate's row and card, never all 10,000 rows.
- **Removing a subtree raises one `entityRemoved` per entity, children first**, each with the parent it had, so every listener can drop what it keeps per entity while the parent still exists.
- **Which entity versions move on:** the entity itself for any change, and for an add, remove or move also the parents it joined or left, whose rows show the change.
- `LevelUpdate` is only a notice that something changed. The undoable edit is a **change**, class `LevelChange`, see [history](../editor/history.md). Every `LevelChange` causes `LevelUpdate`s, never the other way round.

## Derived caches

Values worked out from the tree, kept until something they depend on changes. They live in `core/derived/` and are used by the editor, the renderer and the simulation alike.

| Cache | Holds | Becomes stale when |
|---|---|---|
| `WorldMatrixCache` | Each entity's matrix from its own space to level positions | Its TransformComponent or any parent's changes, or it moves in the tree: the whole subtree is marked |
| `HiddenCache` | Whether an entity or any parent is hidden, and the same for locked | A switch changes on it or a parent, or it moves |
| `BoundsCache` | Each entity's own bounds in level positions, and the bounds of its subtree | Its matrix, shape, path or outline width changes; subtree bounds also when a child's do |
| `PiecesCache` | The collision pieces of each shape, in its own space | Its shape changes. Moving it never splits the polygon again |

- **As built (2026-11-14):** each cache subscribes to `LevelSignals.updated` in its constructor and has `dispose()`. Both keep their values in a small internal `PerEntityValues`: a value is stored only after its parent's, so marking a subtree stops at the first entity with no value. `WorldMatrixCache` treats an entity without a TransformComponent as not moved.
- **Marking is cheap and computing is lazy.** A change marks the entity and its subtree with one walk, and nothing is computed until someone asks. Dragging 1,000 entities marks 1,000 subtrees once per frame and recomputes only what is drawn or hit-tested.
- In the play copy, `WorldMatrixCache` takes body poses from the simulation, see [simulation.md](../simulation.md#bodies-and-their-entities).

## Copying and the one data shape

- **`EntityData`** is one entity as plain data: its id, its parent's id, its hidden and locked switches, and each component's values, keyed by attribute name. It is the same shape as one entity in `level.json`.
- `LevelWriter.writeSubtree(entity)` and `LevelReader.readSubtree(data, level, parent, index)` are the only code that turns entities into data and back. They are used by:

| Use | Ids |
|---|---|
| Saving and loading, export and import | Kept |
| Undo of a delete | Kept, through `Level.restoreEntity` |
| Copy, paste and duplicate | Replaced by new ids, see [clipboard](../editor/clipboard-and-shortcuts.md) |
| The play copy | Kept |
| `.entity` files and spawning (v2) | Replaced by new ids |

- A component is copied with `component.copy()`, which clones each value through its field type, so a list or a point list is never shared between two components.
