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
- **`Selection` and `CurrentGroup` as built** (standing yes, 2026-11-15): `replace` is one batch, where a parent wins over its children and the World is dropped when anything else is in it. `add` and `toggle` go one at a time and **the newest wins**: adding a parent drops its selected children (the requirement), adding a child drops its selected parent, adding the World selects it alone, and adding anything else drops the World (*proposal*, as Figma does). *Why: the requirement says only what adding a parent does; the newest click winning is what the user just asked for.* A move that puts one selected entity inside another keeps the parent. `entities` and `isEmpty` were added for the commands. An unknown id is a bug and throws. Each `version` moves only on a real change; `CurrentGroup.version` also moves when the group or a parent of it moves, because its `path` changed. `enter` takes any entity of the level; whether it has children is the Go into group command's check. `restore` lands in the deepest id on the path that still exists, or the World. Both have `dispose()`.
- **"Selected" in the Inspector:** an empty selection shows the World, see [inspector-and-entities.md](inspector-and-entities.md).

## Hit testing

```typescript
export class HitTester {
    constructor(level: Level, caches: DerivedCaches, index: SpatialIndex, settings: ViewSettings);

    topmostAt(point: Point, probe: HitProbe): Entity | undefined;             // front to back
    allAt(point: Point, probe: HitProbe): readonly Entity[];                 // v3: Alt+click
    allTouching(box: Bounds, probe: HitProbe): readonly Entity[];            // the selection box
    selectableFor(hit: Entity, currentGroup: Entity, insideGroups: boolean): Entity | undefined;
}

export type HitProbe = {
    readonly zoom: number;             // for the sizes that stay the same on screen
    readonly currentGroup: Entity;     // decides whether entities inside the camera are reached
    readonly reachHiddenAndLocked?: boolean;   // the Joint tool, to say why it skips them
};

export type SpatialIndex = {
    query(area: Bounds): Iterable<Entity>;   // candidates, back to front; may return more than overlap
};
```

- **The hit areas are the requirement's table**, checked against the shape's outline from the [polygon pipeline](../core-model/geometry.md#the-polygon-pipeline): filled shapes by inside and edge, shapes with no fill or no StyleComponent by edge only, lines and open paths by the line with at least 5 screen pixels of tolerance, groups only through their children, joints by their icon, the camera by its frame's edge.
- Hidden entities, locked entities and entities inside the camera are passed through, as the requirements say. The camera frame and joint icons are tested only while the View menu shows them.
- `selectableFor` turns the hit into what a click selects: the hit's ancestor that is a direct child of the current group. A hit outside the current group selects nothing and stays inside. With Ctrl, the selection box selects inside groups.
- **`HitTester` as built** (standing yes, 2026-11-15): each call takes a `HitProbe` instead of a tolerance, because the joint icon, the 5 px tolerance and the Ctrl box all need the zoom, and reaching inside the camera needs the current group; the tolerance is the requirement's 5 px, `HIT_TOLERANCE_PX`. `ViewSettings` is passed in for the two View menu switches. *Why: the signature above it had no zoom, so nothing on screen could keep its size.* The details:
  - **An edge reaches half the drawn outline's width or 5 screen px, whichever is wider**, for every shape and path, filled or not. *Why: "the edge" is what the user sees, and a thin edge still needs the requirement's tolerance.*
  - The edge follows what the level view draws: a polygon's own points, a rectangle's outline, a circle as 128 points, a path with its curves cut into 16 straight steps. The fill is the filled outlines, even-odd for a closed path.
  - **The selection box touches without any tolerance**, and a box wholly inside a filled shape touches it. Groups never appear in its list; the Select tool turns each hit into what it selects through `selectableFor`.
  - A joint is hit only by its icon, a 7 px radius on screen (`JOINT_ICON_RADIUS_PX`, moved to `editor/view` so the drawing and the hit share it), even a Rope with its path. The World is never hit.
  - **Entities inside the camera are passed through unless the current group is the camera or inside it**, and then they are in front of the level, as they are drawn. *Why: the requirement's double-click goes into the camera "to reach the entities inside it".*
  - `selectableFor` returns nothing for the current group itself.
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
    undoDrawingStep(): boolean;               // Ctrl+Z before Undo: a drawing's last step; true when used
    cancel(): boolean;                        // Esc steps 1 and 3; true when there was something to cancel
};

