# Controls and icons

## TL;DR

How each control of the editor looks in each of its states, and which icons v1 needs. **This is the redesign's look** (owner, 2026-11-17, see [redesign.md](redesign.md)), drawn in its [mockup](mockups/redesign.html): rounded buttons, pill fields, sliders drawn as a filled field, switches for checkboxes, a blue pill for the selected row, a soft active tool, soft menu hovers, tinted notes, and no borders or lines. The values come from [tokens.md](tokens.md). **States marked *proposal* are Claude's**, kept from round 8 where the mockup doesn't show them, and change freely until the owner comments.

## Islands

- **An island** is `--panel` with `--radius-island` corners and the `--shade` shadow, 10 px from the window's edge and from the next island. No edge and no line inside it.
- **☰** is a 48 px square island holding one 34 px button with `--radius-tool` corners, its icon in `--muted` like an unchosen tool's. It opens the main menu to its right.
- **The tool column** is a 48 px wide island under ☰, holding the 34 px tool buttons one under another with 4 px between them.
- **The debug box** is an island 28 px tall under the minimap, its right edge on the minimap's, as wide as its entries 10 px apart: `X: -3120  Y: -2410  GRID: 50  ZOOM: 9%`, in `--text-tiny`, the labels in capitals and `--muted`, the values in `--text` with tabular figures.
- **The minimap** is a 180 px wide island with a 3 px edge in `--panel`; the picture inside has 11 px corners.
- **The message pill** sits at the bottom middle of the level view: `--chip`, fully round, `--text-size`. A failed save shows its warning icon in `--danger`.

## Buttons and tools

