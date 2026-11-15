# Editor: workspace

## TL;DR

The frame around everything: where the panels sit, the top bar and status bar, the seven tools, moving around the level view, the grid and snapping, and how the editor behaves inside a browser. **v1:** fixed panels on top of a full-window level view, three of the seven tools on their number keys, pan and zoom from 1% to 1000%, and a grid you can snap to. **v2:** the other four tools and the searchable shortcut list. **v3:** resizing and collapsing panels, and snapping to other entities with pink guides. The shortcut table itself is in [shortcuts.md](shortcuts.md).

Sizes in pixels are starting values until tested.

## Layout

### Fixed panels over the level view · v1

- The level view fills the whole window. The panels sit on top of it, in fixed places. *Why: the owner's change, so the level is always as big as it can be.*
- **Left: the toolbar strip, then the Inspector, full height. Right: the Entities panel above the Assets panel** (owner: 2026-11-14). Bottom: the Console, collapsed to a strip by default. Top: the top bar. Bottom edge: the status bar.
- **In v1 there is no Assets panel and no Console**: the Entities panel takes the whole right side. Both come in v2 with scripts. *Why: the owner's smaller v1 has no files and no scripts.*
- Panels can't be dragged to other places or floated. *Why: fixed panels are enough for the first version, and docking is a large feature.*
- Starting sizes: toolbar 44 px wide, Inspector 300 px, Entities and Assets panels 260 px, top bar 44 px, status bar 24 px, Console 220 px when open.
- The centre has a permanent `Level` tab. A `.lua` file opens as an extra closable tab beside it, one per file. The tab strip shows only while an extra tab is open.
- A tool with options, such as the Joint tool's joint type, shows a small options strip over the top left of the level view. It never shifts the layout. The Shape tool's strip offers its kinds and takes the Inspector's place, since the Inspector is hidden while that tool is active (owner: 2026-11-15), see [drawing](../drawing.md#the-shape-tool--v1).
- One dark theme. *Why: art and levels read well on it.*
- Panel sizes, folded cards and open tabs are editor settings saved in the browser. They are never in the level and never in undo.

Source: round 1: D12; round 3: 01 2.1; old: WS-01 to WS-15; owner: 2026-11-13, 2026-11-14, 2026-11-15

### Resize and collapse the panels · v3

- Drag a panel's edge to make it wider or narrower: Entities and Assets panels 200 to 480 px, Inspector 260 to 520 px, Console 120 px to 60% of the window.
- Click a panel's title to fold it away. A folded side panel becomes a 28 px strip. Double-clicking an edge restores the default size.
- Sizes and folded states are remembered in the browser. `Reset layout` in the main menu restores the defaults.
- In v1 the panels have one size each.

Source: scope ED6; round 1: D12; old: WS-02, WS-10, WS-12, WS-13

## Top bar and status bar

### Top bar · v1

Left to right:

| Part | What it does |
|---|---|
| Main menu | One button with submenus File, Edit, Arrange, View, Help. Every command is here with its shortcut, so it is the full list of commands |
| Level name | Click to rename in place. Enter commits, Esc cancels, an empty name reverts. Renaming is an undo step |
| Save state | `Saved`, `Saving`, `Unsaved changes` or `Save failed`. Clicking it explains the state. See [saving](../play-and-save/saving.md) |
| Undo and Redo | Greyed when empty. The tooltip names the step, such as `Undo: Move 3 entities` |
| Snapping | Switches for the grid, and in v3 for snapping to entities |
| Play | Starts test play. During play the editor's bars and panels are hidden and the Play bar takes over, see [test play](../play-and-save/test-play.md) |
| View menu | Switches what the editor draws over the level: Grid, Joint icons, Camera frame, Physics view. Each has a shortcut. Saved in the browser, never in the level. *Why: there will be several such switches, and one menu is where most editors put them* |
| Zoom | Shows the percentage. Click to type a value or pick: Zoom in, Zoom out, 100%, Whole level, Selection, Camera frame |
| Help | Keyboard shortcuts, About |

- The browser tab title shows the level name, with `*` in front while there are unsaved changes.
- Space at the right end is left free for publishing and account controls later.
- **The save state and the zoom are in the top bar**, not the status bar (owner: 2026-11-14).

Source: round 3: 01 2.2, 2.3; round 8: VW1; old: WS-16 to WS-27; owner: 2026-11-14