export type ToolContext = {
    readonly openLevel: OpenLevel;
    readonly view: ViewState;
    readonly snapper: Snapper;
    readonly commands: CommandRegistry;
    readonly status: StatusText;
    readonly reader: LevelReader;                    // reads a new entity in, for createShape
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
- **The tool contract and `ToolController` as built** (standing yes, 2026-11-15):
  - A tool's `keyDown` and `keyUp` take a `ToolKey` (code, key, Ctrl, Shift, Alt, repeat) instead of a `KeyChord`, which is a written shortcut, not a press. `editor/shortcuts`' `KeyPress` has that shape, so `editor/tools` never imports the shortcuts and the dispatcher can import the tools. *Why: a tool reads the key pressed, and the other way round the two modules would import each other.*
  - The constructor takes `ToolServices`, the context without `finished`, which the controller adds. The context reads the services when used, so a replaced open level reaches every tool. The tools' number keys are `TOOL_KEYS`, all seven, the v2 ones kept free.
  - **The pointer:** `PanGesture` takes a middle press at any time and a left press while Space is held. During a pan with a tool's button still down, the tool hears each move at the level position now under the mouse, so a drag follows the level. A release whose press the tool never saw (one Esc cancelled) isn't passed on, so it never ends as a click. A pan started with Space goes on after Space is released, until its button is.
  - **The keys** (`ShortcutDispatcher`, given the controller and `EscapeChain`): Esc, then the tools' number keys (a held key picks once, so it never locks), then the tool's own keys and Space, then the commands. All of them are skipped while typing in a field or the code editor, and Esc is left to an open dialog, which closes itself. Space is used even when repeating, so the page never scrolls. The dispatcher's `handleKeyUp` passes key ups to the controller.
  - **Picking Select twice locks it**, which changes nothing, so Esc drops that lock silently and goes on down the chain rather than spending a press on it.
- **`EscapeChain` as built** (standing yes, 2026-11-15): `press()` returns which answer it gave. The drag step answers while a tool's button is down, a pan runs or `LiveEdit` is active: the tool's `cancel` puts its drag back, then any live edit left running is put back. The page reports an open menu through `OpenWindows.isOpen()`; the menu closes itself on the same Esc, because the keyboard adapter hears the key before the menu does. Going up one group selects the group it left.

## Esc

`EscapeChain` asks, in the requirement's order, until one answers yes: the active drag (`LiveEdit.cancel`), an open menu or window (the UI reports whether one is open), the tool's unfinished drawing, tool lock or a tool other than Select, the current group (`exitOne`), and finally the selection (`clear`). A field being typed in handles its own Esc first and stops it there.

## The Select tool

The Select tool holds one **drag state** at a time (the State pattern):

| State | Entered by | Ends with |
|---|---|---|
| `IdleState` | | |
| `PressState` | A press, until it moves 3 px or is released | A click: select, narrow, toggle |
| `MoveState` | Pressing an entity and moving | One step: `Move N entities` |
| `ResizeState` | Pressing one of the eight handles | One step. One shape or a group: its scale (stage 18). The World's rectangle always resizes from its centre, as if Alt were held, because the World never moves |
| `RotateState` | Pressing just outside a corner | One step. Shift snaps to 15° |
| `BoxSelectState` | Pressing empty space and moving | Selects everything the box touches |
| `PointEditState` | Double-clicking a polygon or line | Esc. Each point drag, add or delete is one step, see [drawing-and-points.md](drawing-and-points.md#point-editing) |

- **`IdleState`, `PressState` and `BoxSelectState` as built** (standing yes, 2026-11-15):
  - **An unselected entity is selected on the press**, so the drag that follows moves it; a selected one narrows on release, as the press table says. Shift waits for the release and toggles; Shift+click on empty space changes nothing. *Why: the table selects an unselected entity for both a click and a drag, so doing it at once makes the Inspector follow at once.*
  - **The selection box selects on release**, not while dragged: Shift is read at the press (it decides a box over a move), Ctrl at the release. The box is published as `selectionBox` for the overlay. *Why: one selection change per box, and step 15's speed test drags at 10,000 entities.*
  - `SelectionPicker` asks the `HitTester` with the zoom and the current group at that moment; **`OpenLevel` holds the `HitTester`**, built on `LinearSpatialIndex` with the session's `ViewSettings`, so a replaced level gets its own.
  - **A double-click goes into what it selects when the hit lies deeper** (a group, hit through a child) **or when it is the camera**, and then selects the child under the mouse. A double-click outside the current group, or on empty space inside it, goes up one group and selects the group left, as Esc does. The first click of the two has already selected. *Why: groups are hit only through their children, so "deeper than what it selects" is exactly "a group".*
  - Esc during a press or a box goes back to idle and the release is ignored. Only the left button selects.
- **`MoveState` and nudges as built** (standing yes, 2026-11-15):
  - **`SelectionMove`** in `editor/commands/move` is the offset code a drag and a nudge share. It takes the selection without the World and locked entities (a locked child still moves with its parent), reads each entity's level origin and its parent's inverted level matrix once, and writes each position through `LiveEdit`, so an offset in level positions moves every entity exactly that far on screen whatever its parents' rotation, scale and skew. An entity under a parent with a scale of 0 is left out. *Why: the selection never holds a parent and its child, so no parent moves during the move and its matrix read at the start stays true.*
  - **Snapping uses the drawn bounds, outline included**, of everything moved (the `BoundsCache`'s subtree bounds), or the origins when nothing draws. *Why: the outline is what the user sees line up with the grid.*
  - **Shift locks to the axis moved along most** at each mouse move, and only that axis snaps. A drag needing a `LiveEdit` while another is running does nothing.
  - **The twelve nudge commands** (`edit.nudgeLeft1`, `edit.nudgeLeft10`, `edit.nudgeLeftGrid` and so on, labelled `Move left 1 px`, `Move left 10 px`, `Move left one grid step`) repeat while held and **have no menu place**: `EditorCommand.menu` became optional, and `CommandRegistry.menu` returns only commands with one. *Why: twelve entries would crowd the Edit menu, and the requirement gives the arrows only as keys.* `LiveEdit.commit` takes the join key. A nudge during a drag is refused, `Not during a drag`, as Undo is.
- **`SelectionFrame` and `ResizeState` as built** (standing yes, 2026-11-15):
  - **`SelectionFrame.of`** gives the frame of exactly one selected entity that is neither locked nor hidden (its parents' switches included): a box in the entity's own space and its level matrix, so the box follows its rotation, scale and skew. **A shape's box is its own geometry, the outline left out**, because that is what Width and Height measure. **A group's box is what its visible descendants draw, outlines included**, in the group's space. The World's box is its rectangle. **The camera and joints have no handles in v1** (*proposal*): the selection table draws them as a heavier frame and a ring, and the camera's size is its two fields. *Why: the requirement only lists boxes with handles for shapes and groups.* `SelectTool.frame` gives it to the overlay while idle, so handles hide during any drag.
  - Handles are grabbed by the nearest square within 8 screen px of its middle (half the 8 px square and the 4 px margin), corners winning a tie. **A press on a handle resizes at once**, before what lies under it, with no 3 px wait, so the handle follows the mouse from the first move.
  - **The handle snaps as a point** (`snapPoint`) where it lands, after the press's offset from its middle is kept; Ctrl turns that off.
  - **`resizeFactor`** gives the stretch along each own axis and the anchor that stays put: the opposite side or corner, or the centre with Alt or on the World. Shift, and a circle always, give every axis the larger stretch, mirrored where the handle crossed over, a side handle stretching the other axis from its centre.
  - **`EntityResize`** stretches around the entity's own origin and moves its position so the anchor stays in place on screen. **A shape and a group alike change only their TransformComponent's scale**, negative when mirrored; the shape's geometry and its outline width are never touched (stage 18 step 8, owner 2026-11-16). The World changes only its rectangle. A circle's scale takes the larger stretch on both axes, so it stays round (standing yes, 2026-11-17). **At least 1 px is measured on the size drawn**: the box times the scale, the World's rectangle as it is; a box with no size along an axis isn't stretched along it. The step is `Resize <name>`. *Before stage 18 a shape's geometry was stretched and Shift multiplied its outline width.*
- **`RotateState` and the readouts as built** (standing yes, 2026-11-15):
  - **The rotate area is a 16 screen px square from each corner outward along the frame's own sides**, both distances measured on screen; a handle in it wins, and the World has none. A press there rotates at once, like a handle.
  - **`EntityRotate`** turns the entity by changing its Rotation by as much as the mouse turns around the frame's centre on screen, and moves its position so that centre stays in place on screen. Under a mirroring parent the Rotation turns the other way, so the entity still follows the mouse. The turn keeps counting past a half turn, so going round twice gives 720°. Under a skewed or unevenly scaled parent the turn on screen is close but not exact, since a Rotation is measured from the parent. *Why: the requirement asks only that handles follow the mouse exactly; changing the Rotation alone keeps the step to the two values the Inspector shows turning.* The step is `Rotate <name>`.
  - **Shift rounds the Rotation itself to a multiple of 15°**, not the turn, so the Inspector shows 15°, 30° and so on.
  - **`SelectTool.readout`** is the text and the mouse's level position, set at each move of a move, resize or rotate drag and cleared when the drag ends. Its numbers have one decimal at most and a `−` sign. **The resize readout is the size drawn** (the box times the scale, the World's rectangle as it is), the same size the 1 px rule measures; **the rotate readout is the new Rotation**, not the turn. *Why: the readout then agrees with what the Inspector will show after the release.*
- **The handles' frame** (`SelectionFrame`) follows a single entity's rotation and is axis-aligned for several. Handles stay the same size on screen, and hide during a drag while a readout shows the distance, size or angle.
- **In v1 several entities only move together**; their frame shows no resize or rotate handles (v3 adds them).
- Resizing never rests at zero: on release each side is at least 1 px. Dragging past the opposite side mirrors the entity.
- **Arrow keys** nudge through the same move code, with the join key described in [history.md](history.md).
- Double-click follows the requirement's table: go into a group, edit points, go into the camera, go up one group on empty space.
- **Moving an entity into another group keeps its place on screen** with the maths in [geometry](../core-model/geometry.md#matrix2d-and-the-transformcomponent). If it changes which body the entity belongs to, the command asks first, see [errors.md](../errors.md).

## The Shape tool

The Shape tool and point editing are in [drawing-and-points.md](drawing-and-points.md).

## The Joint tool

- The joint type comes from its options strip, Hinge by default.
- Under the mouse it looks for entities with physics, skipping hidden and locked ones and those without physics. Shapes merged into one body count as one, through `BodyMembership` from [the physics module](../simulation.md#bodies-and-their-entities).
- **It says why it skips an entity** (owner, 2026-11-16): with no body to use under the mouse, the preview's label names the frontmost skipped entity and the reason, `Platform has no BodyComponent`, `Platform is hidden` or `Platform is locked`; a click shows the same text as the status text, and a Rope's or Spring's second click there is refused instead of pinning that end to the background.
- **One-point joints** (Hinge) take one click: two bodies under the mouse are A and B; one body pins it to the background (B empty). **Two-ended joints** (Rope, Spring) take two clicks, one per entity, each end exactly where clicked.
- **Which body is A:** the smaller of the two.
- Ends snap to the centres and corners of the entities under the mouse, through a `PointSnapper` that v3's snapping to entities extends.
- Finishing runs `CreateJointCommand`: a TransformComponent at the hinge point (or between the two ends), a JointComponent with the type's defaults ("Let connected objects collide" off for Hinge, on for Rope and Spring) and its two ends in its own space, and for Rope and Spring the read-only PathComponent.

## Snapping

```typescript
export type Snapper = {
    snapMove(movingBounds: Bounds, offset: Point, view: ViewState, options: SnapOptions): SnapResult;   // edges and centre
    snapPoint(point: Point, view: ViewState, options: SnapOptions): SnapResult;                         // drawing, resizing
};
```

- **`GridSnapper` is v1**: edges and centre jump to the nearest grid line within 6 screen pixels. Ctrl held during a drag turns it off. Typed values and arrow keys are never snapped.
- **As built (standing yes, 2026-11-15):** `SnapOptions` is `{ ctrlHeld }`, so the snapper, not each tool, knows that Ctrl turns snapping off. A `SnapResult` is the snapped point (for `snapMove`, the snapped offset) and, per axis, whether it snapped, for v3's guides. Each axis snaps on its own; on an axis the nearest of the three positions within 6 screen px (inclusive) wins, the first of left (top), centre, right (bottom) on a tie. Snapping goes to the lines a grid size apart through the origin, not the fainter lines between them. **Grid snapping is a fifth `ViewSettings` switch, `gridSnapping`, on by default**, with the View menu's `Grid snapping` (`view.gridSnapping`, Shift+G); hiding the grid doesn't stop snapping. *Why: the switch lives in the browser like the others and never makes a step; a hidden grid is a drawing choice, and the requirement ties snapping to its own switch.*
- v3's snapping to entities is a second `Snapper` with guides. A `CombinedSnapper` picks the nearest result, the entity winning a tie, as the requirement says. Neither tool changes.

## Stage 9's choices

Made under the standing yes (2026-11-15), before building. The [plan](../../steps/stage-09.md) has the steps.

- **The nested level file comes first** (owner, 2026-11-15), as step 2, before any tool, so every later test writes the new shape. *Why: the tools add nothing to the file, and changing it while nothing else moves keeps the change easy to check.*
- **Stage 9 builds the Select tool, not what links it to later stages.** `PointEditState` is stage 10's point editing, so until then a double-click on a polygon or line only selects it. Editing text is v2. The Shape and Joint buttons join the toolbar with their stages (10 and 14); the toolbar shows Select alone, which tool lock still applies to. Hover outlines, Alt+click and resizing several entities are v3. *Why: a stage never builds what a later stage owns.*
- **The lock is honoured though it is v3:** `HitTester` passes through locked entities and the Select tool never moves one, since `locked` is already in every entity. *Why: one check each, and v3's Lock icon then needs no change here.*
- **`LiveEdit` lives in `editor/history`** beside `LevelEditor`, as [history.md](history.md#drags-and-live-edits) draws it, and also drives the Inspector's slider while dragged (step 14), as stage 8 left it.
- **The handles' sizes** (*proposal*): 8 screen px squares, grabbed within 4 px of their edge; the rotate area is a 16 px square just outside each corner, outside the handle. The cursor shows which. *Why: the sizes Figma and Inkscape use, and the design's 8 px grid.*
- **Rotating turns around the entity's bounds' centre** in v1, since the pivot marker is v3, and keeps that centre in place on screen through the TransformComponent's position.
- **The readout's texts** (*proposal*): moving `120, −40 px` (the distance moved), resizing `200 × 100 px` (the new size drawn, as built), rotating `45°` (the new Rotation, as built), shown 16 px below and right of the mouse, in the status font.
- **Nudges are a command per direction and distance**, `Move left 1 px` and so on, in the shortcut map's `levelView` scope, so a focused field keeps its arrows. Each runs `nudgeSelection`, which shares `MoveState`'s offset code and records with the join key `nudge:` plus the selected ids. Ctrl+Shift+arrow moves one grid size, read from `LevelEditorData`.
- **The body question** (*proposal*): moving between groups, or grouping, when it changes which body any moved entity or one below it merges into (through `mergesInto`), asks `Move into another body?` with the text `2 entities will move with a different body in play.` and the buttons Move and Cancel. Undo never asks. *Why: [errors.md](../errors.md) lists it as a question first; the wording names the effect, not the rule.* **As built (standing yes, 2026-11-16):** `countBodyChanges` (core/physics) takes the planned moves and counts, without changing the level, the moved entities and those inside them that have a BodyComponent or a SurfaceComponent and would move with another body: `mergesInto` takes a `ParentOf` for the planned parents, and a surface with no body on it or above it is Static. A plain group isn't counted, since nothing of it moves with a body. Group counts with the group's parent as the new parent, since the new group has no body. `confirm()` works the move out again from the level as it is then. `moveEntities` returns a `MoveOutcome`, and the Entities panel's drop shows it through `CommandRunner.showOutcome`, its OK selecting from the panel like the drop. *Why: only what collides changes in play; planning again on OK never applies a plan the level has moved past.*
- **`PointerInput` also owns the wheel**: the wheel zooms by `ZOOM_STEP` per notch (a trackpad's small steps add up), keeping the point under the mouse, and Shift+wheel pans sideways. *Why: [adapters.md](../adapters.md#rendering) gave panning and the wheel to stage 9; one adapter turns all the level view's pointer events into calls.*
- **`PointerInput` as built** (standing yes, 2026-11-16), in `adapters/browser/pointer/`:
  - It listens on the level view's canvas and hands `ToolController` each press, move and release with the position in CSS pixels from the canvas's top left corner and in the level. Browser zoom keeps CSS pixels as they are; a CSS scale on the page is undone through the canvas's drawn and laid-out sizes. The pointer is captured on each press. Ctrl is Cmd on a Mac.
  - **It counts double-clicks itself** (`ClickCounter`): a press of the same button within 500 ms and 4 screen px of the last one counts on from it. *Why: pointer events carry no click count, and the usual system settings are these.*
  - A second button going down or up while one is held comes from the browser as a move; it reaches the tools as a press or a release, so a middle pan works during a left drag.
  - **The wheel:** a notch is 100 px or 3 lines (`wheelPixels`), and the zoom changes by `ZOOM_STEP` to the power of the notches, so a trackpad's small steps add up to a notch's. Ctrl+wheel, a pinch, zooms the same. Shift+wheel pans sideways by the delta, read from `deltaX` where the browser moved it there. The page never zooms or scrolls.
  - The middle button's press is stopped (`pointerdown` and `mousedown`), so the browser never autoscrolls. The left press is left alone, so it still gives the level view the keyboard.
  - **Losing focus:** the window's own blur calls `EscapeChain.focusLost()`, which puts the drag back as Esc's first step would and lets go of Space (`ToolController.releaseKeys`), since neither key up nor release will arrive. `pointercancel` calls `dragLost()`, the drag alone.
  - **Open windows:** `OpenWindowCount` in `editor/tools` counts what is open; every `Menu` counts while it is shown, and `RowDrag` while a row is dragged, both through ui's `OpenWindowsContext`. Esc then answers `window` and leaves the menu or the drag to close itself. Dialogs need no count: the dispatcher leaves every key to an open dialog.
  - `EditorComposition` builds `ToolController` with Select alone, `PanGesture`, `EscapeChain`, the dispatcher given the tools and Esc, and `KeyboardInput`, which now passes key ups on. The snapper is a `GridSnapper` made again when a new level opens, since it reads that level's grid.
- **`SelectionOverlay` as built** (standing yes, 2026-11-16), in `adapters/pixi/overlays/selection/`:
  - **`planSelection`** turns the selection into what the table draws, in level positions, and is tested in Node; `SelectionOverlay` draws it in screen pixels in front of the joint icons, so outlines, rings and the 8 px handles keep their size at any zoom. It reads a **`SelectionSource`**: the selected entities, the Select tool's `frame`, `selectionBox` and `readout`, the hidden and locked switches with their parents', and one change signal. `app/EditorSelectionSource` builds it from the session and `ToolController`, following New and Import; `PixiLevelView.showSelection` takes it.
  - **A hidden entity beside visible ones draws nothing** and stays out of the shared box; only a selection that is all hidden gets the dashed box, at least as big as a joint's ring. *Why: the table only names "only hidden entities", and a box around something the user can't see would point at nothing.*
  - **A locked entity** gets a plain outline of its shapes and a small padlock just outside the top right of what it draws; a locked group is outlined too, since it has no box.
  - **A body's whole outline** (*proposal*): for each selected entity with a BodyComponent or a SurfaceComponent, the other colliding shapes that merge into the same body get a thin outline at half strength. A Merge left unticked is a body of its own; a surface with no body outlines only itself.
  - A joint's ring is drawn even with the joint icons switched off, so the selection still shows. **During a drag the frame hides with its handles** (`SelectTool.frame` is undefined then) while the outlines stay and the readout shows; one group shows nothing but the readout while dragged.
  - Over 500 selected: the shared box and `501 selected` above its top left corner, nothing else.
- **The entity field's picker is a short mode of `ToolController`**, not a tool: while it waits, the next click in the level view picks `topmostAt` the mouse (inside groups, since a Follow target may be a child) and returns to the tool before it; Esc leaves it. The status bar's hint reads `Click an entity to pick it. Esc cancels.` *Why: it has no button or key of its own, so it isn't one of the seven tools.*
- **The page as built** (standing yes, 2026-11-16):
  - **The toolbar** shows a `ToolButton` for each tool `ToolController` holds, in its order, the active one on, with its number key in the tooltip; tool lock is a 4 px dot in the button's bottom right corner, as the design's proposal has it. Clicking picks, so a double-click locks.
  - **The grid snapping switch** is a magnet icon button after Undo and Redo, running the View menu's `view.gridSnapping`, so both and Shift+G stay one switch.
  - **The status bar's left slot** shows the status text, or the tool's hint (`ToolController.hint`) while there is none. Then **the mouse position**, `120, −40` in whole level pixels: `PointerInput` tells `MousePosition` (editor/tools) each press and move and when the pointer leaves, and it moves at most once a frame through the `FrameScheduler`, so the bar redraws at most once a frame. *Why: [performance.md](../performance.md) throttles it to the frame.*
  - **`Back to level`** (in `ui/level-view-host`, placed in the shell's `FreeArea`, bottom middle) shows while `ViewState.holdsNothing` the World's subtree bounds, which hold the World's rectangle and everything drawn, and runs Whole level.
  - **The picker:** the entity field's target icon (`EntityPickButton`) calls `ToolController.waitForPick`; the icon is on while that field's picker waits. A left click in the level view picks `topmostAt` seen from the World, so inside groups, and the tool never hears the press or its release; a click on nothing ends it with nothing set, a right click or a pan leaves it waiting. Esc ends it as its drawing step, as does picking a tool, clicking the icon again or the field going away. The picked entity goes through the same refusal as a dropped row.
  - **The slider** changes the level while dragged: `FieldSlide` (editor/commands) begins a `LiveEdit` on the slider's first move on every shown entity with the component, and the release commits `Change Linear damping`; Esc during the drag puts the values back and the release then makes no step. A derived field, or a drag begun while another live edit runs, changes the level only on release, as before. A list's items keep committing on release.
- **The speed tests come now**, in `tests/performance/` with a level from `tests/levels/`, since the stage's done-when names them; stage 17 adds the rest.
- **The Playwright tests as built** (standing yes, 2026-11-16), in `tests/e2e/select-tool.spec.ts`: a click on the camera frame's edge selects it, a drag moves it and Ctrl+Z puts it back; a click inside the frame selects nothing and a selection box across its edge selects it; a double-click on the frame goes into the camera, and Esc goes up, selecting it, then clears. *Why the camera: until stage 10's Shape tool the page can make no entity, and the camera can't be grouped; the double-click table goes into the camera as into a group.* Stage 10 can add a test with a real group.
- **The speed tests as built** (standing yes, 2026-11-16): see [performance.md](../performance.md#targets-and-their-tests). The page's `createTools` moved to its own file in `app`, so the tests build the same tools. Selecting met its target; dragging 1,000 entities didn't, so **step 16 makes it**.

## Stage 14's choices

Made under the standing yes (2026-11-16), before building. The [plan](../../steps/stage-14.md) has the steps; how joints play is in [simulation.md](../simulation.md#stage-14s-choices).

- **Where things live:** `CreateJointCommand` in `editor/commands/joints/`; `JointTool` and `pickBodyA` in `editor/tools/joint/`; `PointSnapper` in `editor/snapping/point/` beside `grid/`; `JointPreviewOverlay` and `planJointPreview` in `adapters/pixi/overlays/joint-preview/`.
- **What the tool finds under the mouse:** `HitTester.allAt` with the tool's probe, front to back. Each hit becomes its body through `BodyMembership.bodyOf`, or itself for a surface with no body; hits without either are skipped, and two shapes of one body count once. The two frontmost bodies are used; choosing among three is v3.
- **As built in stage 18 step 5** (standing yes, 2026-11-17): the probe sets `reachHiddenAndLocked`, so `bodiesUnder` sees hidden and locked hits and returns, beside the bodies, `skipped`: the frontmost skipped hit's reason, hidden before locked before no BodyComponent, named by the hit itself, not its group. Joints are skipped without a reason, since their icons sit over the bodies they join. A body under the mouse still wins over any skipped entity, in front of it or not. The plan `nothing` carries the reason, shown as the label and, on a click, instead of `Nothing with physics here`; a new plan `refused` is a second end with no body but a skipped entity, whose preview keeps the first end and A. *Why: the reason is only news when the click would otherwise do nothing or pin to the background; a hidden entity is not drawn, but the owner asked to name it.*
- **`pickBodyA`:** the body with the smaller area is A, from `BodyMass`'s area or, for a surface with no body, its own pieces'; on a tie the frontmost is A. For a Rope or Spring swapping A and B swaps their ends too. *Why: the requirement says the smaller becomes A whatever the draw order, and area is what "smaller" looks like; density would make a small heavy wheel the bigger one.*
- **A Hinge** is one click: two bodies make a Hinge between them, one pins it, none does nothing and shows `Nothing with physics here` (*proposal*). **A Rope or Spring** is two clicks: the first needs a body, like a Hinge; the second on another body joins them, on the same body does nothing and keeps waiting, and **on empty space attaches B to the background at that point**. *Why: "one on each entity" leaves a rope hanging from the ceiling with no way to make it, and an empty B is the requirement's background pin.*
- **`PointSnapper`** snaps a click to the centres (of their own bounds) and corners (each piece's points in level positions) of the bodies under the mouse within 6 screen px, the nearest winning; failing that, the grid, as `GridSnapper.snapPoint` does when drawing; Ctrl turns both off. v3's snapping to entities replaces its first half.
- **`CreateJointCommand`** puts the joint in the current group, on top, selected, refused inside a locked group with `This group is locked`. It is named by `EntityNamer` with the type's word (`Hinge 1`), and the step is `Place Hinge 1`. Its TransformComponent sits at the hinge point, or halfway between a Rope or Spring's ends, with no rotation and a scale of 1 in the current group's space; its ends are the clicked points in its own space. Length and Rest length are the drawn gap in that space, Match drawn distance on. A Rope or Spring gets the read-only PathComponent from `jointPathPoints` and no StyleComponent, so it is invisible until styled.
- **As built in step 8** (standing yes, 2026-11-16): `CreateJointCommand` is the edit `placeJoint` in `editor/commands/joints/`, not a registered command, since only the Joint tool runs it, like `createShape`. It takes the clicked points in level positions and turns them into the current group's space itself; a group scaled to 0 has no such space, so it refuses with `This group is scaled to 0` (*proposal*), and the tool never gets there, as the Shape tool draws nothing in one. A Hinge's two ends are both at its own origin. The drawn gap is kept between Length's 1 and 100,000 px, so two ends clicked on one point give a Length of 1. *Why: "Command" in this code names a registered `EditorCommand`; the tool and its tests both work in level positions.*
- **As built in step 9** (standing yes, 2026-11-16): `PointSnapper` snaps to the centres and corners of the entities hit under the mouse, those with physics, rather than each body's merged pieces, as the plan's step says. *Why: the wheel's own centre is the point people aim for, and a body's merged pieces have no centre of their own.* The second click of a Rope or Spring takes the frontmost body under the mouse other than the first's, and on a tie of area the first click's body is A. Joints under the mouse are skipped, since a joint is no physics entity. Ctrl+Z drops a first click as Esc does, and changing the type in the strip drops it too, so a half-made joint is never kept or undone by surprise. A click acts on release, where it was pressed, like the Shape tool's polygon points.
- **The preview** is plain data on the tool: the type, the points so far and the mouse, the two entities and the label `Hinge: Wheel to Car`, or `Hinge: Wheel to background` for a pin. Esc or another tool drops a first click. `finished` returns to Select unless the tool is locked, like the Shape tool.
- **The thin lines to a joint's entities** go from the joint's position to the centre of each entity's own bounds, while the joint is selected or is the Select tool's frontmost hit under the mouse. *Why: hover outlines are v3, but the requirement puts these lines in v1, and the frontmost hit is already worked out.*
- **As built in step 10** (standing yes, 2026-11-16): `JointPreviewOverlay` draws, in the design's accent colour, a 1 px outline around the drawn bounds of the entities a click would join, a Rope's line or a Spring's zigzag (from `jointPathPoints`) from the first end to the mouse at 1.5 px, a 7 px dot at each end and at the snapped mouse, and the label in 11 px JetBrains Mono 12 px below and right of the mouse (*proposal*). The thin lines are 1 px dashed in the joint icon's edge colour at 60%, under the icons; a hidden joint has none, and a missing or empty end has no line. The app's `EditorJointPreviewSource` finds the hovered joint with `HitTester.topmostAt` at `MousePosition`, while the Select tool is active, and draws again only when that joint changes. `OptionButton` moved up to `ui/tool-options/ToolOptions/` for both strips and takes a tooltip: `Hinge (revolute joint)`, `Rope (distance joint)`, `Spring (distance joint with a spring)` (*proposal*). The Inspector stays shown with the Joint tool. *Why: the joint's settings are typed in the Inspector right after placing it, and only the Shape tool needs the room.*
- **The hints** (*proposal*): Hinge `Click where two bodies overlap to join them, or on one to pin it.`; Rope and Spring `Click the first entity, then the second.` and, after the first click, `Click the second entity, or empty space to pin to the background.`
