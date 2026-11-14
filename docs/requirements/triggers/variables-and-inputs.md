# Variables and inputs

## TL;DR

Two lists on the World that triggers and scripts share. **Variables** are named values during play, such as `coins = 5`. **Inputs** are names such as `jump` with keys mapped to them. **v2:** variables (a number, a string or a boolean) with a starting value, raw keys, and inputs on the World's InputComponent, five of them in a new level. **v3:** variables kept between runs, gamepads, players remapping inputs, and scripts reading the mouse. Core rules: a variable is the one concept for level values (it replaces "data" and "saved data"), and players can remap inputs but not raw keys.

## Variables

### Variables on the World · v2

- The World has a **VariablesComponent** listing each variable: a name and a starting value. Example: `coins = 0`.
- **Each variable has one type, picked when you create it: number, string or boolean.** Example: `coins = 0`, `player_name = "Ada"`, `door_open = false`. *Why: the owner wants text in v2 (owner: 2026-11-13), and named the three types (owner: 2026-11-14).*
- **What a trigger can do with each type:**
  - **number:** Change value sets, adds or subtracts. An If compares it, such as "If coins is 10 or more".
  - **string:** Change value only sets it. An If only checks "is" or "is not".
  - **boolean:** Change value sets it or **flips** it: true becomes false, false becomes true. An If only checks "is" or "is not", such as "If lamp_on is true". Example: a light switch is one trigger, "When something starts touching this, Flip lamp_on". *Why: with only Set, a switch needs two triggers that both fire on the same touch and undo each other (owner: 2026-11-14).*
  - *Why: adding 1 to a string or asking whether a boolean is "10 or more" means nothing.*
- Triggers and scripts read and change variables. A trigger changes one with Change value: set, add, subtract or flip, as its type allows.
- A trigger can react to a variable with the event "a variable changes", and check one in an If.
- Restarting the level puts every variable back to its starting value.
- *Why: variables replace the older "data" and "saved data", which were two concepts for one thing. A score needs one.*

Source: scope VA1; round 2: O2; round 4: T2; round 5: T5; round 9: 09 2.4b; owner: 2026-11-13; owner: 2026-11-14

### Keep between runs · v3

- Each variable has a **Keep between runs** checkbox. A kept variable saves its value in the browser for that level, and the next run starts from the saved value.
- The VariablesComponent has a **Reset kept values** button. *Why: it lets you test from a clean start.*
- Test play and playing use the same saved value.
- *Why v3: it is for best times and unlocks, which matter once other people try your levels.*

Source: scope VA2; round 2: O2; round 11: KV1

## Keys

### Raw keys and inputs · v2

- A key event can use a **raw key** ("When the Space key is pressed") or an **input** ("When the jump input is pressed").
- An input is a name plus its keys, listed on the World's **InputComponent**. Example: `jump` on Space and W.
- **A new level starts with five inputs:** `left` (A, Left arrow), `right` (D, Right arrow), `up` (W, Up arrow), `down` (S, Down arrow) and `jump` (Space). They can be renamed or deleted. *Why: most games need these five, and the builtin player works at once (owner: 2026-11-13).*
- Both kinds fire on press, on release, or while held. A press shorter than one tick still counts as one press.
- Scripts get the same two: `is_down("jump")` and `is_key_down("Space")`.
- **Players can remap inputs but not raw keys**, so the editor suggests an input when a trigger uses a raw key.
- *Why both: the owner wanted both. A raw key is quickest for a test, and an input is what lets players remap and use a gamepad. "Input", not "action", because trigger actions already use that word.*
- Two keys on one input: the input stays held until both are up.
- Keys are matched by their place on the keyboard, so W, A, S, D stay together on other layouts.
- **Tab is taken by the game** for the pause menu, so levels can't use it. **Browser keys never reach the game.** Esc only leaves full screen.
- While the game has the keyboard, keys it uses don't scroll the page.
- A key that confirmed a menu doesn't reach the game until it is released and pressed again.
- An unknown input name reads as not held and puts one warning in the Console.
- *Why v2: the builtin player uses inputs, and remapping later needs them.*

Source: scope IN1; round 10: IN1; round 12: PM1, MS2; old: PL-64 to PL-73; owner: 2026-11-13

### Gamepads · v3

- Each input also lists gamepad buttons. Gamepads work through them.
- A stick counts as pressed past half its travel.

Source: scope IN2; round 3: D71; round 10: 11 2.12; old: PL-79

### Players remap inputs · v3

- Players remap a level's inputs in the pause menu's Controls page.
- Assigning a key already in use swaps the two. Keys the game keeps for itself are refused with a reason. One button resets to the level's own keys.
- *Why v3: until other people try your levels, you know your own keys.*

Source: scope IN3; round 10: 11 2.12; old: PL-76, PL-77

### Scripts read the mouse · v3

- Scripts read where the mouse is and whether its left, right or middle button is held: `is_mouse_down("left")`, `mouse_position()`, `mouse_screen_position()`.
- Two functions convert positions: `level_to_screen(x, y)` and `screen_to_level(x, y)`.
- **The game never locks or hides the mouse pointer.**
- *"Button" means the mouse's own buttons. "Level", not "world", because World is the top entity.*
- *Why v3: it goes with the mouse events.*

Source: scope IN4; round 3: D70; round 10: 11 2.11; round 11: MS1; round 12: MS2; old: PL-69, PL-74

## Small features

Small features from the old draft and review that the scope review never asked about. The owner gave each its version in round 7 of the architecture review.

| Feature | Rule | Version |
|---|---|---|
| Keys that can't be bound | Esc, Tab, Ctrl, Alt and Cmd in any combination, F1 to F12, Caps Lock, Num Lock | v2 |
| Menus without a mouse | Every built-in menu works with the keyboard, and later a gamepad | v3 |
| Touch controls | On-screen controls mapped to inputs | Later |

Source: old: PL-65, PL-72, PL-80, PL-81; owner: 2026-11-14
