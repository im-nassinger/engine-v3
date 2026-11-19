# Editor: workspace

## TL;DR

The frame around everything: where the islands sit, ☰ and the main menu, the debug box and the minimap, the seven tools, moving around the level view, the grid and snapping, and how the editor behaves inside a browser. **v1:** islands on top of a full-window level view (the redesign, owner: 2026-11-17), a show-only minimap, three of the seven tools on their number keys, pan and zoom from 1% to 1000%, and a grid you can snap to. **v2:** the other four tools and the searchable shortcut list. **v3:** resizing and collapsing panels, moving the view with the minimap, and snapping to other entities with pink guides. The shortcut table itself is in [shortcuts.md](shortcuts.md).

Sizes in pixels are starting values until tested.

## Layout

### Islands over the level view · v1

- The level view fills the whole window. Every part of the editor floats on top of it as an **island**: a rounded part with a soft shadow, **10 px from the window's edge and from the next island**, in fixed places. *Why: the owner's change, so the level is always as big as it can be, and the owner's redesign (2026-11-17), so the editor looks clean, with no borders or lines.*
- **Top left: ☰**, a 48 px square. **Under it: the tool column**, 48 px wide. **Beside them, from the top: the Entity inspector.** **Top right: the Entities viewer**, only as tall as its rows. **Bottom right: the minimap**, with the debug box under it. Nothing else sits at the top: there is no bar across the window (owner: 2026-11-17).
- **The Entities viewer grows with its rows** until it reaches 10 px above the minimap; then a scrollbar appears. The minimap always shows (owner: 2026-11-18).
- **The Entity inspector grows with its cards** the same way, until it reaches 10 px above the window's bottom; then its cards scroll. With nothing selected it is hidden (owner: 2026-11-19).
- In v2 the Assets panel and the Console come with scripts; where they go is decided then. *Why: the owner's smaller v1 has no files and no scripts.*
- Islands can't be dragged to other places or floated. *Why: fixed places are enough for the first version, and docking is a large feature.*
- Starting sizes: ☰ and the tool column 48 px wide with 34 px buttons, Entity inspector 300 px, Entities viewer 260 px, minimap 180 px.
- **The free area** is the level view between the Entity inspector and the Entities viewer, so fitting the view frames the level where it is seen.
- The centre has a permanent `Level` tab. A `.lua` file opens as an extra closable tab beside it, one per file (v2). The tab strip shows only while an extra tab is open.
- **While the Shape tool is active the Entity inspector is hidden** (owner: 2026-11-15), and the tool's kinds menu stands open beside it, see [drawing](../drawing.md#the-shape-tool--v1). The Joint tool's types have the same menu (owner: 2026-11-18), and the Entity inspector is hidden with it too (standing yes, 2026-11-19). *Why: the menu stands where the Entity inspector is, and the owner found the Entity inspector showing behind it (2026-11-19).*
- One dark theme. *Why: art and levels read well on it.*
- Folded cards and open tabs are editor settings saved in the browser. They are never in the level and never in undo.

Source: round 1: D12; round 3: 01 2.1; old: WS-01 to WS-15; owner: 2026-11-13, 2026-11-14, 2026-11-15, 2026-11-17, 2026-11-18, 2026-11-19

### Resize and collapse the panels · v3

- Drag a panel's edge to make it wider or narrower: the Entities viewer and the Assets panel 200 to 480 px, the Entity inspector 260 to 520 px, the Console 120 px to 60% of the window.
- Click a panel's title to fold it away. A folded panel becomes a 28 px strip. Double-clicking an edge restores the default size.
- Sizes and folded states are remembered in the browser. `Reset layout` in the main menu restores the defaults.
- In v1 the panels have one size each.

Source: scope ED6; round 1: D12; old: WS-02, WS-10, WS-12, WS-13

## ☰, the debug box and the minimap

### ☰ and the main menu · v1

- **☰ opens the main menu to its right; each submenu opens beside it.** Every command is reached through it, so it is the full list of commands, each with its shortcut (owner: 2026-11-17).
- The main menu, top to bottom:

| Item | What it holds |
|---|---|
| Play | Starts test play (Ctrl+Enter), a plain item. During play the islands are hidden and the Play bar takes over; Pause and Step are on the Play bar, see [test play](../play-and-save/test-play.md) |
| File | New, Import…, Save, Export…, Rename level…. See [saving](../play-and-save/saving.md) |
| Edit | Undo, naming its step (such as `Undo: Move 3 entities`), Redo, Cut, Copy, Paste, Duplicate, Delete. Undo and Redo are greyed when empty |
| Arrange | Group, Ungroup, Go into group |
| View | **The View menu:** the editor's view settings, each a switch with a shortcut, saved in the browser and never in the level: Grid, Grid snapping right under it, Joint icons, Camera frame, Physics view; then the zooms: Zoom in, Zoom out, 100%, Whole level, Selection, Camera frame |
| Help | Keyboard shortcuts, About |

- **Select all, Rename and Hide or show are in no menu for now**; their keys still work (owner: 2026-11-18).
- *Why no buttons for Undo, Redo, Save or Play: each extra island at the top made the editor busier, and the owner tried them in many places before choosing one button for everything (owner: 2026-11-17). The keys stay.*
- **The level's name isn't shown in the editor** (owner: 2026-11-17). The level keeps its name in the file; File → Rename level… changes it in a small dialog (owner: 2026-11-18). Renaming is an undo step.
- **The browser tab title shows the level's name, with `*` in front while there are unsaved changes** (owner: 2026-11-18). There is no save state on screen; a failed save shows in the message pill until it is fixed.
- Space for publishing and account controls is decided in v4.

Source: round 3: 01 2.2, 2.3; round 8: VW1; old: WS-16 to WS-27; owner: 2026-11-14, 2026-11-17, 2026-11-18

### The debug box and the message pill · v1

- **The debug box** is an island under the minimap, its right edge on the minimap's, as wide as its entries: `X: -3120  Y: -2410  GRID: 50  ZOOM: 9%`. The mouse position in level pixels, the grid size and the zoom; labels muted in capitals, values in tabular figures. It only shows them: the zoom changes with the mouse wheel, the keys and the View menu (owner: 2026-11-17).
- **The message pill** sits at the bottom middle of the level view, shown only while there is a message: a status text such as `Undid: Move 3 entities` or `The camera can't be deleted` for 4 seconds, or a failed save until it is fixed (owner: 2026-11-18).
- No lasting tool hint, no selection summary and no message count. *Why: the tool column shows the tool, the Entities viewer and the Entity inspector show the selection, and each editor message already shows on its card (owner: 2026-11-17, 2026-11-18).*

Source: round 3: 01 2.2, 2.3; round 8: WN1; round 10: EM1; old: WS-29 to WS-31; owner: 2026-11-17, 2026-11-18

### The minimap · v1

- An island at the bottom right, 180 px wide, above the debug box: the whole level bounds drawn small, its shapes without outlines, and an accent rectangle showing what the level view shows (owner: 2026-11-17).
- **In v1 it only shows** (owner: 2026-11-18). It follows the level and the view a few times a second at most, so it never slows editing.

Source: owner: 2026-11-17, 2026-11-18

### Moving the view with the minimap · v3

- Clicking on the minimap centres the level view there; dragging moves it.

Source: owner: 2026-11-18

## Tools

### Seven tools on number keys · v1

| Key | Tool | What it makes | Rules in |
|---|---|---|---|
| 1 | Select | Nothing. Selects, moves, resizes, rotates. Double-click edits points | [selection.md](selection.md) |
| 2 | Shape | A rectangle, circle, polygon or line | [drawing](../drawing.md) |
| 3 | Joint | A joint between two entities | [joints](../physics/joints.md) |
| v2 | Pencil | A freehand path | [drawing](../drawing.md) |
| v2 | Bézier pen | A path with curves | [drawing](../drawing.md) |
| v2 | Text | A text entity | [drawing](../drawing.md) |
| v2 | Trigger | A rectangle that notices touching, with a trigger | [triggers](../triggers/triggers.md) |

