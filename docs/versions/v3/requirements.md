# v3 requirements

## TL;DR

**v3 gives the engine logic without code** (owner, round 12, 2026-11-20): shapes that notice touching, tags, triggers (When, If, Do), number variables on the World, inputs mapped to keys, and a run that can end as won or lost. **The owner approved this list (2026-11-22).** Coins, spikes and goals in the rules are only examples of what a creator builds with these parts; the engine adds none of them. The rules are written once, in [requirements/](../../requirements/README.md), each feature marked `· v3`; this file lists them and what in v1 and v2 they touch. Warnings that later go to the Console go to the message pill, since the Console is v5.

## The new features

| Feature | Rules | In short |
|---|---|---|
| Sensors notice touching | [bodies.md](../../requirements/physics/bodies.md#sensors-and-touching--v3) | A SurfaceComponent with Sensor ticked notices what enters it without pushing it. A touch trigger without a SurfaceComponent says so on its card, with a button to add one |
| Tags | [triggers.md](../../requirements/triggers/triggers.md#the-tagscomponent--v3) | The TagsComponent: lowercase words such as `player` and `coin`, typed into one tags field |
| The trigger: When, If, Do | [triggers.md](../../requirements/triggers/triggers.md#when-if-do--v3) | The TriggerComponent holds a list of triggers. Each reads as a sentence with clickable parts; an unset part is highlighted and stops it running. Each can be switched on or off, reordered, duplicated and deleted. A trigger's name is made from its When and can be edited |
| Events | [triggers.md](../../requirements/triggers/triggers.md#events--v3) | Touched, no longer touched, a key or input (pressed, released, held), a timer (after N seconds, every N seconds), level start |
| "No entity with this tag is left" | [triggers.md](../../requirements/triggers/triggers.md#no-entity-with-this-tag-is-left--v3) | Fires when the last entity with a tag goes. On the World: when no `coin` is left, Win |
| If checks | [triggers.md](../../requirements/triggers/triggers.md#if-checks--v3) | `other` has a tag; a number variable compared with a value |
| Actions | [triggers.md](../../requirements/triggers/triggers.md#actions--v3) | Change value, Destroy, Push, Win, Lose, Restart. Each picks its target: `this`, `other`, an entity by name, or every entity with a tag |
| Repeat | [triggers.md](../../requirements/triggers/triggers.md#repeat--v3) | Every time, once per run, or at most once every N seconds |
| Order and limits | [triggers.md](../../requirements/triggers/triggers.md#order-and-limits--v3) | Triggers run in Entities viewer order. A chain of triggers stops after 32 steps in a tick, with a warning |
| The Trigger tool | [triggers.md](../../requirements/triggers/triggers.md#the-trigger-tool--v3) | Key 6. Draws an invisible sensor rectangle with one trigger, "When something starts touching this" |
| Number variables on the World | [variables-and-inputs.md](../../requirements/triggers/variables-and-inputs.md#variables--v3) | The World's VariablesComponent: a name and a starting number each, such as `coins = 0`. Restart puts them back |
| Raw keys and inputs | [variables-and-inputs.md](../../requirements/triggers/variables-and-inputs.md#raw-keys-and-inputs--v3) | The World's InputComponent. A new level starts with `left`, `right`, `up`, `down` and `jump`. Some keys can't be bound, such as Esc, Tab and Shift+T |
| Win and Lose | [test-play.md](../../requirements/play-and-save/test-play.md#win-and-lose-the-end-window--v3) | One end window, titled won or lost, with the time, Restart and Leave. Leave goes back to the editor |

## What v3 touches in v1 and v2

| Part | Where | What v3 adds |
|---|---|---|
| The Sensor checkbox | [bodies.md](../../requirements/physics/bodies.md#the-surfacecomponent--v1) | It existed in v1 but nothing listened. Now triggers hear it |
| The Entity inspector's card order | [inspector-and-undo.md](../../requirements/editor/inspector-and-undo.md) | The tags, variables, inputs and triggers cards, in their fixed places |
| The field types | [inspector-and-undo.md](../../requirements/editor/inspector-and-undo.md#one-fixed-list-of-field-types--v1) | The tags field |
| The tool keys | [workspace.md](../../requirements/editor/workspace.md#seven-tools-on-number-keys--v1) | Trigger on key 6 |
| A new level | [variables-and-inputs.md](../../requirements/triggers/variables-and-inputs.md#raw-keys-and-inputs--v3) | The World gets its InputComponent with the five inputs. Levels saved before v3 open without them |
| Test play | [test-play.md](../../requirements/play-and-save/test-play.md) | A run can now end, and Restart starts it again |

## Not in v3

- **The v4 events and actions:** collision, custom events, destroyed, a variable changes, Fire custom event, Wait, checking a component value.
- **String and boolean variables, and variables on entities other than the World**, are v4.
- **Scripts and the Console** are v5. Warnings go to the message pill.
- **The "can't fire" explanations** beyond the missing SurfaceComponent are Later, as is the **collision grid**: every solid surface still hits every other.
- **The pause menu** is Later. Restart is the end window's button or the Restart action.
