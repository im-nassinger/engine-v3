# The redesign

## TL;DR

The owner wants a new look for the editor before v2 starts (2026-11-17): **clean, cool and beautiful, with no borders, separator lines or outlines**, even if it looks less "professional" than commercial tools. Only the look changes (colours, spacing, layout, the parts' shapes); what the screen shows stays. **Settled so far:** the Islands look, the owner's set of parts, the dock at the bottom, panels holding only their own content, a level card above the Inspector, no View button, and a minimap at the bottom right with the zoom beside it. **Open:** which level card, where the zoom sits, the font, and the status chip. The mockup is [mockups/redesign.html](mockups/redesign.html); the [round 8 design](README.md) stays what is built until this one is written into [tokens.md](tokens.md) and [controls.md](controls.md) and planned as a stage.

## Settled, in order (all owner, 2026-11-17)

1. **Islands.** The level view fills the window and every panel floats over it as a rounded island, 10 px from the window's edge and from each other. Slate panels with a bright blue. Every other direction was dropped: Bento tiles, Quiet, Glass, Candy, Neon, Ember, and the palette and density variations of Islands (Midnight, Graphite, Mint, Soft, Compact, Frosted, Warm). Don't bring them back.
2. **The parts** (from the owner's screenshot): the Entities panel only as tall as its rows, panel titles as plain titles (not small caps), Inspector cards split by space only, pill-shaped fields, sliders drawn as a filled field, switches for checkboxes, a blue pill for the selected row, a soft (tinted) active tool, rounded buttons, soft menu hovers, tinted editor messages, square selection handles, and a tinted pill for the Play bar.
3. **The dock** at the bottom middle of the level view holds the three tools, Undo, Redo, grid snapping and Play.
4. **Panels hold only their own content.** The owner rejected putting the top bar's controls or the status text at the top or foot of the Inspector or the Entities panel.
5. **Too many islands** was a complaint: two similar top islands (left and right) and a status bar island were too much. The bottom status bar island looked ugly.
6. **A level card** at the top left, above the Inspector, holds only the main menu, the level's name and the save state. The Inspector starts under it. The Entities panel starts at the top right. The zoom moved to the minimap, and the card has no Help button: Help is already in the main menu.
7. **No shadows, anywhere.** The owner hates them (2026-11-17): no island, menu, dialog, chip or Play bar casts one, and nothing glows. An island stands apart from the level view by its colour alone.
8. **No View button.** The View menu is the main menu's View submenu, written into [workspace.md](../requirements/editor/workspace.md), the glossary and [rejected.md](../rejected.md). The built editor still has the button until the redesign is built.
9. **A minimap** at the bottom right, its own island 180 px wide, with a thin 3 px edge in the panels' colour so it doesn't merge with the level view, under the Entities panel: the whole level, with a blue rectangle showing what the level view shows. The mockup's level is a square 8000 px wide, like a new level's bounds, so the rectangle sits inside it, and the minimap is a square too. Its shapes have no outlines. The zoom (− 40% +) sits by it. It is a new feature, not yet in the requirements, so [workspace.md](../requirements/editor/workspace.md) needs it with its version before it is built.

## The tokens of the pick

From the mockup's `SLATE` set: app `#0d0f13`, panels `rgba(24,27,33,.96)`, raised `rgba(255,255,255,.04)`, fields `rgba(255,255,255,.055)`, hover `rgba(255,255,255,.065)`, text `#e4e8ef`, muted `#8b93a1`, faint `#586070`, accent `#4f8cff`, accent soft `rgba(79,140,255,.2)`, accent text `#8fb5ff`. Corners 8 px for controls, 12 px for menus and tiles, 16 px for islands. Rows 30 px, panel inset 14 px. The status chip and the title chip are `rgba(13,15,19,.8)` pills.

## Open for the owner

- **Which level card:** 1, one row as wide as the Inspector, with the menu, the name and Saved; 2, a pill only as wide as its content, with the save state as a check; 3, the menu as a round button of its own and the name with Saved as a pill next to it. The old cards (name and zoom, the level preview, the info card) were dropped once the zoom moved to the minimap.
- **Where the zoom sits:** 1, a small pill above the minimap; 2, under the map in the same island; 3, floating on the map's bottom right corner; 4, upright, left of the map.
- **The status text:** today it is one dark chip above the dock with the tool hint, the mouse position, the selection and the warning count. Not yet confirmed.
- **The font:** JetBrains Mono (round 8's decision) is still the default; the page offers Inter, Geist and Inter with mono numbers.

## The mockup page

[mockups/redesign.html](mockups/redesign.html): pick a variation, then a moment (a selected shape, drawing, the main menu, a dialog, test play, or all the parts side by side), and a font. The Mix row changes one part at a time; the line under the caption sums up the choices so the owner can paste it back. Its choices are kept in `localStorage`. To check it renders, take screenshots with Playwright (already a dev dependency) from a script in the project folder, since Node resolves `playwright` from there.

## Next

1. The owner picks the level card, the zoom's place, the status text and the font.
2. Write the result into [tokens.md](tokens.md), [controls.md](controls.md), [level-view.md](level-view.md) (square handles, the selection colour) and this folder's README, replacing round 8's look; change [workspace.md](../requirements/editor/workspace.md)'s top bar, status bar and toolbar sections to the islands, the dock and the level card (a requirement change, so with the owner's yes).
3. Plan the build as a stage in [plan.md](../plan.md) with its steps in [steps/](../steps/README.md), before v2.

Note: `npm run check` currently fails on Prettier for the untracked `.netlify/state.json`, which is not the project's. Adding `.netlify/` to `.gitignore` and `.prettierignore` fixes it; the owner hasn't answered yet.
