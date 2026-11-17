# Controls and icons

## TL;DR

How each control of the editor looks in each of its states, and which icons v1 needs. Every state is drawn on the **States** sheet of the [mockups](mockups/index.html) (moment 6). The values come from [tokens.md](tokens.md). **The states marked *proposal* are Claude's, drawn after the owner picked direction A on 2026-11-14**, and change freely until the owner comments: the moments didn't show them.

## Buttons and tools

| Control | Normal | Hover | On or active | Disabled |
|---|---|---|---|---|
| Icon button (Undo, snapping, the eye) | Icon in `--text`, no background | `--hover` background | `--accent-soft` background (a switch that is on) | Icon in `--faint`. The tooltip still says why |
| Button (Cancel) | `--line` edge, `--text` | `--hover` background | | `--faint` text |
| Primary button (Replace, Play) | `--accent` background, `--on-accent` text, weight 600 | | | |
| Tool button | Icon in `--text` | `--hover` background | `--accent` background, icon in `--on-accent` | |

- **Play is the only primary button in the top bar**, in its middle.
- **Tool lock** (*proposal*): the active tool's button gets a small dot in its bottom right corner.
- **Tooltips:** `--tooltip` background, the name and then its key in `--muted`, such as "Shape 4". A disabled button's tooltip gives its reason.

## Fields

A field is a row of `--row` height: the label in `--muted` in a 128 px column, then the box. Units are a faded suffix inside the box.

| State | Looks like |
|---|---|
| Normal | `--field` box, no edge |
| Focused | 1 px `--accent` edge. Shows the full value, not the one rounded to 2 decimals |
| Refused (*proposal* for the look) | 1 px `--danger` edge, and the message under the field in `--danger`, such as "Can't read this as a number" |
| Clamped (*proposal*) | The message under the field in `--muted`, such as "Max is 100" |
| Read-only (Mass, Kind) | No box, the value in `--text` |
| Mixed (*proposal*) | "Mixed" in `--muted` italics |
| Disabled (greyed, such as the fields a body type doesn't use) | Label and value in `--faint`. The value is kept |

- **Vector:** two boxes side by side, each starting with its axis letter in `--muted`.
- **A number with a minimum and a maximum** has a short box and a slider: a 3 px track in `--line`, filled in `--muted` up to the value, with an 11 px round thumb in `--text`.
- **Choice:** the value and a small down arrow.
- **Colour:** a 14 px swatch, then the code in capitals. **An empty fill** (*proposal*): a swatch crossed by a red line, and "None" in `--muted`.
- **Checkbox:** 14 px, a `--muted` edge. Checked: `--accent` with a white tick.
- **Entity field** (*proposal*): the target's kind icon and name, and a target icon at the end for the picker. A deleted target shows `missing entity` in `--warning` with its icon.

## Panels

- **Panel title:** weight 600, `--panel-head` high, a line under it.
- **The Inspector's header:** the kind icon, the name in an editable box (weight 500), and the eye. The World's name isn't a box, because the World can't be renamed. With several selected it reads `3 entities`.
- **Card:** a fold arrow, the component's name in weight 600, and a `…` menu button with Remove and Reset to defaults. A 1 px line closes each card. **Add Component** sits under the last card, as a button with a `--line` edge across the panel.
- **Editor message on a card** (*proposal*): a `--field` box inside the card, the icon (warning in `--warning`, tip in `--tip`), the sentence in `--text`, and the fix button as a link in `--accent`, such as "Needs a SurfaceComponent to collide. Add SurfaceComponent".

## Entities panel rows

| State | Looks like |
|---|---|
| Normal | Fold arrow, kind icon in `--muted`, name, eye in `--faint` at the right end |
| Hover | `--hover` background, the eye in `--muted` |
| Selected | `--accent-soft` background, the kind icon in `--text` |
| Hidden | The eye crossed out |
| Hidden by its parent | Its own eye at half strength |
| Drop line while dragging (*proposal*) | A 2 px `--accent` line with a small ring at its start, indented to the depth the row will land at |

- Each level of the tree is indented 16 px. The World's row has no eye, because the World can't be hidden.
- v1 rows have no lock icon. Lock comes with v3 (owner, 2026-11-14).

## Menus, dialogs, bars

- **Menu:** `--panel`, a `--line` edge, a shadow. Entries are 26 px high, the shortcut in `--muted` and `--text-small` at the right. The hovered entry is `--accent` with `--on-accent` text. A disabled entry is `--faint`. A submenu opens to the right of its entry.
- **Dialog:** 400 px wide, centred, over the `--scrim`. A title in `--text-title` and weight 600, the text in `--muted`, then a line and the buttons at the right: the safe one first, the primary one last.
- **Options strip** (the Joint tool's types; the Shape tool's Rectangle, Circle and Polygon, owner 2026-11-15): floats over the top left of the level view, 8 px from its corner, with a shadow. Its corner is the free area's: right of the Inspector, or right of the toolbar while the Shape tool hides the Inspector. Each choice is an icon button with its name. The chosen one is on.
- **Status bar:** `--text-small`. From the left: the tool's hint or a status text in `--text`, then the mouse position, the selection and the warning count in `--muted`. The count's icon is `--warning` when it isn't 0.
- **Play bar:** floats at the top centre of the window. A 1.5 px frame and a label with a dot: PLAYING in `--playing`, PAUSED in `--paused` (*proposal* for the colours). Then Pause (Resume while paused), Step (disabled while running), Stop, each with its key in `--muted`. STARTING (in `--playing`) while the game loads and ENDED (in `--muted`) once a run ended (*proposal*, stage 16). One line of `--text-small` under the buttons shows why a run ended, "The game isn't responding", or a hint such as "Stop to edit".

## Icons

- **Outline icons** (owner, 2026-11-14): 24 px drawings shown at 16 px, a 1.6 px stroke with round ends and corners, no fill. One open set for every icon: `lucide-react`, picked in stage 6 (standing yes, 2026-11-15, see [ui.md](../architecture/ui.md#stage-6s-choices)).
- v1 needs these: main menu, Select, Shape, Joint, the four shape kinds (rectangle, circle, polygon, line), group, World, camera, hinge, the eye and the eye crossed out, fold arrows (right and down), undo, redo, grid snapping, Play, Pause, Step, Stop, help, saved, warning, tip, the target picker, `…`, plus, and the down arrow of a choice.
