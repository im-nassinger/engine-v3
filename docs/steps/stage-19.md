# Stage 19 in steps: The redesign

## TL;DR

**Approved by the owner on 2026-11-18, with every question answered; the [runner](../runner/README.md) builds it and then stops, before v2.** Stage 19, in 17 steps, makes the built v1 editor look like the redesign in [design/redesign.md](../design/redesign.md) and its mockup [mockups/redesign.html](../design/mockups/redesign.html): islands floating over a full-window level view, ☰ alone at the top left holding every command, a tool column, the panels titled Entity inspector and Entities viewer, a minimap with a debug box under it, and a dark level view outside the level bounds. Nothing of v2. The docs change first (step 1), because several settled points are requirement changes; then the theme, the shared controls, the layout, each part, the level view, and last the tests and checks. Each step ends with its tests, `npm run check` and a commit. The owner's [answers](#the-owners-answers) are written in; so are the [smaller ones](#the-owners-answers-to-the-smaller-questions).

## What changes, in short

| Today | After the redesign |
|---|---|
| Top bar: ☰, level name, save state, Undo, Redo, snapping, Play, View, zoom, Help | Gone. ☰ is its own 48 px island at the top left; its menu starts with Play, then File, Edit, Arrange, View, Help (redesign 20) |
| Toolbar strip flush with the left edge | A tool column island under ☰, 34 px buttons in a 48 px island (20, 27) |
| "Entity inspector", full height, flush left | **Entity inspector** island beside the tool column, from the top; cards titled `Transform`, `Shape`… (15, 26) |
| "Entities viewer", full height, flush right | **Entities viewer** island at the top right, only as tall as its rows (2, 15) |
| Status bar: hint, mouse position, selection, message count | A debug box at the bottom right: `X: … Y: … GRID: … ZOOM: …` (23, 24) |
| — | A minimap island above the debug box, 180 px wide (9) |
| Shape tool's options strip at the top left of the level view | A menu beside the Shape tool, with an arrow, open while the tool is active (28) |
| Outside the level bounds dimmed; grid everywhere | Outside the bounds the app's `#0d0f13`; the grid only inside; bounds labelled **World** 8000 × 8000 (25, 14) |
| Round 8 tokens: flush panels, 4 px corners, lines between parts | Slate tokens, no borders or lines, 14 px island corners, a soft 2 px shadow under every grey container (27, 29) |
| Fields boxed, slider beside the box, checkboxes | Pill fields, a slider drawn as a filled field, switches (2) |

## Steps

