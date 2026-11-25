# Controls and icons

## TL;DR

How each control of the editor looks in each of its states, and which icons v1 needs. **This is the redesign's look** (owner, 2026-11-17, see [redesign.md](redesign.md)), drawn in its [mockup](mockups/redesign.html): rounded buttons, pill fields, sliders drawn as a filled field, switches for checkboxes, a blue pill for the selected row, a soft active tool, soft menu hovers, tinted notes, and no borders or lines. The values come from [tokens.md](tokens.md). **States marked *proposal* are Claude's**, kept from round 8 where the mockup doesn't show them, and change freely until the owner comments. **The trigger card is Scratch blocks** (owner, 2026-11-24, built 2026-11-25): see [v4 fix 4](#v4-fix-4-the-trigger-card-as-scratch-blocks).

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
- **Entity field** (*proposal*): a pill with the target's kind icon and name, opening the [entity picker](#v4-fixes-the-trigger-cards-pickers-and-boxes), and a target icon at the end that picks in the level view. A deleted target shows `missing entity` in `--warning` with its icon.

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
  - **The block's head:** the trigger's name (weight 500, the handle that drags it), the on/off switch, and a `…` menu with Rename, Duplicate and Delete (replaced by [fix 6](#v4-fix-6-labelled-head-and-icon-menu)). An off trigger's sections fade to 45%.
  - **Four sections in one shape: When, If, Do, Repeat.** Each is a small-caps title in `--muted` (the card head's style) with a hint at the right in `--faint` ("optional" or "all must be true" on If, "top to bottom" on Do with two or more actions), over full-width rows. *Why one shape: the owner found a first try that mixed labels beside and above values, with floating "+ If" and "+ Do", unclear (owner, 2026-11-22).*
  - **A row is one sentence**, at least 28 px high, `--field` with `--radius` corners, 4 px apart; it wraps when it must. If and Do rows show an × at the right on hover, which removes the row.
  - **A word that can change** is `--accent-text` with a dotted underline, solid on hover and while its menu is open. Clicking it opens a menu under it; a number opens a small number field. **An unset word** is `--warning` in italics and says what it needs, such as "pick a tag". **A word naming `other` under an event with none** is `--faint` and struck through.
  - **Add check** and **Add action** are rows with no background in `--muted`, a + first, at the end of If and Do. With no action, Add action is `--warning`.
  - **A trigger that can't run** showed a warning note at its end: "Doesn't run until every yellow part is set." until v4 fix 5 removed it (owner, 2026-11-25). (v3 also showed "Needs a Surface to notice touching. Add Surface as sensor" on a touch trigger without a SurfaceComponent, until fix 3.)
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
- **The When menu** lists six events since fix 3, below. "This gets a custom event" and "a variable changes" read "this gets the custom event `open`" and "the variable `score` becomes 3 or more".
  - **The variable's condition is one word:** "changes" (any change) or "becomes …". Its menu offers "changes (any change)", then each compare its type allows ("becomes … or more", "becomes more than …", and so on for a number; "becomes "…"" and "becomes anything but "…"" for a string; "becomes true" and "becomes false" for a boolean); picking one that needs a value opens the value's field in its place.
- **Add check** offers the value check only since fix 3, below. **A component value** reads "this `Body › Speed` is more than `200`": its component's submenu lists its number values and each vector once; Body's ends with Speed and Velocity, each with the faint word "live". A vector or Velocity adds an axis word, `x` or `y`, a menu of the two.
- **Add action** adds "fire a custom event" and "wait" before win. **Fire** reads "fire `open` on `every door` `with the number 2`": the name menu lists the level's names and "New name…", which opens a text field taking one word, as a tag is; the number is optional, its unset word "with a number (for scripts)" in `--muted` with a `--muted` dotted underline (not yellow, since nothing is missing), and its field has a "No number" entry. **Wait** reads "wait `2` s", 0 to 3,600.
  - **A Wait with actions after it** has a 1 px `--faint` line at 45% under its row, 8 px below it, inset 10 px each side, so the actions after it read as a later moment.
  - **Change value** on a boolean offers set and flip ("flip `this` `door_open`", with no value); on a string, set only, its value in quotes.
- **The variable menu** has a group per owner, each titled in the menu's small caps: "Level variables" first (the World's variables), then the target's own, titled with the target (`this`, `other`, the entity's name). An If offers `this`, and `other` when the event has one; a When offers `this` only. Each row ends in its type as a `--text-tiny` `--faint` word: number, string, boolean. An owner with none shows "no variables of its own", disabled. Change value's menu is laid out apart, below.
- **A value follows its variable's type:** a number opens the number field; a string opens a text field and shows in quotes; a boolean opens a menu of true and false. A string or boolean compares with "is" and "is not" only. Picking a variable of another type resets the value to unset and the compare to "is".
- **The Variables card**, on any entity: each row is the name in `--text` (82 px, cut with an ellipsis), the type menu (an 84 px choice pill: Number, String, Boolean), then the value: a number pill, a text pill (at most 1,000 characters, "Text" as its placeholder) or a switch; then the ×. Changing the type resets the value to 0, "" or off. **Add variable** adds `variable_1` (the first free number), a number set to 0.

## v4 fixes: the trigger card's pickers and boxes

The owner's ask while trying v4 (2026-11-23): every part of a trigger is picked the way the rest of the editor picks it. Built straight away; seen in Chromium screenshots.

- **The entity picker** replaces every flat list of entities, in a trigger's entity words and in every entity field (a camera's Follow, a joint's A and B). A 280 px popup with the menu's `--panel`, `--radius-menu` corners and `--shade`, under the word or field:
  - **First, what names no one entity**, as menu rows: a trigger's `this` ("The entity this trigger is on") and `other` ("The other entity of the event: the one touching, hit or firing", greyed with "This event has no other entity" under an event with none), then, where a tag can be the target, the heading "Every entity tagged" and a row per tag. An entity field's first row is None.
  - **Then the search row:** a pill "Search entities" holding the keyboard, and the target icon. Typing keeps the entities whose name holds it, with their parents in `--muted` so each match shows where it sits; Enter picks the first match. The target icon closes the picker and picks the next entity clicked in the level view, as the entity field's icon does.
  - **Then the Entities viewer's tree**, its rows drawn as the panel draws them (30 px, the fold arrow, the kind icon, the name, 16 px per level) without the eye, folded as the panel is until folded here; folding here leaves the panel alone. The picked entity's row is `--accent-soft`. An entity that can't be picked (an entity field's World, camera and own entity) is `--faint`, and picking it shows the reason in the message pill. At most 320 px high, then it scrolls.
  - **A row dropped from the Entities viewer** on an entity word picks it, as on an entity field.
