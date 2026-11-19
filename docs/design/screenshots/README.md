# Screenshots of the redesign

## TL;DR

The built editor beside the [mockup](../mockups/redesign.html), one picture for each moment of the mockup, taken in stage 19 step 16 for the owner to compare. The editor's level is a few drawn rectangles on a new level's light blue World, while the mockup shows its night example level, so the level's art differs on purpose. The mockup's seventh moment, all the parts side by side, is a sheet and not a state of the editor, so it has no picture.

| Picture | Moment |
|---|---|
| [selected-shape.png](selected-shape.png) | A selected shape |
| [whole-level.png](whole-level.png) | The whole level |
| [drawing.png](drawing.png) | Drawing |
| [main-menu.png](main-menu.png) | The main menu, with Edit open |
| [dialog.png](dialog.png) | A dialog |
| [test-play.png](test-play.png) | Test play |

To take them again: `npm run build && node tests/redesign-screenshots/takeScreenshots.ts`.

## What still differs from the mockup

None of these was changed, since each follows a requirement or an owner's answer:

- **Colours show eight digits** (`#4A90D9FF`), as the file stores them; the mockup shows six.
- **The Fill field has its None button**, which the mockup leaves out.
- **The bounds are 20000 × 10000**, so the minimap is wider than the mockup's square (owner, 2026-11-18).
- **The dialog is titled `New level`**, with the question under it; the mockup uses the question as its title.
- **The debug box keeps room for its numbers**, so it is wider than the mockup's.