| # | Step | Module | Ends with |
|---|---|---|---|
| 1 | **The docs.** The owner's answers written in. [design/](../design/README.md): [tokens.md](../design/tokens.md), [controls.md](../design/controls.md) and [level-view.md](../design/level-view.md) rewritten from the redesign, round 8's look replaced, redesign.md marked as the source. Requirements: [workspace.md](../requirements/editor/workspace.md) (layout of islands, top bar and status bar sections replaced by ☰, the tool column, the debug box, the minimap with its version), [drawing.md](../requirements/drawing.md) (the kinds menu), [inspector-and-undo.md](../requirements/editor/inspector-and-undo.md) (card titles), [saving.md](../requirements/play-and-save/saving.md) (Save, the save state, the tab title), [shortcuts.md](../requirements/editor/shortcuts.md). The glossary: Entity inspector, Entities viewer, island, tool column, minimap, debug box; Top bar, Status bar, Entity inspector and Entities viewer moved to the dropped words. [rejected.md](../rejected.md) gets the dropped directions. [architecture/ui.md](../architecture/ui.md) gets the new component tree. (This stage's row in [plan.md](../plan.md) and [steps/README.md](README.md) were written with these steps.) `.netlify/` added to `.gitignore` and `.prettierignore` | `docs/` | `node tools/check-docs.js` and `node tools/check-sources.js` pass; `npm run check` passes again |
| 2 | **The new names in the code.** `Inspector` becomes `EntityInspector` and `EntitiesPanel` becomes `EntitiesViewer`: the modules `ui/inspector` and `ui/entities-panel`, their components, CSS classes, test ids, tests and the architecture docs that name them; `InspectorModel` and the other names built on them follow. Nothing else changes | `ui`, `editor`, `tests`, `docs/architecture` | `npm run check`, the browser tests and the Playwright tests pass; a search finds no old name outside the dropped words |
| 3 | **The theme.** `ui/theme.css` takes the Slate tokens (app, panel, raised, field, hover, text, muted, faint, accent, accent soft, accent text), corners 8 / 12 / 14 / 7 px, the one `--shade` shadow (`0 2px 5px rgba(0,0,0,.3)`), JetBrains Mono at 10, 12, 14 and 16 px only, no border or line tokens. The four `--stack-*` layers stay | `ui` | The theme's browser test reads every token; no component CSS uses a removed token (a grep test) |
| 4 | **The shared controls.** `Button` and `IconButton` rounded, `Menu` solid with 12 px corners, soft hovers and the shade, submenus opening to the right, `Tooltip`, `MenuButton`, `MenuSearch`, the dialog box and its scrim | `ui/shared`, `ui/dialogs` | Their browser tests pass with the new looks; each state of [controls.md](../design/controls.md) has a test that does something |
| 5 | **The fields.** Pill fields for `NumberBox`, `TextField`, `ChoiceField`, `ColourBox`, `VectorField`, `EntityField`, `ListField`; `FieldSlider` becomes a fill behind the number box; `CheckboxField` becomes a switch, still a checkbox for the keyboard and screen readers; error and Mixed states | `ui/fields` | Every row of the typing table still passes; the filled slider's tests: a drag across the field sets the value, a click without a drag types in it |
| 6 | **The layout.** `EditorShell` places islands 10 px from the window and each other: ☰, the tool column, the Entity inspector, the Entities viewer, the minimap's place and the debug box's. The free area becomes the level view between the Entity inspector and the Entities viewer, so fitting still frames the level where it is seen. While the Shape tool is active the Entity inspector goes, as today | `ui/shell` | `EditorShell`'s browser tests; fitting tests with the new free area |
| 7 | **☰ and the main menu.** The top bar and its eight parts are removed. ☰ opens the main menu to its right: Play (with its keys), then File (New, Import…, Save, Export…), Edit (Undo with its step's name, Redo, Cut, Copy, Paste, Duplicate, Delete), Arrange, View (Grid, Grid snapping, the switches, the zooms), Help. Select all, Rename and Hide or show are in no menu for now and keep only their keys, so the stage 6 test that every command is in the menu lists them as the exceptions | `ui/main-menu`, `ui/commands`, `editor/commands` | Every v1 command is still in the menu with its shortcut (the stage 6 test); the menu entries test; no `top-bar` module left |
| 8 | **The tool column and the kinds menus.** The toolbar becomes the tool column island; the Shape tool's kinds (Rectangle, Circle, Polygon) are a menu beside the tool, centred on it with a seamless arrow, the chosen kind like the active tool; the Joint tool's types (Hinge, Rope, Spring) the same. `tool-options` is removed | `ui/toolbar` | Tool and kind tests by click and by key; tool lock still works; the menu never closes while its tool is active |
| 9 | **The Entity inspector.** Titled Entity inspector; its head is the kind icon, the name as a pill field and the eye; cards split by space only, titled without `Component`, with the small-caps head of the mockup; Add Component, notes tinted, Mixed | `ui/inspector` | The Entity inspector's browser tests with the new titles; card titles come from one function, tested for every component |
| 10 | **The Entities viewer.** Titled Entities viewer; only as tall as its rows, growing with them until it reaches 10 px above the minimap, then a scrollbar appears; the minimap always shows; the selected row a blue pill; the hover and drop line restyled | `ui/entities-panel` | Its browser tests; the 10,000-row speed test still within 42 ms |
| 11 | **The debug box and the messages.** The status bar becomes the debug box: `X`, `Y`, `GRID`, `ZOOM`, labels muted in capitals, values in tabular figures. Status messages, the tool's hint and the warning count go to a message pill at the bottom middle, shown only while a message is (4 s; a failed save until it is fixed); the tool's hint as a lasting text and the warning count go | `ui/status-bar`, `editor/status` | Its browser tests; the status text tests follow the answer |
| 12 | **Saving without a save state.** The level's name leaves the screen; File → Save (Ctrl+S) saves to the browser now, and Export… stays its own item; a failed save shows in the message pill; the tab title keeps `* Name`; File → Rename level… opens a small dialog; the leave prompt as today | `editor/commands/file`, `ui` | Saving's Playwright tests rewritten: a full disk still warns, Export still works |
| 13 | **The minimap**, v1, show-only (clicking or dragging on it to move the view is v3). A second small view of the whole level bounds, shapes without outlines, redrawn at most a few times a second, with the accent rectangle for what the level view shows; its architecture written into [adapters.md](../architecture/adapters.md) first | `adapters/pixi`, `ui` | Its tests; at 10,000 entities it adds no dropped frames to the dragging speed test |
| 14 | **The level view.** Outside the bounds the app's colour, the World's fill only inside; the grid only inside the bounds, its lines adapting to the fill as today; the bounds' label **World** and their size (**World** 20000 × 10000 for a new level) and the camera's **Camera** 1920 × 1080, bold name then size; the accent and square handles of the new tokens | `adapters/pixi` | Drawing tests of each; the determinism hashes are unchanged (only the editor's drawing changes) |
| 15 | **The Play bar and test play.** The Play bar a tinted pill with the shade; Play is reached from ☰ and the keys only | `ui/play-bar` | Its browser tests; test play's Playwright tests |
| 16 | **The browser checks.** Every Playwright test that used the top bar, the status bar or the options strip rewritten; the layout checks at five sizes and the covered-parts check pass with the islands, in three browsers; the phone check; new screenshots of each mockup moment beside the mockup for the owner | `tests/e2e` | All Playwright tests pass in three browsers, no `fixme` |
| 17 | **The docs' end.** What the stage showed, redesign.md marked built, the design README, `progress.md` | `docs/` | `node tools/check-docs.js` passes |

## The owner's answers

All four of Claude's recommendations, picked by the owner on 2026-11-18. Step 1 writes them into the requirements.

1. **Save** (Ctrl+S) saves to the browser now, without waiting for autosave; Export… stays its own item.
2. **Messages** go to a pill at the bottom middle, shown only while a message is (4 s; a failed save until it is fixed). No lasting tool hint and no warning count: each warning already shows on its card.
3. **The minimap** is v1 and built in this stage, show-only; moving the view by clicking or dragging on it is v3.
4. **The level's name**: the browser tab keeps `* Name` while there are unsaved changes, and renaming is File → Rename level…, a small dialog.

## The owner's answers to the smaller questions

Asked on 2026-11-18, answered by the owner the same day.

- **Select all, Rename and Hide or show**, which left the Edit submenu, are in no menu for now; their keys still work. View's zoom items keep their names.
- **The Joint tool's types** (Hinge, Rope, Spring) get the same menu beside the tool as the Shape tool's kinds.
- **The filled slider**: dragging across the field sets the value like a slider; a click without a drag types in it.
- **The new names everywhere**: Entity inspector and Entities viewer in every doc that says "Entity inspector" or "Entities viewer" (the glossary first), on screen, and in the code (step 2).
- **A new level's bounds stay 20000 × 10000**: the mockup's 8000 × 8000 square was for its example level only, like its night fill.
- **`.netlify/`** goes into `.gitignore` and `.prettierignore` in step 1, so `npm run check` passes.
- **The Entities viewer's height** fits its rows and grows with them until it reaches the minimap, then a scrollbar appears. The minimap always shows.
