# Example level: a platformer character

## TL;DR

**A plan, waiting for the owner's review (2026-11-26).** An example level, built by a script, that shows a keyboard platformer character made only of triggers (the Scratch blocks), since scripts come in v5. The character is a round blob in the style of the owner's reference picture: flat colours, no outline, dot eyes, a small smile, stubby legs. **Movement** runs on one trigger that fires every tick and adds velocity, since a trigger can't set one axis of a velocity alone. **All six feel mechanics fit**: variable jump height, apex control, jump buffering, coyote time, fall speed limiting, and corner correction (by the shape of its Surface, not by blocks). **Animation** draws every frame of every pose, for both directions, as its own shapes, and shows one at a time by opacity, picked by a number variable `pose`. The plan may change while building; what changes is written back here.

## What the owner asked (2026-11-26)

- An example level showing a platformer character controlled with the keyboard, made with the trigger blocks.
- The controller should be responsive, precise and forgiving: variable jump height, apex control, jump buffering, coyote time, fall speed limiting, collision correction.
- The art follows a reference picture of small cute monsters: flat bright colours, no outlines, round soft bodies, black dot eyes, tiny mouths, stubby legs. Vectors only.
- Nice animations: every frame drawn as separate vectors, shown by cycling opacity by the character's state and direction.

## What the engine allows (checked in the code, 2026-11-26)

These limits shape the whole design.

