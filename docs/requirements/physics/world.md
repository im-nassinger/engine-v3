# Physics: the World, the collision grid and level bounds

## TL;DR

The level-wide physics settings, all on the World entity. **v1:** gravity as one vector, the background colour (the World's StyleComponent), and level bounds (the World's rectangle ShapeComponent) whose edges are all walls or all open. **Later:** the collision grid (which tags hit which), the Collision check, gravity buttons, game speed, and a background image. Core rule: **the collision grid on the World is the one place that decides what hits what.** There is no second system beside it.

## World settings

### Gravity and background colour · v1

- The World has a **PhysicsWorldComponent** holding gravity, game speed and the collision grid, and from v4 *Pixels per metre* (see [lengths in metres](../editor/workspace.md#lengths-in-metres--v4)). *Why one component: all world physics settings in one place.*
- **Gravity is one vector, x and y, in m/s²**, **default 0, 9.8**: straight down, since y points down. Each of x and y goes from −100 to 100 (standing yes, 2026-11-15: the old strength's limit of 100, per axis). *Why: a pull is a direction and a size, which one vector holds, like the kick the Push action took until 2026-11-23 (owner: 2026-11-15).*
- Zero gravity is 0, 0, so it keeps no direction. Typing a new vector sets both again.
- Sizes are in metres and speeds in m/s, gravity in m/s², like real life, and mass in kg (owner, 2026-11-25: sizes and speeds were in pixels until v4).
- The 9.8 default feels floaty for a platformer. The fix is the player's Gravity scale, not the world's gravity: the builtin platformer script sets it from its jump variables.
- **The background colour is the fill of the World's StyleComponent**, which paints the World's rectangle, the level bounds. A soft light blue by default, **`#BFE3F5`**, with no outline, because the editor already draws the bounds as a thin frame. *Why: a StyleComponent already holds a fill, so the background needs no setting of its own, and Later an image fill becomes the background image (owner: 2026-11-13). Why this blue: every default shape colour stands out on it (standing yes, 2026-11-14).*
- Triggers and scripts can change gravity and the World's whole StyleComponent during play, the background colour included. **Walls can't change during play**, because the bounds don't (standing yes, 2026-11-14). Changing gravity wakes every sleeping body, so nothing hangs in mid-air.
- The World's settings are edited in the Entity inspector, like any entity's.

Source: scope PH9; round 1: C3, D6, D38; round 3: D75, R15; round 6: 05 2.14; round 7: CF1; old: PH-82 to PH-84, PH-88, PH-89; owner: 2026-11-13, 2026-11-14, 2026-11-15

### Buttons for gravity · Later

- Quick buttons for how strong gravity is: Earth 9.8, Moon 1.6, Arcade 30, None 0. Each sets the vector's length and keeps its direction; from 0, 0 they point down (standing yes, 2026-11-15: gravity became a vector, and the buttons are about strength, not direction).

Source: scope PH10; round 6: 05 2.14; old: PH-85; owner: 2026-11-15

### Game speed · Later

- A World setting: 1 is normal, 0.5 half, 2 double. Triggers and scripts can change it, such as slow motion for 2 seconds after a bomb.
- It slows physics, timers and script waits together. Keys and sound stay at real speed.
- At 0 the level freezes, and scripts still run with no time passing.
- It is different from the test speed menu on the Play bar, which only changes how fast you watch.

Source: scope PH11; round 3: D75; round 6: 05 2.14; round 9: 09 2.10; old: PH-87

### Background image · Later

- The background can be an image instead of a colour: the World's StyleComponent gets an image fill. It comes with images.
- A missing image falls back to the colour.

Source: scope DR11; round 6: 05 2.14; old: PH-88

## What hits what

### The collision grid · Later

- **The collision grid uses tags.** You pick which tags appear in the grid, and tick which of them hit each other. An entity's tags decide what its surfaces hit.
- Tags that aren't in the grid don't affect collisions.
- An entity with no grid tag counts as **Default**.
- An entity with two grid tags hits something if either tag does.
- Changing an entity's tags during play changes its collisions at once.
- Up to 64 grid tags, which is Box2D's limit.
- The grid opens from "Edit collision grid" on the PhysicsWorldComponent's card.
- The grid applies to touching too: if a pair is unticked, neither bumping nor passing through is noticed.
- **Nothing extra for ragdolls.** There is no "parts don't collide" setting and no collision group component. Give the parts the right tags. The trade-off, accepted by the owner: two ragdolls sharing a tag pass through each other.
- *Why tags: the owner's idea, one label system instead of two. "Either tag" is how Box2D's filter bits already work. And once the grid exists, nothing else is needed.*
- In v1 there is no grid: every solid surface hits every other, and shapes with no Surface cover coins and finish zones.
- Hovering a cell shows a sentence, such as "player and enemy collide". A new grid tag collides with everything until you untick boxes.

Source: scope PH6; round 6: 05 2.12, 05 2.13; round 7: CF1; round 8: CF3, CF4, CT1; old: PH-64 to PH-77

### The Collision check · Later

- Right-click two entities: **"Why do these collide?"**. It answers "These collide", or names the first rule that stops them.

| Order | Rule | If it fails |
|---|---|---|
| 1 | They are not the same body | "Both are part of Car, so they never collide" |
| 2 | At least one is Dynamic | "Static and Kinematic bodies never collide with each other" |
| 3 | No joint between them, or the joint lets connected entities collide | "They are joined, and the joint has Let connected objects collide off" |
| 4 | Their tags are ticked in the grid | "player and coin are unticked in the grid" |

- These are the only rules. If either has no Surface, the answer reads "These overlap but don't push". If either is one-way, it adds "from one side only".

Source: scope PH7; round 6: 05 2.13; round 8: CF4; old: PH-80, PH-81

## Level bounds

### Level bounds · v1

- **A level has a fixed size.** Every level has a bounds rectangle, always. *Why: a physics world needs an edge, otherwise lost entities cost time forever and the camera has nothing to stop at.*
- **The level bounds are the World's rectangle:** the World has a ShapeComponent holding a rectangle, and its width and height are the bounds' size. It is always a rectangle and can't be removed. *Why: the owner's change. A rectangle already has a size, a card and handles, so the bounds need no settings of their own (owner: 2026-11-13).*
- Default size: **200×100 m**. The default camera is 19.2×10.8 m. *Why: the owner's 20000×10000 px at the default 100 px per metre (standing yes, 2026-11-25). Before: the owner first made a new level square (2026-11-17), then kept 20000×10000 (owner: 2026-11-18): the redesign's 8000×8000 square was its example level only.*
- **The World's rectangle is centred on the level's origin**, and stays there. *Why: the World never moves, so its rectangle can't be moved either, and a centred rectangle needs no offset setting (owner: 2026-11-13).*
- The bounds show as a thin frame in the editor. Resize them by dragging their handles with the World selected, or by typing the rectangle's width and height. **Dragging one edge moves the opposite edge by the same amount**, so the centre never moves. Example: bounds 200 m wide run from −100 to 100 m; dragging the right edge out by 10 m makes them 220 m wide, from −110 to 110 m.
- The camera stops at the bounds.
- **The edges are all walls or all open**, set by one checkbox, **Walls**, on the PhysicsWorldComponent. Off by default, so all four edges are open. A wall blocks everything that collides. *Why: one toggle is enough; a choice per edge is more than a level needs (owner: 2026-11-13).*
- **The World's rectangle is never solid.** The World can't take a BodyComponent or a SurfaceComponent: the Add Component menu shows both greyed out, with the reason "The World can't collide. To block the edges of the level, turn on Walls on the PhysicsWorldComponent." The only walls are the ones Walls makes. *Why: a solid rectangle the size of the level would trap every entity inside it (owner: 2026-11-13).*
- **An entity that is fully outside an open edge is removed**, where it can no longer be seen. That is all the game does: it decides nothing about lives or falling.
- An entity that starts or spawns outside is left alone until it has been inside once.
- The bounds don't change during play.

Source: scope PH12; round 1: D5, D40; round 6: 05 2.15; round 7: BND2; round 10: 11 2.16; old: PH-91 to PH-99; owner: 2026-11-13, 2026-11-17, 2026-11-18

## Small features

Small features from the old draft and review that the scope review never asked about. The owner gave each its version in round 7 of the architecture review.

| Feature | Rule | Version |
|---|---|---|
| "Keep going" past an open edge | A setting to keep entities instead of removing them. The review only kept removal | Later |
| Hard limit | Any body 2,000 m from the origin is removed, with a warning: the status text in v1, the Console from v5 | v1 |
| Maximum level size | 4,000×4,000 m | v1 |
| Gravity hint | Under Gravity: "An entity falls 4.9 m in the first second." | Later |
| Background image layout | Fill the screen or tile, and how much it scrolls with the camera, from 0% to 100% | Later |
| Grid window details | Colours per tag, drag across cells to paint, "Collide with all" and "Collide with none" per row | Later |
| Removal line in the Console | "Crate left the level and was removed." | Later |

Source: old: PH-73, PH-74, PH-86, PH-88, PH-93, PH-95, PH-96, PH-99; owner: 2026-11-14
