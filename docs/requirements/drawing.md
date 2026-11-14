# Drawing and text

## TL;DR

How shapes, paths and text are made and how they look. **v1:** the Shape tool (rectangle, ellipse, polygon, line), point editing by double-click, polygons that may cross themselves, and the StyleComponent with solid colours. **v2:** the Bézier pen and the Pencil, gradients, and the Text tool with one font. **v3:** images (a shape with an image fill), Convert to polygon, the W/A/S/D size keys, colour picker extras, toolbar swatches, three more fonts, line height and letter spacing, Flip, and the EffectsComponent. Core rules: a shape can collide and a path never does, an image is not its own kind of entity, and each entity draws exactly one thing.

## Drawing tools

### Shared rules for drawing tools · v1

- **Shift** keeps proportions (square, circle) or straight angles (15° steps). **Alt** draws from the centre. **Enter or Esc** finishes. Ctrl held turns snapping off.
- No key throws away drawn work: Enter and Esc both finish and keep the drawing. A drawing too short to be valid is dropped (a polygon needs 3 points, a line or path needs 2).
- While drawing, Ctrl+Z or Backspace removes the last point. The finished drawing is one undo step.
- Choosing another tool, or pressing Play, finishes and keeps the drawing.
- Pan and zoom work during a multi-click drawing and don't end it.
- A new entity goes inside the group you are inside, on top, named after what it is ("Rectangle 1", "Path 2"), and is selected.
- New shapes have a Transform, a ShapeComponent and a StyleComponent. **They have no physics until you add it.**
- A press that moves less than 4 px is a click.
- Drawing while inside a locked group is refused: "This group is locked".

Source: round 1: D39; round 5: 03 2.1; old: DR-01 to DR-09

### The Shape tool · v1

- One tool draws four kinds, picked in its options strip: **rectangle, ellipse, polygon, line**. These are the four kinds a ShapeComponent can hold.
- A faded preview follows the mouse and shows exactly what a click will place. A click places it. Dragging sets the size instead, and the size is remembered for the next shape.
- **Polygon:** each click adds a point. Clicking the first point closes it. Enter, Esc and double-click close it too. A polygon is always closed and can be any outline.
- **Line:** an open chain of straight segments, 2 points or more. Each click adds a point, and Enter, Esc or double-click finishes. A single segment is a line with 2 points. Curved lines are paths. *Why a line is its own kind: Box2D calls it a chain and it is the usual way to make platformer ground.*
- The size in px shows beside the mouse during a drag.
- A rectangle or ellipse is at least 1 px on each side.
- Limits: 1,000 points in a polygon or line. Above 200 a note says "High detail may slow physics".

Source: scope DR1; round 5: TK2; round 7: SH1; old: DR-10 to DR-16

### W, A, S, D set the preview size · v3

- With the Shape tool: D makes the preview wider, A narrower, W taller, S shorter, centred on the mouse. 1 px per press, Shift 10 px, Ctrl+Shift one grid step.
- *Why these steps: they match the arrow keys, so nothing is relearned, and unlike grid-only steps they allow small sizes.*

Source: scope DR4; round 8: SH3

### Width and height, not scale · v1

- **Resize changes what a thing measures. Scale stretches it like a picture.** Resizing a single shape changes its width and height and leaves its scale at 1. Resizing a group changes the group's scale.
- Polygons, lines and paths resize by moving their points.
- A free resize of a single shape leaves its outline width alone. A resize with Shift (proportional) multiplies width, height and outline width together.
- Inside a scaled group everything stretches, outlines and text included. An uneven group scale gives uneven outlines. That is what "like a picture" means.
- The Inspector shows Width and Height for every shape. Typing a size on a polygon, line or path rescales its points. The point count is shown read-only.

Source: round 1: D21; round 5: 03 2.4; old: DR-21 to DR-30

### The Bézier pen · v2

It works like Illustrator's pen.

- Click places a corner point. Press and drag places a curve point with two mirrored handles.
- Alt during a handle drag breaks the mirror, so the next segment can leave in a new direction.
- Space during a drag moves the point being placed.
- Clicking the first point closes the path. Dragging on it shapes the closing curve.
- Enter, Esc, double-click, right-click or choosing another tool finishes an open path.
- With an open path selected, clicking either end continues drawing from it. With nothing selected, the pen always starts a new path.
- A path is one continuous line: no branches, no separate parts. It is open or closed. Only a closed path can be filled.
- The result is an entity with a Transform, a PathComponent and a StyleComponent.
- Limit: 2,000 points in a path.
- *Why v2: a path never collides, and Convert to polygon is v3, so in v1 a path would be decoration only. It was settled before the scope review.*

Source: round 1: D24; round 5: 03 2.5; old: DR-33 to DR-45; owner: 2026-11-13

### The Pencil · v2

