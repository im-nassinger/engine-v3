# Editor: selection, groups and the Entities viewer

## TL;DR

How entities are picked, moved and arranged in the tree. **v1:** click and drag-box selection, handles to move, resize and rotate one entity, arrow-key moves, grouping with Ctrl+G, going into groups by double-click, the Entities viewer as the real tree, and the eye icon. **Later:** resizing and rotating several entities together, the path bar, Alt+click for the entity underneath, hover outlines, Entities viewer search, the lock icon, and invert selection. Core rules: one selection everywhere, one row is one entity, and moving an entity between groups never moves it on screen.

## Selecting

### Click, drag-box, Shift+click, Select all · v1

- There is **one selection**, shown in the level view, the Entities viewer and the Entity inspector.
- A click selects the entity under the mouse. If it is inside a group, the click selects the whole group, as seen from the group you are inside.
- Shift+click adds an entity to the selection or removes it.
- Dragging on empty space draws a selection box. **It selects every entity it touches.** Shift adds to the selection. Ctrl selects entities inside groups instead of their groups. *Why touch: the owner's change from "fully inside".*
- Ctrl+A selects every entity directly inside the group you are inside. The World and the camera are left out.
- Clicking empty space clears the selection. **With nothing selected the Entity inspector is hidden** (owner: 2026-11-19); the World's settings show when its row is selected.
- A drag under 3 screen pixels is a click.
- A selection never holds an entity together with one of its parents. Adding the parent drops its selected children.
- The World can only be selected alone.
- The selection, and the group you are inside, are editor state. They are never saved in the level.
- The selection survives switching tools. Only the Select tool shows handles.
- **Skip rule:** a command skips entities that don't allow it and the message pill says what was skipped, such as "Camera kept". The command is disabled only when nothing would be left.

What a press does:

| Press lands on | Click | Drag |
|---|---|---|
| Empty space | Clear the selection | Selection box |
| An unselected entity | Select it | Select it and move it |
| A selected entity | Narrow the selection to it, on release | Move the whole selection |
| Anything, with Shift held | Add or remove it | Add by selection box |

What counts as hit:

| Entity | Hit area |
|---|---|
| A shape or closed path with a fill | Inside and edge |
| A shape with no StyleComponent, such as a trigger | Inside and edge, as the editor draws it with a faint fill. *Why: the owner couldn't click a trigger except on its edge (2026-11-22).* |
| A shape with a StyleComponent and no fill | Edge only, so a big invisible sensor doesn't steal clicks |
| An open path, a line | The line itself, with at least 5 screen pixels of tolerance at any zoom |
| A shape with an image fill | The whole shape, transparent parts included |
| Text | Its box |
| A group | Only through its children |
| A joint | Its icon |
| The camera | The edge of its frame, not the inside |

Clicks pass through hidden entities and locked entities.

Source: scope SE1; round 1: D19; round 4: SEL1, 02 2.3, 02 2.4; round 5: 02 2.2, 04 2.7; old: SG-01 to SG-14, SG-21 to SG-33; owner: 2026-11-19, 2026-11-22

### Invert selection · Later

- Selects every entity directly inside the current group that isn't selected. "Select same type" and "Select same tag" are dropped.

Source: scope SE12; round 4: 02 2.5

### Next entity underneath · Later

- Each Alt+click on the same spot selects the next entity underneath, children of groups included. After the bottom it starts again from the top.
- There is no Ctrl+click for the deepest entity. *Why: one key is enough. Reaching the deepest entity is a few more clicks, with fewer keys to learn.*

Source: scope SE6; round 4: 02 2.2; round 5: 02 2.2

### Hover outlines · Later

- Hovering outlines what a click would select: the whole group, not the child under the mouse.
- Hovering an Entities viewer row outlines that entity in the level view, and hovering in the level view tints its row.
- Hidden entities show no outline. Hover is off during a drag.

Source: scope SE7; round 4: 02 2.6

### How the selection is drawn · v1

| Selection | Drawn as |
|---|---|
| One shape, path or text | An outline of the real shape, plus a box with handles |
| One group | A box only |
| Several entities | A thin outline each, and one shared box |
| A joint | A ring around each of its icons. A Rope or Spring also outlines its path and has one box around the whole joint, with no handles, since its ends stay on the entities they join (owner: 2026-11-22) |
| The camera | A heavier frame |
| A locked entity, selected from the Entities viewer | A plain outline with a padlock, no handles |
| Only hidden entities, selected from the Entities viewer | A dashed box where they are, no handles |

