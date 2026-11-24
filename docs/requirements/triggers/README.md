# Triggers, variables and inputs

## TL;DR

Logic without code. **Nothing here is in v1.** **In v3** an entity's TriggerComponent holds triggers shaped as When, If, Do, with events for touching, keys and inputs, timers and level start, one check (a value compared), five actions led by Change value, and a Repeat setting; the World holds the level's number variables and inputs. **In v4** come custom events, a variable changing, component values in the check, Fire custom event and Wait, and string and boolean variables on any entity. Since 2026-11-23 there are six events, one check and seven actions (owner). **v5** adds the variable types scripts need, and **v7** Spawn. **Later:** mouse events, two more touch events, sound and camera actions, arrows to what a trigger affects, kept variables, gamepads, remapping and the mouse for scripts. Core rules: if it's data, change it with Change value, triggers and scripts share one list of events, and the order you see is the order things run.

## Files

| File | Covers |
|---|---|
| [triggers.md](triggers.md) | When, If, Do, events, checks, actions, Repeat, custom events, order and limits |
| [variables-and-inputs.md](variables-and-inputs.md) | The VariablesComponent, Keep between runs, raw keys, the InputComponent, gamepads, remapping, the mouse |

## Features and versions

| Feature | Version | File |
|---|---|---|
| When, If, Do as a sentence | v3 | triggers |
| Events: touching (starts or stops), key or input, timer (after or every), level start | v3 | triggers |
| The value check: a tag, a number variable | v3 | triggers |
| Actions: Change value, Destroy, Win, Lose, Restart | v3 | triggers |
| Repeat, order and limits | v3 | triggers |
| The Trigger tool | v3 | triggers |
| The TagsComponent | v3 | triggers |
| Number variables on the World | v3 | variables-and-inputs |
| Raw keys and inputs | v3 | variables-and-inputs |
| Events: custom event, a variable changes | v4 | triggers |
| The value check on a component value | v4 | triggers |
| Fire custom event and Wait, custom events | v4 | triggers |
| String and boolean variables, on any entity | v4 | variables-and-inputs |
| The variable types scripts need, number limits | v5 | variables-and-inputs |
| Spawn | v7 | triggers |
| Mouse events | Later | triggers |
| "While touching" and "left the level" | Later | triggers |
| Play sound, Stop sound, Camera shake | Later | triggers |
| Arrows to what a trigger affects | Later | triggers |
| Convert to script | Later | triggers |
| Keep between runs | Later | variables-and-inputs |
| Gamepads, remapping, the mouse for scripts | Later | variables-and-inputs |
