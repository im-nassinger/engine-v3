# v4 architecture

## TL;DR

**How v4 is built**, Claude's draft (2026-11-22), built the same night under the owner's go-ahead ("plan everything needed and then use the orchestrator"). Every choice here is made under the standing yes and listed in [decisions.md](../../decisions.md). v4 grows what v3 built and adds no new part: **the trigger model** gains four Whens, one check, two actions and Flip; **variables** get a type and go on any entity; **the tick** gains contact events from Box2D, Destroyed, variable changes, custom events and **waiting runs**; and **the shortcut list** reads the shortcuts the editor already has. **Saved levels never change:** a level saved in v3 reads as before, and a level without the new parts saves as before. The v3 parts this grows are in [core-model/triggers.md](../../architecture/core-model/triggers.md) and [triggers-in-play.md](../../architecture/triggers-in-play.md).

## Where things live

| Code | Folder | Part |
|---|---|---|
| The new trigger types, how they are read and copied | `core/fields/trigger/` | core |
| `VariableFieldType`'s three types | `core/fields/field-types/` | core |
| `triggerProblems`, `changeableValues`, `readableValues`, `triggerName` for the new kinds | `core/triggers/model/` | core |
| `ContactLedger`, `WaitingRuns`, `VariableWatch` | `core/simulation/triggers/` | core |
| `CustomEventNames` | `core/derived/custom-events/` | core |
| Fire custom event, Wait, Flip, the component value check | `core/simulation/actions/` | core |
| Contact events and a body's velocity in the physics contract | `core/physics/contracts/`, `adapters/box2d/` | core, adapters |
| The new words and menus of the trigger card, the variable menu's groups | `editor/entity-inspector/triggers/` | editor |
| `ShortcutCatalog`, `ShortcutSearch` | `editor/shortcuts/catalog/` | editor |
| `ShortcutSheet` | `ui/shortcut-sheet/` | ui |

## Variables

- **`VariableFieldType`'s value is `number | string | boolean`**, stored as before, `{ "name": "door_open", "value": false }`. **The type is the JSON type of the value**, so a v3 variable reads as a number with nothing added. A string holds at most 1,000 characters (`normalize` cuts it). *Why: no type field means no second place that can disagree with the value.*
- **The VariablesComponent is allowed on any entity** and is in every entity's Add Component menu. The refusal v3 gave on entities other than the World goes.
- **The Variables card's row** gains a type menu; changing the type is one step that resets the value to `0`, `""` or `false`.

## The trigger

New and changed types in `core/fields/trigger/Trigger.ts`:

```typescript
export type When =
    | /* v3's */
    | { kind: 'collision' }
    | { kind: 'destroyed' }
    | { kind: 'custom'; name: string | null }
    | { kind: 'variableChanged'; variable: VariableRef | null; becomes: Condition | null };   // null: any change

// Which variable: the level's (the World's), or one of an entity's own.
export type VariableRef =
    | { owner: 'level'; name: string }                                    // saved as "coins", as in v3
    | { owner: 'own'; target: Target; name: string };                     // saved as { "target": ..., "name": "health" }
// In a When, an own variable's target is always `this`: only the entity hears its own variables.

export type Condition = { compare: Compare; value: VariableValue };
export type VariableValue = number | string | boolean;

export type Check =
    | /* hasTag, as in v3 */
    | { kind: 'compare'; variable: VariableRef | null; compare: Compare; value: VariableValue | null }
    | { kind: 'compareValue'; target: Target; value: ReadableValue | null; compare: Compare; amount: number | null };

export type ReadableValue =
    | { kind: 'field'; component: ComponentName; field: string; axis?: 'x' | 'y' }
    | { kind: 'live'; live: 'speed' | 'velocityX' | 'velocityY' };       // read from physics, px/s

export type Action =
    | /* v3's, with change's op gaining 'flip' */
    | { kind: 'fire'; target: Target; name: string | null; amount: number | null }
    | { kind: 'wait'; seconds: number | null };

// Change value's variable names an own variable with `own: true`; without it, the level's, as v3 saved.
export type ValueRef = /* v3's */ | { kind: 'variable'; name: string; own?: true };
```