- Drag to draw freehand. On release the drawing becomes an ordinary path with a small number of curve points.
- If you finish near the start (within 12 screen pixels), the path closes.
- Smoothness is Low, Medium or High, Medium by default.
- *Why it exists: the pen is the hardest tool in vector drawing, and lumpy ground is exactly what a level needs. It adds no new kind of data.*
- *Why v2: the same as the Bézier pen.*

Source: round 1: D24; round 5: 03 2.6; old: DR-46 to DR-48; owner: 2026-11-13

### Point editing · v1

- **Double-click a polygon, line or path with the Select tool** to edit its points. Esc goes back. There is no separate tool for it.
- Click a point to select it, Shift+click to add, drag on empty space for a box.
- Drag points to move them, or use the arrow keys. On a path, drag the curve handles.
- **Double-click an edge to add a point.** On a curve the shape doesn't change.
- Delete removes the selected points. A path or line keeps at least 2 points, a polygon or closed path 3.
- Path points are sharp, smooth, or smooth with handles that move separately. Double-clicking a point switches between sharp and smooth.
- Polygons and lines have straight edges only, so they have no handles.
- Each drag, add or delete is one undo step.
- A rectangle or ellipse has no points to edit.

Source: scope DR2; round 5: TK2, 03 2.7; old: DR-49 to DR-63

### Polygons may cross themselves · v1

- A polygon may cross itself. **Every enclosed area is filled, and it collides exactly where it is filled.** A figure-of-eight is filled in both loops.
- Polygons with holes are not supported.
- *Why: a polygon library cuts the outline at its crossings into simple pieces, and every concave polygon is split anyway. Filling every enclosed area keeps "what you see is what collides".*

Source: scope DR3; round 6: PG1

### Convert a path to a polygon · v3

- A path never collides. To make a drawn curve collide, right-click the path and choose **Convert to polygon**.
- A dialog shows a slider for how many points to use and a live preview over the dimmed path. A readout such as "Stays within 2 px of the path" shows how closely it matches.
- Accepting adds a ShapeComponent with the polygon's points to the same entity. The path is still what is drawn, and the shape is what collides.
- Sharp corners stay exact, and more points go where the curve bends most.
- An open path gives a line instead of a polygon.
- The polygon never updates by itself when the path changes later, because physics should not change silently.
- The first time, the slider starts at the lowest count that stays within 2 px, up to 64.

Source: scope DR5; round 1: D22, D58; round 5: 03 2.8; old: DR-64 to DR-79

## How things look

### The StyleComponent · v1

- The StyleComponent works the same on everything that draws: a ShapeComponent, a PathComponent and a TextComponent. *Why: style belongs to anything drawn, not shapes only.*
- It holds a **fill**, an **outline** (colour and width) and an **opacity**.
- A fill is nothing, a solid colour, a gradient, or (v3) an image.
- A path's fill paints only when the path is closed. A line has no fill.
- On text, the fill colours the letters and the outline traces them.
- Colours can be see-through. Outline width goes from 0 to 200, and 0 means no outline.
- **A shape or path with no StyleComponent is invisible in play.** The editor still shows it as a thin outline. Text always shows.
- The plain colour picker: a colour square, a hue slider, a see-through slider, a colour code field and a fixed palette. One drag in the picker is one undo step.
- In v1 new shapes start with one default look: fill `#4A90D9`, outline `#1F3552`, width 2.

Source: round 1: D23; round 6: ST2; old: DR-90 to DR-94

### Gradients · v2

- A fill can be a linear or a radial gradient.
- *Why: the owner changed this from "solid colours first". Why v2: it is decoration, and solid colours are enough to test a v1 level. It was settled before the scope review.*

Source: round 1: D25; round 6: ST2; owner: 2026-11-13

### Colour picker extras · v3

- **Level colours:** up to 16 colours most used in this level, worked out automatically.
- **Recent colours:** the last 12 picked, kept in the browser.
- **Eyedropper:** click anything in the level view to take the colour under the mouse.

Source: scope DR6; round 6: ST2; old: DR-95, DR-96

### Toolbar swatches · v3

- Two swatches on the toolbar show the last fill and outline you picked. New shapes use them.

Source: scope DR7; round 5: 03 2.3; old: DR-18 to DR-20

### Images · v3

- **An image is not its own kind of entity. It is a shape whose fill is the image.** There is no `ImageComponent`.
- Dropping a PNG, JPEG, WebP or GIF on the level makes an entity with a Transform, a rectangle ShapeComponent the image's size, and a StyleComponent with that image as its fill. 1 image pixel is 1 level pixel.
- The image's size is the rectangle's width and height, with a proportions lock.
- An ellipse with an image fill shows the image cut to a circle.
- Settings that belong only to an image live on the image fill: **stretch or tile**, and **smooth or sharp** scaling. *Why: an asset is just a raw file, so its display settings can't live on it.*
- Opacity is the StyleComponent's. Physics is added like on any shape. There is no "Add hitbox".
- Clicking anywhere on an image selects it, transparent parts included.
- The World's background can be an image.
- Tint is an effect and waits for the EffectsComponent.
- *Why a fill: proposed by the owner and extended the way Figma does it. Everything known about shapes (size, outline, opacity, physics, clicking) works on images for free, and three concepts disappear: image size, image opacity, hitboxes.*
- Images bring importing, licences and the builtin Kenney art with them, see [assets](assets/README.md).

