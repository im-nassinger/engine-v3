# Triggers, variables and inputs

## TL;DR

Logic without code. **In v1** an entity's TriggerComponent holds triggers shaped as When, If, Do, with events for touching, keys, timers, level start, custom events, destroyed and variables, nine actions led by Change value, and a Repeat setting. The World holds the level's variables and inputs. **In v2** come mouse events, two more touch events, sound and camera actions, arrows to what a trigger affects, kept variables, gamepads, remapping and the mouse for scripts. Core rules: if it's data, change it with Change value, triggers and scripts share one list of events, and the order you see is the order things run.

## Files

| File | Covers |
|---|---|
| [triggers.md](triggers.md) | When, If, Do, events, checks, actions, Repeat, custom events, order and limits |
| [variables-and-inputs.md](variables-and-inputs.md) | The VariablesComponent, Keep between runs, raw keys, the InputComponent, gamepads, remapping, the mouse |

## Features and versions

| Feature | Version | File |
|---|---|---|
| When, If, Do as a sentence | v1 | triggers |
| Events: touched, no longer touched, collision, key or input, timer, level start, custom event, destroyed, a variable changes | v1 | triggers |
| The event "no entity with this tag is left" | v1 | triggers |
| If checks | v1 | triggers |
| Actions: Change value, Spawn, Destroy, Push, Fire custom event, Wait, Win, Lose, Restart | v1 | triggers |
| Repeat | v1 | triggers |
| Custom events | v1 | triggers |
| Variables on the World | v1 | variables-and-inputs |
| Raw keys and inputs | v1 | variables-and-inputs |
| Mouse events | v2 | triggers |
| "While touching" and "left the level" | v2 | triggers |
| Play sound, Stop sound, Camera shake | v2 | triggers |
| Arrows to what a trigger affects | v2 | triggers |
| Keep between runs | v2 | variables-and-inputs |
| Gamepads, remapping, the mouse for scripts | v2 | variables-and-inputs |