### Status bar · v1

- Shows, left to right: the active tool's hint, the mouse position in level pixels, a summary of the selection, and the count of editor messages.
- The left slot briefly shows results such as `Undid: Move 3 entities` or `The camera can't be deleted` for 4 seconds, then returns to the tool hint.
- Clicking the count lists every editor message. Clicking one selects its entity.

Source: round 3: 01 2.2, 2.3; round 8: WN1; round 10: EM1; old: WS-29 to WS-31

## Tools

### Seven tools on number keys · v1

| Key | Tool | What it makes | Rules in |
|---|---|---|---|
| 1 | Select | Nothing. Selects, moves, resizes, rotates. Double-click edits points | [selection.md](selection.md) |
| 2 | Pencil | A freehand path | [drawing](../drawing.md) |
| 3 | Bézier pen | A path with curves | [drawing](../drawing.md) |
| 4 | Shape | A rectangle, circle, polygon or line | [drawing](../drawing.md) |
| 5 | Text | A text entity | [drawing](../drawing.md) |
| 6 | Joint | A joint between two entities | [joints](../physics/joints.md) |
| 7 | Trigger | A rectangle that notices touching, with a trigger | [triggers](../triggers/triggers.md) |

- *Why seven: the owner wanted fewer tools. Point editing moved into Select (double-click) as in Inkscape and Figma, and panning is Space, so neither needs a tool.*
- **v1 has three of them: Select (1), Shape (4) and Joint (6).** The Pencil, the Bézier pen, Text and Trigger come in v2, on the keys above, so nothing is relearned. *Why: in the smaller v1 a path is decoration only, text was for a score, and there are no triggers.*
- Exactly one tool is active, and its button is highlighted.
- **After making something, every tool returns to Select** with the new entity selected, the Joint tool included. To make many in a row, use tool lock. *Why: one rule for every tool, and tool lock already covers placing many joints (owner: 2026-11-13).*
- **Tool lock:** double-clicking a tool button, or pressing its number key twice, keeps the tool active until another tool is picked or Esc is pressed.
- Hold Space to pan with any tool. Releasing returns to that tool. It works between clicks of an unfinished path, and is ignored while typing.
- Dragging with the middle mouse button pans at any time, even during a drawing drag.
- Single-key shortcuts never fire while typing in a field, a script or text on the level.
- A button clicked with the mouse doesn't keep keyboard focus, so a later Space or Enter can't press it again.
- A disabled button still shows a tooltip giving the reason.

Source: round 3: R11, 01 2.4; round 4: TK1; round 5: TK2; decisions: D11; old: WS-32 to WS-39; owner: 2026-11-13

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
- The area outside the level bounds is dimmed.
- Panning stops well outside the level. If the view holds nothing, a `Back to level` button appears.
- The view position and zoom are remembered in the browser. They are not in the level file.

Source: scope ED1; round 3: 01 2.6; round 5: 02 2.5; old: WS-46 to WS-52, WS-56, WS-57, SG-36

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
| Small windows | Under 1280 px wide the panels get narrower. Under 1024 px the Console, then the Entities and Assets panels, then the Inspector fold away by themselves and come back when there is room. Under 640×480 a notice asks for a bigger window. The level is never lost | v3 |
| Touch devices | On a touch-only device a notice says the editor needs a mouse and keyboard | v3 |
| First-run hints | A hint card in an empty level ("Press 4 and drag to draw a shape"), then one hint pointing to Play. Hints end after the first Play | v3 |
| Hide all panels | `Ctrl+\` hides every panel and bar, leaving the level view and a small restore button | v3 |
| Temporary zoom tool | Hold Z: drag draws a zoom box, click zooms in, Alt+click zooms out | v3 |
| Scroll wheel pans | A setting for trackpads: two-finger scroll pans, pinch still zooms | v3 |
| Rulers | Rulers along the top and left in level pixels, off by default | v3 |
| Whole pixels | A snapping switch that keeps positions on whole pixels, on by default | v3 |
| Short motion | Animations in the editor take 150 ms or less, and are off when the system asks for reduced motion | v3 |

Source: round 3: 01 2.13; old: WS-11, WS-36, WS-51, WS-55, WS-59, WS-137 to WS-139, WS-145 to WS-153; owner: 2026-11-14
