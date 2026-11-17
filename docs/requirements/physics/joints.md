# Physics: joints

## TL;DR

A joint is an ordinary entity with a JointComponent that connects two bodies. **v1:** three joints (Hinge, Rope, Spring), the Joint tool, each joint's typed settings, and Rope and Spring that show in play when styled. **v3:** Weld, Rod, Slider and Wheel, dragging limits on the level, re-attaching an end or changing type, joints that break, and the joint warnings. Core rule: **no special cases for joints.** A joint moves and copies only when it is selected, and breaking is just being destroyed.

All lengths are pixels and all angles are degrees. Positive angles and speeds are clockwise on screen. Values marked (tune) are starting points.

## What a joint is

### A joint is an ordinary entity · v1

- A joint is an entity with a TransformComponent and a JointComponent. It has its own row in the Entities panel, and can be renamed and hidden like any entity.
- It can hold children, triggers and scripts, like any entity. *Why: one rule for every entity. Treating joints as special was left over from an earlier design.*
- The JointComponent names its two entities in fields **A** and **B**. Clicking a field selects that entity. An empty B pins A to the background.
- Joints connect bodies. A sensor or a line can be an end.
- Joints show an editor-only icon so they can be selected, one shape per type, always the same size on screen. "Joint icons" in the View menu hides them.
- Hovering or selecting a joint shows thin lines to its two entities.
- **Joints have no special drawing in play.** An unstyled joint is invisible, like any entity.
- A hidden joint still works.
- Joints don't run inside the camera, because positions there are screen positions.

Source: round 1: C9, D43; round 4: G2, R44; round 5: R45; round 6: LY2; round 8: VW1, HUD2; decisions: D44; old: JT-07, JT-47 to JT-53

### Three joints: Hinge, Rope, Spring · v1

| Joint | Does what | Used for |
|---|---|---|
| Hinge | Turns around one point | Ragdoll limbs, doors, seesaws, wheels on an axle |
| Rope | A longest distance. It can go slack | Hanging cages, wrecking balls |
| Spring | Pulls back to a rest length | Bouncy platforms, hanging lamps |

- *Why these three: each does something the others can't.*
- Each type's tooltip adds the physics name, such as "Hinge (revolute joint)", so people can find help elsewhere.

Source: round 6: 06 2.1; round 8: JV2; round 1: D42; old: JT-01, JT-02

### Four more joints: Weld, Rod, Slider, Wheel · v3

| Joint | Does what | Used for |
|---|---|---|
| Weld | Holds two bodies rigid, or a little springy | Breakable bridges, plank walkways |
| Rod | A fixed distance, like a stiff bar | Crank linkages, pendulums |
| Slider | Slides along a line, no turning | Lifts, crushers, pistons |
| Wheel | Spins freely, with sprung travel along a line | Vehicle wheels with suspension |

- *Why v3: Weld is the easiest to leave out, because merging shapes into one body already glues them. Rod is a Rope that can't go slack, so it is cheap to add.*
- Rod, Rope and Spring are one kind underneath, so switching between them keeps everything they share.
- Pulley and Gear joints come after that, see [rejected.md](../../rejected.md).

Source: round 1: D41, D42; round 6: 06 2.1; round 8: JV2; decisions: D46; old: JT-01, JT-03

## Making and changing joints

### The Joint tool · v1

- Pick the joint type in the tool's options strip. Hinge is the default.
- **Click where two physics entities overlap to connect them, or on one alone to pin it to the background.**
- **A one-point joint (Hinge, and later Weld) takes one click. A two-ended joint (Rope, Spring, and later Rod) takes two clicks, one on each entity**, and each end sits exactly where you clicked. *Why two clicks: it is the only way to say where each end of a rope goes.*
- Ends snap to centres and corners when close. It is the same snapping used everywhere else.
- Two merged shapes of one car count as one body. Entities without physics, hidden entities and locked entities are skipped.
- A preview shows what will be connected before you click, with a label such as "Hinge: Wheel to Car".
- **Over an entity it skips, the preview's label says why**, when there is no physics entity to use there: "Platform has no BodyComponent", "Platform is hidden", "Platform is locked". Clicking does nothing and the status text repeats the reason. *Why: "Nothing with physics here", small and far from the mouse, didn't say which entity or why (owner: 2026-11-16).*
- **A Rope's or Spring's second click on an entity it skips is refused** with the same reason, instead of pinning that end to the background. *Why: a joint to the background there is not the one the user meant (owner: 2026-11-16).*
- No fix button in the preview: it can't be clicked. A fix belongs in an editor message on the card.
- Clicking with nothing under the mouse does nothing and shows a hint.
- Making a joint is one undo step. The new joint is selected.
- **Joints come only from the Joint tool.** The JointComponent is in the Add Component menu, disabled, with "Use the Joint tool to place a joint." *Why: added by hand, a joint would have no ends and no A, and would do nothing until deleted and placed again, since re-attaching an end is v3 (standing yes, 2026-11-14).*

