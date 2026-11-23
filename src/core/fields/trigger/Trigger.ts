import type { KeyCode } from '../../keys/index.ts';

import type { EntityId } from '../EntityId.ts';
import type { VariableValue } from '../variables/VariableValue.ts';
import type { JsonValue } from '../JsonValue.ts';

// One trigger of a TriggerComponent: When (one event), If (checks that must all be true) and Do (actions run
// top to bottom). A part not set yet is null, so a trigger half made is saved and read back half made; a
// trigger with an unset part doesn't run (triggerProblems).
export type Trigger = {
    // Unique in its TriggerComponent and never reused there (newTriggerId), so Change value can name it.
    readonly id: number;
    // Null: the trigger is called by its When (triggerName).
    readonly name: string | null;
    readonly on: boolean;
    readonly when: When | null;
    readonly checks: readonly Check[];
    readonly actions: readonly Action[];
    readonly repeat: Repeat;
};

export type Press = 'pressed' | 'released' | 'held';

export type When =
    | { readonly kind: 'touched' }
    | { readonly kind: 'untouched' }
    | { readonly kind: 'input'; readonly input: string | null; readonly how: Press }
    | { readonly kind: 'key'; readonly key: KeyCode | null; readonly how: Press }
    | { readonly kind: 'after'; readonly seconds: number | null }
    | { readonly kind: 'every'; readonly seconds: number | null }
    | { readonly kind: 'levelStart' }
    | { readonly kind: 'tagLeft'; readonly tag: string | null }
    | { readonly kind: 'collision' }
    | { readonly kind: 'destroyed' }
    // An event named by the level, such as `open`, heard when a Fire custom event names it.
    | { readonly kind: 'custom'; readonly name: string | null }
    // Without a condition, any change of the variable's value.
    | { readonly kind: 'variableChanged'; readonly variable: VariableRef | null; readonly becomes: Condition | null };

export type WhenKind = When['kind'];

// What a check or an action is about: the entity holding the trigger, the one that caused the event, an
// entity by its id, or every entity with a tag.
export type Target =
    | { readonly kind: 'this' }
    | { readonly kind: 'other' }
    | { readonly kind: 'entity'; readonly entity: EntityId | null }
    | { readonly kind: 'tagged'; readonly tag: string | null };

export type Compare = 'is' | 'isNot' | 'more' | 'less' | 'atLeast' | 'atMost';

// Which variable: the level's (the World's), saved as its name as v3 saved it, or one of an entity's own,
// saved as `{ "target": ..., "name": "health" }`. In a When, an own variable's target is always `this`: only
// the entity hears its own variables.
export type VariableRef =
    | { readonly owner: 'level'; readonly name: string }
    | { readonly owner: 'own'; readonly target: Target; readonly name: string };

// A variable's value compared, such as "10 or more". A string or a boolean is only compared with is or isNot.
export type Condition = { readonly compare: Compare; readonly value: VariableValue };

// A component's type name, such as `BodyComponent`. The same as the components' ComponentTypeName, written
// out here because field types sit below the components.
type ComponentName = `${string}Component`;

// What the component value check reads on its target: a number field, or one axis of a vector field, or
// what a body is doing now, in px/s, read from physics.
export type ReadableValue =
    | { readonly kind: 'field'; readonly component: ComponentName; readonly field: string; readonly axis?: 'x' | 'y' }
    | { readonly kind: 'live'; readonly live: LiveValue };

export type LiveValue = 'speed' | 'velocityX' | 'velocityY';

export type Check =
    | { readonly kind: 'hasTag'; readonly target: Target; readonly tag: string | null }
    | {
          readonly kind: 'compare';
          readonly variable: VariableRef | null;
          readonly compare: Compare;
          readonly value: VariableValue | null;
      }
    | {
          readonly kind: 'compareValue';
          readonly target: Target;
          readonly value: ReadableValue | null;
          readonly compare: Compare;
          readonly amount: number | null;
      };

export type CheckKind = Check['kind'];

// Flip turns a boolean variable to the other value, and needs no amount.
export type ChangeOp = 'set' | 'add' | 'subtract' | 'flip';

// Changes in velocity, in px/s, ignoring mass: a fixed vector, or one strength away from or towards `this`.
export type Push =
    | { readonly kind: 'by'; readonly x: number; readonly y: number }
    | { readonly kind: 'away' | 'towards'; readonly strength: number };

// The value Change value changes on its target.
export type ValueRef =
    // A variable: the level's (the World's, its target the World, as v3 saved it), or with `own` one of the
    // target's own.
    | { readonly kind: 'variable'; readonly name: string; readonly own?: true }
    // A field by its key, such as TransformComponent's `position`. A vector's axis is for Add and Subtract.
    | { readonly kind: 'field'; readonly component: ComponentName; readonly field: string; readonly axis?: 'x' | 'y' }
    // Add or subtract the tag in the action's amount.
    | { readonly kind: 'tag' }
    // A trigger's on/off, by its id in the target's TriggerComponent.
    | { readonly kind: 'triggerOn'; readonly trigger: number };

export type Action =
    | {
          readonly kind: 'change';
          readonly target: Target;
          readonly value: ValueRef | null;
          readonly op: ChangeOp;
          readonly amount: JsonValue | null;
      }
    | { readonly kind: 'destroy'; readonly target: Target }
    | { readonly kind: 'push'; readonly target: Target; readonly push: Push | null }
    | { readonly kind: 'win' }
    | { readonly kind: 'lose' }
    | { readonly kind: 'restart' }
    // Each target hears the custom event in the same tick. The number is for scripts (v5); no trigger reads it.
    | { readonly kind: 'fire'; readonly target: Target; readonly name: string | null; readonly amount: number | null }
    // The actions after it run this many seconds later.
    | { readonly kind: 'wait'; readonly seconds: number | null };

export type ActionKind = Action['kind'];

export type Repeat =
    | { readonly kind: 'everyTime' }
    | { readonly kind: 'oncePerRun' }
    | { readonly kind: 'atMostEvery'; readonly seconds: number };

export type RepeatKind = Repeat['kind'];
