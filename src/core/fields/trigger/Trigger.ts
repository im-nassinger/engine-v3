import type { KeyCode } from '../../keys/index.ts';

import type { EntityId } from '../EntityId.ts';
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
    | { readonly kind: 'tagLeft'; readonly tag: string | null };

export type WhenKind = When['kind'];

// What a check or an action is about: the entity holding the trigger, the one that caused the event, an
// entity by its id, or every entity with a tag.
export type Target =
    | { readonly kind: 'this' }
    | { readonly kind: 'other' }
    | { readonly kind: 'entity'; readonly entity: EntityId | null }
    | { readonly kind: 'tagged'; readonly tag: string | null };

export type Compare = 'is' | 'isNot' | 'more' | 'less' | 'atLeast' | 'atMost';

export type Check =
    | { readonly kind: 'hasTag'; readonly target: Target; readonly tag: string | null }
    // A variable of the World's, in v3.
    | {
          readonly kind: 'compare';
          readonly variable: string | null;
          readonly compare: Compare;
          readonly value: number | null;
      };

export type CheckKind = Check['kind'];

export type ChangeOp = 'set' | 'add' | 'subtract';

// Changes in velocity, in px/s, ignoring mass: a fixed vector, or one strength away from or towards `this`.
export type Push =
    | { readonly kind: 'by'; readonly x: number; readonly y: number }
    | { readonly kind: 'away' | 'towards'; readonly strength: number };

// A component's type name, such as `BodyComponent`. The same as the components' ComponentTypeName, written
// out here because field types sit below the components.
type ComponentName = `${string}Component`;

// The value Change value changes on its target.
export type ValueRef =
    // A variable of the target's VariablesComponent: the World's, in v3.
    | { readonly kind: 'variable'; readonly name: string }
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
    | { readonly kind: 'restart' };

export type ActionKind = Action['kind'];

export type Repeat =
    | { readonly kind: 'everyTime' }
    | { readonly kind: 'oncePerRun' }
    | { readonly kind: 'atMostEvery'; readonly seconds: number };

export type RepeatKind = Repeat['kind'];
