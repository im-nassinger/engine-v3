# Tags, variables, inputs and triggers

## TL;DR

**What v3 and v4 added to the core model**, moved here from [v3's architecture](../../versions/v3/architecture.md) when v3 closed (2026-11-22) and from [v4's](../../versions/v4/architecture.md) when v4 closed (2026-11-23). Four components (TagsComponent, VariablesComponent, InputComponent, TriggerComponent), registered at the end of the registry; their field types (`TagsFieldType`, `VariableFieldType`, `InputFieldType`, `TriggerFieldType`); `KeyCodes`, the keys a level may use; and **the trigger model in core** (`Trigger`, `triggerProblems`, `changeableValues`, `triggerName`), which both the Entity inspector and the game read, so "yellow in the editor" and "doesn't run in play" can't disagree. v4 gives variables a type (number, string or boolean) and puts them on any entity, and grows the trigger model by four Whens, the component value check, Fire custom event, Wait and Flip. Each plugs into a seam v1 left ([components-and-fields.md](components-and-fields.md#seams-for-later-versions)). **Saved levels never change:** a level without the new components reads as before. How triggers run is in [triggers-in-play.md](../triggers-in-play.md); the trigger card in [inspector-and-entities.md](../editor/inspector-and-entities.md#v3-the-trigger-card-tags-variables-and-inputs).

## The components

| Component | Card | Values | On | Changes in play |
|---|---|---|---|---|
| TagsComponent | 11 | Tags: `TagsFieldType` | Any entity | Yes, by adding or removing one tag |
| VariablesComponent | 12 | Variables: a list of `VariableFieldType` | Any entity (the World only in v3) | Each variable's value |
| InputComponent | 13 | Inputs: a list of `InputFieldType` | The World only, not in the Add Component menu, like the CameraComponent | No |
| TriggerComponent | 15 | Triggers: a list of `TriggerFieldType`, and `nextTriggerId` | Any entity, the World included | Each trigger's on/off |

- **Registered at the end of the registry, in that order**, so a component's index never changes, as v1 decided. Card 14 is kept for the ScriptComponent (v5), so the cards follow the requirement's order: tags, then scripts, then triggers. Variables and inputs sit after tags. *Why: they hold the values triggers read, so they read before the triggers.*
- **A new level's World gets an InputComponent** with `left`, `right`, `up`, `down` and `jump`, written into `LevelWriter.newLevel.json`. A level saved before v3 opens without one; the World then shows the note "No inputs. [Add the five inputs]" (`MissingInputsRule`), whose fix is one step. *Why: the reader never adds anything behind the user's back.*
- **Partners:** a TriggerComponent asks for nothing (a key trigger needs no shape). The missing Surface note is a rule on its card (`TouchNeedsSurfaceRule`), not a partner, since only touch triggers need it.
- **`LevelTags`** (`core/derived/tags/`) lists every tag in the level, for the tags field's suggestions and the trigger card's pickers.

## The field types

| Type | Value | Stored as |
|---|---|---|
| `TagsFieldType` | `readonly string[]` | `["coin", "pickup"]` |
| `VariableFieldType` | `{ name, value: number \| string \| boolean }` | `{ "name": "door_open", "value": false }` |
| `InputFieldType` | `{ name, keys: readonly KeyCode[] }` | `{ "name": "jump", "keys": ["Space", "KeyW"] }` |
| `TriggerFieldType` | a `Trigger`, below | the same shape, keys in snake_case |

