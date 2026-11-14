# Physics: bodies and surfaces

## TL;DR

How entities move and collide. A **BodyComponent** says how something moves, a **SurfaceComponent** says how its shape collides. **v1:** add a body in one click, the Box2D body settings, the surface settings (density, friction, restitution, sensor), merging shapes in a group into one body, and the physics view. **v2:** sensors and touching, for triggers and scripts. **v3:** one-way platforms and the warnings for setups that behave badly. Core rules: new shapes have no physics until you add it, collision always matches what you see, and touching is detected by the physics engine alone.

Field names are Box2D's, so the Inspector, the Lua API and tutorials match. The scale is 50 px per metre and is not a setting.

## Bodies

### Add a body in one click · v1

- The editor says **Body** for how something moves and **Surface** for how it collides. A Surface is what Box2D calls a shape, and older Box2D a "fixture". *Why not "shape": it would clash with ShapeComponent.*
- One click adds a BodyComponent as **Static**, **Dynamic** or **Kinematic**.
- **The click adds only the BodyComponent.** If the entity has a ShapeComponent but no SurfaceComponent, the BodyComponent's card shows a note with an [Add SurfaceComponent] button. Adding a body to a group adds nothing to the shapes inside it. *Why: nothing happens behind the user's back. A body on a group whose shapes already have surfaces needs nothing more, so adding surfaces automatically would often be wrong.*
- Adding a body to an entity with children makes them one solid thing: the shapes inside merge into that body.
- New shapes have no physics until you add it.
- The type is a three-way switch with a plain line under it, and a hint saying what collides with what.

| Type | Plain line | Used for |
|---|---|---|
| Static | Stays exactly where you put it. Nothing can move it | Ground, walls |
| Dynamic | Falls, gets pushed, and bounces off things | Crates, cars, players |
| Kinematic | Moves only when told to. Nothing can push it, and it passes through walls | Moving platforms, doors |

- A Dynamic body collides with anything. Static with Static, Static with Kinematic and Kinematic with Kinematic never collide, and sensors between those pairs don't fire either.
- **A line can't go on a Dynamic body.** The Dynamic option is greyed out with the reason, and the shape shows a red badge. A line on a Static or Kinematic body is fine.
- Lines collide from both sides, whichever way they were drawn. A line never collides with another line.

Source: scope PH1; round 1: C6, D36, D39; round 2: O8; round 6: 05 2.1, 05 2.2, 05 2.3; decisions: D35; old: PH-01 to PH-16; owner: 2026-11-13

### Body settings · v1

| Field | What it does | Range | Default | Applies to |
|---|---|---|---|---|
| Type | See above | Static, Dynamic, Kinematic | Dynamic | All |
| Gravity scale | How strongly gravity pulls. 1 is normal, 0 floats, negative rises | −10 to 10 | 1 | Dynamic |
| Linear damping | Slows movement over time, even in mid-air. Use 2 to 5 for top-down games | 0 to 100 | 0 | Dynamic |
| Angular damping | Slows spinning over time. Raise it to make balls stop rolling | 0 to 100 | 0 | Dynamic |
| Fixed rotation | Never tips or spins. Use for players | On or off | Off | Dynamic |
| Bullet | Extra checks so a very fast entity doesn't pass through other moving things | On or off | Off | Dynamic |
| Mass | Read-only, in kg. Updates as shapes and density change. You set density, never mass | | | Dynamic |

- *Why these names: the owner wanted common terms. These are Box2D's (Unity and Godot are nearly the same), so the Inspector, the Lua API and tutorials match.*
- Only the fields that matter for the chosen type are enabled. The others are greyed, with their values kept.
- All of these can change during play.
- Speed is capped at 6,000 px/s and spin at 15 turns per second. Higher values are quietly limited.

Source: scope PH2; round 3: P1; round 7: 05 2.4; old: PH-17 to PH-19

## Surfaces

### The SurfaceComponent · v1

| Field | What it does | Range | Default |
|---|---|---|---|
| Density | How heavy it is for its size. A 100 px square at density 1 weighs 4 kg | 0 to 100 | 1 |
| Friction | How much it grips. 0 is ice, 1 is very grippy. Both surfaces count, so ice is slippery on anything | 0 to 5 | 0.3 |
| Restitution | How much speed it keeps after a hit. 0 stops dead, 1 bounces back fully. The bouncier of the two wins | 0 to 2 | 0 |
| Sensor | Notices what touches it but never pushes | On or off | Off |

