# Test play

## TL;DR

Pressing Play in the editor, and what a run is. **v1:** Play runs a copy of the level and hides the panels, the Play bar offers Stop, Pause and Step, switching tabs pauses, the game always runs 60 ticks per second, and the determinism test. **v2:** the Panels button with live values, a run that is playing, won or lost and ends in one end window, Tab opening the pause menu with Resume and Restart, and the random seed. **v3:** the pause menu's Controls and Settings pages, the speed menu, pinning the seed, more View menu switches, full screen, a slower game for players, and what players see outside the editor. Core rules: test play never changes the level, there is no special player, and the game decides nothing the creator should.

Keys, inputs and remapping are in [variables and inputs](../triggers/variables-and-inputs.md). The Console and debugging are in [the code editor and the Console](../scripts/code-editor-and-console.md).

## Play and Stop

### Play and Stop · v1

- **Play runs a copy of the level. Stop throws the copy away.** The level and the undo history are never touched.
- Ctrl+Enter starts and stops, also from inside the code editor. F5 is left to the browser's reload.
- Play first commits anything half-typed, such as an open field or text in the code editor, so the run matches what you see. Play is ignored in the middle of a drag or while a dialog is open.
- **Play starts as fast as possible**, with no fixed number. *Why: the owner's rule. It should start as soon as you hit Play.* Stop during loading cancels the start.
- **Play hides every panel**, so the game looks as it will for players. A small **Play bar** stays, with Stop, Pause, Step and (from v2) Panels. A coloured frame and a PLAYING or PAUSED label sit on the Play bar, and the browser tab title says the game is running. *Why: the game should look like the real thing, but debugging needs the panels somewhere.*
- **You can't edit the level during play.** Trying shows a "Stop to edit" hint. Nothing you try is silently lost.
- Editor-only drawing (handles, the camera frame, joint icons) is hidden during play, unless a View menu switch shows it.
- **Stop is instant** and puts the editor back exactly as it was: the view, the tool, the group you were inside and the panels.
- A run holds no unsaved work. Closing or reloading the page during a run loses the run and nothing else.
- *Why v1: the core of the game.*

Source: scope PL1; round 1: C18, D13; round 9: 11 2.1, 11 2.2, 11 2.3; round 10: UI1; old: PL-01, PL-02, PL-05, PL-06, PL-10, PL-11, PL-14, PL-15, PL-17, PL-18

### Pause and Step · v1

- A **Pause** button on the Play bar freezes the game. While paused, a **Step** button moves it forward one tick. F8 pauses and resumes, F9 steps.
- *Why: to watch a jump or a collision tick by tick.*
- Test play only. Players never get Pause or Step, only the pause menu.
- While paused no tick runs: scripts, `wait`, timers and triggers are frozen. Drawing and the panels keep working.
- Inputs held during a Step count for that tick, so "hold right, press Step" works.
- Step is off once a run has ended.

Source: round 10: PS1; round 11: DB2; old: PL-19, PL-21, PL-22

### The Panels button and live values · v2

- Panels stay hidden during play until you press **Panels** on the Play bar. Then the Inspector, the Layers panel and the Console come back, read-only.
- The Inspector and the Layers panel show **live values** from the run. Spawned entities appear in the Layers panel, and destroyed ones leave it.
- A script error opens the Console by itself.
- **After Stop, the Console keeps the run's lines.** *Why: you often don't need Panels at all.*
- *Why hidden by default: play should look like the real thing.*
- *Why v2: Panels also brings back the Console, which comes with scripts. Pause and Step are enough to watch physics.*

Source: round 10: UI1, 11 2.8; round 11: PN1, DB2; old: PL-51, PL-52, PL-53; owner: 2026-11-13

### When something goes wrong in a run · v1

- A script error stops only that script, and test play pauses at the first error. The rules are in [scripts](../scripts/scripts.md).
- **The game runs separately from the editor.** If the game stops responding or crashes, the run ends with a message, and you are one click from the editor with the level exactly as it was.
- A missing file doesn't stop a run. The run continues without it, and the Console shows a warning.
- A chain of triggers that hits its limit stops for that tick with a warning, see [triggers](../triggers/triggers.md).

Source: round 1: D30; round 10: LP1, 11 2.9; old: PL-57, PL-58, PL-61, PL-62

## How a run ends

### Win and Lose: the end window · v2

