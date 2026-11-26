# Example level: a platformer character

## TL;DR

**Built (2026-11-26), waiting for the owner to play it.** An example level, built by a script, that shows a keyboard platformer character made only of triggers (the Scratch blocks), since scripts come in v5. The file to import is [`examples/blob-platformer.editable`](../../examples/blob-platformer.editable); the script is in `tests/levels/examples/platformer/` (art in `art/`, the blocks in `controller/`, the test harness in `play/`). The character, the Blob, is a round sky-blue monster in the style of the owner's reference picture. **All six feel mechanics are in**: variable jump height, apex control, jump buffering, coyote time, fall speed limiting, and corner correction (by the shape of its Surface). **Speeds are exact** although a trigger can only add to a whole velocity: chains of halving steps set one axis. **Animation**: 40 frames (20 per direction), each its own shapes, one shown at a time by opacity. A headless test checks every mechanic; the level was also played in the editor. One engine bug turned up: [a shape a trigger moves is drawn in front](../bugs.md#a-shape-moved-by-a-trigger-is-drawn-in-front-of-everything-in-play-open-2026-11-26).

## What the owner asked (2026-11-26)

- An example level showing a platformer character controlled with the keyboard, made with the trigger blocks.
- The controller should be responsive, precise and forgiving: variable jump height, apex control, jump buffering, coyote time, fall speed limiting, collision correction.
- The art follows a reference picture of small cute monsters: flat bright colours, no outlines, round soft bodies, black dot eyes, tiny mouths, stubby legs. Vectors only.
- Nice animations: every frame drawn as separate vectors, shown by cycling opacity by the character's state and direction.
- The plan's three questions (controls, colour, where it lives) were answered with "ok, now create the level", so Claude's picks stand.

## Playing it

- **Import** `examples/blob-platformer.editable` (File › Import, or drop it on the editor), then Play.
- **Keys**: A, D or the arrows to move; Space, W or Up arrow to jump. Up has no keys of its own, so W and Up only jump.
- **The course, left to right**: flat ground to walk, stop and turn; a step; a wide gap with a pit (jump late off the edge: coyote time); a high ledge only a held jump reaches, under a low ceiling (its corners show the correction); a long drop (the fall speed limit); four stairs back up; a plateau with hurdles, floating platforms and a low tunnel where only short hops fit; the flower at the end, which wins.
- **Rebuilding**: `node tests/levels/examples/platformer/writePlatformer.ts`. Every speed and time is in `controller/platformerFeel.ts`.

## What the engine allows (checked in the code, 2026-11-26)