- A SurfaceComponent makes its entity's shape collide. Without one, nothing collides.
- **There are no material presets.** *Why: presets would be a real feature of their own (browse and save presets on any component). Not in v1.*
- **A surface with no BodyComponent on it or above it acts as Static.** No hidden body is created. *Why: nothing happens behind the user's back, and "a surface without a body stays still" is Unity's rule.*
- Friction, Restitution and Sensor can change during play. Density can't.
- In v1 every solid surface hits every other one. What hits what is set in v3 by the [collision grid](world.md).
- Only the shape collides, so a thick outline can overlap its neighbours by half its width.

Source: scope PH3; round 1: C7; round 6: 05 2.5; round 7: SF1, SN1; round 8: CT1; old: PH-20, PH-21

### Sensors and touching · v2

- A sensor notices things entering it but doesn't push them. Triggers and scripts decide what happens.
- **Triggers that react to touching need a SurfaceComponent.** Without one, the trigger card shows "Needs a SurfaceComponent to notice touching. [Add SurfaceComponent as sensor]".
- A coin is a ShapeComponent, a SurfaceComponent set to sensor, and a TriggerComponent.
- *Why: Box2D detects touching, so we don't write a second collision system that would disagree at the edges and threaten determinism.*
- A sensor is drawn like any other shape, so its StyleComponent decides whether players see it. With no StyleComponent it is invisible, and only the physics view shows it.
- Sensors add no weight.
- Sensors check once per tick and are not protected against fast entities: something moving 600 px/s travels 10 px each tick and can skip a thin sensor.
- The body type rule applies: a Static sensor can't notice a Kinematic body.
- *Why v2: noticing a touch is only for triggers and scripts, which come in v2. The Sensor setting itself is in v1, because it is one Box2D setting.*

Source: scope PH3; round 6: 05 2.11; round 7: SN1; old: PH-58 to PH-63; owner: 2026-11-13

### One-way platforms · v3

- One-way is a SurfaceComponent setting: a checkbox and a direction, **up by default**. No component, no script. *Why: it is about how a surface collides. It must be decided inside the physics step for every contact, where Lua would be slow and fragile for determinism.*
- An arrow on the shape shows the direction things pass through. Up is the classic platform: jump up through it, land on top. The arrow turns with the entity.
- Pass or block is decided when contact starts and held until contact ends.
- Something blocks only if, when contact starts, it is on the arrowhead side and not moving along the arrow. Something that starts overlapping passes until it is clear.
- The decision is shared by the whole body: if any part is passing through a platform, all its parts pass until none touches it.
- A passing contact produces no collision event. A blocked one behaves like any collision.
- Only faces looking along the arrow can block. Walking into the end of a platform passes through.
- With Sensor on, One-way has no effect.
- A script can make a body drop through the one-way platforms it is standing on. The builtin platformer script uses it for Down plus Jump.

Source: scope PH5; round 6: 05 2.10; round 7: OW1; old: PH-47 to PH-57

## Groups and scale

### Shapes in a group merge into one body · v1

- **A shape inside a group with a body merges into the group's body, unless merging is unticked.** A car body made of three shapes moves as one piece.
- It merges into the nearest group above it that has a body. Groups without a body in between are skipped.
- **Whether a child merges is the Merge checkbox on its BodyComponent**, on by default. A shape with a SurfaceComponent and no BodyComponent always merges into the body above it; to give it a body of its own, add a BodyComponent and untick Merge. *Why: it belongs with the body settings it greys out (owner: 2026-11-13).*
- **Nothing is lost when it changes.** A merged shape keeps its own body settings, greyed, and gets them back when unmerged. Grouping, ungrouping, adding and removing bodies and dragging out never destroy data.
- The body decides how everything moves. Each surface keeps its own density, friction, restitution and sensor, so one body can mix them.
- A child with no physics inside a group with a body follows the body and doesn't collide.
- A child with merging unticked stays where it is in the tree and draw order, but moves by its own body during play.
- A merged shape's own body type doesn't matter: the group's wins.
- Bodies that overlap at the start of play are pushed apart. Not an error.

Source: scope PH4; round 1: C8; round 6: 05 2.6; old: PH-24 to PH-31; owner: 2026-11-13