- They live in `core/fields/field-types/`, beside v1's (standing yes, 2026-11-22). The fixed list of field types gains `input` and `trigger`, and `variable` is built.
- **A variable's type is the JSON type of its value** (v4): a number, a string or a boolean, so a v3 variable reads as a number with nothing added. A string holds at most 1,000 characters (`normalize` cuts it). *Why: no type field means no second place that can disagree with the value.* The Variables card's row has a type menu; changing the type is one step that resets the value to `0`, `""` or `false`. v5's other types are still to come.
- **`wordName`** (`core/fields/names/`) makes a tag: lowercase, spaces to `_`, other characters dropped, 1 to 32 characters; a tags list keeps the first of two equal tags. **A variable's name and an input's name** follow the same rule (they are names a script will use in v5), unique in their list through `ListFieldType`'s `itemName`: `parse` refuses a second `coins`. *Why 32: long enough for `enemy_flying_boss`, short enough for a menu.*
- **A key is a `KeyboardEvent.code`**, such as `KeyW` or `Space`, so it is matched by its place on the keyboard. `KeyCodes` (`core/keys/`) gives the label the Entity inspector shows (`W`, `Left arrow`) and **lists the keys a level may use; every other key is refused** (standing yes, 2026-11-22): letters, digits, Space, Enter, Backspace, the Shifts, the arrows, the editing keys, punctuation and the numpad. Tab, Esc, the F keys, Ctrl, Alt, the system key and the media and browser keys can't be bound. An input may have no key; it is never held. *Why: a list of what is allowed refuses any key a browser adds later, and Ctrl, Alt and the system key start shortcuts.*
- **Copying keeps links:** a field type may say where its entity links are, with an optional `mapEntities(raw, linkTo)`. `TriggerFieldType` and `ListFieldType` implement it, and `IdRemapping` and the missing-entity rule call it for any field that has it. *Why: a trigger names entities deep inside its value, and the clipboard must not learn the trigger's shape.*

## The trigger

The types and how a saved trigger is read (`parseTrigger`, `normalizeTrigger`, `copyTrigger`, `mapTriggerEntities`) are in `core/fields/trigger/`; `triggerName`, `triggerProblems`, `changeableValues` and `newTriggerId` in `core/triggers/model/` (standing yes, 2026-11-22).

```typescript
export type Trigger = {
    readonly id: number;                      // unique in its TriggerComponent, never reused, so Change value can name it
    readonly name: string | null;             // null: made from its When (triggerName)
    readonly on: boolean;
    readonly when: When | null;
    readonly checks: readonly Check[];
    readonly actions: readonly Action[];
    readonly repeat: Repeat;
};

export type When =
    | { kind: 'touched' } | { kind: 'untouched' }
    | { kind: 'input'; input: string | null; how: Press }
    | { kind: 'key'; key: KeyCode | null; how: Press }
    | { kind: 'after'; seconds: number | null } | { kind: 'every'; seconds: number | null }
    | { kind: 'levelStart' }
    | { kind: 'tagLeft'; tag: string | null }
    | { kind: 'collision' }                                               // v4
    | { kind: 'destroyed' }                                               // v4
    | { kind: 'custom'; name: string | null }                             // v4
    | { kind: 'variableChanged'; variable: VariableRef | null; becomes: Condition | null };   // v4; null: any change
export type Press = 'pressed' | 'released' | 'held';

export type Target =
    | { kind: 'this' } | { kind: 'other' }
    | { kind: 'entity'; entity: EntityId | null }
    | { kind: 'tagged'; tag: string | null };

export type Check =
    | { kind: 'hasTag'; target: Target; tag: string | null }
    | { kind: 'compare'; variable: VariableRef | null; compare: Compare; value: VariableValue | null }
    | { kind: 'compareValue'; target: Target; value: ReadableValue | null; compare: Compare; amount: number | null };   // v4
export type Compare = 'is' | 'isNot' | 'more' | 'less' | 'atLeast' | 'atMost';

// v4: which variable, the level's (the World's) or one of an entity's own.
export type VariableRef =
    | { owner: 'level'; name: string }                                    // saved as "coins", as in v3
    | { owner: 'own'; target: Target; name: string };                     // saved as { "target": ..., "name": "health" }
// In a When, an own variable's target is always `this`: only the entity hears its own variables.
export type Condition = { compare: Compare; value: VariableValue };
export type VariableValue = number | string | boolean;

export type ReadableValue =                                               // v4
    | { kind: 'field'; component: ComponentName; field: string; axis?: 'x' | 'y' }
    | { kind: 'live'; live: 'speed' | 'velocityX' | 'velocityY' };       // read from physics, px/s

export type Action =
    | { kind: 'change'; target: Target; value: ValueRef | null; op: 'set' | 'add' | 'subtract' | 'flip'; amount: JsonValue | null }   // flip: v4
    | { kind: 'destroy'; target: Target }
    | { kind: 'push'; target: Target; push: Push | null }
    | { kind: 'win' } | { kind: 'lose' } | { kind: 'restart' }
    | { kind: 'fire'; target: Target; name: string | null; amount: number | null }   // v4
    | { kind: 'wait'; seconds: number | null };                                      // v4
export type Push =
    | { kind: 'by'; x: number; y: number }                 // px/s
    | { kind: 'away' | 'towards'; strength: number };       // px/s

export type ValueRef =
    | { kind: 'variable'; name: string; own?: true }       // without own, the level's, as v3 saved
    | { kind: 'field'; component: ComponentName; field: string; axis?: 'x' | 'y' }
    | { kind: 'tag' }                                      // op is add or subtract: add or remove the tag in amount
    | { kind: 'triggerOn'; trigger: number };              // a trigger on the target, by its id

export type Repeat = { kind: 'everyTime' } | { kind: 'oncePerRun' } | { kind: 'atMostEvery'; seconds: number };
```