| Control | Normal | Hover | On or active | Disabled |
|---|---|---|---|---|
| Icon button (the eye, the Play bar's) | Icon in `--text`, no background | `--hover` background | `--accent-soft` background, icon in `--accent-text` | Icon in `--faint`. The tooltip still says why |
| Button (Cancel) | `--raised` background, `--text`, `--radius` corners | `--hover` background | | `--faint` text |
| Primary button (Replace) | `--accent` background, `--on-accent` text, weight 600 | | | |
| Tool button, ☰ | Icon in `--muted` | `--hover` background | `--accent-soft` background, icon in `--accent-text` (the soft active tool) | |

- **Tool lock** (*proposal*): the active tool's button gets a small dot in its bottom right corner.
- **Tooltips:** `--tooltip` background, `--radius` corners, the name and then its key in `--muted`, such as "Shape 4". A disabled button's tooltip gives its reason.

## Fields

A field is a row of `--row` height: the label in `--muted` in a 120 px column, then the value. Units are a faded suffix inside the field.

| State | Looks like |
|---|---|
| Normal | **A pill:** `--field`, fully round, no edge |
| Focused | A 1 px `--accent` ring. Shows the full value, not the one rounded to 2 decimals |
| Refused (*proposal* for the look) | A 1 px `--danger` ring, and the message under the field in `--danger`, such as "Can't read this as a number" |
| Clamped (*proposal*) | The message under the field in `--muted`, such as "Max is 100" |
| Read-only (Mass, Kind) | No pill, the value in `--text` |
| Mixed (*proposal*) | "Mixed" in `--muted` italics |
| Disabled (greyed, such as the fields a body type doesn't use) | Label and value in `--faint`. The value is kept |

- **Vector:** two pills side by side, each starting with its axis letter in `--muted`. **The value comes first:** when it and the unit don't both fit, the unit is hidden (standing yes, 2026-11-19).
- **A number with a minimum and a maximum is a filled slider:** one pill whose inside is filled in `--accent-soft` from the left up to the value, the number on top. **Dragging across it sets the value like a slider; a click without a drag types in it** (owner, 2026-11-18). The value follows the pointer, the pill's left edge the minimum and its right edge the maximum; a press becomes a drag after 3 px, and a pill already being typed in takes clicks as text (standing yes, 2026-11-18).
- **Choice:** the value and a small down arrow, in a pill.
- **Colour:** a 14 px swatch with 4 px corners, then the code in capitals. **An empty fill** (*proposal*): a swatch crossed by a red line, and "None" in `--muted`.
- **Checkbox is a switch:** 28 × 16 px, fully round; off is `--field` with a `--muted` knob on the left, on is `--accent` with an `--on-accent` knob on the right, and Mixed has its `--muted` knob in the middle (*proposal*). For the keyboard and screen readers it is still a checkbox. *The mockup's off track is white at 12%; it takes `--field`, the token tokens.md gives a switch that is off, because no component writes a colour of its own (standing yes, 2026-11-18).*
- **Entity field** (*proposal*): a pill with the target's kind icon and name, and a target icon at the end for the picker. A deleted target shows `missing entity` in `--warning` with its icon.

## Panels

- **Panel title:** plain, not small caps, `--text-title`, weight 600, `--panel-head` high. The panels are titled **Entity inspector** and **Entities viewer**. No line under it.
- **The Entity inspector's head:** the kind icon, the name as a pill field (weight 500), and the eye. The World's name isn't a field, because the World can't be renamed. With several selected it reads `3 entities`.
- **Card:** split from the next by space only. Its head, `--card-head` high, holds the title in small caps (`--text-tiny`, capitals, `--muted`) without `Component`, such as `Transform`, and a `…` menu button with Remove and Reset to defaults; clicking the head folds the card. **Add Component** sits under the last card as a `--raised` button across the panel.
- **Editor message on a card:** a note with `--radius` corners, tinted at 10%: yellow for a warning, blue for a tip, the icon in `--warning` or `--tip`, the sentence in `--text`, and the fix as a link in `--accent-text`, such as "Needs a Surface to collide. Add Surface".

## Entities viewer rows

| State | Looks like |
|---|---|
| Normal | Fold arrow, kind icon in `--muted`, name, eye in `--faint` at the right end |
| Hover | `--hover` background with `--radius` corners, inset 6 px from the island's sides, the eye in `--muted` |
| Selected | **A blue pill:** `--accent-soft` with `--radius` corners, inset 6 px, the kind icon in `--accent-text` |
| Hidden | The eye crossed out |
| Hidden by its parent | Its own eye at half strength |
| Drop line while dragging (*proposal*) | A 2 px `--accent` line with round ends and a small ring at its start, indented to the depth the row will land at |

- Each level of the tree is indented 16 px. The World's row has no eye, because the World can't be hidden.
- v1 rows have no lock icon. Lock comes Later (owner, 2026-11-14).

## Menus, dialogs, the Play bar

- **Menu:** solid `--panel`, `--radius-menu` corners, 6 px inside, the `--shade` shadow, no edge. Entries are 28 px high with `--radius` corners, the shortcut in `--muted` at the right. **The hovered entry is `--accent-soft`** (a soft hover). A disabled entry is `--faint`. A submenu opens to the right of its entry.
- **The main menu** opens to the right of ☰, its top level with ☰'s top: Play with its keys, then File, Edit, Arrange, View and Help, each with a right arrow.
- **A kinds menu** (the Shape tool's Rectangle, Circle and Polygon; the Joint tool's Hinge, Rope and Spring) stands open to the right of its tool, 12 px from the tool column, **centred on the tool**, with a 7 px arrow on its left side in `--panel` pointing at the tool and joined to the menu with no seam. Each kind is an entry with its icon; the chosen one is drawn like the active tool: `--accent-soft`, its icon and words in `--accent-text`.
- **Dialog:** 400 px wide, centred, over the `--scrim`, `--panel` with `--radius-island` corners and the `--shade`. A title in `--text-title` and weight 600, the text in `--muted`, then the buttons at the right with no line above them: the safe one first, the primary one last.
- **Play bar:** a fully round pill at the top centre of the window, tinted with its state's colour at 16% over `--panel`, with the `--shade`. A label with a dot: PLAYING in `--playing`, PAUSED in `--paused`. Then Pause (Resume while paused), Step (disabled while running), Stop, each a round icon button with its key in `--muted`. STARTING (in `--playing`) while the game loads and ENDED (in `--muted`) once a run ended (stage 16). One line of `--text-size` under the pill shows why a run ended, "The game isn't responding", or a hint such as "Stop to edit".

## v2: the pen, the Pencil and gradients

Claude's proposal (standing yes, 2026-11-20), drawn in the [v2 mockup](mockups/v2.html), **approved by the owner** the same day.

- **The Bézier pen (4) and the Pencil (5)** are tool buttons under Joint, with Lucide's `pen-tool` and `pencil`. Tooltips: `Bézier pen 4`, `Pencil 5`.
- **Both hide the Entity inspector**, as the Shape and Joint tools do. The pen has no menu beside it.
- **The Pencil's smoothness is a kinds menu** beside it, titled `SMOOTHNESS` in small caps, with Low, Medium and High, each with a line icon from jagged to smooth. It starts on Medium and remembers the last one.
- **A path's Points** in the Entity inspector are a list of path points. Each row is the point's number, a fold arrow, its position as a vector and its corner as a choice (Sharp, Smooth, Separate). Unfolded, **Handle in** and **Handle out** show under it as vectors. The rows of selected points are the blue pill and unfolded.
- **The Fill** is a choice pill: None, Solid, Linear, Radial. Solid shows v1's colour field. Linear and Radial show the gradient editor under it:
  - **The gradient bar**, 22 px high and fully round, over a check pattern so see-through stops show.
  - **The colour stops** under it, 14 px swatches with a white ring; the chosen one has an `--accent` ring too. Dragging a stop along the bar sets its place, and clicking the bar adds a stop there.
  - **The chosen stop's Colour and Place**, the place a filled slider from 0 to 100%, and a `−` button to remove it, disabled with 2 stops. **+ Add stop** under them, a link in `--accent-text`, disabled with 8.
  - **Start and End** (linear) or **Centre and Radius** (radial), in % of the entity's box.
- **The minimap paints a gradient as one colour**: its stops mixed, each weighted by how much of the bar it covers.

## Icons

- **Outline icons** (owner, 2026-11-14): 24 px drawings shown at 16 px, a 1.6 px stroke with round ends and corners, no fill. One open set for every icon: `lucide-react`, picked in stage 6 (standing yes, 2026-11-15, see [ui.md](../architecture/ui.md#stage-6s-choices)).
- v1 needs these: ☰, Select, Shape, Joint, the four shape kinds (rectangle, circle, polygon, line), the three joint types (hinge, rope, spring), group, World, camera, the eye and the eye crossed out, fold arrows (right and down), Play, Pause, Step, Stop, warning, tip, the target picker, `…`, plus, the right arrow of a submenu and the down arrow of a choice. **v2 adds** the Bézier pen, the Pencil, a path's kind icon, and Low, Medium and High smoothness.
