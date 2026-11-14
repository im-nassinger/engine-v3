# Editor: Inspector, editor messages, clipboard and undo

## TL;DR

How values are edited and how mistakes are reversed. **v1:** the Inspector shows each component as a card, built from one fixed list of field types; a component that needs a partner shows a note with a button instead of adding it; warnings sit on the card they are about; copy, paste, duplicate and delete; undo with 512 steps. **v3:** copying values and whole components between entities, tips, the physics and joint warnings, and the Used by list.

## The Inspector

### Cards for the selection · v1

- The Inspector shows every component of the selected entity as a card: a title, its fields, and a menu with Remove and Reset to defaults.
- **Clicking empty space shows the World's components.** There is no settings window. *Why: the World is an entity like any other, so its settings are its components.*
- The World's TransformComponent is fixed at zero and its card isn't shown, because the World never moves (owner: 2026-11-13).
- The header shows the entity's name (editable), and its hide switch, and from v3 its lock switch. With several selected it reads `3 entities`.
- The Inspector doesn't show the parent. The Layers panel tree does.
- Cards appear in one fixed order, the same on every entity: TransformComponent, shape, path, text, style, body, surface, joint, camera, tags, scripts, triggers. Users can't reorder them.
- Clicking a card's title folds it. The folded state is remembered per component type, in the browser.
- TransformComponent fields are measured from the parent, and the tooltip says so. The level position of the selection is in the status bar.
- Hovering a field's label shows its description.
- During play the Inspector is read-only, and shows live values when brought back with Panels.

Source: round 1: C1, C10; round 3: R15; round 4: H2, SEL1; decisions: D14, D15; old: WS-84 to WS-89, WS-124; owner: 2026-11-13, 2026-11-14

### One fixed list of field types · v1

- Every Inspector field is one of: **number, text, checkbox, choice, colour, vector, angle, entity, asset, variable, tags**, or a **list** of any of these.
- Components and scripts share the list: a setting a `.lua` file declares shows as the same kind of field.
- A new need adds a type to the list, never a special field on one component.
- *Why: one list makes components and scripts look and behave the same, and the interface work is a fixed set of field types.*

Source: round 3: S2; round 4: FT1

### Typing values · v1

- Enter commits and returns the keyboard to the level view. Tab commits and moves to the next field. Clicking away commits. Esc restores the old value. A value that didn't change makes no undo step.
- Numbers show up to 2 decimals. A focused field shows the full value. Showing a rounded value never changes the stored one.
- Units show as a faded suffix and may be typed: `px`, `°`, `%`, `px/s`, `s`. Rotation is in degrees, lengths and speeds in pixels.
- Both `1.5` and `1,5` are decimals. *Why: the owner's locale and many others use a comma.*
- A number with both a minimum and a maximum also shows a slider.
- An **entity** field is filled by dragging a row from the Layers panel, from a dropdown, or with a picker that lets you click an entity in the level view. A deleted target shows a `missing entity` warning.

| Typed | Result |
|---|---|
| Can't be read as a number, divides by zero, or is too large | Red outline and a message under the field. Enter does nothing, and clicking away restores the old value |
| Below the minimum or above the maximum | Clamped, with a brief `Max is 1500` under the field |
| A fraction in a whole-number field | Rounded |
| Empty | Restores the old value, or clears an optional field |
| Scale of 0 | Refused: `Scale can't be 0` |

Source: round 3: 01 2.5; old: WS-114, WS-115, WS-119 to WS-122, WS-125, WS-126

### Adding and removing components · v1

- `Add Component` sits at the bottom of the cards and opens a searchable menu. Components the entity already has are not listed, because an entity has one of each type.
- **Adding a component that needs a partner doesn't add the partner.** The card shows a note with a button, such as "Needs a ShapeComponent to draw anything. [Add ShapeComponent]". *Why: adding the partner automatically surprises you, and refusing is annoying when you were about to add it next. A note with a one-click fix is clear and never in the way.*
- **Every partner note reads "Needs a X to Y. [Add X]"**, such as "Needs a SurfaceComponent to collide. [Add SurfaceComponent]". *Why: one pattern, so every note reads the same (owner: 2026-11-13).*
- The TransformComponent, the camera's CameraComponent and the World's own components can't be added or removed by hand. The menu entry is disabled and says why.
- With several entities selected, Add Component adds to every entity that lacks it, and Remove removes from all.
- **Removing a component that others need removes only that one.** The cards left without their partner show their note. Example: removing a crate's ShapeComponent leaves its SurfaceComponent, whose card then shows its note with an [Add ShapeComponent] button. *Why: nothing happens behind the user's back, and undo brings the component back.*

