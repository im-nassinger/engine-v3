# Design tokens

## TL;DR

Every named value of the editor's look: colours, the font, sizes, spacing, corners and shadows. **In stage 6 each token becomes a CSS custom property in `ui/theme.css`**, with the name given here, and no component writes a colour or a size of its own. The values are the ones in the [mockups](mockups/index.html), direction A, which the owner picked on 2026-11-14. Sizes marked *requirement* come from [workspace.md](../requirements/editor/workspace.md) and change only with it.

## Colours

The panels are a cool blue-grey, and blue is the one accent colour (owner, 2026-11-14).

| Token | Value | Used for |
|---|---|---|
| `--app` | `#16191e` | Behind everything, where no panel or level view is |
| `--panel` | `#21252c` | Panels, the top bar, the status bar, menus, dialogs |
| `--field` | `#191c22` | The inside of a field, a note on a card |
| `--hover` | `#2b3039` | A row or button under the mouse |
| `--line` | `#323843` | Lines between panels, cards and sections; a button's edge |
| `--text` | `#d5dbe5` | Text and icons |
| `--muted` | `#8a93a3` | Labels, units, shortcuts, captions |
| `--faint` | `#5d6574` | Disabled text and icons, an eye that is off |
| `--accent` | `#3b82f6` | The accent colour: the active tool, Play, a focused field, a checked box, the hovered menu entry, selection outlines and handles in the level view |
| `--accent-soft` | `#3b82f6` at 24% | A selected row, a switched-on icon button |
| `--on-accent` | `#ffffff` | Text and icons on `--accent` |
| `--warning` | `#e5b931` | The warning icon, the `missing entity` text |
| `--tip` | `#5aa9f0` | The tip icon |
| `--danger` | `#e5534b` | A refused value's outline and message |
| `--playing` | `#3fb27f` | The Play bar's frame and label while running |
| `--paused` | `#e5b931` | The Play bar's frame and label while paused |
| `--tooltip` | `#0b0d10` | Tooltips and the drag readout |
| `--tooltip-text` | `#e8ebf0` | Text on them |
| `--scrim` | `#000000` at 45% | Behind a dialog |

The level view's own colours are in [level-view.md](level-view.md).

## The font

- **JetBrains Mono for all of the editor's text** (owner, 2026-11-14): labels, values, menus and numbers alike. One font, the same on every computer, and numbers line up because every character has the same width.
- It is hosted with the game and loaded before the editor first draws, as the [tech notes](../tech-notes.md) ask for fonts. Weights 400, 500 and 600 only.
- The editor's font has nothing to do with texts in a level: those keep their own fonts, Inter by default (see [drawing](../requirements/drawing.md)).

| Token | Value | Used for |
|---|---|---|
| `--font` | `"JetBrains Mono", ui-monospace, monospace` | Everything |
| `--text-size` | 12 px | The default |
| `--text-small` | 11 px | The status bar, shortcuts in menus, tooltips, captions, field messages |
| `--text-title` | 13 px | A dialog's title |
| Weights | 400 text, 500 names (the level's name, the Inspector's name field), 600 headings, card titles, Play and primary buttons | |

## Sizes

| Token | Value | Source |
|---|---|---|
| `--top-bar` | 44 px | requirement |
| `--status-bar` | 24 px | requirement |
| `--toolbar` | 44 px wide | requirement |
| `--inspector` | 300 px wide, on the left | requirement |
| `--entities` | 260 px wide, on the right | requirement |
| `--row` | 28 px: an Entities panel row, an Inspector field | medium density, round 8 |
| `--panel-head` | 36 px: a panel's title | |
| `--inspector-head` | 44 px: the entity's name and its eye | |
| `--card-head` | 32 px | |
| `--control` | 28 px: buttons, icon buttons, the zoom and View menus | |
| `--input` | 22 px: the box inside a field | |
| `--tool` | 32 px: a tool button | |
| `--menu-item` | 26 px | |
| `--label` | 128 px: a field's label column | |
| `--icon` | 16 px, 13 px in the status bar and in fields | |
| `--indent` | 16 px per level of the Entities panel tree | |
| `--dialog` | 400 px wide | |

## Spacing, corners, shadows

- **Spacing** steps: 4, 6, 8, 12, 16 px. A panel's content is inset 12 px. Gaps between controls are 4 px in a bar and 6 to 8 px elsewhere.
- **Corners** (`--radius`): 4 px for buttons, fields, menus, cards, dialogs, tooltips and the Play bar (owner, 2026-11-14). 3 px for small parts inside them: a checkbox, a colour swatch, a menu entry.
- **Panels are flush** with the window's edges, with a 1 px `--line` between a panel and the level view (owner, 2026-11-14). Panels have no shadow.
- **Shadows** only on what floats: a menu `0 8px 24px` black at 45%, a dialog `0 16px 48px` at 50%, the options strip `0 2px 10px` at 25%, a tooltip `0 2px 8px` at 40%.
- **Stacking order** (stage 18, standing yes, 2026-11-17): the level view and the panels stack in page order, and four tokens sit over them, each over the one before: `--stack-floating` (10) for the options strip, Back to level and the Play bar; `--stack-popup` (20) for menus, submenus and the save state's explanation; `--stack-tooltip` (30); `--stack-dialog` (40). No component sets a stacking number of its own. See [ui.md](../architecture/ui.md#styles).
- **Motion:** none in v1. Every change shows at once. Animations come with v3, at 150 ms or less (see [workspace.md](../requirements/editor/workspace.md)).
