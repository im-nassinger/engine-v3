# Variables and inputs

## TL;DR

Two kinds of lists that triggers and scripts share. **Variables** are named values during play, such as `coins = 5`: the World's are the level's, and any other entity can have its own, such as an enemy's `health`. **Inputs** are names such as `jump` with keys mapped to them. **v3:** number variables on the World, raw keys, and inputs on the World's InputComponent, five of them in a new level. **v4:** string and boolean variables, on any entity. **v5:** the other types scripts need, and number limits. **Later:** variables kept between runs, gamepads, players remapping inputs, and scripts reading the mouse. Core rules: a variable is the one concept for named values (it replaces "data", "saved data" and the values scripts used to keep on the ScriptComponent), and players can remap inputs but not raw keys.

## Variables

### Variables · v3

- **The World has a VariablesComponent**, listing each variable: a name, a type and a starting value. **The World's variables are the level's**, such as `coins = 0`.
- **In v3 every variable is a number.** Change value sets, adds or subtracts. An If compares it, such as "If coins is 10 or more".
- Restarting the level puts every variable back to its starting value.
- *Why: variables replace the older "data" and "saved data", which were two concepts for one thing. A score needs one. Why only numbers in v3: a coin count is a number (owner: 2026-11-20).*

Source: scope VA1; round 2: O2; round 5: T5; owner: 2026-11-13; owner: 2026-11-20

### String and boolean variables, on any entity · v4