- **Change value's value menu** has two groups: "Level variables" (the World's, each with its type) and "Values of `this`" (or `other`, or the entity's name): one row per component of the target, in card order, each opening its values in a submenu ("Transform" › Position, Rotation; "Variables" › the target's own variables; "Tags" › Tags; "Trigger" › each trigger's on/off). A vector is one row. The word reads `Transform › Position`.
- **The entity comes before the value** in Change value's sentence: "set `this` `Transform › Position` to `0, 0`", "add `5, 0` to `other` `Transform › Position`", "add `1` to `coins`" (a level variable names no entity), "subtract `coin` from `this` `tags`".
- **A typed word opens the Entity inspector's own boxes** in its 220 px popup: a number the number pill with the value's unit (Rotation's °, Position's px, a time's s); a vector two pills X and Y side by side, Enter in either typing in both; a colour or a Fill the colour box with its swatch; an entity field's value the entity picker. A tag's value menu ends with "New tag…". Body › Velocity's amount is one word, `0, -600`, opening the two pills in px/s.
- **Add action's menu is in four groups**, titled in small caps: Values (change a value), Entities (destroy), Events (fire a custom event, wait), The game (win, lose, restart the level). **Every item of Add action and Add check has a line under its label** in `--muted` `--text-tiny` saying what it does ("Take an entity out of the level"); such a row grows to fit it.
- **Wording:** "other has the tag player" (was "other is tagged player"), "this gets the custom event open", "pick an entity" and "pick a value" for unset words.

## v4 fix 3: simpler triggers

The owner found triggers convoluted (2026-11-23); the plan is [fix-3-simpler-triggers.md](../versions/v4/fix-3-simpler-triggers.md). Built the same day.

- **The When menu holds six events:** "other starts or stops touching this", "a key or input is pressed, released or held", "after or every few seconds", "the level starts", "a variable changes", "this gets a custom event". Picking one gives its first kind (starts, a key, after).
- **Touching, a key or input and a timer pick their kind in place:** their rows read "other `starts` touching this", "the `key` `Space` is `pressed`", "`after` `60 seconds`". **The in-place word is also the event word** (standing yes, 2026-11-23): its menu shows the two kinds first, in a group titled Touching, Key or input or Timer, then the six events under Events. *Why: a key or input and a timer have no other word to hold the event, and one word per row picking the event keeps every When row alike.* The kind keeps the rest of the When: a key's press, a timer's seconds; switching key to input leaves the name to pick.
- **Add check offers "a value"**, with "Such as: other has the tag player, coins is 10 or more, this Body › Speed" under it. It starts on `other` when the event has one, else `this`, and reads "`other` `pick a value`" until the value is picked.
- **The value menu is laid out as Change value's**: "Level variables", then "Values of `other`" with one row per component opening its values: numbers and vectors, Body's Speed and Velocity (live), Variables › the target's own, Tags › Tags. A level variable makes the World the target and names no entity in the row.
- **Each kind of value reads in its own words:** "`other` `has` `the tag` `player`" (the compare word is has or doesn't have, before the value word), "`coins` `is at least` `10`", "`this` `health` `is less than` `1`", "`this` `Body › Speed` `x` `is more than` `200`". A first number value starts at "is at least" for a variable and "is more than" for a component value, as v4's checks did; a value of another type resets the compare to is and the amount to unset.
- **Change value offers Body › Velocity** in Body's submenu: "add `0, -500` to `other` `Body › Velocity`", its amount the two pills in px/s. Push is gone from Add action.
- **The Sensor checkbox is gone** from the Surface card, and so is the trigger card's "Needs a Surface to notice touching. [Add Surface as sensor]" note.

## v4 fix 4: the trigger card as Scratch blocks

**Picked by the owner (2026-11-24) from the [trigger card mockup](mockups/triggers.html), option 12, Scratch. Built (2026-11-25) from [fix-4-scratch-triggers.md](../versions/v4/fix-4-scratch-triggers.md).** The old card was ugly and convoluted (owner, 2026-11-24), so a trigger is now snap-together blocks: an event block on top, one C-shaped If wrapping the actions it guards, then the actions as plain blocks, each changeable part in its own box, corners and teeth slightly rounded. The mockup is the reference for every size and colour; the rules below are what the owner settled over its rounds, with what was tried and dropped, so it doesn't come back. The mockup's other options (Chips, Icon rows, Blocks, Flow, Steps, Folded, Sentence, When / Then, Tree, Branch) are in [rejected.md](../rejected.md).

- **Spacing matters most.** Nothing may touch its container's edge: the mockup uses 12 px inside a trigger, 8 px between rows, 8 px around the card.
- **No underlines, no filled circle markers, no lines that wrap.** Branch's first look had all three and was "very ugly and convoluted". Keep each part on one line; shorten the words, or cut with "…", rather than wrap.
- **Each changeable part must look separate.** "other has tag player" in one colour read as one thing, though `other`, `has tag` and `player` are three choices. Branch tells them apart by colour alone (entity blue, value violet, amount green, choice white, fixed words grey); Scratch gives each its own box.
- **The event names who touches:** "When **other** starts touching this", not "something starts touching this" or "Other starts touching this". The sentence starts with When where no label says When, and `other` is blue like an entity, with no chip or menu, since it can't be changed.
- **Only a little roundness.** The owner didn't like the first, rounded Scratch look; a square version (Blocky) followed. Then Blocky got 4 px corners and teeth rounded by 3 px, became the only Scratch option, and took its name (owner, 2026-11-24). Its teeth are square tabs, and no notch is cut: the tooth above always covers where it would be. The 2 px gap is a ring around the body and the tooth (box-shadow), so the hole is the tooth plus 2 px on every side, corners rounded by 5 px; drop-shadows drew it with near-square corners, so the hole didn't match the tooth (owner).
- **No cooldown; a trigger rests by switching itself off** (owner, 2026-11-24). Its actions start with "Set this Enabled to false" and end with "Wait 3 s" and "Set this Enabled to true", plain Set blocks like any other (owner, 2026-11-24: not a special "switch this trigger off" block). *Enabled* is the trigger's on/off value ([glossary](../glossary.md)), shown as `Triggers › <trigger> › Enabled`. The time counts from the end of the actions, not from the firing, and a firing whose check fails switches nothing off, since the blocks sit inside the If. **Repeat is gone** (owner, 2026-11-24): **once per run is one first block setting this trigger's Enabled to false**, with nothing switching it back. The run that switches its own trigger off goes on, so it can wait and switch it on again ([requirements](../requirements/triggers/triggers.md)). *Rejected* for the cooldown: a footer line; a block under the event worded "cooldown 3 s" (jargon), "rest 3 seconds" ("horrible") or "do and rest for 3 seconds"; "ignore touches for 3 seconds"; a ⏱ badge on the event block; the event block's first word as a menu ("when", "the first time", "at most every 3 seconds"), which hides its choices; a block at the end of the actions, which reads as if the time starts after them, though a cooldown starts at the firing; a C-shaped "every 3 seconds" block, which read like a timer; "at most once every 3 s", too hard to read; "not again for 3 s" inside the event block. A Wait at the end alone can't do it, since a firing during a Wait starts its own run.
- **Block colours: don't invent a palette.** Three invented ones were each worse (owner, 2026-11-24): the first clashed, with white text on mid colours; a muted one at one OKLCH lightness turned brown and dull; light pastel blocks with near-black text were "absolutely horrible". Now the blocks use the editor's own way: a dark surface tinted with the kind's colour, the editor's `--text` on it, the icon in the full colour, changeable parts as the editor's fields, and a 2 px gap tracing each block's outline.
- **Scratch's categories in deeper colours** (owner, 2026-11-24: "#3d66c3, #2f897e, #b88133, etc.", replacing Scratch's own bright colours, which replaced the tinted dark blocks below): **a colour per kind of block, whatever it changes** (owner, 2026-11-24: every Set is blue, Position or Enabled): amber `#b88133` for the event, teal `#2f897e` for the If, blue `#3d66c3` for Set, violet `#7d58b8` for Add, rose `#ad4a7c` for Wait, red `#b5473d` for Destroy (Claude, in the owner's tone); white words and icons, menus in the block's colour darkened by a quarter, numbers as white ovals with Scratch's grey text.
- **Every block starts with one icon** saying what it does (the event's, If's split, each action's, Wait's hourglass, the power icon of switching a trigger off or on), in the block's full colour; the If's closing bar has none (Claude, asked to decide, 2026-11-24).
- **Only If holds other blocks.** A trigger is When, If, Do, with no nesting beyond that: one If, its checks joined by "and", wrapping the whole Do list since its checks guard every action. When is the top block, Wait and the actions plain blocks; a C-shape for Wait would suggest a scope that doesn't exist (Claude, asked to decide, 2026-11-24).
- **A time's unit is a menu**, "seconds", not a fixed "s", so ticks can be offered later (owner asked for "frames"; the glossary's word is tick) (owner, 2026-11-24).
- **A component value shows its path** (owner, 2026-11-24): "set this Enabled to false" read as switching the whole entity off. Set's value box now shows the path from the entity, the steps dim and the value bright: `Transform › Position`, `Triggers › Timed door › Enabled`. *Rejected:* "this trigger" as a target with a bare `Enabled`, which hides where Position lives. The trigger's line is now 128 px wider than the 344 px Entity inspector, so it scrolls sideways.
- **Blocks are cut apart by the trigger's own background** (owner, 2026-11-24): the 2 px border around every block is the colour of the trigger it sits in, not a stronger shade of the block's colour.
- **Adding a block anywhere** (owner, 2026-11-24; look only in the mockup): hovering a Scratch block opens an empty "add a block" slot next to it, shaped like a block, the tooth above in its hole; a block with nothing under it shows its tooth while the slot is open. **A block has three bands: its top third opens the slot above it, its bottom third the slot below it, and its middle third, where its values are, opens none** (owner, 2026-11-24, replacing top and bottom halves): any open slot closes there (owner). **A value box acts as the middle wherever it reaches**, so hovering one opens no slot and closes any open one (owner, 2026-11-24). The tooth is left out of the measure (owner). The If is two bars, each with its own three bands (owner, 2026-11-24, replacing the If measured whole): the top bar's top third opens the slot above the If, its bottom third the first slot inside it; the bottom bar's top third opens the last slot inside it, its bottom third the slot after the whole If; both middles, and the arm, open none. The event has nothing above it, so its top third is like its middle (Claude). The cursor shows the hovered band: an up arrow over a band that opens the slot above, a down arrow over one that opens the slot below, the plain arrow over a middle (owner asked for a cursor per band, 2026-11-24; which cursors, Claude, standing yes). Slots open only on hover, and the card has no other Add button (owner: one kind of add button, not two). **The hovered block never moves:** the script keeps the height it has with no slot open, and when a slot opens or closes above the hovered block, the script (the box that also scrolls sideways) scrolls by the slot's height at once, so the block, and the point of it under the mouse, stay where they were; otherwise a value box couldn't be clicked (owner, 2026-11-24). When the open slot would be clipped by the script's view, above or below, wherever the hovered block is, the script scrolls smoothly by what's needed to show all of it, the hovered block moving with it (owner, 2026-11-24). Where the script can't scroll that far, an empty strip above or below its blocks makes the room, and the script glides back to its start over 400 ms when the mouse has left it, not at once (owner: it jumped) (Claude). **Nothing moves for 200 ms** after the mouse asks for a change (owner, 2026-11-24). **Then a slot takes 400 ms** (owner): first the blocks move apart to make its room (200 ms), then the slot fades in (200 ms; at 100 ms it looked instant, owner); closing runs the other way. Every move eases in and out (owner: not linear). So a mouse moving fast reaches the block it's heading for before anything moves; the script scrolls on every frame of it.
- **The script's scrollbars are thin rounded bars drawn over the blocks** (owner asked for better-looking scrollbars, 2026-11-24): they take no room, so the vertical one appearing no longer narrows the script and calls up the horizontal one (owner); they show while the mouse is on the script and widen under it, and their thumbs can be dragged (Claude). **Where the script hides blocks past an edge, that edge fades them into the card** instead of cutting them, on any side, only where something is hidden (owner, 2026-11-24); a straight fade looked artificial (owner), so it eases and has a grain from a noise texture, strongest halfway through the fade; it is 24 px, shorter while less than that is hidden (Claude).
- **No highlight stripe on the event block.** The square Scratch's lighter band on top was "ugly"; the event block is one flat colour.

- **No block before or after the If** (owner, 2026-11-24, point C of the plan): with an If, there are no slots above or below it. The top third of the If's top bar and the bottom third of its bottom bar act like a middle, and the event block's bottom third opens the If's first inner slot. *Why: the If wraps the whole Do list, and play keeps one flat action list.*
- **A check is added from a slot's menu** (owner, 2026-11-24, point D): the add menu starts with a check group, "if … (a value)", then the actions. With no If, the check wraps every action in a new If; with one, it is joined by "and". Removing the last check removes the If, so a trigger without checks draws no empty If.
- **A block is removed with an ×** at its right end, shown while the mouse is on its middle band, as the old rows had (standing yes, 2026-11-24). Dragging blocks to reorder is left for later.

## v4 fix 5: the blocks after the owner's try

**Asked by the owner while trying fix 4 (2026-11-25), [fix](../versions/v4/fixes.md) 5. Built the same day.**

- **The script is at least 4 blocks tall and at most 10** (owner): a block takes 34 px, the last 40, and 6 px stay under it, so 148 px to 352 px. A longer script scrolls.
- **No "Doesn't run until every yellow part is set." note** (owner). The unset value boxes are the only sign; play still skips a trigger with unset parts.
- **Every value box is a pill** (owner): its corners fully rounded, menus and number ovals alike.
- **Value box colours** (owner asked for better ones; picked by Claude, standing yes, 2026-11-25): a menu is the block's colour darkened by a fifth (it was a quarter); an unset or missing box is a soft amber `#ffd77a` with dark brown words, instead of the editor's warning yellow, so it stands out without looking like an error. No value box has a ring inside (owner, 2026-11-25: "remove that ugly border"; Claude's faint rings removed). Tokens: `--block-select-*` in [tokens.md](tokens.md).
- **A block has a context menu** (owner): a right click opens **Replace** and **Delete**. Replace opens, beside it, the menu of what can take that part's place: the six events for the event block, the actions in their groups for an action (keeping its target, as an action's own word did), and the check menu for the If's top bar. Delete removes the part, as the × does; the event block's Delete is greyed, "A trigger always has its event". On the If's top bar the menu acts on the check under the mouse, or the first check under "if" and "and"; the If's bottom bar has none (standing yes, 2026-11-25). The × stays.
- **A box only changes its own value, never the whole block** (owner: "its select will be used only to change its own value (ex: from starts to stops) and not allow the user to use it to change the whole block itself"). The event's box offers only its in-place kinds: starts or stops touching, a key or an input, after or every. An event with none (the level starts, a variable changes, a custom event) reads as plain words, and so does an action's own word (destroy, fire, wait, win, lose, restart the level), since Replace now changes those (standing yes, 2026-11-25: the owner named the event block; the action word follows the same rule). A new trigger's "pick an event" box still opens the six events.

## v4 fix 6: labelled head and icon menu

**Asked by the owner (2026-11-25), [fix](../versions/v4/fixes.md) 6. Built the same day.**

- **The trigger's head is two labelled rows, drawn like a card's fields** (owner picked this from four options: "it looks more like how the other components render their values"): **Name**, an always-editable text box (Enter, Tab or clicking away renames, Esc doesn't), then a grip that drags the trigger to another place and the `…` menu; **Enabled**, the on/off switch. The `…` menu has Duplicate and Delete; Rename is gone, since the box renames (Claude, standing yes, 2026-11-25). The grip sits beside `…` so the labels line up at the left as on other cards (Claude, standing yes, 2026-11-25).
- **A click on a block's icon opens its Replace menu** (owner): the same menu as right click › Replace, alone, under the icon. The icon acts as the block's middle, so hovering it opens no slot, like a value box (Claude, standing yes, 2026-11-25).
- **The Entity inspector and the Entities viewer are both 360 px wide** (owner).

## v4 fix 10: variables in value boxes

**Asked by the owner (2026-11-25), [fix](../versions/v4/fixes.md) 10. Built the same day.** What a box does is in the [requirements](../requirements/triggers/triggers.md#multiply-divide-and-variables-in-every-value-box--v4); this is how it looks.

- **Change value's op box offers Multiply and Divide** after Set, Add and Subtract, where the value takes them: "multiply score by 2", "divide this Transform › Position by 2". The amount of either is a plain number, with no unit (standing yes, 2026-11-25).
- **A value box that takes variables opens one menu** (standing yes, 2026-11-25): a box typed into (a number, a text) shows the box to type into on top, as before, and the variables under it; a box picked from (true or false, a tag) shows its values, then the variables. The variables come in the variable menu's groups, "Level variables" then the target's own under the target's name (`this` for a Wait), each group with a greyed line, such as "no number variables", when it has none. Picking one puts it in the box, which then reads the variable's name: "add bonus to score", "wait delay seconds". Typing a value, or picking one, switches the box back.
- **A box that takes no variable opens as before:** a vector's X and Y, a colour's, a fill's, an entity's picker, Flip's, and a Change value whose value isn't picked yet.
- **The If on a level's variable offers only the level's variables** (standing yes, 2026-11-25): its sentence shows no target, so an own variable would be read on an entity the block doesn't show.

## Icons

- **Outline icons** (owner, 2026-11-14): 24 px drawings shown at 16 px, a 1.6 px stroke with round ends and corners, no fill. One open set for every icon: `lucide-react`, picked in stage 6 (standing yes, 2026-11-15, see [ui.md](../architecture/ui.md#stage-6s-choices)).
- v1 needs these: ☰, Select, Shape, Joint, the four shape kinds (rectangle, circle, polygon, line), the three joint types (hinge, rope, spring), group, World, camera, the eye and the eye crossed out, fold arrows (right and down), Play, Pause, Step, Stop, warning, tip, the target picker, `…`, plus, the right arrow of a submenu and the down arrow of a choice. **v2 adds** the Bézier pen, the Pencil, a path's kind icon, and Low, Medium and High smoothness.