- **A run is playing, won or lost.** The Win and Lose actions, or the same functions in a script, end it.
- Won and lost show **the same end window** with a different title, the time, and two buttons: **Restart** and **Leave**. In test play, Leave goes back to the editor.
- *Why keep won and lost apart: it costs nothing now and later features need it, such as levels that must be beaten before publishing, and completion counts. Only the title differs.*
- **A level can't replace or hide the end window.** *Why: there is one built-in end window that always lets the player leave.* For a custom ending, build it in the level and call Win when it finishes.
- When a run ends, the current tick finishes and no more ticks run. The last frame stays behind the end window.
- The first Win or Lose in a run decides. Later ones are ignored with a Console warning.
- **A level doesn't need a goal.** Without Win or Lose it runs until the player leaves. Scripts can't make the player leave: leaving is always the player's own action.
- **The game has no lives, health or death.** How a level handles falling and lives is up to its creator. The game only removes entities that are fully past an open edge of the level bounds. *Why: the game shouldn't decide how a level handles lives.*
- *Why: ending is what makes a level a level. Why v2: only triggers and scripts end a run.*

Source: scope PL2; round 3: D74; round 4: LS1; round 10: 11 2.16; old: PL-96 to PL-100, PL-106, PL-115, PL-116; owner: 2026-11-13

### The pause menu · v2

- **Tab opens and closes the pause menu.** While it is open, **R restarts** the level. In v2 the menu has Resume and Restart.
- **Esc only leaves full screen**, and never reaches the game. *Why Tab: Esc is what browsers use to leave full screen, so it shouldn't also open the menu.*
- **There is no restart key outside the menu**, and new levels get no restart input or trigger. *Why: the owner's rule that restarting goes through the pause menu.*
- The menu belongs to the game. Levels can't change it, draw over it or hide it, so a stuck player always has a way out. Nothing runs while it is open.
- Restart needs no confirmation.
- **Restart throws the run away and starts a new one**, as fast as possible: every entity, physics, scripts, waits, timers, variables, sounds, the camera and the level's time start fresh.
- Restart keeps what isn't part of the run: variables with Keep between runs, the player's settings, the test settings (speed, View menu switches, pinned seed) and the Console's lines.
- *Why: restarting goes through it. Why v2: in v1 a run never ends by itself, and in test play Stop then Play already starts again.*

Source: scope PL3; round 10: 11 2.13; round 11: RS2; round 12: PM1; old: PL-34, PL-36, PL-37, PL-82, PL-84, PL-86; owner: 2026-11-13

### The pause menu's Controls and Settings pages · v3

- **Controls:** players remap the level's inputs, see [variables and inputs](../triggers/variables-and-inputs.md).
- **Settings:** one Volume slider and Mute, the setting that slows the game for a player, and full screen.
- The menu also gets **Quit**, for playing outside the editor.
- Settings are remembered in the browser.
- *Why v3: it comes with remapping and sound.*

Source: scope PL4; round 10: 11 2.13, 11 2.21; old: PL-76, PL-82, PL-85

## Time, focus and determinism

### 60 ticks per second and the level's time · v1

- **The game always runs 60 ticks per second**, on every screen. Drawing follows the screen, so a 144 Hz monitor is smooth and a 30 Hz one plays at the same speed.
- **A slow computer slows the game down rather than skipping ahead.**
- A built-in timer counts the level's time in ticks from the start of the run. Scripts can read it, and the end window shows it as minutes, seconds and hundredths.
- Pausing, switching tabs and a slow computer add nothing to the level's time, because no tick runs.
- Screen size never changes what happens in a run, only what is seen.
- Teleports, spawns and restarts snap into place, with no streak across the screen.

Source: round 10: 11 2.18, 11 2.20; old: PL-118 to PL-121, PL-132 to PL-135

### Switching tabs pauses the game · v1

- **Switching browser tabs pauses the game**, always.
- **Keys never stay stuck down:** every input is released when the game loses the keyboard.
- For players, clicking outside the game also pauses it, and the pause menu opens and waits. The game never resumes by itself.
- In test play, clicking a panel keeps the game running with its inputs released, so you can watch it while reading values.
- Resizing the window never pauses or changes a run.
- *Why: otherwise a key held while switching tabs keeps the player running. Why v1: it is small, and a hidden tab must add nothing to a run. Stuck keys matter from v2, when the game reads keys.*

Source: scope PL5; round 10: 11 2.19; old: PL-122 to PL-128; owner: 2026-11-13

### The random seed · v2

- Every run has a **seed**, the number all its random values come from. Each run gets a new seed, restarts included.
- *Why a new seed: a level with random values shouldn't replay the same way on every attempt.*
- *Why v2: only scripts make random values.*

Source: round 3: D73; old: PL-38; owner: 2026-11-13

### Pin the seed · v3

