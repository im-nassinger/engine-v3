# Design tokens

## TL;DR

Every named value of the editor's look: colours, the font, sizes, spacing, corners and the shadow. **Each token is a CSS custom property in `ui/theme.css`**, with the name given here and no other (a guard test compares the two), and no component writes a colour or a size of its own. **These are the redesign's values** (owner, 2026-11-17, see [redesign.md](redesign.md)): the Slate colours of its [mockup](mockups/redesign.html), islands with 14 px corners, no borders or lines anywhere, and one soft shadow under every grey container. They replace round 8's flush panels, which stage 19 rebuilt (2026-11-19). Sizes marked *requirement* come from [workspace.md](../requirements/editor/workspace.md) and change only with it.

## Colours

Slate islands and one bright blue accent (owner, 2026-11-17). **There is no line or border colour:** parts stand apart by colour, space and the shadow alone.

| Token | Value | Used for |
|---|---|---|
| `--app` | `#0d0f13` | Behind everything, and the level view outside the level bounds |
| `--panel` | `rgba(24,27,33,.96)` | Islands, menus, dialogs, the Play bar |
| `--raised` | `rgba(255,255,255,.04)` | A card's head, a raised part inside an island |
| `--field` | `rgba(255,255,255,.055)` | A pill field, a switch that is off |
| `--hover` | `rgba(255,255,255,.065)` | A row, button or menu entry under the mouse |
| `--text` | `#e4e8ef` | Text and icons |
| `--muted` | `#8b93a1` | Labels, units, shortcuts, an unchosen tool, ☰'s icon, the debug box's labels |
| `--faint` | `#586070` | Disabled text and icons, an eye that is off |
| `--accent` | `#4f8cff` | A focused field's ring, a switch that is on, the selection in the level view, the minimap's view rectangle |
| `--accent-soft` | `rgba(79,140,255,.2)` | The active tool, the chosen kind, a selected row, a hovered menu entry, a filled slider's fill |
| `--accent-text` | `#8fb5ff` | Text and icons on `--accent-soft`, a note's fix button |
| `--on-accent` | `#ffffff` | Text and icons on `--accent` |
| `--warning` | `#e5b931` | The warning icon, the `missing entity` text; a warning note is tinted with it at 10% |
| `--tip` | `#5aa9f0` | The tip icon; a tip note is tinted with it at 10% |
| `--danger` | `#e5534b` | A refused value's ring and message, a failed save in the message pill |
| `--playing` | `#3fb27f` | The Play bar's tint and label while running |
| `--paused` | `#e5b931` | The Play bar's tint and label while paused |
| `--tooltip` | `#0b0d10` | Tooltips and the drag readout |
| `--tooltip-text` | `#e8ebf0` | Text on them |
| `--chip` | `rgba(13,15,19,.8)` | The message pill |
| `--scrim` | `#000000` at 50% | Behind a dialog |
| `--check-dark` | `#2a2e36` | The darker squares of the check pattern under the gradient bar, so see-through stops show (v2, from the [v2 mockup](mockups/v2.html)) |
| `--check-light` | `#3a3f49` | Its lighter squares |
| `--stop-ring` | `#ffffff` | The white ring around a colour stop's swatch |
| `--scrollbar` | `rgba(255,255,255,.14)` | A scrollbar's thumb, on no track, in every list that scrolls (owner's fix, 2026-11-21) |
| `--scrollbar-hover` | `rgba(255,255,255,.24)` | The thumb under the mouse, where the browser allows it (not Firefox) |
| `--block-event` | `#b88133` | A trigger's event block (v4 fix 4, owner's tone, 2026-11-24) |
| `--block-if` | `#2f897e` | The If's C, and Fire, Win, Lose and Restart blocks |
| `--block-set` | `#3d66c3` | A Set block, whatever it sets |
| `--block-add` | `#7d58b8` | An Add, Subtract or Flip block |
| `--block-wait` | `#ad4a7c` | A Wait block |
| `--block-destroy` | `#b5473d` | A Destroy block |
| `--block-text` | `#ffffff` | Words and icons on a block; a menu box is the block's colour darkened by a fifth (v4 fix 5) |
| `--block-number` | `#ffffff` | A number's oval on a block |
| `--block-number-text` | `#575e75` | The text in a number's oval (Scratch's grey) |
| `--block-shade` | `#000000` | Mixed in at 20% to darken a block's colour for its menu boxes |
| `--block-select-unset` | `#ffd77a` | An unset or missing value box on a block: a soft amber instead of the warning yellow (v4 fix 5) |
| `--block-select-unset-text` | `#4d3800` | The words in an unset value box |
| `--block-gap` | `--panel` with 4% white, opaque | The 2 px ring around each block, the trigger's own background, cutting blocks apart |
| `--block-slot` | `--panel` with 7% white | An empty "add a block" slot |
| `--block-slot-hover` | `--panel` with 10% white | The slot under the mouse, or with its menu open |

The level view's own colours are in [level-view.md](level-view.md).

## The font

