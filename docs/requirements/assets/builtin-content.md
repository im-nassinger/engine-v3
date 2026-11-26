# Assets: builtin content

## TL;DR

What comes with the game, in the read-only `builtin` folder: plain `.lua` and `.entity` files, with no private powers. **v8:** one platformer player and its script, built from coloured shapes. **Later:** the rest of the library (platforms, enemies, hazards, pickups, gadgets, projectiles, physics toys, the ragdoll), the other builtin scripts, and Kenney art. The Later lists below are a starting design carried over from the old draft: the review accepted the categories, not each entry. Core rule: **a creator must be able to rebuild anything builtin using only what they have.**

## The builtin folder

### Plain files, no private powers · v8

- **There is no "behaviour".** A ready-made script is a plain `.lua` file in the read-only `builtin` folder. You drag one onto an entity's ScriptComponent.
- Builtin entities are plain `.entity` files in the same folder. A builtin `.entity` file can hold scripts and art like any other.
- **The game has no built-in player.** A player is an ordinary group of entities with a body and a script, tagged `player`.
- **Builtin content has no private powers.** If it needs something a creator doesn't have, the Lua API grows for everyone. The test: rebuild the builtin player in an empty level using only what a creator has, and compare it with the builtin one.
- Builtin files can be opened and read, so they work as examples.
- **Builtin files never change once released.** A new version is a new file. *Why: a game update must never change how an existing level plays.*
- The folder shows the licence and author of each file.
- *Why v8: it comes with the builtin folder.*

Source: round 1: C13, C15; round 2: R9; round 5: 04 2.5; old: PP-35, PP-38, AS-38, AS-40; owner: 2026-11-13

## v8 content

### The builtin platformer player · v8

- One `.entity` file: a group tagged `player`, with a Dynamic body with Fixed rotation, a shape to collide with, a narrower sensor at its feet to detect ground, and the builtin platformer script.
- In v8 it is drawn with coloured shapes, because images come Later.
- It reads the inputs `left`, `right`, `down` and `jump`, which a new level defines on the World's InputComponent.
- The camera follows it through the camera's own follow setting. Nothing is connected in a hidden way.
- *Why: it proves a creator can build a player with only what they have, and it is the fastest way to test a level. Why v8: it is a script in an `.entity` file, and `.entity` files come in v8 (owner: 2026-11-20).*

Source: scope EF4; round 1: C15; round 7: 08 2.4, 08 2.12; old: PP-33; owner: 2026-11-13

### The builtin platformer script · v8

Run, jump, double jump, ledge grace time and slopes.

- **The jump is set by height and time to the top**, not by forces. The script works out the take-off speed and sets the body's gravity scale so the player reaches that height in that time. It raises gravity scale while falling.
- **On the ground** means: the feet sensor touches a solid surface that isn't part of the player, the player isn't rising, and the surface is no steeper than Max slope angle. Sensors never count as ground.
- **Ledge grace time:** you can still jump for a moment after running off an edge. **Jump buffer:** a press just before landing jumps on landing.
- **Variable jump:** a tap gives a short hop, a held press the full height.
- **Double jump:** air jumps refill on landing.
- **Slopes:** up to Max slope angle the player runs along the surface at Run speed and stands still with no input. Steeper surfaces act as walls.
- Run speed is measured against the surface under the player, so a player on a moving platform moves with it and can walk on it.
- The script assumes gravity points down.
- All defaults are starting values for playtesting.
- One setting comes Later, when one-way platforms arrive: Drop through one-way (Down plus Jump), on by default.

| Setting | Range | Default |
|---|---|---|
| Run speed | 0 to 15 m/s | 4 |
| Acceleration | 0 to 100 m/s² | 30 |
| Deceleration | 0 to 100 m/s² | 36 |
| Air control | 0 to 100% | 65 |
| Jump height | 0 to 10 m | 1.75 |
| Time to the top | 0.1 to 1.5 s | 0.38 |
| Short hop height | 0 to Jump height | 60 |
| Air jumps | 0 to 5 | 0 |
| Air jump height | 0 to 10 m | 1.4 |
| Ledge grace time | 0 to 0.5 s | 0.1 |
| Jump buffer | 0 to 0.5 s | 0.1 |
| Feet | An entity | The feet sensor |
| Max slope angle | 0 to 80° | 50 |
| Fall gravity multiplier | 1 to 5 | 1.6 |
| Max fall speed | 1 to 30 m/s | 11 |
| Half gravity near the top while jump is held | On or off | On |
| Stick to slopes | On or off | On |
| Keep platform speed on jump | On or off | On |
| Left, Right, Down, Jump | An input each | `left`, `right`, `down`, `jump` |

- *Why v8: it is the builtin player's script.*