- The Play bar menu shows the run's seed and can **pin** it, so later runs use the same one until it is unpinned.
- The pinned seed is a test setting, stored in the browser, not in the level. *Why: the seed is a testing tool. In the level file, an exported level would carry your debug setting.*
- *Why v3: it only matters once levels use random values and you chase a bug in one run.*

Source: scope PL7; round 3: D73; round 4: SD1; old: PL-39

### The determinism test · v1

- **Determinism is a requirement with a test: the same level, seed, inputs and clock time give the same run on any computer.**
- What makes it hold: every random value comes from one seed, Box2D v3 gives the same result everywhere, and triggers and scripts run in Layers panel order.
- **Scripts may read the real date and time.** The test fixes the clock the same way it fixes the seed. Timing during play should still use the level's time. *Why: the owner's rule that reading the clock is fine. Fixing it in the test keeps determinism without blocking anything.*
- Pausing, the speed menu and a player slowing the game change no tick, so they can't break it.
- *Why v1: it is far cheaper to keep determinism from the first day than to find what broke it later. The test catches the moment something breaks it.*

Source: scope PL11; round 5: SD2; round 10: SB1; round 11: CL1; old: PL-127

## Test tools

### The speed menu · v3

- A speed menu on the Play bar: ¼×, ½×, 1×, 2×.
- **It only changes how fast you watch.** Every tick is the same at any speed, and the level's time is the same.
- It is not the World's Game speed, which is part of the level and which scripts can see, see [the World](../physics/world.md).
- *Why v3: Pause and Step already cover watching closely.*

Source: scope PL6; round 3: D69; round 10: PS2; old: PL-23, PL-25

### View menu switches during play · v3

- The Play bar has the View menu too. Its switches can be on several at once.
- The physics view is already in v1, see [bodies](../physics/bodies.md). v3 adds **highlighting triggers as they fire** and **performance numbers**.
- None of them ever show to players.
- *Why the View menu: it already holds this kind of switch, so no second place is needed. Why v3: debug comfort.*

Source: scope PL8; round 8: VW1; round 10: 11 2.7; old: PL-44, PL-47, PL-50

### A full screen button · v3

- A button makes the game fill the screen. A level can't start full screen itself, because browsers only allow it from a click.
- Esc leaves full screen, and does nothing else.
- *Why v3: not needed to test.*

Source: scope PL9; round 10: 11 2.20; round 12: PM1; old: PL-129

### Players can slow the game · v3

- A player setting in the pause menu slows the game to between 50% and 100%.
- It changes how fast the player watches, never a tick, so the level's time on the end window is unchanged.
- **There is no reduced motion setting for now.** *Why: the owner's choice.*
- *Why v3: an accessibility setting for when other people try your levels.*

Source: scope PL10; round 3: D75; round 10: 11 2.21; old: PL-139

## For players

### Playing outside the editor · v3

Players arrive with the play file, see [saving](saving.md). What differs from test play:

- **There is no title card.** Players see a loading screen until the level is loaded, then the level starts. *Why: the owner's choice. The game decides nothing the creator should.*
- No Play bar, no panels and no debug views.
- When a script stops, players only see a small notice, never the script's details.
- Clicking outside the game pauses it.

Source: scope SA4; round 3: D68; round 10: 11 2.9, 11 2.14, 11 2.19; old: PL-63, PL-88

## Small features

Small features from the old draft and review that the scope review never asked about. The owner gave each its version in round 7 of the architecture review.

| Feature | Rule | Version |
|---|---|---|
| Selecting on the game while paused | While paused, clicking the game selects an entity for the live Inspector. The review accepted "inspect things while paused" without a version | v2 |
| Selection carried back on Stop | If the entities selected during the run exist in the level, they stay selected after Stop | v2 |
| A destroyed selection | If the selected entity is destroyed, the Inspector says so and greys its last values | v2 |
| Panels after a run ends | The panels and the View menu switches still work on a run that was won or lost | v2 |
| Mute in test play | A mute switch on the Play bar that doesn't change the player's volume | v3 |
| Free view | Pan and zoom the game during test play without moving the level's camera | v3 |
| Preview size | Show the run as a 16:9, 21:9 or 4:3 window would see it. Only matters with Fill window | v3 |
| Performance warnings | A note on the Play bar when the game can't keep 60 ticks per second | v3 |
| End window extras | The old draft's end window also had the creator's own win and lose text, a score taken from a variable, the best time and an attempt count. The review kept a title, the time, Restart and Leave | Later |
| Retry instantly | A level setting that skips the end window after Lose and restarts at once | Later |

Source: old: PL-07, PL-08, PL-26, PL-45, PL-46, PL-48, PL-49, PL-54, PL-102 to PL-105, PL-109, PL-112; owner: 2026-11-14
