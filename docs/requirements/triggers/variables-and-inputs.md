# Variables and inputs

## TL;DR

Two lists on the World that triggers and scripts share. **Variables** are named values during play, such as `coins = 5`. **Inputs** are names such as `jump` with keys mapped to them. **v1:** variables with a starting value, raw keys, and inputs on the World's InputComponent. **v2:** variables kept between runs, gamepads, players remapping inputs, and scripts reading the mouse. Core rules: a variable is the one concept for level values (it replaces "data" and "saved data"), and players can remap inputs but not raw keys.

## Variables

### Variables on the World · v1

- The World has a **VariablesComponent** listing each variable: a name and a starting value. Example: `coins = 0`.
- Triggers and scripts read and change variables. A trigger changes one with Change value: set, add or subtract.
- A trigger can react to a variable with the event "a variable changes", and check one in an If.
- Restarting the level puts every variable back to its starting value.
- *Why: variables replace the older "data" and "saved data", which were two concepts for one thing. A score needs one.*

Source: scope VA1; round 2: O2; round 4: T2; round 5: T5; round 9: 09 2.4b

### Keep between runs · v2

- Each variable has a **Keep between runs** checkbox. A kept variable saves its value in the browser for that level, and the next run starts from the saved value.
- The VariablesComponent has a **Reset kept values** button. *Why: it lets you test from a clean start.*
- Test play and playing use the same saved value.
- *Why v2: it is for best times and unlocks, which matter once other people try your levels.*

Source: scope VA2; round 2: O2; round 11: KV1

## Keys

### Raw keys and inputs · v1

- A key event can use a **raw key** ("When the Space key is pressed") or an **input** ("When the jump input is pressed").
- An input is a name plus its keys, listed on the World's **InputComponent**. Example: `jump` on Space and W.
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
- *Why v1: the builtin player uses inputs, and remapping later needs them.*

Source: scope IN1; round 10: IN1; round 12: PM1, MS2; old: PL-64 to PL-73

### Gamepads · v2

- Each input also lists gamepad buttons. Gamepads work through them.
- A stick counts as pressed past half its travel.

Source: scope IN2; round 3: D71; round 10: 11 2.12; old: PL-79

### Players remap inputs · v2

- Players remap a level's inputs in the pause menu's Controls page.
- Assigning a key already in use swaps the two. Keys the game keeps for itself are refused with a reason. One button resets to the level's own keys.
- *Why v2: until other people try your levels, you know your own keys.*

Source: scope IN3; round 10: 11 2.12; old: PL-76, PL-77

### Scripts read the mouse · v2

- Scripts read where the mouse is and whether its left, right or middle button is held: `is_mouse_down("left")`, `mouse_position()`, `mouse_screen_position()`.
- Two functions convert positions: `level_to_screen(x, y)` and `screen_to_level(x, y)`.
- **The game never locks or hides the mouse pointer.**
- *"Button" means the mouse's own buttons. "Level", not "world", because World is the top entity.*
- *Why v2: it goes with the mouse events.*

Source: scope IN4; round 3: D70; round 10: 11 2.11; round 11: MS1; round 12: MS2; old: PL-69, PL-74

## Not in the scope review

Left over from the old draft. The last column is Claude's suggestion, not a decision.

| Feature | Rule | Suggested |
|---|---|---|
| What a variable can hold | The review compares variables with numbers. Whether a variable can also hold text was never asked | Needs a decision |
| Inputs of a new level | The old draft had a fixed set: `left` (A, Left), `right` (D, Right), `up` (W, Up), `down` (S, Down), `jump` (Space), four action keys, and the mouse buttons. With inputs now defined per level, a new level could start with the first five | v1, needs a decision |
| Keys that can't be bound | Esc, Tab, Ctrl, Alt and Cmd in any combination, F1 to F12, Caps Lock, Num Lock | v1 |
| Menus without a mouse | Every built-in menu works with the keyboard, and later a gamepad | v2 |
| Touch controls | On-screen controls mapped to inputs | Later |

Source: old: PL-65, PL-72, PL-80, PL-81