- Outlines and handles stay the same size on screen at any zoom.
- Selecting anything with physics outlines its whole body in the level view.
- Handles hide during a drag. A small readout near the mouse shows the distance, size or angle.
- Above 500 selected entities, the per-entity outlines are replaced by the shared box and a count.

Source: round 6: LY2; old: SG-39 to SG-42

## Moving, resizing, rotating

### Handles and arrow keys · v1

- One Select tool moves, resizes and rotates, with no separate modes. Eight handles resize: four corners, four sides. Dragging just outside a corner rotates. There are no skew handles.
- **The cursor shows what a press would do** (owner: 2026-11-21): a turning arrow just outside a corner, and a two-way arrow along the handle on a resize handle, kept through the drag. *Why: the owner found rotating worked with no sign the mouse was in the right place.*
- Arrow keys move the selection 0.01 m. Shift+arrow moves 0.1 m. **Ctrl+Shift+arrow moves one grid step.** Moves follow the level's axes whatever the rotation.
- **Z and X rotate the selection** (owner: 2026-11-17): Z counter-clockwise and X clockwise on screen, 1° a press, Shift+Z and Shift+X 10°. Each entity turns around the centre of its own box, as the rotate drag does, until Later turns several entities around the selection box's centre. A run of presses within 1 s is one undo step, `Rotate <name>`. The World and the camera are skipped with the skip rule's text; locked entities are left out. Ctrl+Z and Ctrl+X stay Undo and Cut.
- **W, A, S and D resize the selection's shapes** (owner: 2026-11-17): D wider, A narrower, W taller, S shorter, 0.01 m a press, **Shift one grid step** (owner: 2026-11-19, replacing 10 px). Unlike the handles they **change the shape's values**, so an outline keeps its width: a rectangle's Width or Height, a circle's Radius by half a step on either axis, a polygon's or line's points spread from or pulled towards its bounds' centre. Each shape keeps its own centre and grows along its own axes, so a rotated rectangle gets longer along its own width. A size stops at its smallest, 0.01 m, and W and S do nothing on a flat line. A run of presses within 1 s is one undo step, `Resize <name>`. The World and the camera are skipped with the skip rule's text; locked entities and entities with no ShapeComponent are left out.
- A handle always follows the mouse on screen, whatever the rotation or scale of the parents.
- The box of one rotated entity follows its rotation, so resizing works along the entity's own sides.
- **Resizing changes the entity's scale, never its shape's values**, for a shape and a group alike (owner: 2026-11-16). The World is the one exception: its rectangle changes, from its centre.
- Resizing never changes the outline width; the StyleComponent's Scale outline says whether the scale stretches it.
- The readout shows the size the entity is drawn at, its scale counted.
- Dragging a handle past the opposite side mirrors the entity. A size never rests at zero: on release each side is at least 0.01 m.
- A whole drag is one undo step.
- A locked entity never moves through handles or arrow keys. A locked child still moves with its unlocked parent.

| While | Shift | Alt | Ctrl | Ctrl+Shift | Esc |
|---|---|---|---|---|---|
| Moving | Lock to horizontal or vertical | | Turn snapping off | | Cancel |
| Resizing | Keep proportions | Resize from the centre | Turn snapping off | Resize from the centre, and only that | Cancel |
| Rotating | Snap to 15° steps | | | | Cancel |

- **Ctrl+Shift resizes from the centre**, as Alt does, and neither keeps proportions nor turns snapping off (owner: 2026-11-16; the rest under the standing yes, 2026-11-17). *Why: on Linux with GNOME, Alt+drag moves the window, so Alt can't reach the page there.* Alt stays a second way, and Alt+Shift resizes from the centre keeping proportions.

Source: scope SE2; round 1: D21; round 4: 02 2.7; round 5: 03 2.4; old: SG-43 to SG-48, SG-52, SG-53, SG-55, SG-56; owner: 2026-11-16, 2026-11-19, 2026-11-21

### Several entities together · Later

- A multi-selection resizes and rotates together. Rotation turns the entities around the centre of the selection box. Resizing keeps the opposite side or corner fixed. Alt or Ctrl+Shift resizes from the centre. Shift keeps proportions.
- *Why: it matches single entities and groups, so nothing changes when you group them, and it uses the same keys as the drawing tools.*
- Resizing rotated entities unevenly slants them through skew, exactly as it would inside a group.
- In v1 a multi-selection can only be moved. To turn several entities together, group them first.