- **Unset is `null`**, so a trigger half made is saved and read back half made: a trigger with unset parts doesn't run.
- **`triggerProblems(trigger, level)`** lists what stops a trigger running: an unset part, a missing entity, an unknown variable, input or value. **The Entity inspector and the game both call it.** A missing entity shows `missing` and only that action is skipped in play; an unset part stops the whole trigger.
- **`changeableValues(entity, registry)`** lists what Change value may offer for a target: every field whose schema marks it `changeableInPlay`, the TagsComponent's tag, each trigger's on/off, and the World's variables. It reads the schemas only, so a component added later is offered with no trigger code. A vector is offered whole for Set, Add and Subtract, with its field's unit (owner, 2026-11-23). **`normalizeTrigger` turns a change saved on one axis** (`"axis": "x"` with a number, as v3 and v4 made them) into the whole vector with 0 on the other axis, so such a trigger is read the new way; play still adds to one axis for a trigger that never went through it. The component value check keeps its axis, since it compares one number.
- **`triggerName(trigger)`** gives "Touched", "jump pressed", "After 60 s", "No coin left". A trigger with a name of its own keeps it.
- **Ids are never reused** (standing yes, 2026-11-22): the TriggerComponent stores `nextTriggerId` beside its list, and `newTriggerId(component)` gives the next one, above every id the list holds. The list refuses two triggers with one id (`ListFieldType`'s `itemId`, the problem `repeatedId`).

### What v4 added to the trigger

- **A v3 trigger reads unchanged**: a check's `variable` as a string is the level's; a Change value's variable without `own` is the level's. `parseTrigger` accepts both forms. The trigger holds a `VariableRef` in memory, and `savedTrigger` writes the level's variable back as its name, so `normalizeTrigger` keeps the type and **a v3 level saves byte for byte the same**.
- **Strings and booleans compare with `is` and `isNot` only.** `triggerProblems` lists a `more` on a string, or a value of the wrong type, as `wrongType`, in the slots `compare` (a compare the type lacks) or the value's; the card never offers them.
- **`triggerProblems`** also lists an unset name, variable, value or seconds; a custom name that is a builtin event's name (`reservedName`, in the slot `name`: the names of every When kind, in snake_case, such as `touched`, `collision`, `level_start`); an unknown own variable when the target is `this` or a named entity (a `tagged` or `other` target can't be known before play, so it is skipped in play when missing). A Wait's seconds are 0 to 3,600.
- **`changeableValues(entity)`** adds the entity's own variables, each with the ops its type allows: number Set, Add, Subtract; string Set; boolean Set, Flip. The level's variables are offered for every target, as before.
- **`readableValues(entity, registry)`** lists what the component value check offers: every `number` field and each axis of every `vector` field the entity's components have, and, when the entity is a body, the three live values. It reads the schemas only, like `changeableValues`.
- **`triggerName`**: "Hits something", "Gets open", "Destroyed", "coins changes", "coins becomes 10 or more".
- **`mapTriggerEntities`** maps the targets of `fire`, `compareValue` and an own `VariableRef`, so copying keeps their links.
- **A custom event's name** uses `wordName`, the tags' rule. **`CustomEventNames`** (`core/derived/custom-events/`) lists every name used in a When or a Fire in the level, for the card's suggestions.
