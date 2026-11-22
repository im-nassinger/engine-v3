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

## v3: triggers, tags, variables, inputs and the end window

Claude's proposal (standing yes, 2026-11-22), drawn in the [v3 mockup](mockups/v3.html), redrawn once after the owner's notes and **approved by the owner** the same day.

- **The Trigger tool (6)** is a tool button under the Pencil, a dashed rectangle with a bolt. Tooltip: `Trigger 6`. It hides the Entity inspector like the other drawing tools and has no menu beside it.
- **The Triggers card** holds one block per trigger, in `--raised` with 10 px corners and 8 px inside, 8 px apart, then **+ Add trigger** as a `--raised` button across the card.
  - **The block's head:** the trigger's name (weight 500, the handle that drags it), the on/off switch, and a `…` menu with Rename, Duplicate and Delete. An off trigger's sections fade to 45%.
  - **Four sections in one shape: When, If, Do, Repeat.** Each is a small-caps title in `--muted` (the card head's style) with a hint at the right in `--faint` ("optional" or "all must be true" on If, "top to bottom" on Do with two or more actions), over full-width rows. *Why one shape: the owner found a first try that mixed labels beside and above values, with floating "+ If" and "+ Do", unclear (owner, 2026-11-22).*
  - **A row is one sentence**, at least 28 px high, `--field` with `--radius` corners, 4 px apart; it wraps when it must. If and Do rows show an × at the right on hover, which removes the row.
  - **A word that can change** is `--accent-text` with a dotted underline, solid on hover and while its menu is open. Clicking it opens a menu under it; a number opens a small number field. **An unset word** is `--warning` in italics and says what it needs, such as "pick a tag". **A word naming `other` under an event with none** is `--faint` and struck through.
  - **Add check** and **Add action** are rows with no background in `--muted`, a + first, at the end of If and Do. With no action, Add action is `--warning`.
  - **A trigger that can't run** shows a warning note at its end: "Doesn't run until every yellow part is set." A touch trigger without a SurfaceComponent shows "Needs a Surface to notice touching. Add Surface as sensor".
- **The tags field** is one pill, wrapping onto more lines: each tag a 19 px `--accent-soft` pill in `--accent-text` with an ×, then the text box, "Add a tag". Typing offers the level's matching tags in a small menu under the field.
- **The Variables card:** one row per variable, its name in `--text` as the label, its starting number as the value, and an × to remove it. **The Inputs card:** one row per input, its name as the label, 96 px wide as in the v3 mockup so the default keys fit, its keys as one pill ("A, Left arrow"), and an ×. Each card ends with an **Add variable** or **Add input** row, drawn like Add check.
- **The end window:** over the `--scrim`, a 320 px `--panel` window with `--radius-island` corners and the `--shade`, centred: the title "Level won" or "Level lost" at 20 px weight 600, "Time" in `--muted` with the time in `--text`, then **Leave** and **Restart**, Restart the primary button. The Play bar reads ENDED.

## v4: the shortcut list, the new trigger rows and typed variables

Claude's proposal (standing yes, 2026-11-22), drawn in the [v4 mockup](mockups/v4.html) from v3's approved look, for the owner to see in v4's try. Its shortcut search, trigger cards, variable menus and Variables cards work.

- **The shortcut sheet** is an island at the top right, 320 px wide, in the Entities viewer's place, which it hides while open; it reaches down to 10 px above the minimap. *The v4 design put it over the Entity inspector, but the top right holds the Entities viewer; this is the closest fix (standing yes, 2026-11-22).*
  - **Its head:** the search field, a pill with a 1 px `--accent` ring while it has the focus, a search icon and "Search shortcuts", then a × icon button that closes the sheet.
  - **Its list scrolls:** one section per area (Tools, Selecting, Editing, View, Test play, File, Mouse), its title in the card head's small caps, then one 28 px row per shortcut: what it does in `--text` on the left, the keys on the right.
  - **A key cap** is `kbd`: `--text-tiny`, 18 px high, at least 18 px wide, `--raised` with `--radius` corners; the keys of one shortcut are joined by a `+` in `--faint`, and a second way is after a faint "or". On a Mac the caps read Cmd and Option.
  - **Typing filters** the rows by the words of the name and the keys ("ctrl z", "grid"), case and order not counting; an area with no row left is hidden; nothing left shows "No shortcut matches" in `--muted`.
  - `?` (typed outside a field), **Help › Keyboard shortcuts** in the main menu (the entry's name in [workspace.md](../requirements/editor/workspace.md)), the ×, and Esc open or close it. Opening gives the search the focus.
- **Tooltips:** every icon button, the name then its key in `--muted` ("Trigger 6"); a button without a shortcut shows its name only.
- **The When menu** lists v3's eight, then "this hits something", "this gets a custom event", "this is destroyed" and "a variable changes". Their rows read "this hits something", "this gets `open`", "this is destroyed", and "the variable `score` becomes 3 or more".
  - **The variable's condition is one word:** "changes" (any change) or "becomes …". Its menu offers "changes (any change)", then each compare its type allows ("becomes … or more", "becomes more than …", and so on for a number; "becomes "…"" and "becomes anything but "…"" for a string; "becomes true" and "becomes false" for a boolean); picking one that needs a value opens the value's field in its place.
- **Add check** offers "who is tagged…", "a variable compared with a value" and "a component value compared with a number". **The component value check** reads "this `Body speed` is more than `200`": the value menu lists the target's components, each opening a submenu to its right with its number values and vector axes; Body's ends with Speed, Velocity x and Velocity y, each with the faint word "live".
- **Add action** adds "fire a custom event" and "wait" before win. **Fire** reads "fire `open` on `every door` with `2`": the name menu lists the level's names and "New name…", which opens a text field taking one word, as a tag is; the number is optional, its unset word "no number" in `--muted` with a `--muted` dotted underline (not yellow, since nothing is missing), and its field has a "No number" entry. **Wait** reads "wait `2` s", 0 to 3,600.
  - **A Wait with actions after it** has a 1 px `--faint` line at 45% under its row, 8 px below it, inset 10 px each side, so the actions after it read as a later moment.
  - **Change value** on a boolean offers set and flip ("flip `door_open` of `this`", with no value); on a string, set only, its value in quotes.
- **The variable menu** has a group per owner, each titled in the menu's small caps: "The level's" first (the World's variables), then the target's own, titled with the target (`this`, `other`, the entity's name). An If offers `this`, and `other` when the event has one; a When offers `this` only; Change value offers its target's. Each row ends in its type as a `--text-tiny` `--faint` word: number, string, boolean. An owner with none shows "no variables of its own", disabled. Change value's menu then lists v3's component values under "A value of an entity".
- **A value follows its variable's type:** a number opens the number field; a string opens a text field and shows in quotes; a boolean opens a menu of true and false. A string or boolean compares with "is" and "is not" only. Picking a variable of another type resets the value to unset and the compare to "is".
- **The Variables card**, on any entity: each row is the name in `--text` (82 px, cut with an ellipsis), the type menu (an 84 px choice pill: Number, String, Boolean), then the value: a number pill, a text pill (at most 1,000 characters, "Text" as its placeholder) or a switch; then the ×. Changing the type resets the value to 0, "" or off. **Add variable** adds `variable_1` (the first free number), a number set to 0.

## Icons

- **Outline icons** (owner, 2026-11-14): 24 px drawings shown at 16 px, a 1.6 px stroke with round ends and corners, no fill. One open set for every icon: `lucide-react`, picked in stage 6 (standing yes, 2026-11-15, see [ui.md](../architecture/ui.md#stage-6s-choices)).
- v1 needs these: ☰, Select, Shape, Joint, the four shape kinds (rectangle, circle, polygon, line), the three joint types (hinge, rope, spring), group, World, camera, the eye and the eye crossed out, fold arrows (right and down), Play, Pause, Step, Stop, warning, tip, the target picker, `…`, plus, the right arrow of a submenu and the down arrow of a choice. **v2 adds** the Bézier pen, the Pencil, a path's kind icon, and Low, Medium and High smoothness.
