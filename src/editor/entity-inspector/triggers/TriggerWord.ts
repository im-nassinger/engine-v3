import type { Action, Check, JsonValue, Repeat, Unit, ValueType, When } from '../../../core/fields/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import type { TriggerPart, TriggerSlot } from '../../../core/triggers/index.ts';

// A row of the card: the When, one check, one action, or the Repeat setting.
export type TriggerRowPart = TriggerPart | { readonly section: 'repeat' };

// The word of a row a slot is: the ones triggerProblems names, and the ones that are never unset.
export type TriggerWordSlot =
    | TriggerSlot
    | 'press'
    | 'op'
    | 'action'
    // Push's fixed kick, one vector word.
    | 'pushBy'
    | 'strength'
    // The axis the component value check reads on a vector, x or y.
    | 'axis'
    | 'repeat'
    | 'repeatSeconds'
    // A variable changed When's condition: "changes" or "becomes 3 or more", one word.
    | 'becomes';

// Where a word sits, for typing a number into it.
export type TriggerWordAddress = {
    readonly part: TriggerRowPart;
    readonly slot: TriggerWordSlot;
};

// set: it reads as it is. unset: yellow, it says what it needs (or names something the level lacks), and
// the trigger doesn't run. optional: not set, and nothing is missing, such as Fire's "no number". greyed: `other` under an event with none, struck through. missing: an entity or
// trigger that was deleted; only its own check or action is skipped in play.
export type TriggerWordState = 'set' | 'unset' | 'optional' | 'greyed' | 'missing';

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
    // The faint word at the right: a variable's type (number, string, boolean), or "live" for what a body is
    // doing now; undefined for none.
    readonly note: string | undefined;
    // A line under the label, saying what the item does: "Compare a variable with a value". Undefined for
    // none.
    readonly description?: string;
    // A field the pick opens before it is made, such as the number of "becomes … or more" or the word of
    // "New name…": the pick and what is typed are one step (TriggerEdits.pickedAndTyped). Undefined when
    // the pick is made at once.
    readonly asks: TriggerTypedEntry | undefined;
};

// One group of a menu with a title, such as the variable menu's "Level variables": its items, then the
// items that open a submenu, such as each component of the entity, opening its values.
export type TriggerMenuGroup = {
    readonly title: string;
    readonly choices: readonly TriggerChoice[];
    readonly submenus?: readonly TriggerSubmenu[];
    // What a group with no choice says, disabled: "no variables of its own".
    readonly emptyText: string | undefined;
};

// One item of a menu that opens a submenu to its right: a component and its values.
export type TriggerSubmenu = {
    readonly label: string;
    readonly choices: readonly TriggerChoice[];
};

// What a word to type into opens: a number (with an entry that clears it, when it is optional), a value of
// another type (a colour, a vector) read with its own type, a string variable's text, or a one-word name.
export type TriggerTypedEntry =
    | {
          readonly kind: 'number';
          readonly value: number | null;
          readonly unit: Unit | undefined;
          // The entry that leaves the number unset, "No number"; undefined when it must be set.
          readonly clearLabel: string | undefined;
      }
    // Two number boxes, x and y.
    | { readonly kind: 'vector'; readonly value: Point | null; readonly unit: Unit | undefined }
    // The colour box, with its swatch and the browser's picker. A Fill's takes a solid fill of the colour.
    | { readonly kind: 'colour'; readonly value: string | null; readonly isFill?: true }
    | { readonly kind: 'value'; readonly value: JsonValue | null; readonly valueType: ValueType<unknown> }
    | { readonly kind: 'text'; readonly value: string | null }
    | { readonly kind: 'word'; readonly value: string | null; readonly hint: string };

// What a target word opens: the entity picker. Its first items name no one entity (`this`, `other`, every
// entity with a tag); then the level's tree, where a row picks that entity, and the trigger's own entity
// picks `this`.
export type TriggerEntitiesEntry = {
    readonly kind: 'entities';
    readonly choices: readonly TriggerChoice[];
    // Every entity with a tag, one item per tag; empty where a tag can't be the target, as in the tag check.
    readonly tagged: readonly TriggerChoice[];
    // The entity picked now, marked in the tree; undefined for none.
    readonly chosenId: EntityId | undefined;
    readonly placeEntity: (entityId: EntityId) => TriggerPartValue;
};

// What clicking a word opens: a menu, a menu in titled groups, a menu whose items open submenus, the entity
// picker, or a small field to type into.
export type TriggerWordEntry =
    | { readonly kind: 'menu'; readonly choices: readonly TriggerChoice[] }
    | { readonly kind: 'groups'; readonly groups: readonly TriggerMenuGroup[] }
    | { readonly kind: 'submenus'; readonly submenus: readonly TriggerSubmenu[] }
    | TriggerEntitiesEntry
    | TriggerTypedEntry;

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