- **A v3 trigger reads unchanged**: a check's `variable` as a string is the level's; a Change value's variable without `own` is the level's. `parseTrigger` accepts both forms, and `normalizeTrigger` writes the level's form back as a string, so a v3 level saves byte for byte the same.
- **Strings and booleans compare with `is` and `isNot` only.** `triggerProblems` lists a `more` on a string, or a value of the wrong type, as `wrongType`; the card never offers them.
- **`triggerProblems`** adds: an unset name, variable, value or seconds; a custom name that is a builtin event's name (`reservedName`: the names of every When kind, in snake_case, such as `touched`, `collision`, `level_start`); an unknown own variable when the target is `this` or a named entity (a `tagged` or `other` target can't be known before play, so it is skipped in play when missing). A Wait's seconds are 0 to 3,600.
- **`changeableValues(entity)`** adds the entity's own variables, each with the ops its type allows: number Set, Add, Subtract; string Set; boolean Set, Flip. The level's variables are offered for every target, as before.
- **`readableValues(entity, registry)`** (new) lists what the component value check offers: every `number` field and each axis of every `vector` field the entity's components have, and, when the entity is a body, the three live values. It reads the schemas only, like `changeableValues`.
- **`triggerName`**: "Hits something", "Gets open", "Destroyed", "coins changes", "coins becomes 10 or more".
- **`mapTriggerEntities`** maps the targets of `fire`, `compareValue` and an own `VariableRef`, so copying keeps their links as v3's do.
- **As built (standing yes, 2026-11-22):** the trigger holds a `VariableRef` in memory, and `savedTrigger` writes the level's variable back as its name, so `normalizeTrigger` keeps the type; `triggerProblems` gains the slots `compare` (a compare the type lacks) and `name` (a custom event's). See [decisions.md](../../decisions.md).
- **A custom event's name** uses `wordName`, the tags' rule. `CustomEventNames` (`core/derived/custom-events/`) lists every name used in a When or a Fire in the level, for the card's suggestions.

## The trigger card