Source: scope DR11; round 5: 04 2.3, 04 2.6, 04 2.7, 04 2.8; round 6: ST1, ST3

### Flip · v3

- A Flip button sets the Transform's scale to −1, for any entity. Typing −1 does the same.

Source: scope DR12; round 6: ST3

### The EffectsComponent · v3

- An EffectsComponent adds pixelate, shadow and blur to an entity that draws. Tint belongs here too.
- *Why v3: each effect needs a drawing pass per entity.*

Source: round 2: O9; round 6: ST3; round 8: FX3

### Each entity draws one thing · v1

- An entity draws exactly one thing, in this order: **text, then path, then shape**. The rest is not drawn.
- With a path and a shape on one entity, the path is drawn and the shape is used for collision.
- To stack two drawings, use two entities in a group.

Source: round 5: 03 2.13; old: DR-117 to DR-122

## Text

### The Text tool · v2

- Click on the level and type. The text shows in its real font, size, colour and rotation as you type.
- Enter starts a new line. Esc or clicking elsewhere finishes. Empty text creates nothing, and emptying a text deletes the entity.
- Double-clicking a text with Select edits it again.
- **TextComponent settings in v2:** Width, font, weight, size, alignment.
- **Width** is "Fit to text" or "Fixed". With Fixed, the text wraps at that width. The height always fits the text, so text never spills out of its box. *Why a two-option choice: it reads better than a checkbox.*
- Size is a whole number from 8 to 400, default 32. Weight takes any value. Alignment is left, centre or right.
- One style for the whole text. No mixed bold or colours.
- **A text entity has a rectangle ShapeComponent as its box, like an image.** The rectangle isn't drawn. It is what you click, what Flex uses, and what collides if you add physics. With Fit to text the editor sets its width and height. With Fixed you set the width and the editor sets the height. *Why: the owner's idea. Text works exactly like images, and "text doesn't collide unless you add a shape" goes away.*
- The one font in v2 is **Inter**. Fonts come with the game, so a level looks the same on every computer. A font is never removed from the list.
- **Non-Latin text uses the system font, with a warning** that it may look different on other computers. Emoji too.
- Text stays sharp at any zoom and inside a scaled group.
- A text holds up to 10,000 characters.
- Typing inside a text has its own undo. The whole edit is one level undo step when finished.
- *Why v2: the reason it was v1 was a score on the screen, which needs variables. Text also brings fonts and sharp text at any zoom.*

Source: scope DR8; round 1: D27; round 3: F1; round 6: TX1; round 7: TX2; old: DR-100 to DR-116; owner: 2026-11-13

### Line height and letter spacing · v3

- Line height from 0.8 to 3, default 1.2. Letter spacing.

Source: scope DR9; round 6: TX1

### More fonts · v3

- Lora, JetBrains Mono and Roboto Mono, beside Inter.
- *Why v3: one font is enough to test, and every font adds download size.*

Source: scope DR10; round 3: F1

## Not in the scope review

Accepted in the requirements review but never given a version. The last column is Claude's suggestion, not a decision.

| Feature | Rule | Suggested |
|---|---|---|
| Corner radius | A rectangle has one corner radius, set by a dot on the level or typed. A free resize keeps it. Rounded corners are part of what collides | v3 |
| Line caps and joins | Cap, join and miter limit for outlines, under "More" on the StyleComponent | v3 |
| Apply scale | On a single shape with a scale other than 1, a button folds the scale into its size and resets scale to 1 | v3 |
| Break and join path points | Break opens a closed path at a point, or splits an open path in two. Join closes an open path | v3 |
| Create path from shape | Adds a path that exactly matches a shape, so the art can be curved without touching what collides | v3 |
| Convert a rectangle or ellipse to a polygon | Replaces it with a polygon. On an ellipse, the point count gives a triangle, a hexagon or any regular polygon | v3 |
| "Out of date" after converting | When a path changes after Convert to polygon, the shape shows an "Out of date" note with a Regenerate button | v3 |
| Polygon too thin to collide | A polygon with almost no area gets a warning and has no collision | v3 |
| Text size by handles | Dragging a text's corner changes the font size in whole numbers. Written before the text box existed, so it needs a decision | Needs a decision |
| Text tool remembers | The Text tool remembers the last font, size and colour. New text is dark, or light on a dark background | v3 |
| Drawing hint line | Drawing tools show a one-line hint of what clicks and keys do right now | v3 |

Source: old: DR-03, DR-29, DR-31, DR-32, DR-61, DR-66, DR-67, DR-77, DR-86, DR-91, DR-110, DR-115
