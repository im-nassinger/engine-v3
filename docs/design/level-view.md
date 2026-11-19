# The level view's colours

## TL;DR

What the editor draws over the level: the grid, the dark outside, the bounds' and camera frame's labels, the camera frame, joint icons, selections and handles, the drawing preview and the physics view. **Overlays keep their size on screen at any zoom**, as the requirements say. The level's own colours (a new shape's `#4A90D9` fill and `#1F3552` outline, the light blue background) belong to the level and are set by the [requirements](../requirements/drawing.md), not here. Values are drawn in the [mockups](mockups/index.html) and, **since the redesign** (owner, 2026-11-17), in its [mockup](mockups/redesign.html): outside the level bounds the editor's own `#0d0f13`, the World's fill and the grid only inside, the bounds labelled **World** and their size, and square handles. **Values marked *proposal* are Claude's** (2026-11-14), not yet seen by the owner in a moment.

## The background and the grid

| Part | Look |
|---|---|
| Background | The World's fill. In the mockups the soft light blue is `#CDE3F2` (*proposal*: the requirements say "a soft light blue" without a value) |
| Grid lines, every 50 px | 1 px, `#1E3C5F` at 13% on a light fill; white at 5% on a dark fill (redesign, standing yes, 2026-11-17) |
| The lines through the origin | 1 px, `#1E3C5F` at 32% on a light fill; white at 14% on a dark fill |
| Fainter lines every 10 px | Same colour at 7% on a light fill, 3% on a dark one (*proposal*; 3% standing yes, 2026-11-18), shown only when they are at least 8 screen px apart. For another grid size, every fifth of it |
| Zoomed far out | When the grid's lines would be under 8 screen px apart, only every fifth is drawn, then every 25th, and so on (*proposal*) |
| Outside the level bounds | **The app's `#0d0f13`**: the World's fill paints only the inside of the bounds (owner, 2026-11-17). A 1 px edge on the bounds, `#ECF0F6` at 35% |
| The bounds' label | Above their top left corner in 12 px: **World** in weight 600, a 10 px gap, then the size, such as **World** 20000 × 10000, in `#ECF0F6` (the name at 92%, the size at 60%) |

- **The grid is drawn over the level's entities and only inside the level bounds** (owner, 2026-11-17), faint enough not to hide them.
- **The grid adapts to the background** (requirement): on a dark fill the lines are white at the lower strengths above (*proposal*: dark means a fill whose brightness is under half). A World with no fill shows the app's colour, so it counts as dark (standing yes, 2026-11-18).
- **Entities outside the level bounds stay visible** over the app's colour: nothing is painted over them (standing yes, 2026-11-18).

## Editor-only drawing

| Part | Look |
|---|---|
| Camera frame | 1.5 px, `#141C28` at 70% on a light fill, `#ECF0F6` at 55% on a dark one, with its label written like the bounds': **Camera** 1920 × 1080. The label is coloured for what it starts on, so above the level bounds it is the light one (standing yes, 2026-11-18) |
| Joint icon | A 14 px white circle with a 1.5 px `#1D2430` edge and a dot in its middle |
| Drag readout | A small `--tooltip` box near the mouse, such as "175 × 85" |

All of them are hidden during test play unless a View menu switch shows them.

## Selections

The accent colour draws every selection (owner, 2026-11-14: blue, chosen over orange).

| Selection | Look |
|---|---|
| One shape | A 1.5 px `--accent` outline of the real shape, and **8 px square handles** with 1.5 px corners (owner, 2026-11-17): white with a 1.5 px `--accent` edge, at the corners and the middle of each side |
| Several entities | A 1 px outline each, and one shared box with handles |
| One group | The box with handles only |
| A joint | A 2 px ring around its icon |
| The camera | A 3 px frame (*proposal*: the requirement says "a heavier frame") |
| Only hidden entities, from the Entities viewer | A dashed box, no handles |
| Over 500 entities | The shared box and a count (as the requirement says) |

## Drawing

- **The faded preview** of the Shape tool: the new shape's default fill at 35%, its outline solid for placed segments and dashed at 60% from the last point to the mouse and back to the first point.
- **Placed points:** the same 8 px handles. **The first point** of a polygon is a 12 px ring, because clicking it closes the polygon.

## The physics view

- Every collision piece is drawn in **orange `#FF8A3D`**, a 1.5 px outline over a 15% fill, on top of the level (*proposal*). Orange stays visible next to the blue selection and the default blue shapes.
- v1 draws the plain pieces only. v3 adds a colour per body, hatching for Static, dashes for sensors and a legend (see [bodies](../requirements/physics/bodies.md)).