- **`TriggerChoices`** offers the new Whens, the compare value check and the two actions, in the order the [design](design.md) lists. Every new word is a `TriggerWord` like v3's, so the card's screen part needs only the new menus.
- **The variable menu** has two groups: "The level's" (from the World's VariablesComponent) and the target's own (from the target's, when it is `this` or a named entity; for `other` and `tagged`, the names used by any entity's VariablesComponent in the level). Each item carries its type, which picks the compare words and the value field.
- **The value field** of a compare or a Change value follows the variable's type: a number field, a text field, or a true or false choice.
- **The Wait row** has a faint line under it, a class on the row, drawn only when actions follow it.
- **As built (task 5, standing yes, 2026-11-22):** a word's menu is a plain list, titled groups (`groups`) or items opening submenus (`submenus`); an item can carry a faint `note` (a type, or "live") and `asks`, a field opened before the pick, which `TriggerEdits.pickedAndTyped` commits with the typed value as one step; Fire's unset number has the word state `optional`; a row knows `hasWaitLine`. See [decisions.md](../../decisions.md).

## Triggers in play

### The tick, from v4

| Phase | v4 adds |
|---|---|
| `PhysicsPhase` | Reads Box2D's **contact begin and end events** into `ContactLedger`, as sensor events go into `TouchLedger` |
| `EventPhase` | The fixed order becomes: level start, keys and inputs, timers, **waiting runs due this tick**, touched, no longer touched, **collision**, "no entity with this tag is left" |
| `TriggerPhase` | Its rounds also carry **Destroyed, variable changes and custom events**, which actions set off and which are heard in the same tick (`ChainedEvents`), within the 32 steps |
| `EndOfTickPhase` | Cancels the waiting runs of removed entities |

- **`ContactLedger`** counts, like `TouchLedger`, per hit entity and hitting entity: collision fires when a count goes from 0 to 1. A count is compared before and after all of a step's events. The owner is the shape's entity and every group above it with a collision trigger; parts of one group hitting each other are filtered out. **As built in task 8** (standing yes, 2026-11-22): each contact event counts both ways, so the two sides each hear the other; **the hitting entity is the other surface's body entity, or the surface's own entity when it is on the ground**, so a ball hitting a floor with no body names the floor, not the World; the counting is shared with `TouchLedger` in `OwnerCounts`. `TriggerIndex.contactEventSurfaces()` is read by `startSimulation` from the read level before its physics is built (through `startPlayCopy`), and holds sensors too, since Change value can make one solid. *Why the surface on the ground: the World holds everything, so `other` as the World would say nothing about what was hit; a body's shapes still count as one entity.*
- **Contact events are switched on only for the shapes that need them**: a shape whose entity, or a group above it, has a collision trigger, worked out at the start of the run from `TriggerIndex`. *Why: Box2D reports every begin it is asked for, and a level of 10,000 bodies with one collision trigger must not pay for 10,000. Triggers can't be added during play, only switched on or off, so the set is known when the run starts.*
- **The physics contract** gains `contactEvents()` after `step()`, each with the two entities, from the adapter's own shape table as sensor events are, and `velocity(body)` for the live values. `NoPhysicsEngine` and the test fakes follow. Box2D 3.2's facts (when a begin comes, a shape destroyed while touching, a body put to sleep while touching) are checked first, in `box2dFacts.test.ts`. **What they showed** (task 2, standing yes, 2026-11-22; the facts are in [tech-notes.md](../../tech-notes.md#physics-and-joints)): one shape with contact events on is enough, so the set above hears every hit on it; a contact keeps the switch it began with, so **a surface rebuilt in play (a change of Sensor) gets its switch again when it is made**; a destroyed shape's end comes in the next step and names a shape that is gone, so contact events are named from the adapter's shape table like sensor events; a body falling asleep while touching sends no end, so a resting body counts as one hit; two shapes of one body send one begin each, which `ContactLedger`'s count per entity makes one hit. No rule here was contradicted.
- **Destroyed:** the Destroy action marks the target's subtree, as in v3, and adds one Destroyed event per newly marked entity, in Entities viewer order. An entity already marked is not marked twice. The entity is still there for the rest of the tick. **As built in task 9** (standing yes, 2026-11-22): only the entity's own Destroyed triggers hear it, and a Destroy whose target already goes this tick does nothing (`RemovalMarks.goes`); the events reach `ChainedEvents` through `ActionEffects`.
- **Variable changes:** `PlayValueWriter` reports every variable it writes, the old value and the new, to `VariableWatch`, which adds a variable changed event when the value differs and, with a condition, when the condition was false before and is true now. A level's variable is heard by every trigger with that When (from `TriggerIndex`, by name); an own variable by the triggers of the entity holding it. **As built in task 10** (standing yes, 2026-11-22): `VariableWatch` is told of every write, one by one, with the same value too, and ignores a write that changes nothing; the If check and "becomes" compare with one rule, `variableMatches`, under which values of two types never match; an own variable check on a tag passes when one tagged entity's does; a World trigger naming a World variable as its own hears it as the level's; `TriggerIndex` keeps the level's by name and the own ones by entity.
- **Custom events:** Fire custom event adds one event per target, in the target order, with `other` as the firing trigger's `this`. `TriggerIndex` keeps the custom triggers by name. A name nobody hears costs nothing. **As built in task 9** (standing yes, 2026-11-22): only the target's own triggers hear it, not a group above it; the index is by name, then by entity.
- **Waiting runs:** `ActionRunner` runs a trigger's actions until a Wait, then hands `WaitingRuns` the rest: the trigger, `this`, `other`, the next action's index and the tick it is due (now plus the seconds in whole ticks, at least one tick). A trigger holds at most 32; the 33rd firing is dropped with the play warning `tooManyWaitingRuns`, once per run. Due runs go in order of due tick, then trigger order, then the order they started. A resumed run doesn't ask its checks or Repeat again. Switching the trigger off, or removing its entity, cancels its runs; Restart starts empty. *Why no recheck: "wait 2 s, then close" must close, whatever happened meanwhile.* **As built in task 11** (standing yes, 2026-11-22): the 33rd firing is dropped at its Wait, after the actions before it ran; a resumed run is a `TriggerFiring` with `resumesAt`, run from that action by `TriggerPhase`; `PlayValueWriter` cancels a trigger's runs when it switches it off, and `PlayTriggers.removing` when its entity goes.
- **The component value check** reads the target's value from the play level, or the body's live value from `velocity(body)`; a target without it is false.
- **Flip** goes through `PlayValueWriter` like Set, so the report, the mirror and `VariableWatch` see it.

### Determinism

- **`stateHash` adds every entity's variables**: the World's as in v3, then each other entity's with a VariablesComponent, in Entities viewer order, each value hashed with its type. A level with no variables on entities other than the World hashes as before, so v3's hashes are unchanged.
- The **waiting runs** are part of the hash too, as their due ticks and action indices, in their order.
- Two new levels with recorded inputs: `trigger-doors` (a button firing `open`, a door waiting and closing, a boolean switch flipped) and `trigger-hits` (collisions, Destroyed adding to a variable, "becomes" winning).

## The shortcut list

- **`ShortcutCatalog`** (`editor/shortcuts/catalog/`) is the list the sheet shows: each shortcut's name, its area and its keys, built from `ShortcutMap` and the commands, so a shortcut added later shows with no work. *Why one source: the main menu, the tooltips and the sheet show the same keys, and only `ShortcutMap` decides them.* Mouse shortcuts from [shortcuts.md](../../requirements/editor/shortcuts.md) are added as fixed rows in the same list.
- **`ShortcutSearch`** filters by words of the name and by the keys' text ("ctrl z"), case and order not counting.
- **`ShortcutSheet`** (`ui/shortcut-sheet/`) draws it as the design says. `?` (Shift and the key that holds `/`, by its character, so it works on other layouts) opens and closes it, from Help › Shortcuts in the main menu too, and its search field takes focus. While it has the focus, typing goes to the search, not to the editor's shortcuts; Esc closes it.
- **Tooltips:** a browser test walks every icon button on the page and checks it has a tooltip, and that a button whose command has a shortcut shows it.

## Tests

- **Node:** every new kind through `parseTrigger`, `normalizeTrigger`, `copyTrigger`, `triggerProblems` and `triggerName`; a v3 level read and written back byte for byte; `runHeadless` tests for each new event, for Wait (two firings during one wait, a cancelled run, the 32 limit) and for Flip.
- **Browser:** the trigger card's new menus, the Variables card's type menu, the shortcut sheet, the tooltips.
- **Journeys (three browsers):** a button and a door with Fire custom event and Wait; a ball hitting a wall that is destroyed and adds to a score that wins; the shortcut sheet searched.
- **Speed:** 1,000 collision triggers in test play meet test play's targets, the numbers written in [performance.md](../../architecture/performance.md).