- **JetBrains Mono for all of the editor's text** (owner, 2026-11-14, kept 2026-11-17): labels, values, menus and numbers alike. Numbers line up because every character has the same width.
- It is hosted with the game and loaded before the editor first draws, as the [tech notes](../tech-notes.md) ask for fonts. Weights 400, 500 and 600 only.
- **Four sizes only: 10, 12, 14 and 16 px** (owner, 2026-11-17).
- The editor's font has nothing to do with texts in a level: those keep their own fonts, Inter by default (see [drawing](../requirements/drawing.md)).

| Token | Value | Used for |
|---|---|---|
| `--font` | `"JetBrains Mono", ui-monospace, monospace` | Everything |
| `--text-tiny` | 10 px | Small-caps card heads, the debug box |
| `--text-size` | 12 px | The default: rows, fields, menus, numbers, tooltips, the message pill |
| `--text-title` | 14 px | A panel's title, a dialog's title |
| `--text-large` | 16 px | Kept for the rare large text; v1 uses none |
| `--text-end-title` | 20 px | The end window's title, "Level won" or "Level lost" (v3) |
| `--weight-text` | 400 | Text |
| `--weight-name` | 500 | The entity's name field |
| `--weight-heading` | 600 | Panel titles, card heads, the Play bar's label and primary buttons |
| `--caps-spacing` | 0.09em | The letter spacing of small caps, as in the mockup |

## Sizes

| Token | Value | Source |
|---|---|---|
| `--island-gap` | 10 px: from the window's edge and between islands | requirement |
| `--island-bar` | 48 px: ☰ and the tool column's width | requirement |
| `--tool` | 34 px: a tool button, ☰'s button | requirement |
| `--entity-inspector` | 380 px wide | requirement (owner, 2026-11-26: 380 px; 400 px earlier that day, 360 px from 2026-11-25, 344 px before, 300 px before that) |
| `--entities-viewer` | 380 px wide | requirement (owner, 2026-11-26: 380 px; 400 px earlier that day, 360 px from 2026-11-25, 260 px before) |
| `--minimap` | 180 px wide | requirement |
| `--minimap-height` | 93 px tall: inside the 3 px edge the picture is 174 × 87 px, the 2:1 of a new level's 20000 × 10000 bounds | stage 19, steps 6 and 13 (standing yes, 2026-11-18) |
| `--debug-box` | 28 px tall | redesign 24 |
| `--row` | 30 px: an Entities viewer row, an Entity inspector field | redesign |
| `--panel-head` | 40 px: a panel's title | |
| `--card-head` | 32 px | |
| `--control` | 28 px: buttons, icon buttons, a menu entry | |
| `--input` | 24 px: a pill field | |
| `--label` | 120 px: a field's label column | |
| `--icon` | 16 px | |
| `--icon-small` | 13 px: in fields, menu entries and the debug box | |
| `--indent` | 16 px per level of the Entities viewer tree | |
| `--dialog` | 380 px wide | owner, 2026-11-26 (400 px before) |
| `--end-window` | 320 px wide: the end window in test play | the v3 design |
| `--shortcut-sheet` | 380 px wide: the shortcut sheet | owner, 2026-11-26 (320 px from the v4 design before) |
| `--trigger-window` | 600 px wide: the trigger window | owner, 2026-11-26 |
| `--scrollbar-size` | 8 px: a scrollbar's width in WebKit; Firefox and Chromium draw their own thin one | owner's fix (2026-11-21) |

## Spacing, corners, the shadow

- **Spacing** steps: `--space-4`, `--space-6`, `--space-8`, `--space-10` and `--space-14`, of 4, 6, 8, 10 and 14 px. A panel's content is inset 14 px (`--inset`). Cards and sections are split by space only.
- **Corners:** `--radius` 8 px for controls (buttons, rows, menu entries, notes), `--radius-menu` 12 px for menus and tiles, `--radius-island` 14 px for islands and dialogs (owner, 2026-11-17), and `--radius-tool` 7 px for a button inside an island, the island's corner minus the 7 px around it, so their curves run parallel. Pill fields, the message pill and the Play bar are fully round.
- **No borders, outlines or separator lines** (owner, 2026-11-17), except the focus ring a keyboard user needs and the minimap's 3 px edge in `--panel`.
- **One shadow, `--shade`: `0 2px 5px rgba(0,0,0,.3)`**, under every grey container: ☰, the tool column, the Entity inspector, the Entities viewer, the minimap, the debug box, every menu (the kinds menus included), dialogs and the Play bar (owner, 2026-11-17). Nothing glows.
- **Stacking order** (stage 18, standing yes, 2026-11-17): the level view and the islands stack in page order, and four tokens sit over them, each over the one before: `--stack-floating` (10) for the kinds menus, the message pill, Back to level and the Play bar; `--stack-popup` (20) for menus and submenus; `--stack-tooltip` (30); `--stack-dialog` (40). No component sets a stacking number of its own. See [ui.md](../architecture/ui.md#styles).
- **Motion:** none in v1. Every change shows at once. Animations come Later, at 150 ms or less (see [workspace.md](../requirements/editor/workspace.md)).
