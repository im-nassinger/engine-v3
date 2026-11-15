# The level view's colours

## TL;DR

What the editor draws over the level: the grid, the dimmed outside, the camera frame, joint icons, selections and handles, the drawing preview and the physics view. **Overlays keep their size on screen at any zoom**, as the requirements say. The level's own colours (a new shape's `#4A90D9` fill and `#1F3552` outline, the light blue background) belong to the level and are set by the [requirements](../requirements/drawing.md), not here. Values are drawn in the [mockups](mockups/index.html), and **those marked *proposal* are Claude's** (2026-11-14), not yet seen by the owner in a moment.

## The background and the grid

| Part | Look |
|---|---|
| Background | The World's fill. In the mockups the soft light blue is `#CDE3F2` (*proposal*: the requirements say "a soft light blue" without a value) |
| Grid lines, every 50 px | 1 px, `#1E3C5F` at 13% |
| The lines through the origin | 1 px, `#1E3C5F` at 32% |
| Fainter lines every 10 px | Same colour at 7% (*proposal*), shown only when they are at least 8 screen px apart. For another grid size, every fifth of it |
| Zoomed far out | When the grid's lines would be under 8 screen px apart, only every fifth is drawn, then every 25th, and so on (*proposal*) |
| Outside the level bounds | `#0A1423` at 35% over the background, and a 1 px edge at 50% (*proposal*) |

- **The grid is drawn over the level's entities**, faint enough not to hide them (*proposal*).
- **The grid adapts to the background** (requirement): on a dark background the same strengths use white instead of `#1E3C5F` (*proposal*: dark means a background whose brightness is under half).

## Editor-only drawing

| Part | Look |
|---|---|
| Camera frame | 1.5 px, `#141C28` at 70%, with "Camera 1920 × 1080" above its top left corner in 11 px |
| Joint icon | A 14 px white circle with a 1.5 px `#1D2430` edge and a dot in its middle |
| Drag readout | A small `--tooltip` box near the mouse, such as "175 × 85" |

All of them are hidden during test play unless a View menu switch shows them.

## Selections

The accent colour draws every selection (owner, 2026-11-14: blue, chosen over orange).

| Selection | Look |
|---|---|
| One shape | A 1.5 px `--accent` outline of the real shape, and 8 px square handles: white with a 1.5 px `--accent` edge, at the corners and the middle of each side |
| Several entities | A 1 px outline each, and one shared box with handles |
| One group | The box with handles only |
| A joint | A 2 px ring around its icon |
| The camera | A 3 px frame (*proposal*: the requirement says "a heavier frame") |
| Only hidden entities, from the Entities panel | A dashed box, no handles |
| Over 500 entities | The shared box and a count (as the requirement says) |

## Drawing

- **The faded preview** of the Shape tool: the new shape's default fill at 35%, its outline solid for placed segments and dashed at 60% from the last point to the mouse and back to the first point.
- **Placed points:** the same 8 px handles. **The first point** of a polygon is a 12 px ring, because clicking it closes the polygon.

## The physics view

- Every collision piece is drawn in **orange `#FF8A3D`**, a 1.5 px outline over a 15% fill, on top of the level (*proposal*). Orange stays visible next to the blue selection and the default blue shapes.
- v1 draws the plain pieces only. v3 adds a colour per body, hatching for Static, dashes for sensors and a legend (see [bodies](../requirements/physics/bodies.md)).