Source: scope SE3; round 5: 02 2.8; round 6: MS1; old: SG-57 to SG-61

## Groups

### Group, ungroup, go in, go out · v1

- **Ctrl+G** groups the selection, **Ctrl+Shift+G** ungroups. Groups nest up to 256 deep. A move that would go deeper is refused with the reason.
- Every entity can hold children, with no exceptions. A group is simply an entity used for that. *Why: one rule for every entity is easier to learn and build than special cases.*
- A new group is named "Group N", sits where the frontmost selected entity was, and becomes the selection. Its origin is the centre of its contents. A single entity may be grouped.
- **Grouping can change the draw order, and the editor says so.** A group is one run in the draw order, so entities that were apart are pulled together and move up. The message pill says "Draw order changed".
- Entities from different groups can be grouped together. They stay where they are on screen.
- Ungrouping removes the group entity and puts its children in its place, selected. The group's own triggers, scripts, tags and body go with it. The message pill lists what was removed.
- Deleting a group's last child keeps the empty group, because it may hold scripts or a body.
- **Double-click a group to go into it. Esc goes up one group.** Inside a group, clicks select its direct children. This is how Inkscape does it.
- After going in, the child under the mouse is selected, so another double-click goes one deeper. Enter on a selected group goes in too.
- A single click outside the group you are inside clears the selection and stays inside. A double-click outside leaves.
- Selecting an entity in the Entities viewer works at any depth.
- Going in or out is never an undo step.
- Dragging in the level view never changes an entity's parent. Parents change only in the Entities viewer or by grouping.

| Double-click on | Result |
|---|---|
| A group | Go into it |
| Text | Edit the text |
| A polygon, line or path | Edit its points |
| A rectangle or circle, a joint | Select only |
| The camera frame | Go into the camera, to reach the entities inside it |
| Empty space inside a group | Go up one group |

Source: scope SE4; round 1: C2, D16; round 2: O7; round 4: G2, 02 2.9; decisions: D20; old: SG-62 to SG-81, SG-87

### The path bar · Later

- A bar above the level view shows which group you are inside, such as World › Car › Wheel. Click a name to jump there. It shows only when you are inside a group.

Source: scope SE5; round 2: O7; old: SG-85

### Moving between groups keeps the place on screen · v1

- Moving an entity into or out of a group keeps it exactly where it is on screen. The editor works out its new TransformComponent from the group's, including rotation, scale and **skew**. Its Entity inspector values change, because they are measured from the new parent.
- If the move changes which body the entity belongs to, the editor warns first.
- Undo restores the old numbers.
- *Why skew: a TransformComponent is measured from the parent. Position, rotation, scale and skew together describe any mix of moves, turns and stretches, so the result is always exact. Without skew, a rotated entity inside a stretched group would have to change shape.*

Source: round 6: RP1; old: SG-135 to SG-137

## The Entities viewer

### The tree of entities · v1

- The Entities viewer shows the real tree of entities. There is no separate layer system.
- **One row is one entity.** A row has an arrow to fold it, an icon for its kind, its name and an eye, and Later a lock. Nothing else. *Why the lock waits: Lock is Later (owner: 2026-11-14).* *Why: joints are their own rows, so showing them inside another row breaks the picture.*
- **The top row is drawn in front.** The World is the top row, because it is the root. A new entity appears at the top of the group you are inside.
- The camera is an ordinary row that can be moved up and down. Where it sits changes nothing, because what is inside the camera is always drawn over the level.
- Click selects a row, Ctrl+click adds or removes one, Shift+click selects a range.
- **Drag rows** to reorder them or move them into a group. A line shows where the row will land, and its indent shows the depth. Dragging a selected row drags the whole selection. A drop is one undo step.
- Can't drop: into itself or its own children, or above the World.
- **F2** or a double-click on the name renames in place. Names are trimmed, 1 to 64 characters, and don't have to be unique. Typing an empty name restores the old one. Renaming can be undone.
- Selecting in the level view unfolds the groups above the row and scrolls it into view.
- Which rows are folded is saved in the project file, not in the play file.
- Every entity has a name, filled automatically, such as "Rectangle 1". A name is not a tag.
- **A name is never empty.** A level file with an empty entity name, or one of only spaces, is damaged. A name missing from the file reads as `Entity`, like any missing value reads as its default. *Why: the Entities viewer never shows an empty row, and every file stays readable (owner: 2026-11-14).*
- **A name can't change during play.** *Why: a lookup by name stays the same for the whole run (owner: 2026-11-14).*
- During play the panel is read-only.