| Fact | Where | What it means here |
|---|---|---|
| Change value on Body › Velocity takes the whole vector; Set replaces both axes, Multiply scales both | [triggers-in-play.md](../architecture/triggers-in-play.md#actions) | Every velocity change **adds** on one axis (`{x, 0}` or `{0, y}`) |
| A vector's amount can't be a variable | [core-model/triggers.md](../architecture/core-model/triggers.md#what-fix-10-changed-2026-11-25) | Speeds are typed numbers, written by the script from `platformerFeel.ts` |
| Any BodyComponent field (Gravity scale, damping) can't change in play | [triggers-in-play.md](../architecture/triggers-in-play.md#actions) | Extra or reduced gravity is velocity added every tick |
| The TransformComponent's Scale isn't changeable in play | `transformSchema.ts` | Facing left has its own frames, mirrored by the script |
| One check per trigger | [triggers.md](../requirements/triggers/triggers.md) | "A and B" is a trigger that checks A and fires a custom event to a trigger that checks B |
| Events a trigger causes are heard in the next round of the same tick, up to 32 rounds | `TriggerPhase.ts` | The Blob's tick takes about 8 rounds |
| "Every 0.0167 s" is due every tick (timers count whole ticks at 60 a second) | `TriggerTimers.ts` | The heartbeat |
| Pressing a second key of an input already held is no press | [variables-and-inputs.md](../requirements/triggers/variables-and-inputs.md) | Holding Space and tapping W doesn't jump again |

## The Blob

```
Blob                    Dynamic body, Fixed rotation, an octagon Surface with Friction 0, tag player
├── Feet                40 by 10 px shape with no Surface: a sensor; counts the ground it touches
└── Art
    ├── Idle 1 right    each frame a group of filled paths, every path tagged blob_frame and blob_pose_<n>
    ├── …               poses 0 to 19 face right, 20 to 39 the same frames facing left
```

- **The Surface is an octagon** (62 by 74 px, corners cut by 12 px). *Why: the cut corners slide the blob past an edge it clips by a few pixels, which is the collision correction, done by Box2D instead of by blocks.*
- **Friction 0** so it never sticks to walls; stopping is done by the blocks. Platforms are tagged `ground`.
- **Variables** (own): `ground_contacts`, `on_ground`, `grace` (coyote seconds left), `buffer` (jump press seconds left), `jump_held`, `left_held`, `right_held`, `move`, `facing`, `was_in_air`, `land_time`, and the animation's `state`, `frame`, `frame_time`, `frame_count`, `frame_seconds`, `target_*`, `pose_next`, `pose`.

## Movement, every tick

202 triggers on the Blob, about half of them generated steps. In order:

1. **Heartbeat** (every tick, in this order): clear `on_ground` and `move`; fire `feet_down` if the Feet touch ground; `move` from the held keys; `facing` from `move`; count down `buffer`, `grace` and `land_time`; fire `move_phase`.
2. **Standing**: `feet_down` sets `on_ground` and refills `grace` (0.1 s), but only when not rising faster than 60 px/s, so the tick a jump starts doesn't count and give a second jump.
3. **Running**: on the ground or in the air, the pressed way adds its acceleration (80 or 44 px/s a tick) plus a turn boost (60) when moving the other way, then caps at 460 px/s. With no key, the ground takes 96 px/s a tick off, the air 16.
4. **Jumping**: a jump needs `buffer` (a press in the last 0.12 s) and `grace`. It first cancels any falling speed, so a coyote jump is as high as one from the ground, then adds 1,300 px/s upwards.
5. **Gravity shaping** (World gravity 30 m/s²): rising with jump released adds 110 px/s a tick (the short hop); near the top of a held jump half of gravity is taken away and steering is a little stronger; falling adds 22 px/s a tick, capped at 1,100 px/s.

**Exact speeds from adding**: a cap, a stop or a cancel is a chain of triggers, each checking the speed and adding a step half the size of the one before (`controller/velocitySteps.ts`), so the steps that run add up to the change needed, to within the last step. The top speed is exactly 460 px/s and stopping ends at exactly 0, with no wobble.

## Animation

- **Animations** (frames, seconds a frame): idle (8, 0.15, a slow breath and a blink), run (6, 0.07, legs and arms swinging, a bounce), rise (1, stretched), apex (1, arms out, legs tucked), fall (2, 0.1, arms up), land (2, 0.07, squashed, then played for 0.14 s after landing).
- **Each frame is drawn by the script** from a few numbers (squash, bob, lean, each leg's swing and lift, arms, eyes, mouth) in `art/blobAnimations.ts` and `art/blobArt.ts`, so every frame stays on model. The face sits towards the way the blob looks.
- **Picking**: after the movement, the Blob picks the animation from `on_ground`, `move`, `land_time` and the vertical speed; a new animation starts at its first frame; `pose_next` is the animation's first pose plus `frame`, plus 20 facing left, and is copied to `pose` in one change.
- **Showing**: one trigger per pose, "when `pose` becomes n: set the opacity of every entity tagged `blob_frame` to 0, then of every entity tagged `blob_pose_n` to 1", so the frame changes once a tick with no flicker.

## How it was checked

- `buildPlatformer.test.ts` (in `npm test`): every trigger has no problems; running reaches 460 px/s and stops dead; a held jump rises over 270 px and a tap under 140; a press 5 ticks before landing jumps on landing; a jump 5 ticks after leaving a ledge works and one 8 ticks after falls; falling stops at the limit; facing left shows the left frames; touching the flower wins.
- Played in the editor with Playwright: the level imports, plays with no errors, the camera follows, and the run and apex frames show.

## Changed from the plan

- **The friends don't bob.** A trigger moving a drawn group drew it in front of the blob, an engine bug now in [bugs.md](../bugs.md). They bob again once it is fixed.
- **No jitter at the top speed, coyote jumps at full height, quick turns**: the halving steps and the turn boost removed the three costs the plan listed.
- **20 frames a side**, not 16: idle got 8 frames for a slower breath with a blink.