Source: round 6: 06 2.2; round 7: 06 2.3; round 5: TK2; old: JT-04 to JT-25; owner: 2026-11-14; owner: 2026-11-16

### Settings of each joint · v1

Every joint:

| Setting | Default |
|---|---|
| Let connected objects collide | Off for Hinge. On for Rope and Spring, because their ends act at a distance |

Its name is enough, and it has no description (owner: 2026-11-17). It covers the joint's two bodies only: bodies joined through other bodies, as in a ragdoll, still collide.

Hinge:

| Setting | What it does | Range | Default |
|---|---|---|---|
| Limit rotation | Stops A turning too far | On or off | Off |
| Min angle, Max angle | How far it can turn each way from how it is placed. At most half a turn each way (standing yes, 2026-11-16) | −180 to 0, 0 to 180 | −45, 45 |
| Motor | Turns A by itself | On or off | Off |
| Motor speed | Target speed. At most the spin cap, see [bodies](bodies.md#body-settings--v1) (standing yes, 2026-11-16) | −2,700 to 2,700 °/s | 180 |
| Motor strength | How hard it pushes. Too low and it never reaches speed | 0 to 100,000 | 50 (tune) |
| Resistance | Stiffness in the joint, so limbs and doors slow and settle | 0 to 100,000 | 0 |

Rope:

| Setting | What it does | Range | Default |
|---|---|---|---|
| Match drawn distance | Keeps the length equal to the gap between the ends | On or off | On |
| Length | The longest the rope can get. Longer than the gap gives slack | 1 to 100,000 px | As drawn |

Spring:

| Setting | What it does | Range | Default |
|---|---|---|---|
| Match drawn distance | The rest length stays equal to the gap between the ends | On or off | On |
| Rest length | The length it pulls back to | 1 to 100,000 px | As drawn |
| Stiffness | Bounces per second. Higher is firmer | 0.1 to 15 | 2 |
| Damping | How fast the bouncing dies out. 0 keeps bouncing, 1 settles at once | 0 to 1 | 0.3 |

- **Rope and Spring share one Match drawn distance setting**, so switching a Rope to a Spring in v3 keeps it, and Lua has one `match_drawn_distance` (standing yes, 2026-11-14).
- **Length and Rest length read as 100 px when a file leaves them out.** The Joint tool always sets them from the drawn gap, so only a file edited by hand can leave one out (standing yes, 2026-11-14).
- Limits always include the placed position: Min can't go above 0 and Max can't go below 0.
- Limits are measured from how the joint was built, so turning things in the editor never makes them wrong.
- *Why half a turn, not the full turn first written: Box2D 3.2 holds a Hinge's limits to 180° each way, so a limit past it would stop the joint at 180° anyway. The closest fix to the owner's range is Box2D's own (standing yes, 2026-11-16).*
- **Triggers and scripts can drive a joint's motor or destroy it, and react when it is destroyed.** The trigger or script doesn't have to sit on the joint.
- Destroying a joint during play disconnects it. This is how a trigger cuts a rope.
- These can change during play: motor on or off, motor speed and strength, limits, resistance, length, rest length, stiffness, damping. The type, the two entities and the ends can't.
- A motor pushing against a limit holds there.

Source: scope JO1; round 7: 06 2.5, 06 2.14, 06 2.15; old: JT-36 to JT-38, JT-79, JT-81 to JT-84; owner: 2026-11-14

### Settings of the v3 joints · v3

| Joint | Settings |
|---|---|
| Weld | Flex (bounces per second when bent, 0 is rigid, 0 to 15) and Flex damping (0 to 1, default 0.7) |
| Rod | Length, read-only. Move an end to change it |
| Slider | Axis angle. Limit travel (on, −100 to 100 px). Motor, Motor speed (−6,000 to 6,000 px/s, default 100), Motor strength (100, tune), Resistance |
| Wheel | Axis angle. Suspension stiffness (0.1 to 15, default 4) and damping (0 to 1, default 0.7). Limit travel (on, −20 to 20 px). Motor, Motor speed (default 720 °/s), Motor strength (20, tune) |

- Let connected objects collide is off for Weld, Slider and Wheel, and on for Rod.
- Slider and Wheel show an arrow through the joint for their axis. Drag it to turn it.

Source: round 7: 06 2.5, 06 2.14; round 8: JV2; old: JT-28, JT-36, JT-79

### Rope and Spring show in play · v1

- A Rope, Spring or Rod has a **read-only PathComponent** whose points the game keeps on the joint's two ends: a straight line, or a zigzag for Spring.
- Adding a StyleComponent to the joint styles that path, so it shows in play. Without one, the joint is invisible.
- **Nothing is drawn in a hidden way.** *Why: the owner's change. A joint draws through a path like anything else, with no special drawing code for joints.*
- *Why v1: a rope nobody can see makes a strange toy.*

Source: scope JO5; round 1: D43; round 3: J1; old: JT-41

### Drag limits on the level · v3

- A Hinge with limits shows an arc with a handle at each end. A Slider or Wheel shows a bar along its axis.
- Hovering or dragging a handle shows a ghost of the part at that limit.
- In v1 limits are typed.

Source: scope JO2; round 7: 06 2.6; old: JT-42 to JT-46

### Re-attach an end, change the type · v3

- After placing a joint you can drag an end to attach it elsewhere, change its two entities in fields A and B, or change its type.
- Settings both types share are kept. Settings that don't apply to the new type stay stored and come back when you switch back.
- In v1 you delete the joint and place it again.

Source: scope JO4; round 8: 06 2.4; old: JT-26 to JT-33

### Joints that break · v3

- A joint can be set to break under too much force: a Breakable switch and a Break force.
- **Breaking destroys the joint entity**, so triggers and scripts use the ordinary "destroyed" event. **There is no "joint broke" event.** *Why: the owner's idea. Breaking is the physics engine destroying the joint when the force passes its limit, so a separate event would be a second name for one thing.*
- A broken joint is gone for the rest of that run. Stop brings it back.

Source: scope JO3; round 6: JB1; round 7: 06 2.5; decisions: D47; old: JT-39, JT-85

## Moving, copying, deleting

### Only what is selected moves or copies · v1

- **A joint moves like any entity: only when it is selected.** Moving a connected entity alone leaves the joint where it is, so it attaches at a different spot. To move both, select both.
- During play the physics engine moves the joint.
- A joint inside a group moves with the group.
- **Copying copies a joint only when it is selected.** A copied joint connects the copies of its entities if they were copied too. Otherwise it connects the originals in the same level, or shows them as missing in another level. `.entity` files follow the same rule.
- *Why: the same rule as everything else. It also makes placing an end easy. The old rule, that a joint's position comes from its two bodies, is only true in play.*
- Deleting an entity deletes the joints attached to it. Deleting a joint deletes only the joint. Removing physics from an end doesn't delete the joint.
- Where a joint's row sits in the Entities panel only affects the tree, never what it connects.

Source: round 1: D45; round 7: 06 2.9, 06 2.10, 06 2.11; round 8: JM1, JC1; old: JT-55, JT-63 to JT-78

### Warnings for joints · v3

Editor messages on the JointComponent's card. None of them stops you playing.

| When | Kind | Message | Fix button |
|---|---|---|---|
| An end is off its entity | Warning | "The end is off Wheel. It still works, like an invisible arm." | Move end to Wheel |
| Both ends are on the same body | Warning | "Both ends are on the same body (Car), so this joint does nothing." | Turn off merging on Wheel |
| Neither end can move | Warning | "Neither end can move, so this joint does nothing. Make one of them Dynamic." | |
| An end has no physics | Warning | "Wheel has no physics, so this joint does nothing." | |
| A Hinge's entity has Fixed rotation | Warning | "Wheel has Fixed rotation on, so it can't turn." | Turn off Fixed rotation |
| Motor on with strength 0 | Tip | "This motor has no strength, so it won't move anything." | |
| A Rope or Spring is drawn longer than its length | Warning | "This rope is stretched. The bodies will snap together when play starts." | Match drawn distance |
| A chain of 12 or more joints | Tip | "Long chains can stretch and wobble. Use fewer links or lighter loads." | |
| One side over 10 times heavier than the other | Tip | "Heavy Crate hangs from light Link 3, so the chain may stretch." | |
| The same type joins the same two bodies twice | Tip | "Another Hinge already connects these bodies, which can cause shaking." | Select it |

Source: scope ED10; round 7: 06 2.13; round 8: JM1, WN1; old: JT-74 to JT-74m

## Small features

Small features from the old draft and review that the scope review never asked about. The owner gave each its version in round 7 of the architecture review.

| Feature | Rule | Version |
|---|---|---|
| Connecting bodies that don't overlap | Press on one body and drag to another, for one-point joints | v3 |
| Pin on purpose | Alt pins to the background even with a second body under the mouse | v3 |
| Choosing among three bodies | With three or more bodies under the mouse, Tab steps through the pairs | v3 |
| Which body is A | The smaller of the two becomes A, so the wheel or the door is A whatever the draw order | v1 |
| Scaling a group with joints | Scaling a group scales its joints' distances, and mirroring it mirrors their limits and motor direction | v1 |
| Force readout | While a Breakable joint is selected in test play, the Inspector shows the current and peak force | v3 |

Source: old: JT-12 to JT-16, JT-40, JT-68, JT-69; owner: 2026-11-14
