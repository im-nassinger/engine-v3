# Example level: the chase

## TL;DR

**Built (2026-11-27), waiting for the owner to play it.** A second example level, built by a script from the [example platformer](platformer.md)'s Blob: the Blob wakes in a forest at dusk with a monster, the Gloom, right behind it, and must run home before it is caught. The file to import is [`examples/blob-chase.editable`](../../examples/blob-chase.editable); the script is in `tests/levels/examples/chase/` (the course in `course/`, the art in `art/`, the monster in `monster/`, the headless player in `play/`). The look follows the owner's three reference pictures: a sunset sky with stars, layered purple forest, flat autumn trees. The Blob's art was redrawn for both levels. A headless test plays the whole course: a clean run wins with the monster's middle about 870 px behind, half a second late about 650, and standing still is caught in under three seconds.

## What the owner asked (2026-11-27)

- Use the uploaded level (the example platformer's file, unchanged) as an example and make a better level, now that the engine was updated.
- Choose the art style from three uploaded pictures: a sheet of flat geometric autumn trees, a purple layered forest, and a pixel dusk scene with a gradient sky, stars and a pier.
- Improve the character art.
- The level starts with the main character chased by a monster; reach the end before it gets you. The level should be beautiful.

## Playing it

- **Import** `examples/blob-chase.editable`, then Play. The keys are the platformer's: A, D or the arrows to move; Space, W or Up to jump.
- **Losing**: the Gloom touches the Blob, or the Blob falls in water or brambles. The end window offers Restart.
- **The course, left to right** (about 10,800 px, 24 s at full speed): the meadow and a fallen log; a stream to jump; a stump; a step up to the river bank; a bridge over the river with planks missing in the middle; a bramble ravine crossed on four branches; a forest ledge with a giant hollow tree, too low inside to jump; a log; steps down into a hollow with two rocks; a pond; the hill with the Blob's hut, where touching the lit doorway wins. Two friends wait by the door, and the sun sets behind the hut.
- **Rebuilding**: `node tests/levels/examples/chase/writeChase.ts`. The layout is `course/layout.ts`; the monster's speed, start and delay are at the top of `monster/addMonster.ts`.

## The Gloom

```
Gloom          Kinematic body, Fixed rotation, own variable frame
├── Jaws       280 by 300 px shape with no Surface over its jaws and chest: touching the Blob loses
└── Art        6 frames, each a group of paths tagged monster_frame and monster_pose_<n>
```

- **It glides through everything along a fixed path** (`MONSTER_FLOOR` in the layout, the height the Blob runs at). *Why: a Kinematic body ignores the course, so it never gets stuck, and a fixed path is the same every run, so the chase is fair and can be learned.*
- **The path is one trigger**: "when the level starts: wait 0.8 s, set Body › Velocity to …, wait …, set …", one velocity and one Wait per stretch, each a whole number of ticks, so it ends each stretch where the layout says.
- **455 px/s**, against the Blob's 460, starting at x −6,650, its head on screen, and waiting 0.8 s. *Why: the Blob can't pull away, so the monster stays at the left edge of the screen the whole run; a clean run keeps about 1.3 s to spare, a start half a second late about 0.8 s.*
- **Animation**: every 5 ticks `frame` goes up by one, back to 0 after 5; "when `frame` becomes n" shows frame n by opacity, as the Blob does. The body heaves, the claw reaches, the jaw snaps and the smoke trailing behind it waves.
- **Art** (redrawn twice on 2026-11-27, owner: the first looked unpolished, the teeth most of all; the second, an antlered beast, "doesn't look like anything, and it's not scary"): **a huge shadow wolf at full gallop**, head low and snarling, a tall ear and a shaggy ruff, a deep chest and tucked belly, a bushy tail fraying into smoke, and one burning eye under a heavy brow, with wrinkles along its snout. **The legs are built joint by joint**: each frame says where each paw is (planted on the ground or lifted), and the elbow or knee is found from the bones' lengths, so planted paws touch the ground and the gallop reaches, gathers and pushes off; the far legs, drawn darker, are a frame behind. **Each tooth stands on its jaw's edge**: its base follows the edge, its sides curve in to a point, a shaded half gives it depth, and its length is kept to the room between the jaws, so the two rows never cross; the long fangs are at the front. *Why a wolf: everyone reads it at once, it belongs in a forest at dusk, and a snarling wolf is scary without being anyone's existing character.*

## The Blob's new art (both levels)

- A gradient body, light at the top; a soft gloss on its head and a paler belly.
- Bigger eyes with two white glints each.
- A two-leaf sprout on its head, which sways back as it runs and flutters up as it falls.
- **Worried brows** while running, jumping and falling, with an open mouth at the top of a jump: it is always being chased now. Idle and landing keep the happy face.
- The front leg is drawn a shade deeper, so the legs read apart.

## The look

- **Sky**: the World's fill is a gradient from night at the top through dusk purple and rose to a peach horizon, with 150 stars, some of them four-pointed sparkles.
- **Layers, back to front**: hills, the far forest, the setting sun, the near forest (tall purple trunks with round lumpy crowns and arching branches, after the purple forest picture), fireflies, bushes, then the flat autumn trees after the tree sheet (round, capsule, flame, pine and cloud-pad shapes in amber, yellow, sage, olive, orange and rust).
- **The course**: dark plum soil under a gold grass edge, wooden planks and posts, mossy logs and stumps, stones, translucent water, thorny brambles with berries, and the hollow tree lit by glowing mushrooms.
- No outlines anywhere, as in the platformer.

## How it was checked

- `buildChase.test.ts` (in `npm test`): every trigger has no problems; a Blob that stays put loses within 3 s; a player that holds right and jumps at fixed take-off points (`play/runChase.ts`) wins, with the monster's middle never closer than 750 px and never further than 1,000, and no play warnings; starting half a second late still wins, by less; falling in the stream loses.
- Played in the editor with Playwright: the level imports in about 0.1 s, plays with the camera following, and the Blob's run frames and the monster's frames show.

## Decided under the standing yes (2026-11-27)

- **A new level, not a change to the platformer.** The platformer stays as the test of the controller's mechanics; the chase reuses its Blob, its controller and its inputs.
- **The pits are deadly** (water and brambles lose), instead of floors to climb out of. *Why: with the monster behind, a climb out would lose anyway, only later and less clearly.*
- **The Gloom doesn't follow the Blob's height**; it follows the course's. *Why: a check can't compare one entity's value with another's, and a fixed path is fairer.*