- **Any entity can have a VariablesComponent.** Any entity's other than the World's are its own, such as an enemy's `health = 3`. *Why: one concept for every named value. A script's values are variables on its entity, so triggers can read and change them too (owner: 2026-11-16).*
- **A variable can also be a string or a boolean.** Examples: `player_name = "Ada"`, `door_open = false`. *Why: the owner wants text (owner: 2026-11-13) and named number, string and boolean (owner: 2026-11-14).*
- **string:** Change value only sets it. An If only checks "is" or "is not".
- **boolean:** Change value sets it or **flips** it: true becomes false, false becomes true. An If only checks "is" or "is not", such as "If lamp_on is true". Example: a light switch is one trigger, "When other starts touching this, Flip lamp_on". *Why: with only Set, a switch needs two triggers that both fire on the same touch and undo each other (owner: 2026-11-14).*
- *Why: adding 1 to a string or asking whether a boolean is "10 or more" means nothing.*
- **Any entity's VariablesComponent is added from its Add Component menu.** Each variable row has a type, Number, String or Boolean, picked from a small menu; changing it puts the value back to `0`, `""` or `false`.
- **A trigger always offers the level's variables, beside the target's own.** "If coins is 10 or more" needs no target picked: `coins` is offered under "the level's" in the variable menu, wherever the trigger is. An entity's own variables are offered under its target, such as "this health". *Why: coins and score are the usual case, so they take one click (standing yes, 2026-11-22: Claude's pick, asked of the owner, who went ahead without answering).*
- A trigger can react to a variable with the event "a variable changes", see [triggers](triggers.md#more-events--v4).
- Restarting the level puts every entity's variables back to their starting values. A spawned entity's variables start from its `.entity` file.
- *Why v4: switches and an enemy's own hits need them (owner: 2026-11-20).*

Source: scope VA1; round 4: T2; round 9: 09 2.4b; owner: 2026-11-14; owner: 2026-11-16; owner: 2026-11-20

### The variable types scripts need · v5

- **A variable can also be an entity, an asset, a colour, a vector, an angle or tags.** Example: `door` set to the entity "Door 2". Change value only sets them. An If only checks "is" or "is not". *Why: they are the types scripts need, such as the door a button opens (owner: 2026-11-16).*
- **A number variable can have limits:** a minimum, a maximum and a unit, such as `speed` from 0 to 15 m/s. Its value stays inside them, in the Entity inspector and during play: a value past a limit is held at it (standing yes, 2026-11-16).
- Scripts add the variables they need from a warning on the ScriptComponent's card, see [scripts](../scripts/scripts.md#the-scriptcomponent--v5).
- *Why v5: they come with scripts (owner: 2026-11-20).*

Source: scope VA1; owner: 2026-11-16; owner: 2026-11-20

### Keep between runs · Later

- Each variable has a **Keep between runs** checkbox. A kept variable saves its value in the browser for that level, and the next run starts from the saved value.
- The VariablesComponent has a **Reset kept values** button. *Why: it lets you test from a clean start.*
- Test play and playing use the same saved value.
- Whether an entity's own variables can be kept is still open, see [progress](../../progress.md#open-questions-for-the-owner).
- *Why Later: it is for best times and unlocks, which matter once other people try your levels.*

Source: scope VA2; round 2: O2; round 11: KV1

## Keys

### Raw keys and inputs · v3

- A key event can use a **raw key** ("When the Space key is pressed") or an **input** ("When the jump input is pressed").
- An input is a name plus its keys, listed on the World's **InputComponent**. Example: `jump` on Space and W.
- **A new level starts with five inputs:** `left` (A, Left arrow), `right` (D, Right arrow), `up` (W, Up arrow), `down` (S, Down arrow) and `jump` (Space). They can be renamed or deleted. *Why: most games need these five, and the builtin player works at once (owner: 2026-11-13).*
- Both kinds fire on press, on release, or while held. A press shorter than one tick still counts as one press.
- Scripts (v5) get the same two: `is_down("jump")` and `is_key_down("Space")`.
- **Players can remap inputs but not raw keys**, so the editor suggests an input when a trigger uses a raw key.
- *Why both: the owner wanted both. A raw key is quickest for a test, and an input is what lets players remap and use a gamepad. "Input", not "action", because trigger actions already use that word.*
- Two keys on one input: the input stays held until both are up.
- Keys are matched by their place on the keyboard, so W, A, S, D stay together on other layouts.
- **Tab is taken by the game** for the pause menu (Later), so levels can't use it. **Browser keys never reach the game.** Esc only leaves full screen.
- While the game has the keyboard, keys it uses don't scroll the page.
- A key that confirmed a menu doesn't reach the game until it is released and pressed again.
- An unknown input name reads as not held and puts one warning in the Console (the message pill until v5).
- *Why v3: steering the ball reads keys, and remapping later needs inputs.*

Source: scope IN1; round 10: IN1; round 12: PM1, MS2; old: PL-64 to PL-73; owner: 2026-11-13

### Gamepads · Later

- Each input also lists gamepad buttons. Gamepads work through them.
- A stick counts as pressed past half its travel.

Source: scope IN2; round 3: D71; round 10: 11 2.12; old: PL-79

### Players remap inputs · Later

- Players remap a level's inputs in the pause menu's Controls page.
- Assigning a key already in use swaps the two. Keys the game keeps for itself are refused with a reason. One button resets to the level's own keys.
- *Why Later: until other people try your levels, you know your own keys.*

Source: scope IN3; round 10: 11 2.12; old: PL-76, PL-77

### Scripts read the mouse · Later

- Scripts read where the mouse is and whether its left, right or middle button is held: `is_mouse_down("left")`, `mouse_position()`, `mouse_screen_position()`.
- Two functions convert positions: `level_to_screen(x, y)` and `screen_to_level(x, y)`.
- **The game never locks or hides the mouse pointer.**
- *"Button" means the mouse's own buttons. "Level", not "world", because World is the top entity.*
- *Why Later: it goes with the mouse events.*

Source: scope IN4; round 3: D70; round 10: 11 2.11; round 11: MS1; round 12: MS2; old: PL-69, PL-74

## Small features

Small features from the old draft and review that the scope review never asked about. The owner gave each its version in round 7 of the architecture review.

| Feature | Rule | Version |
|---|---|---|
| Keys that can't be bound | Esc, Tab, Ctrl, Alt and Cmd in any combination, F1 to F12, Caps Lock, Num Lock, and Shift+T, which stops the run (owner, 2026-11-17). A plain T and Shift alone stay free | v3 |
| Menus without a mouse | Every built-in menu works with the keyboard, and later a gamepad | Later |
| Touch controls | On-screen controls mapped to inputs | Later |

Source: old: PL-65, PL-72, PL-80, PL-81; owner: 2026-11-14
