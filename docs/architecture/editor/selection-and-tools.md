# Selection, tools and hit testing

## TL;DR

**`Selection`** holds the selected ids and keeps the requirement's invariants (never an entity with one of its parents, the World only alone). **`CurrentGroup`** is the group you are inside. **`HitTester`** answers "what is under this point" and "what does this box touch" with the requirement's hit areas, using cached bounds. A **tool** is a class behind one small contract that receives pointer and key input in level positions, already converted from the browser, so every tool is tested without a browser. **`ToolController`** picks the active tool, keeps tool lock, handles panning before any tool, and returns to Select after a tool makes something. The Select tool uses the State pattern for its drags. Snapping is a contract with one v1 implementation, the grid.

## Selection and the current group

```typescript
export class Selection {
    readonly version: VersionCounter;

    constructor(level: Level);
    get ids(): readonly EntityId[];          // in the order they were selected
    has(id: EntityId): boolean;
    replace(ids: readonly EntityId[]): void; // drops children of selected parents, keeps the World alone
    toggle(id: EntityId): void;              // Shift+click
    add(ids: readonly EntityId[]): void;
    clear(): void;
}

export class CurrentGroup {
    readonly version: VersionCounter;

    get group(): Entity;                     // the World when you are inside nothing
    get path(): readonly EntityId[];         // World down to the group, for undo and the v3 path bar
    enter(group: Entity): void;              // double-click, Enter
    exitOne(): Entity | undefined;           // Esc: returns the group it left, which becomes selected
    restore(path: readonly EntityId[]): void;// undo: the nearest group on the path that still exists
}
```

- Both listen to the level: a removed entity leaves the selection, and a removed current group falls back to its nearest existing parent.
- Neither is ever saved or undone, as the requirements say. Undo restores them from the history step.
- **"Selected" in the Inspector:** an empty selection shows the World, see [inspector-and-entities.md](inspector-and-entities.md).

## Hit testing

```typescript
export class HitTester {
    constructor(level: Level, caches: DerivedCaches, index: SpatialIndex);

    topmostAt(point: Point, tolerancePx: number): Entity | undefined;          // front to back
    allAt(point: Point, tolerancePx: number): readonly Entity[];              // v3: Alt+click
    allTouching(box: Bounds): readonly Entity[];                              // the selection box
    selectableFor(hit: Entity, currentGroup: Entity, insideGroups: boolean): Entity | undefined;
}

export type SpatialIndex = {
    query(area: Bounds): Iterable<Entity>;   // candidates whose bounds overlap the area
};
```

