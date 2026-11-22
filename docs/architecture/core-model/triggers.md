# Tags, variables, inputs and triggers

## TL;DR

**What v3 added to the core model**, moved here from [v3's architecture](../../versions/v3/architecture.md) when v3 closed (2026-11-22). Four components (TagsComponent, VariablesComponent, InputComponent, TriggerComponent), registered at the end of the registry; their field types (`TagsFieldType`, `VariableFieldType`, `InputFieldType`, `TriggerFieldType`); `KeyCodes`, the keys a level may use; and **the trigger model in core** (`Trigger`, `triggerProblems`, `changeableValues`, `triggerName`), which both the Entity inspector and the game read, so "yellow in the editor" and "doesn't run in play" can't disagree. Each plugs into a seam v1 left ([components-and-fields.md](components-and-fields.md#seams-for-later-versions)). **Saved levels never change:** a level without the new components reads as before. How triggers run is in [triggers-in-play.md](../triggers-in-play.md); the trigger card in [inspector-and-entities.md](../editor/inspector-and-entities.md#v3-the-trigger-card-tags-variables-and-inputs).

## The components

| Component | Card | Values | On | Changes in play |
|---|---|---|---|---|
| TagsComponent | 11 | Tags: `TagsFieldType` | Any entity | Yes, by adding or removing one tag |
| VariablesComponent | 12 | Variables: a list of `VariableFieldType` | The World only in v3 (any entity from v4), refused on others with the reason | Each variable's value |
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
| `VariableFieldType` | `{ name, value: number }` | `{ "name": "coins", "value": 0 }` |
| `InputFieldType` | `{ name, keys: readonly KeyCode[] }` | `{ "name": "jump", "keys": ["Space", "KeyW"] }` |
| `TriggerFieldType` | a `Trigger`, below | the same shape, keys in snake_case |

- They live in `core/fields/field-types/`, beside v1's (standing yes, 2026-11-22). The fixed list of field types gains `input` and `trigger`, and `variable` is built (numbers only; its other types come in v4 and v5).
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
    | { kind: 'tagLeft'; tag: string | null };
export type Press = 'pressed' | 'released' | 'held';

export type Target =
    | { kind: 'this' } | { kind: 'other' }
    | { kind: 'entity'; entity: EntityId | null }
    | { kind: 'tagged'; tag: string | null };

export type Check =
    | { kind: 'hasTag'; target: Target; tag: string | null }
    | { kind: 'compare'; variable: string | null; compare: Compare; value: number | null };
export type Compare = 'is' | 'isNot' | 'more' | 'less' | 'atLeast' | 'atMost';

export type Action =
    | { kind: 'change'; target: Target; value: ValueRef | null; op: 'set' | 'add' | 'subtract'; amount: JsonValue | null }
    | { kind: 'destroy'; target: Target }
    | { kind: 'push'; target: Target; push: Push | null }
    | { kind: 'win' } | { kind: 'lose' } | { kind: 'restart' };
export type Push =
    | { kind: 'by'; x: number; y: number }                 // px/s
    | { kind: 'away' | 'towards'; strength: number };       // px/s

export type ValueRef =
    | { kind: 'variable'; name: string }                   // the World's in v3
    | { kind: 'field'; component: ComponentTypeName; field: string; axis?: 'x' | 'y' }
    | { kind: 'tag' }                                      // op is add or subtract: add or remove the tag in amount
    | { kind: 'triggerOn'; trigger: number };              // a trigger on the target, by its id

export type Repeat = { kind: 'everyTime' } | { kind: 'oncePerRun' } | { kind: 'atMostEvery'; seconds: number };
```

- **Unset is `null`**, so a trigger half made is saved and read back half made: a trigger with unset parts doesn't run.
- **`triggerProblems(trigger, level)`** lists what stops a trigger running: an unset part, a missing entity, an unknown variable, input or value. **The Entity inspector and the game both call it.** A missing entity shows `missing` and only that action is skipped in play; an unset part stops the whole trigger.
- **`changeableValues(entity, registry)`** lists what Change value may offer for a target: every field whose schema marks it `changeableInPlay`, the TagsComponent's tag, each trigger's on/off, and the World's variables. It reads the schemas only, so a component added later is offered with no trigger code. A vector is offered whole for Set, and by axis for Add and Subtract.
- **`triggerName(trigger)`** gives "Touched", "jump pressed", "After 60 s", "No coin left". A trigger with a name of its own keeps it.
- **Ids are never reused** (standing yes, 2026-11-22): the TriggerComponent stores `nextTriggerId` beside its list, and `newTriggerId(component)` gives the next one, above every id the list holds. The list refuses two triggers with one id (`ListFieldType`'s `itemId`, the problem `repeatedId`).
