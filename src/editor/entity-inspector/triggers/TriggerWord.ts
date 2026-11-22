import type { Action, Check, JsonValue, Repeat, ValueType, When } from '../../../core/fields/index.ts';
import type { TriggerPart, TriggerSlot } from '../../../core/triggers/index.ts';

// A row of the card: the When, one check, one action, or the Repeat setting.
export type TriggerRowPart = TriggerPart | { readonly section: 'repeat' };

// The word of a row a slot is: the ones triggerProblems names, and the ones that are never unset.
export type TriggerWordSlot =
    TriggerSlot | 'press' | 'compare' | 'op' | 'action' | 'pushX' | 'pushY' | 'strength' | 'repeat' | 'repeatSeconds';

// Where a word sits, for typing a number into it.
export type TriggerWordAddress = {
    readonly part: TriggerRowPart;
    readonly slot: TriggerWordSlot;
};

// set: it reads as it is. unset: yellow, it says what it needs (or names something the level lacks), and
// the trigger doesn't run. greyed: `other` under an event with none, struck through. missing: an entity or
// trigger that was deleted; only its own check or action is skipped in play.
export type TriggerWordState = 'set' | 'unset' | 'greyed' | 'missing';

// A row as it is after a pick: what the trigger card commits for one menu item.
export type TriggerPartValue =
    | { readonly section: 'when'; readonly when: When }
    | { readonly section: 'check'; readonly index: number; readonly check: Check }
    | { readonly section: 'action'; readonly index: number; readonly action: Action }
    | { readonly section: 'repeat'; readonly repeat: Repeat };

// One item of a word's menu. Picking it puts `value` in place of the row.
export type TriggerChoice = {
    // What the menu shows: "every entity tagged coin".
    readonly label: string;
    // Why it can't be picked, such as "no other for this event"; undefined when it can.
    readonly disabledReason: string | undefined;
    readonly value: TriggerPartValue;
};

// What clicking a word opens: a menu, a small number field, or a field for a value of another type (a
// colour, a vector) read with its own type.
export type TriggerWordEntry =
    | { readonly kind: 'menu'; readonly choices: readonly TriggerChoice[] }
    | { readonly kind: 'number'; readonly value: number | null; readonly unit: 's' | 'px/s' | undefined }
    | { readonly kind: 'value'; readonly value: JsonValue | null; readonly valueType: ValueType<unknown> };

export type TriggerWord =
    | { readonly kind: 'text'; readonly text: string }
    | {
          readonly kind: 'slot';
          readonly address: TriggerWordAddress;
          // The value as it reads, or what it needs while unset: "pick a tag".
          readonly text: string;
          readonly state: TriggerWordState;
          // What the struck-through or missing word's tooltip says; undefined for the others.
          readonly reason: string | undefined;
          readonly entry: TriggerWordEntry;
      };