- *Why seven: the owner wanted fewer tools. Point editing moved into Select (double-click) as in Inkscape and Figma, and panning is Space, so neither needs a tool.*
- **v1 has three of them: Select (1), Shape (2) and Joint (3)** (owner: 2026-11-19, replacing 1, 4 and 6). The Pencil, the Bézier pen, Text and Trigger come in v2, and their keys are decided then. *Why: in the smaller v1 a path is decoration only, text was for a score, and there are no triggers; the owner wants v1's tools on the first three keys for now.*
- The tools are 34 px buttons in the tool column. Exactly one tool is active, drawn in the soft accent.
- **After making something, every tool returns to Select** with the new entity selected, the Joint tool included. To make many in a row, use tool lock. *Why: one rule for every tool, and tool lock already covers placing many joints (owner: 2026-11-13).*
- **Tool lock:** double-clicking a tool button, or pressing its number key twice, keeps the tool active until another tool is picked or Esc is pressed.
- Hold Space to pan with any tool. Releasing returns to that tool. It works between clicks of an unfinished path, and is ignored while typing.
- Dragging with the middle mouse button pans at any time, even during a drawing drag.
- Single-key shortcuts never fire while typing in a field, a script or text on the level.
- A button clicked with the mouse doesn't keep keyboard focus, so a later Space or Enter can't press it again.
- A disabled button still shows a tooltip giving the reason.

Source: round 3: R11, 01 2.4; round 4: TK1; round 5: TK2; decisions: D11; old: WS-32 to WS-39; owner: 2026-11-13, 2026-11-19

### What Esc does · v1

Esc does the first of these that applies:

1. Cancels a drag in progress and puts everything back.
2. Closes an open menu or window.
3. Ends an unfinished drawing the way its tool defines, or reverts the field being typed in. Text typed on the level is kept.
4. Ends tool lock, or returns from any tool to Select.
5. Goes up one group, selecting the group it left.
6. Clears the selection.

So Esc walks outward and never only deselects inside a group. During play, Esc only leaves full screen (see [test play](../play-and-save/test-play.md)).

Source: round 2: O7; old: WS-40, SG-79

### The searchable list of shortcuts · v2

