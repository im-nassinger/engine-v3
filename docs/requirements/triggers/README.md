# Triggers, variables and inputs

## TL;DR

Logic without code. **Nothing here is in v1.** **In v2** an entity's TriggerComponent holds triggers shaped as When, If, Do, with events for touching, keys, timers, level start, custom events, destroyed and variables, nine actions led by Change value, and a Repeat setting. The World holds the level's variables and inputs. **In v3** come mouse events, two more touch events, sound and camera actions, arrows to what a trigger affects, kept variables, gamepads, remapping and the mouse for scripts. Core rules: if it's data, change it with Change value, triggers and scripts share one list of events, and the order you see is the order things run.

## Files

| File | Covers |
|---|---|
| [triggers.md](triggers.md) | When, If, Do, events, checks, actions, Repeat, custom events, order and limits |
| [variables-and-inputs.md](variables-and-inputs.md) | The VariablesComponent, Keep between runs, raw keys, the InputComponent, gamepads, remapping, the mouse |

## Features and versions

| Feature | Version | File |
|---|---|---|
| When, If, Do as a sentence | v2 | triggers |
| Events: touched, no longer touched, collision, key or input, timer, level start, custom event, destroyed, a variable changes | v2 | triggers |
| The event "no entity with this tag is left" | v2 | triggers |
| If checks | v2 | triggers |
| Actions: Change value, Spawn, Destroy, Push, Fire custom event, Wait, Win, Lose, Restart | v2 | triggers |
| Repeat | v2 | triggers |
| The Trigger tool | v2 | triggers |
| Custom events | v2 | triggers |
| Variables on the World | v2 | variables-and-inputs |
| Raw keys and inputs | v2 | variables-and-inputs |
| Mouse events | v3 | triggers |
| "While touching" and "left the level" | v3 | triggers |
| Play sound, Stop sound, Camera shake | v3 | triggers |
| Arrows to what a trigger affects | v3 | triggers |
| Keep between runs | v3 | variables-and-inputs |
| Gamepads, remapping, the mouse for scripts | v3 | variables-and-inputs |