### Scale, rotate and skew freely · v1

- Physics shapes and groups can be scaled, rotated and skewed freely. **Collision always matches what you see.**
- Density stays fixed, so bigger means heavier. Mass updates as you scale.
- An ellipse with equal width and height, scaled evenly, is a true circle. Any other ellipse collides as a many-sided polygon.
- Mirroring with a negative scale mirrors the collision too.
- Shape and scale don't change during play.
- Entities at rest sit about 1 px apart. It only shows when zoomed in.

Source: round 6: 05 2.7; old: PH-32 to PH-38

## Seeing physics

### The physics view · v1

- A debug view that draws every physics shape on top of the level, whatever the drawing settings say: the eye, opacity, a parent's opacity.
- Off by default. Available in the editor and in test play, never in a published level. It is a View menu switch.
- It draws the same collision pieces the game gives the physics engine, so it shows exactly what collides, and looks the same in the editor, where no physics runs, and in test play.
- *Why v1: a sensor with no StyleComponent is invisible, and this is the only way to see it.*
- Even with the view off, selecting anything with physics outlines its whole body.
- **There is no physics preview in the editor.** Press Play to see physics. *Why: test play already runs a copy that can't harm the level, with Pause and Step.*

Source: scope PH8; round 6: 05 2.8, 05 2.16; round 8: VW1; old: PH-39 to PH-43, PH-100, PH-101; owner: 2026-11-13

### Warnings for physics setups · v3

Editor messages for setups likely to behave badly. None of them stops you playing.

| When | Kind | Message | Fix button |
|---|---|---|---|
| Any physics shape under 1 px on its short side | Warning | "Too small to collide. It will be ignored during play." | |
| A Dynamic or Kinematic shape under 5 px on its short side | Warning | "Very small for physics. It may jitter or slip through things. Try 5 px or more." | |
| A Dynamic or Kinematic shape over 500 px long | Warning | "Very big for a moving entity, so it may feel slow or unstable. Split it into joined pieces, or make it Static." | Make Static |
| A Static shape over 2,500 px long | Tip | "Long static shapes work, but past 2500 px contacts can get less exact. If things jitter here, split it." | |
| A Dynamic shape longer than 20 times its thickness | Tip | "Long thin moving shapes can wobble or slip through other moving things. Make it thicker, or turn on Bullet." | Turn on Bullet |
| A sensor under 10 px on its short side | Tip | "Fast entities can skip thin sensors." | |
| A Dynamic body whose surfaces are all sensors | Warning | "This sensor will fall during play, because its body is Dynamic." | Make Static |
| A group with a body and nothing inside that collides | Warning | "Car has a body, but nothing inside collides. It will fall through everything." | |
| A Dynamic body with density 0 everywhere | Warning | "Nothing here has weight, so it counts as 1 kg and can't spin. Set Density above 0." | Set Density to 1 |
| A Dynamic ellipse that isn't a true circle | Tip | "This ellipse collides as a many-sided shape, so it won't roll perfectly." | Make circle |
| A body that starts outside the level bounds | Tip | "This starts outside the level bounds." | |
| Gravity above 30 | Tip | "Very strong gravity can make stacks jitter." | |
| Level bounds smaller than the camera | Warning | "The level bounds are smaller than the camera view." | |

The sizes come from Box2D's advice at 50 px per metre: moving shapes from 5 to 500 px, static shapes up to 2,500 px. The 1 px, 20 to 1 and 10 px figures are judgement calls to confirm in play.

Source: scope ED10; round 6: 05 2.9; round 10: EM1; old: PH-44 to PH-46

## Not in the scope review

Left over from the old draft, or accepted without a version. The last column is Claude's suggestion, not a decision.

| Feature | Rule | Suggested |
|---|---|---|
| Start asleep, starting velocity, starting spin | Three body fields from the old draft. The reviewed field list doesn't include them | Later |
| "New shapes: no physics, Static, Dynamic" | A Shape tool option so that laying out ground takes no extra clicks | v3 |
| Physics view details | Colour per body, hatched fill for Static, dashed for sensors, centre of mass, contact points, a legend. v1 draws the pieces without these details | v3 |
| Mass ratio hint | Stacks and joints turn wobbly past 10 to 1 in mass. The Density hint says so | v3 |

Source: old: PH-02 to PH-13, PH-17, PH-22, PH-23, PH-41, PH-43