Source: scope SE8; round 1: C2; round 3: N1; round 4: 02 2.11, 02 2.12; round 5: FMT1; round 6: LY2; old: SG-88 to SG-107, SG-122 to SG-128; owner: 2026-11-14

### Search · Later

- A search box filters rows by name as you type. Filters can be added: kind, tag, hidden, locked, has a script, has a trigger, has a warning.
- Results stay a tree: the matches plus their dimmed parents, with a count such as "12 of 3,410". Dragging rows is off while a filter is on.

Source: scope SE9; round 4: 02 2.12; old: SG-108 to SG-110

### Hide · v1

- The eye icon hides an entity. **Hidden means not drawn, in the editor or in play. A hidden entity still collides and runs its triggers and scripts.** *Why: hide is purely about drawing. There is no "active" switch.*
- Hiding applies to children. A child keeps its own switch, so showing the parent again restores the earlier arrangement. A child hidden by its parent shows a dimmed eye.
- Hide can be undone, and is saved in both the project file and the play file.
- A hidden entity can still be selected from its row and edited in the Entity inspector.

Source: scope SE10; round 1: C5; round 2: R7; round 5: 02 2.13; decisions: D7; old: SG-113, SG-115 to SG-119

### Lock · Later

- The lock icon stops an entity from being grabbed in the level view. Example: lock a big background so that dragging over it draws a selection box.
- A locked entity can still be selected from its row in the Entities viewer and edited in the Entity inspector.
- Locking applies to children, the same way as hiding. A locked entity still moves with its unlocked parent, and can still be snapped to.
- Lock can be undone. It is saved in the project file only, because it is editor-only.

Source: scope SE11; round 1: C5; round 3: R17; round 5: 02 2.13, FMT1; decisions: D17; old: SG-114, SG-116, SG-121

## Special entities

### The World and the camera · v1

| | World | Camera |
|---|---|---|
| Select | From its row, alone. Clicking empty space shows it in the Entity inspector | From its row, or by the edge of its frame |
| Move | No | Yes |
| Rename, hide | No | Yes. Hiding it hides everything inside the camera |
| Reorder in the Entities viewer | No, it is the root | Yes, but always directly inside the World |
| Delete, duplicate, copy, group | No | No |
| Hold children | Yes | Yes |

- There is exactly one World and exactly one camera. A second camera can't be added.
- Entities inside the camera are ordinary entities. Single clicks in the level view pass through them, so they never block the level. Double-clicking the camera frame goes into the camera. See [camera](../camera.md).

Source: round 1: C3, C4; round 5: 02 2.15; round 7: 07 2.1; round 8: HUD1; old: SG-129 to SG-134; owner: 2026-11-13

## Speed targets

### Large levels stay responsive · v1

- Selecting shows within 0.05 s. Moving 1,000 selected entities stays smooth. The Entities viewer opens in under 0.2 s and scrolls smoothly at any size.
- These are targets for a level of 10,000 entities on a mid-range laptop.

Source: round 5: 02 2.17; old: SG-140 to SG-145

## Small features

Small features from the old draft and review that the scope review never asked about. The owner gave each its version in round 7 of the architecture review.

| Feature | Rule | Version |
|---|---|---|
| Dimming outside a group | While you are inside a group, the rest of the level dims to about 50%. A View menu switch turns it off | Later |
| Pivot marker | The selection shows the point it rotates around. Drag it to rotate around another point. It resets when the selection changes | Later |
| Set origin to pivot | Moves an entity's origin for good without moving it on screen. This is how a door gets its hinge point | Later |
| Tab to the next entity | Tab and Shift+Tab select the next and previous entity in the same group | Later |
| Auto-pan | The view pans by itself when a drag nears the edge of the level view | Later |
| Solo | Alt+click an eye shows only that entity and its children until repeated. Never saved, never affects play | Later |
| Drag across eyes | Dragging across eye or lock icons sets every row touched to the same state | Later |
| Keyboard in the Entities viewer | Arrows move, Right unfolds, Left folds, typing a letter jumps to a name | Later |
| Entities viewer footer | Counts of selected, hidden and locked entities | Later |

Source: old: SG-16 to SG-19, SG-32, SG-49 to SG-51, SG-82, SG-97, SG-111, SG-112, SG-118b, SG-120; owner: 2026-11-14