| Fact | Where | What it means here |
|---|---|---|
| Change value on Body › Velocity takes the whole vector; Set replaces both axes, Multiply scales both | [triggers-in-play.md](../architecture/triggers-in-play.md#actions) | Walking and jumping **add** velocity on one axis (`{x, 0}` or `{0, y}`) instead of setting it |
| A vector's amount can't be a variable | [core-model/triggers.md](../architecture/core-model/triggers.md#what-fix-10-changed-2026-11-25) | Speeds are typed numbers in the blocks; the build script writes them from one table of constants |
| Any BodyComponent field (Gravity scale, damping) can't change in play: `valueFixedInPlay` | [triggers-in-play.md](../architecture/triggers-in-play.md#actions) | Extra or reduced gravity is made by adding velocity every tick |
| The TransformComponent's Scale isn't changeable in play | `transformSchema.ts` | Facing left is drawn as its own frames (mirrored by the script), not flipped |
| Style › Opacity is changeable in play | `styleSchema.ts` | Frames are shown and hidden by opacity |
| A check reads a body's live `velocityX` and `velocityY` | [core-model/triggers.md](../architecture/core-model/triggers.md#the-trigger) | Caps and the jump phases read the real speed |
| One check per trigger | [triggers.md](../requirements/triggers/triggers.md) | "A and B" is a trigger that checks A and fires a custom event; the trigger hearing it checks B. Custom events are heard in the same tick |
| "Every N s" counts whole ticks at 60 a second | `TriggerTimers.ts`, `secondsToTicks.ts` | "Every 0.0167 s" is every tick: the controller's heartbeat. To confirm while building |
| A shape with no Surface under a touch trigger becomes a sensor in play | [triggers-in-play.md](../architecture/triggers-in-play.md) | The feet are a thin sensor shape inside the character |
| At most 32 triggers setting off triggers in one tick | [triggers.md](../requirements/triggers/triggers.md#order-and-limits--v3) | Chains stay short; the heartbeat fans out to a few small chains |

## The level

- **Built by a TypeScript script** using the helpers the tests already use (`tests/levels/determinism/build/levelParts.ts`, `triggerParts.ts`). It writes `level.json` with `LevelWriter` and packs an `.editable` file with `ProjectFile`, which the owner imports or drops on the editor. Where the script and its output live is picked while building.
- **The script is the source**: every speed and time is a constant at the top, so tuning the feel is one edit and a rerun.
- **A short course that shows each mechanic**: flat ground to walk, a gap that needs coyote time, a high ledge that needs a full jump and a low ceiling where a short hop helps, a tall drop to show the fall speed limit, a ceiling corner to show the correction, and a few platforms at different heights. A sign-like shape near each part could hint what it shows (text comes in v7, so shapes only).
- **Look**: pale pastel background, rounded platforms in soft flat colours, a few small monster decorations in the reference's style standing around.
- **The camera follows the character.**
- Platforms carry the tag `ground`.

## The character's entities

```
Blob                    Dynamic body, Fixed rotation on, its solid shape, Friction 0
├── Feet                thin sensor under the collider; touch triggers count the ground
└── Art                 group of every frame, never collides
    ├── idle_r_1 … n    each frame: a group of curved paths, tagged frame and pose_<n>
    ├── run_r_1 … n
    ├── …               the same for the left side
```

- **The solid shape is a rectangle with cut corners** (an octagon), not a box. *Why: the cut top corners slide the blob past a ceiling edge it clips by a few pixels, and the cut bottom corners lift it onto a ledge it barely reaches. This is the collision correction, done by Box2D instead of by blocks.*
- **Friction 0 on the blob** so it never sticks to walls; stopping is done by the blocks.
- The art never collides: its shapes have no Surface and no touch trigger.

## Variables on the Blob

| Variable | Type | Job |
|---|---|---|
| `ground_contacts` | number | Ground entities the Feet touch now: touched adds 1, stops touching subtracts 1 |
| `grace` | number | Seconds of coyote time left: set to the full time each tick on the ground, counts down in the air |
| `buffer` | number | Seconds the last jump press is kept: set on press, counts down every tick |
| `jump_held` | boolean | Set by jump pressed and released |
| `move` | number | -1, 0 or 1, from left and right pressed and released |
| `facing` | number | 1 or -1, the last direction moved |
| `state` | number | idle, run, rise, apex, fall, land, as numbers |
| `frame`, `frame_time` | number | The animation's frame and the time to the next |
| `pose`, `pose_next` | number | The frame shown, worked out in `pose_next` and copied once, so the frame changes once per tick |

## Movement, every tick

The heartbeat trigger fires a short list of custom events on `this`, in this order. Each is one or two small triggers.

1. **Ground and coyote time.** If `ground_contacts` is at least 1, set `grace` to 0.1 s; else subtract 1/60 from it.
2. **Jump buffering.** Subtract 1/60 from `buffer`. Jump pressed sets `buffer` to 0.12 s.
3. **Jump.** If `buffer` is more than 0, fire `try_jump`; it checks `grace` is more than 0, then adds `{0, -jump speed}` to the velocity and sets `buffer` and `grace` to 0. So a press just before landing jumps on landing, and one just after leaving a ledge still jumps.
4. **Walking.** If `move` is 1 and `velocityX` is below the top speed, add `{acceleration, 0}`; the same leftwards. In the air the acceleration is smaller.
5. **Stopping.** If `move` is 0, add `{±deceleration, 0}` against `velocityX` while it is above one step; on the ground, when it is under one step, multiply the velocity by 0 (the y is already 0 there, so nothing is lost).
6. **Variable jump height.** While rising (`velocityY` below 0) and `jump_held` is false, add extra gravity `{0, cut}` each tick, so releasing early makes a short hop.
7. **Apex control.** While `velocityY` is near 0 in the air and `jump_held` is true, add `{0, -part of gravity}`, so the top of the jump floats a little; the air acceleration is a bit higher there too.
8. **Falling.** While falling, add a little extra gravity for a snappier fall, and when `velocityY` passes the fall speed limit, add `{0, -gravity per tick}`, which holds it at the limit.

Known costs:

- **The top speed jitters by one acceleration step**, since the blocks can only add, not clamp. The step is small (about 1/10 of top speed), so it should not show.
- **A coyote jump is a little weaker**, since the jump adds to a velocity already falling for up to 0.1 s (about 1 m/s). If it shows, the jump trigger first adds back that fall with a check on `velocityY`.
- **Turning around is not instant**: it passes through the deceleration. A turn boost (larger acceleration against the motion) fixes it if it feels slow.

## Animation

- **States**: idle (breathing, 4 frames), run (6 frames, legs and a bounce), rise (1 frame, stretched), apex (1 frame), fall (2 frames, arms up), land (2 frames, squashed, played once). Each for right and left: about 32 frames.
- **Each frame is a group of filled curved paths** (body, legs, eyes, mouth, cheeks), drawn by the script from a few parameters (squash, leg angles, eye height), so every frame stays on model. Left frames are the right ones mirrored by the script.
- **Each frame's shapes share the tags `frame` and `pose_<n>`.** One trigger per frame: "when `pose` becomes `n`: set Style › Opacity of every entity tagged `frame` to 0, then of every entity tagged `pose_<n>` to 1". Both happen in the same tick, so no frame flickers.
- **The state is picked each tick** from the ground, `velocityY` and `move`; the frame advances by `frame_time` at each state's own speed (run faster with speed is a nice extra, if cheap); `pose_next` is the state's first frame number plus `frame`, plus the left-side offset when `facing` is -1, then copied into `pose`.
- **Squash and stretch** come from the frames themselves: rise is tall and thin, land is short and wide.

## How it is checked

- The script's level loads with `LevelReader` with no problems, and `triggerProblems` is empty for every trigger.
- A headless run with recorded inputs (as the determinism tests do) checks: a full jump reaches the planned height, a tap gives a short hop, a jump pressed a few ticks before landing fires on landing, a jump a few ticks after leaving a ledge works, the fall speed holds at the limit, and `pose` follows the state.
- Then the owner plays it in the editor; the constants are tuned from that.

## Open questions for the owner

1. **Controls**: arrows and A/D to move, Space, W and Up to jump. Fine?
2. **Colour of the hero**: teal blue like the first monster in the reference, or another?
3. **Where it lives**: Claude's pick is a folder of its own for example levels, with the built `.editable` committed beside the script so the owner can import it without running anything.