- **The hit areas are the requirement's table**, checked against the shape's outline from the [polygon pipeline](../core-model/geometry.md#the-polygon-pipeline): filled shapes by inside and edge, shapes with no fill or no StyleComponent by edge only, lines and open paths by the line with at least 5 screen pixels of tolerance, groups only through their children, joints by their icon, the camera by its frame's edge.
- Hidden entities, locked entities and entities inside the camera are passed through, as the requirements say. The camera frame and joint icons are tested only while the View menu shows them.
- `selectableFor` turns the hit into what a click selects: the hit's ancestor that is a direct child of the current group. A hit outside the current group selects nothing and stays inside. With Ctrl, the selection box selects inside groups.
- **`LinearSpatialIndex` is v1:** it returns every entity, and the precise test runs only for those whose cached bounds overlap. That is under a millisecond for 10,000 entities. A grid index replaces it only if the speed test fails, see [performance.md](../performance.md).

## The tool contract

```typescript
export type LevelPointerInput = {
    readonly levelPosition: Point;
    readonly screenPosition: Point;
    readonly button: 'left' | 'middle' | 'right';
    readonly modifiers: Modifiers;            // shift, alt, ctrl (Cmd on a Mac)
    readonly clickCount: number;              // 2 for a double-click
};

export type Tool = {
    readonly id: ToolId;                      // 'select' | 'shape' | 'joint', later 'pencil' and others
    readonly hint: string;                    // the status bar's tool hint
    readonly preview: VersionCounter;         // the overlay redraws what the tool shows
    activate(context: ToolContext): void;
    deactivate(): void;                       // finishes and keeps an unfinished drawing
    pointerDown(input: LevelPointerInput): void;
    pointerMove(input: LevelPointerInput): void;
    pointerUp(input: LevelPointerInput): void;
    keyDown(key: KeyChord): boolean;          // true when the tool used it (Enter, Backspace, Shift)
    keyUp(key: KeyChord): void;
    cancel(): boolean;                        // Esc steps 1 and 3; true when there was something to cancel
};

export type ToolContext = {
    readonly openLevel: OpenLevel;
    readonly view: ViewState;
    readonly snapper: Snapper;
    readonly commands: CommandRegistry;
    readonly status: StatusText;
    finished(created: readonly EntityId[]): void;   // return to Select, unless the tool is locked
};
```

- The browser adapter `PointerInput` turns pointer events on the canvas into `LevelPointerInput`, using `ViewState` for the conversion, and keeps pointer capture during drags. A press that moves less than 3 px (Select) or 4 px (drawing tools) is a click, decided by the tool.
- **Tools never change the level directly.** They run a command (create a shape, make a joint) or use `LiveEdit` (drags), see [history.md](history.md).
- Tools publish what to draw while working (a faded shape preview, a selection box, the joint label "Hinge: Wheel to Car") as plain data on themselves. The PixiJS overlay reads it when `preview` moves.

## ToolController

```typescript
export class ToolController {
    readonly version: VersionCounter;

    constructor(tools: readonly Tool[], context: ToolContext, pan: PanGesture);
    get active(): Tool;
    get isLocked(): boolean;
    pick(id: ToolId): void;              // number key or button. Picking the active tool again locks it
    pointerDown(input: LevelPointerInput): void;   // pan first, then the active tool
    // pointerMove, pointerUp, keyDown, keyUp likewise
}
```

- **Panning comes before any tool:** middle drag pans at any time, and holding Space pans with any tool and returns to it on release. `PanGesture` changes `ViewState` only, so it never makes a step.
- **After making something the tool returns to Select** with the new entity selected, unless tool lock is on (open question 4 stays as written).
- v1 registers three tools. v2 adds Pencil, Bézier pen, Text and Trigger as new classes on their keys, and nothing else changes.

## Esc

`EscapeChain` asks, in the requirement's order, until one answers yes: the active drag (`LiveEdit.cancel`), an open menu or window (the UI reports whether one is open), the tool's unfinished drawing, tool lock or a tool other than Select, the current group (`exitOne`), and finally the selection (`clear`). A field being typed in handles its own Esc first and stops it there.

## The Select tool

The Select tool holds one **drag state** at a time (the State pattern):

| State | Entered by | Ends with |
|---|---|---|
| `IdleState` | | |
| `PressState` | A press, until it moves 3 px or is released | A click: select, narrow, toggle |
| `MoveState` | Pressing an entity and moving | One step: `Move N entities` |
| `ResizeState` | Pressing one of the eight handles | One step. One shape: width and height. A group: scale. The World's rectangle always resizes from its centre, as if Alt were held, because the World never moves |
| `RotateState` | Pressing just outside a corner | One step. Shift snaps to 15° |
| `BoxSelectState` | Pressing empty space and moving | Selects everything the box touches |
| `PointEditState` | Double-clicking a polygon or line | Esc. Each point drag, add or delete is one step |

- **The handles' frame** (`SelectionFrame`) follows a single entity's rotation and is axis-aligned for several. Handles stay the same size on screen, and hide during a drag while a readout shows the distance, size or angle.
- **In v1 several entities only move together**; their frame shows no resize or rotate handles (v3 adds them).
- Resizing never rests at zero: on release each side is at least 1 px. Dragging past the opposite side mirrors the entity.
- **Arrow keys** nudge through the same move code, with the join key described in [history.md](history.md).
- Double-click follows the requirement's table: go into a group, edit points, go into the camera, go up one group on empty space.
- **Moving an entity into another group keeps its place on screen** with the maths in [geometry](../core-model/geometry.md#matrix2d-and-the-transformcomponent). If it changes which body the entity belongs to, the command asks first, see [errors.md](../errors.md).

## The Shape tool

- One tool, four kinds picked in its options strip. A faded preview follows the mouse; a click places it at the remembered size, a drag sets a new size.
- Polygon and line: each click adds a point; clicking the first point closes a polygon; Enter, Esc and double-click finish; Ctrl+Z or Backspace removes the last point. Choosing another tool or pressing Play finishes and keeps the drawing.
- Finishing runs `CreateShapeCommand`: a TransformComponent, a ShapeComponent and a StyleComponent with the v1 default look, in the current group, on top, named by `EntityNamer` ("Rectangle 1": one more than the highest number already used with that word), and selected.

## The Joint tool

- The joint type comes from its options strip, Hinge by default.
- Under the mouse it looks for entities with physics, skipping hidden and locked ones. Shapes merged into one body count as one, through `BodyMembership` from [the physics module](../simulation.md#bodies-and-their-entities).
- **One-point joints** (Hinge) take one click: two bodies under the mouse are A and B; one body pins it to the background (B empty). **Two-ended joints** (Rope, Spring) take two clicks, one per entity, each end exactly where clicked.
- **Which body is A:** the smaller of the two.
- Ends snap to the centres and corners of the entities under the mouse, through a `PointSnapper` that v3's snapping to entities extends.
- Finishing runs `CreateJointCommand`: a TransformComponent at the hinge point (or between the two ends), a JointComponent with the type's defaults ("Let connected objects collide" off for Hinge, on for Rope and Spring) and its two ends in its own space, and for Rope and Spring the read-only PathComponent.

## Snapping

```typescript
export type Snapper = {
    snapMove(movingBounds: Bounds, offset: Point, view: ViewState): SnapResult;   // edges and centre
    snapPoint(point: Point, view: ViewState): SnapResult;                         // drawing, resizing
};
```

- **`GridSnapper` is v1**: edges and centre jump to the nearest grid line within 6 screen pixels. Ctrl held during a drag turns it off. Typed values and arrow keys are never snapped.
- v3's snapping to entities is a second `Snapper` with guides. A `CombinedSnapper` picks the nearest result, the entity winning a tie, as the requirement says. Neither tool changes.