- `?` opens a sheet listing every shortcut by area. It stays open while you work and can be searched.
- Every icon button has a tooltip with its name and shortcut.
- Letters and numbers are preferred to punctuation, and every punctuation shortcut also has a menu entry, because keys such as `\`, `[` and `]` differ between keyboard layouts.
- Shortcuts can't be changed by the user.
- On a Mac, Ctrl is Cmd and Alt is Option.
- The shortcuts themselves are in [shortcuts.md](shortcuts.md).
- *Why v2: it was settled before the scope review, so it never went through "smallest thing that can be tested". In v1 the main menu already lists every command with its shortcut.*

Source: round 3: 01 2.5; old: WS-42 to WS-44, WS-140; owner: 2026-11-13

## Moving around the level

### Pan and zoom · v1

- Space and drag pans. The mouse wheel zooms, keeping the point under the mouse fixed. Shift+wheel pans sideways.
- Zoom goes from **1% to 1000%**. 100% means one level pixel per screen pixel. *Why: the owner's range.*
- **F** zooms to the selection, or to the whole level with nothing selected. Selecting never moves the view by itself.
- Moving or zooming the view is never an undo step.
- Outside the level bounds the level view shows the editor's own dark colour; the World's fill and the grid are drawn only inside (owner: 2026-11-17).
- Panning stops well outside the level. If the view holds nothing, a `Back to level` button appears.
- The view position and zoom are remembered in the browser. They are not in the level file.

Source: scope ED1; round 3: 01 2.6; round 5: 02 2.5; old: WS-46 to WS-52, WS-56, WS-57, SG-36; owner: 2026-11-17

### The grid · v1

- The grid can be shown or hidden, its size can be set, and entities can snap to it.
- Default size: **50 px**, which is 1 metre, with fainter lines every 10 px. Lines fade out when they get too close together on screen. The lines through the level's origin are slightly stronger.
- Grid lines adapt to the background colour so they stay visible.
- With grid snapping on, the edges and centre of what you move, resize or draw jump to the nearest grid line. Pasted entities snap too.
- Snap distance is 6 screen pixels at every zoom.
- Holding Ctrl during a drag turns snapping off until released.
- Typed values and arrow-key moves are never snapped. Ctrl+Shift+arrow moves one grid step.
- **The grid size is a whole number of pixels from 5 to 1,000.** *Why: whole numbers keep snapped positions whole, and the range covers fine tiles and coarse layout (standing yes, 2026-11-14).*
- The grid size is saved in the project file, and changing it is an undo step (owner: 2026-11-13). Whether the grid is shown is saved in the browser.

Source: scope ED4; round 3: 01 2.6; round 5: FMT1; round 7: BND2; old: WS-53, WS-54, WS-58 to WS-62; owner: 2026-11-13, 2026-11-14

### Snapping to other entities · v3

- With it on, the edges and centre of what you move snap to the edges and centres of other entities, to the camera frame and to the level bounds. Equal gaps between neighbours snap too.
- Thin pink guide lines show what is aligned, with a small distance label and equal-gap marks. They disappear on release.
- Snap targets are the visible entities in view. Locked entities count. Hidden entities and the selection itself don't.
- The nearest target wins. An entity beats the grid on a tie.
- Joint ends snap to centres and corners with this same snapping.

Source: scope ED5; round 3: 01 2.7; old: WS-58 to WS-64

## In the browser

### Opens straight on the editor · v1

- The app opens directly on the editor with the saved level, or a new level on a first visit. No account prompt, no menu, no window in the way.
- A new level has the World and the camera, and the view opens fitted to the camera frame.

Source: round 3: 01 2.12; round 11: 12 A1; old: WS-135, WS-136

## Small features

Small features from the old draft and review that the scope review never asked about. The owner gave each its version in round 7 of the architecture review.

| Feature | Rule | Version |
|---|---|---|
| Leaving with unsaved changes | Closing or reloading while a change is not yet saved shows the browser's own leave prompt. It is armed only while something is unsaved. A waiting save is written as soon as the tab is hidden | v1 |
| No page gestures | Page scrolling, overscroll bounce and swipe-back are off on the editor page, because they would wreck a drag. The middle mouse button never starts the browser's autoscroll, and Alt alone never opens the browser menu | v1 |
| Losing focus mid-drag | If the window loses focus during a drag, the drag cancels and held keys count as released | v1 |
| Browser zoom | Browser zoom scales the interface. The level view stays sharp and the mouse stays accurate at any browser zoom | v1 |
| Small windows | Under 1280 px wide the panels get narrower. Under 1024 px the Console, then the Entities viewer and the Assets panel, then the Entity inspector fold away by themselves and come back when there is room. Under 640×480 a notice asks for a bigger window. The level is never lost | v3 |
| Touch devices | On a touch-only device a notice says the editor needs a mouse and keyboard | v3 |
| First-run hints | A hint card in an empty level ("Press 4 and drag to draw a shape"), then one hint pointing to Play. Hints end after the first Play | v3 |
| Hide all panels | `Ctrl+\` hides every island, leaving the level view and a small restore button | v3 |
| Temporary zoom tool | Hold Z: drag draws a zoom box, click zooms in, Alt+click zooms out | v3 |
| Scroll wheel pans | A setting for trackpads: two-finger scroll pans, pinch still zooms | v3 |
| Rulers | Rulers along the top and left in level pixels, off by default | v3 |
| Whole pixels | A snapping switch that keeps positions on whole pixels, on by default | v3 |
| Short motion | Animations in the editor take 150 ms or less, and are off when the system asks for reduced motion | v3 |

Source: round 3: 01 2.13; old: WS-11, WS-36, WS-51, WS-55, WS-59, WS-137 to WS-139, WS-145 to WS-153; owner: 2026-11-14