Source: round 5: AD2; old: WS-101, WS-102, WS-106, WS-112; owner: 2026-11-13

### Copy values and components · v3

- Right-click any field: **Copy value**, **Paste value**.
- Right-click a card's title: **Copy component**, then **Paste** onto the selection. Paste updates that component on every selected entity and adds it where it is missing.
- Ctrl+Alt+C and Ctrl+Alt+V do the same for the card under the mouse.
- *Why: the owner wanted any value, not just colours. Per field and per component covers both needs with one idea, and colours stop being a special case.*

Source: scope ED7; round 6: CP1

### The Used by list · v3

- At the bottom of the Inspector, a list shows every entity that points to the selected one, and from where, such as "Hinge 1 (JointComponent, A)". Click a line to select that entity.
- *Why: a joints-only list would be a special case. "What points to this?" is the general question, the same idea as assets showing where they're used.*

Source: scope SE13; round 8: LK1

## Editor messages

### Warnings · v1

- An **editor message** is the one name for every note the editor shows about a setup: a short sentence on the card it is about, maybe with a fix button, never blocking anything. Two kinds: a **warning** (yellow icon, this may not work) and a **tip** (blue icon, this works but there's an easier way).
- All editor messages are listed from the count in the status bar. They never block saving or Play.
- Script errors are not editor messages. They stay in the Console.
- **v1 has only two warnings:** a component missing its partner (see above), and a failed save (see [saving](../play-and-save/saving.md)).
- *Why one name and look: every part of the editor reports problems the same way, and the kind says how worried to be.*

Source: scope ED8; round 7: 06 2.13; round 8: WN1; round 10: EM1; old: WS-141 to WS-143

### Tips · v3

- A tip says something works but there is an easier way. Example: an entity with more than 12 triggers gets a tip suggesting a script.

Source: scope ED9; round 9: 09 2.16; round 10: EM1

### Warnings for physics and joints · v3

- Warnings for setups likely to behave badly, such as a joint end that is off its entity, or a small, fast Dynamic body without Bullet that may pass through walls. The full lists are in [bodies](../physics/bodies.md) and [joints](../physics/joints.md).
- *Why v3: each warning is its own small rule to find and write.*

Source: scope ED10; round 6: 05 2.9; round 7: 06 2.13

## Copy, paste, duplicate, delete

### Copy, paste and duplicate · v1

- Ctrl+C copies the selection, Ctrl+V pastes it, Ctrl+D duplicates it.
- **Duplicate puts the copy on top of the original, in the same group, with no offset.** The copy becomes the selection. *Why: the owner's change.*
- Paste puts the copy centred on the mouse when it is over the level view, otherwise at the centre of the view. Pasted entities go into the group you are inside, on top, and become the selection.
- **Only what is selected is copied.** Nothing comes along because it is connected. A joint is copied only when the joint itself is selected.
- Links between the copies are kept: a copied joint connects the copies of its entities if they were copied too. A link to something outside the copied set stays pointed at the original in the same level, and becomes `missing` in another level. **"The same level" means the same opening of it:** after a reload, New or Import, such links become `missing`. *Why: v1 has no level id, so the editor can only recognise the level it has open (owner: 2026-11-13).*
- The World and the camera are skipped by copy, cut, duplicate and delete. If anything else was selected the command goes ahead, otherwise the status bar says why.
- Pasted data is checked like an imported file. Bad data is refused, with a status message, and nothing changes.
- A paste that would pass a limit is refused whole, naming the limit.
- With nothing to paste: `Nothing to paste` in the status bar.

Source: scope ED3; round 3: 01 2.9; round 7: 06 2.10; round 8: JC1; round 9: 09 2.18; old: WS-71 to WS-83; owner: 2026-11-13

### Delete · v1

- Del removes the selection. No confirmation, because undo covers it.
- Deleting a group deletes its children. Deleting an entity deletes the joints attached to it. Deleting a joint deletes only the joint.

Source: round 7: 06 2.11; old: WS-80, WS-81

## Undo

### Undo and redo · v1

- Ctrl+Z undoes and Ctrl+Shift+Z redoes, up to **512 steps**. The oldest step drops silently. *Why 512: the owner's number.*
- Every change to the level can be undone, including changes to files in the Assets panel and to scripts.
- A whole drag is one step. So is a run of arrow-key moves that ends after 1 second idle.
- Undo also restores the selection and the group you were inside. If that group no longer exists, you land in the nearest one above it that does.
- History is one line: a new change clears redo. Changing the selection or the view doesn't.
- **The history is lost on reload.** It is saved in no file. *Why: every past change would have to load forever, making files big and fragile across versions.*
- Test play never changes the level or its history. Undo and Redo are off during play.
- Undo never moves the view. If the change is out of sight, the status bar still reports it.
- A command that fails or changes nothing makes no step. Opening or importing a level makes no step.

| One step | Not a step |
|---|---|
| Create, delete, paste, duplicate | Changing the selection |
| A move, resize or rotate drag | Going into or out of a group |
| A committed Inspector value | The view, zoom, grid display |
| Adding or removing a component | The active tool, tool lock |
| Group, ungroup, reorder, move between groups, rename, hide, lock | Panel sizes, folded cards, tabs, folded Layers rows |
| World settings, level rename, the grid size | Snapping switches |
| Importing, renaming or deleting a file. Several files at once is one step | Test play, Console contents |
| A committed script edit | Keystrokes in the code editor before commit |

Text and code:

- While a field has uncommitted changes, Ctrl+Z acts on the text only. Once the field matches its committed value, Ctrl+Z acts on the level.
- In the code editor, Ctrl+Z always stays inside the code editor, which has its own undo. An edit reaches the level's history when it is committed.
- During an unfinished drawing, Ctrl+Z removes the last point instead of a level step.
- Ctrl+Z is ignored while a mouse button is held in a drag. Esc cancels the drag.
- Undo or redo that removes a tab's file closes that tab.

Source: scope ED2; round 3: 01 2.11; round 5: FMT1; old: WS-90 to WS-100, WS-127 to WS-133, SG-03, SG-04; owner: 2026-11-13

## Small features

Small features from the old draft and review that the scope review never asked about. The owner gave each its version in round 7 of the architecture review.

| Feature | Rule | Version |
|---|---|---|
| Editing several entities at once | Only components present on every selected entity appear. Different values show as `Mixed`. Typing a value sets it on all | v1 |
| Relative edits | In a mixed number field, `+=10`, `-=`, `*=`, `/=` change each entity from its own value | v3 |
| Arithmetic in fields | Number fields accept `100/2+8` | v3 |
| Scrubbing | Dragging a number field's label changes it live: 1 per pixel, Shift 10, Alt 0.1. One undo step. Up and Down in a focused field do the same | v3 |
| Reset to default | Right-click a field: Reset to default | v3 |
| Align and distribute | Buttons at the top of the Inspector and in the Arrange menu: align left, centre, right, top, middle, bottom, and spread evenly. A group counts as one entity. One-off moves, unlike Flex | v3 |
| Draw order commands | Bring forward, send backward, to front, to back, within the same group. Dragging rows in the Layers panel already does this | v3 |
| Paste in place | Ctrl+Shift+V pastes at the original level position. `Paste here` in the context menu uses the right-click position | v3 |
| Repeat duplicate | Move a duplicate, press Ctrl+D again, and the next copy repeats the same move | v3 |
| Alt+drag copy | Alt+drag an entity drags out a copy, as one undo step | v3 |
| Paste between levels | Copied entities survive the session and paste into another level or tab, bringing the files they use. Text or an image on the clipboard pastes as a text entity or a new image file | v3 |
| Context menus | The editor replaces the browser's right-click menu, except in text fields and the code editor. Every entry shows its shortcut, and disabled entries stay visible | v3 |
| Undo list | An arrow beside Undo lists the last 50 steps. Clicking one goes back to it | v3 |

Source: round 4: FX1; old: WS-66 to WS-70, WS-73 to WS-79, WS-83, WS-105, WS-108 to WS-111, WS-116 to WS-118, WS-123, WS-134, WS-144; owner: 2026-11-14