Source: scope EF4; round 3: P1; round 7: 08 2.7; decisions: D6; old: PP-46 to PP-56; owner: 2026-11-13

## Later content

### The rest of the builtin .entity files · Later

| Kind | Files | Made of |
|---|---|---|
| Players | Top-down player, Buggy | A circle with the top-down script. A car with motor joints |
| Enemies | Walker, Drifter, Turret | Patrols, flies after the player, shoots bolts |
| Hazards | Spikes, Saw, Kill Zone | A sensor with a trigger. A spinning Kinematic circle. A big invisible sensor |
| Pickups | Coin, Heart | A sensor with a trigger |
| Platforms | Ground Block, One-Way Platform, Moving Platform, Falling Platform | Static shapes, a Kinematic body on a path |
| Gadgets | Key and Door, Goal, Spring | Triggers and custom events |
| Projectiles | Bolt | A Dynamic sensor with Bullet on |
| Physics toys | Crate, Ragdoll | A Dynamic box. Limbs on hinges with limits |

- The art is from Kenney's free packs, the hero included. No original hero art is made. *Why: Kenney art is free to use (CC0), so it needs no trademark check of our own.*
- The builtin entities use four tags in the collision grid, so players and enemies pass through each other and touching is detected by sensors: `player`, `enemy`, `zone` (pickups, hazards), `shot`.
- There is no builtin checkpoint, see [rejected.md](../../rejected.md).

Source: scope EF5; round 1: D32, D61; round 7: 08 2.4, 08 2.12; round 8: CT1; old: PP-33, PP-34

### The rest of the builtin scripts · Later

Scripts for movement, enemies, health, pickups, the camera and showing variables. Lengths are metres, speeds m/s, times seconds.

| Script | What it does | Main settings |
|---|---|---|
| Top-down | Free movement with no gravity | Max speed 300, Acceleration 2400, 4 or 8 directions |
| Vehicle drive | Drives motor joints from inputs | Motor joints, Drive speed 900 °/s, Motor torque 400 |
| Move Along Path | Moves a Kinematic body along a path drawn on another entity | Path, Speed 150, Ping-pong, Loop or Once, Pause at ends 0.5 |
| Rotate | Constant spin | Speed 90 °/s |
| Patrol | Walks back and forth | Speed 120, Turn at walls, Turn at ledges |
| Chase | Moves toward an entity with a tag | Tag `player`, Walk or Fly, Speed 2 m/s, Detect range 5 m |
| Health | Holds health for its entity | Max health 3, Safe time after a hit 1 |
| Damage | Hurts tagged entities on contact | Amount 1, Affects tag `player` |
| Stomp | Lets a falling player defeat this entity | Bounce speed 600 |
| Pickup | Adds to a variable and disappears when touched | Variable `coins`, Amount 1 |
| Shooter | Spawns projectiles | `.entity` file, Shot speed 800, Cooldown 0.5 |
| Camera follow | Makes the camera follow this entity at level start | None |
| Auto destroy | Removes its entity after a time or outside the level | After, Outside level bounds |
| Collapse | A platform that falls after being stood on | Delay 0.5, Reset after 3 |
| Show Variable | Shows a variable in this entity's text | Variable, Format such as `Coins: {}` |

- **Moving platforms** are Kinematic bodies with Move Along Path. Riders move along. A path never collides, and scripts can read its points.
- **Showing a variable on screen with no code:** a text entity plus Show Variable.
- Builtin scripts talk to each other through custom events fired on an entity, such as `damage` with an amount. The entity that receives it decides what happens: a crate with no Health script ignores `damage`. Like every custom event, it also reaches the entities inside the one it is fired on.
- **Builtin scripts share three custom events: `damage`, `heal` and `died`.** `damage` and `heal` carry an amount. The Health script fires `died` on its own entity at zero, so a trigger there can Destroy or Lose. Each builtin script's help lists the events it fires and hears. *Why: these are the ones the builtin scripts need. More come only when a builtin file needs one.*
- A kinematic platform can push a player into a wall. There is no crush rule.

Source: scope EF6; round 1: D58; round 2: R2; round 7: 08 2.6, 08 2.8; round 9: MSG2; old: PP-45, PP-57 to PP-71; owner: 2026-11-13

## Small features

Small features from the old draft and review that the scope review never asked about. The owner gave each its version in round 7 of the architecture review.

| Feature | Rule | Version |
|---|---|---|
| Character animation script | Played animations from movement states. It needs animations, which are not designed yet | Later |
| What a script needs | The old draft let a script declare needs such as "a Dynamic body", shown as a checklist with Fix buttons. The partner note on a card covers the same ground | Later |

Source: old: PP-42, PP-55, PP-70; owner: 2026-11-14
