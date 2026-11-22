# v4 requirements

## TL;DR

**v4 adds the rest of the triggers, string and boolean variables on any entity, and the shortcut list** (owner, round 12, 2026-11-20). **The owner approved this list (2026-11-22: "sounds good. continue").** The rules are written once, in [requirements/](../../requirements/README.md), each feature marked `· v4`; this file lists them and what in v1 to v3 they touch. Warnings still go to the message pill, since the Console is v5.

## The new features

| Feature | Rules | In short |
|---|---|---|
| Collision | [triggers.md](../../requirements/triggers/triggers.md#more-events--v4) | "When this hits something": two solid bodies starting to touch, once per entity hit |
| Destroyed | [triggers.md](../../requirements/triggers/triggers.md#more-events--v4) | "When this is destroyed": a Destroy action takes it or a group above it; its triggers run before it disappears |
| A variable changes | [triggers.md](../../requirements/triggers/triggers.md#more-events--v4) | "When coins becomes 10 or more". The level's variables are heard by every entity, an entity's own only by itself. "Becomes" fires when the condition turns true |
| Custom events | [triggers.md](../../requirements/triggers/triggers.md#custom-events--v4) | "When this gets `open`", fired by the action Fire custom event, with an optional number |
| Fire custom event and Wait | [triggers.md](../../requirements/triggers/triggers.md#fire-custom-event-and-wait--v4) | Two actions. Wait delays the actions after it, in whole ticks; each firing is its own waiting run, at most 32 per trigger |
| Checking a component value | [triggers.md](../../requirements/triggers/triggers.md#checking-a-component-value--v4) | "If this BodyComponent speed is more than 200": any number value, a vector's x or y, and a body's live speed and velocity |
| String and boolean variables, on any entity | [variables-and-inputs.md](../../requirements/triggers/variables-and-inputs.md#string-and-boolean-variables-on-any-entity--v4) | A variable is a number, a string or a boolean. Any entity can have a VariablesComponent. A boolean can be flipped. The level's variables are always offered beside the target's own |
| The shortcut list | [workspace.md](../../requirements/editor/workspace.md#the-searchable-list-of-shortcuts--v4) | `?` opens a sheet of every shortcut by area, searchable, staying open while you work. Every icon button's tooltip has its name and shortcut |

## What v4 touches in v1 to v3

| Part | Where | What v4 adds |
|---|---|---|
| The trigger card | [controls.md, v3](../../design/controls.md#v3-triggers-tags-variables-inputs-and-the-end-window) | The new Whens, checks and actions in its menus; the variable menu's two groups, "the level's" and the target's |
| The VariablesComponent | [variables-and-inputs.md](../../requirements/triggers/variables-and-inputs.md#variables--v3) | Any entity, from the Add Component menu; a type per row |
| Change value | [triggers.md](../../requirements/triggers/triggers.md#actions--v3) | Flip for a boolean; Set only for a string; the target's own variables |
| The "compare" check | [triggers.md](../../requirements/triggers/triggers.md#if-checks--v3) | The target's own variables; "is" and "is not" for strings and booleans |
| Triggers in test play | [triggers-in-play.md](../../architecture/triggers-in-play.md) | Contact events from Box2D, destroyed, variable changes, custom events and waiting runs in the tick |
| Saved levels | [core-model/triggers.md](../../architecture/core-model/triggers.md) | Nothing changes for a level saved in v3: a variable with no type reads as a number, a variable named in a trigger with no owner reads as the World's |
| The determinism test | [testing.md](../../architecture/testing.md#the-determinism-test) | New levels for the new events, and every entity's variables in `stateHash` |

## Not in v4

- **Scripts, the Console and the Assets panel** are v5, with the variable types scripts need and number limits. Reading a custom event's number is a script's job.
- **Spawn** is v7.
- **The "can't fire" explanations**, the collision speed, "while touching" and "left the level" are Later.
