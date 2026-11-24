import type { TriggerComponent } from '../../../core/components/index.ts';
import { MAX_WAIT_SECONDS, TriggerFieldType } from '../../../core/fields/index.ts';
import type { Action, Check, JsonValue, Trigger, VariableValue, When } from '../../../core/fields/index.ts';
import { newTriggerId, triggerName } from '../../../core/triggers/index.ts';
import type { TriggerPart } from '../../../core/triggers/index.ts';

import type { TriggerPartValue, TriggerWordAddress, TriggerWordSlot } from './TriggerWord.ts';

// What one edit of the trigger card commits as one step: the component's new list, the id the next new
// trigger gets, and the step's label, such as `Change trigger "Touched"`.
export type TriggerEdit = {
    readonly label: string;
    readonly triggers: readonly Trigger[];
    readonly nextTriggerId: number;
};

const TRIGGER_TYPE = new TriggerFieldType();

// Every edit of the trigger card, each a fresh list. A picked menu item puts its row in place (or adds it,
// for Add check and Add action); a typed number goes into its word; the head's switch, Rename, Duplicate and
// Delete, and dragging a trigger, change the list itself. The write checks what is typed.
export class TriggerEdits {
    static added(component: TriggerComponent): TriggerEdit {
        const id = newTriggerId(component);
        const trigger: Trigger = {
            id,
            name: null,
            on: true,
            when: null,
            checks: [],
            actions: [],
            repeat: { kind: 'everyTime' },
        };
        const triggers = [...copiedTriggers(component), trigger];

        return { label: 'Add trigger', triggers, nextTriggerId: id + 1 };
    }

    // A menu item picked on a word, or on Add check or Add action, whose item names the place past the end.
    static picked(component: TriggerComponent, triggerIndex: number, value: TriggerPartValue) {
        const trigger = triggerAt(component, triggerIndex);
        const name = triggerName(trigger);
        const changed = withPart(trigger, value);

        let label = `Change trigger "${name}"`;
        if (value.section === 'check' && value.index === trigger.checks.length) {
            label = `Add check to trigger "${name}"`;
        }
        if (value.section === 'action' && value.index === trigger.actions.length) {
            label = `Add action to trigger "${name}"`;
        }

        return replaced(component, triggerIndex, changed, label);
    }

    // A menu item that asks for a value first, such as "becomes … or more" or "New name…": the pick and the
    // typed value are one step. Undefined when the value doesn't fit the word.
    static pickedAndTyped(
        component: TriggerComponent,
        triggerIndex: number,
        value: TriggerPartValue,
        address: TriggerWordAddress,
        typed: JsonValue,
    ) {
        const picked = TriggerEdits.picked(component, triggerIndex, value);
        const pickedTrigger = picked.triggers[triggerIndex] as Trigger;
        const changed = withTyped(pickedTrigger, address, typed);
        if (changed === undefined) return undefined;

        const triggers = [...picked.triggers];
        triggers[triggerIndex] = changed;

        return { ...picked, triggers };
    }

    // A value typed into a word: seconds, a compared value, an amount, a Repeat's time, a custom
    // event's name, a condition's value; null clears Fire's optional number.
    static typed(component: TriggerComponent, triggerIndex: number, address: TriggerWordAddress, typed: JsonValue) {
        const trigger = triggerAt(component, triggerIndex);
        const changed = withTyped(trigger, address, typed);
        if (changed === undefined) return undefined;

        const name = triggerName(trigger);
        return replaced(component, triggerIndex, changed, `Change trigger "${name}"`);
    }

    // A check's or action's ×.
    static removed(component: TriggerComponent, triggerIndex: number, part: TriggerPart) {
        const trigger = triggerAt(component, triggerIndex);
        const name = triggerName(trigger);

        if (part.section === 'check') {
            const checks = trigger.checks.filter((_check, index) => index !== part.index);
            return replaced(component, triggerIndex, { ...trigger, checks }, `Remove check from trigger "${name}"`);
        }
        if (part.section === 'action') {
            const actions = trigger.actions.filter((_action, index) => index !== part.index);
            return replaced(component, triggerIndex, { ...trigger, actions }, `Remove action from trigger "${name}"`);
        }

        throw new Error("A trigger's When can't be removed.");
    }

    static switched(component: TriggerComponent, triggerIndex: number) {
        const trigger = triggerAt(component, triggerIndex);
        const name = triggerName(trigger);
        const on = !trigger.on;

        let label = `Switch off trigger "${name}"`;
        if (on) {
            label = `Switch on trigger "${name}"`;
        }

        return replaced(component, triggerIndex, { ...trigger, on }, label);
    }

    // An empty name gives the trigger back the name made from its When.
    static renamed(component: TriggerComponent, triggerIndex: number, typedName: string) {
        const trigger = triggerAt(component, triggerIndex);
        const name = triggerName(trigger);
        const renamedTrigger = TRIGGER_TYPE.normalize({ ...trigger, name: typedName });

        return replaced(component, triggerIndex, renamedTrigger, `Rename trigger "${name}"`);
    }

    // The copy goes right under the trigger, with an id of its own.
    static duplicated(component: TriggerComponent, triggerIndex: number): TriggerEdit {
        const trigger = triggerAt(component, triggerIndex);
        const id = newTriggerId(component);
        const copy = { ...TRIGGER_TYPE.clone(trigger), id };
        const triggers = copiedTriggers(component);
        triggers.splice(triggerIndex + 1, 0, copy);

        const name = triggerName(trigger);
        return { label: `Duplicate trigger "${name}"`, triggers, nextTriggerId: id + 1 };
    }

    static deleted(component: TriggerComponent, triggerIndex: number): TriggerEdit {
        const trigger = triggerAt(component, triggerIndex);
        const triggers = copiedTriggers(component).filter((_trigger, index) => index !== triggerIndex);
        const nextTriggerId = newTriggerId(component);

        const name = triggerName(trigger);
        return { label: `Delete trigger "${name}"`, triggers, nextTriggerId };
    }

    // Dragged to another place, which also changes when it runs. undefined when it stays where it is.
    static moved(component: TriggerComponent, fromIndex: number, toIndex: number): TriggerEdit | undefined {
        const trigger = triggerAt(component, fromIndex);
        const triggers = copiedTriggers(component);
        const lastIndex = triggers.length - 1;
        const placeIndex = Math.min(Math.max(toIndex, 0), lastIndex);
        if (placeIndex === fromIndex) return undefined;

        const [moving] = triggers.splice(fromIndex, 1);
        triggers.splice(placeIndex, 0, moving as Trigger);

        const name = triggerName(trigger);
        const nextTriggerId = newTriggerId(component);
        return { label: `Move trigger "${name}"`, triggers, nextTriggerId };
    }
}

function triggerAt(component: TriggerComponent, triggerIndex: number) {
    const trigger = component.get('triggers')[triggerIndex];
    if (trigger === undefined) throw new Error(`The component has no trigger ${triggerIndex}.`);

    return trigger;
}

function copiedTriggers(component: TriggerComponent) {
    return component.get('triggers').map((trigger) => TRIGGER_TYPE.clone(trigger));
}

function replaced(component: TriggerComponent, triggerIndex: number, trigger: Trigger, label: string): TriggerEdit {
    const triggers = copiedTriggers(component);
    triggers[triggerIndex] = trigger;
    const nextTriggerId = newTriggerId(component);

    return { label, triggers, nextTriggerId };
}

// A new event resets the When's own parts and keeps the checks and actions, as the choice already holds.
function withPart(trigger: Trigger, value: TriggerPartValue): Trigger {
    switch (value.section) {
        case 'when':
            return { ...trigger, when: value.when };
        case 'repeat':
            return { ...trigger, repeat: value.repeat };
        case 'check': {
            const checks = withItemAt(trigger.checks, value.index, value.check);
            return { ...trigger, checks };
        }
        case 'action': {
            const actions = withItemAt(trigger.actions, value.index, value.action);
            return { ...trigger, actions };
        }
    }
}

// The item in place, or added at the end when the index is just past it.
function withItemAt<T>(items: readonly T[], index: number, item: T) {
    if (index < 0 || index > items.length) throw new Error(`No place ${index} in a list of ${items.length}.`);

    const changed = [...items];
    changed[index] = item;

    return changed;
}

function withTyped(trigger: Trigger, address: TriggerWordAddress, typed: JsonValue): Trigger | undefined {
    const { part, slot } = address;

    switch (part.section) {
        case 'when': {
            const when = whenWithTyped(trigger.when, slot, typed);
            if (when === undefined) return undefined;

            return { ...trigger, when };
        }
        case 'repeat':
            if (slot !== 'repeatSeconds' || !isNumber(typed) || trigger.repeat.kind !== 'atMostEvery') return undefined;

            return { ...trigger, repeat: { kind: 'atMostEvery', seconds: typed } };
        case 'check': {
            const check = trigger.checks[part.index];
            if (check === undefined) return undefined;

            const typedCheck = checkWithTyped(check, slot, typed);
            if (typedCheck === undefined) return undefined;

            return withPart(trigger, { section: 'check', index: part.index, check: typedCheck });
        }
        case 'action': {
            const action = trigger.actions[part.index];
            if (action === undefined) return undefined;

            const typedAction = actionWithTyped(action, slot, typed);
            if (typedAction === undefined) return undefined;

            return withPart(trigger, { section: 'action', index: part.index, action: typedAction });
        }
    }
}

function isNumber(typed: JsonValue): typed is number {
    return typeof typed === 'number' && Number.isFinite(typed);
}

function isVariableValue(typed: JsonValue): typed is VariableValue {
    return isNumber(typed) || typeof typed === 'string' || typeof typed === 'boolean';
}

function whenWithTyped(when: When | null, slot: TriggerWordSlot, typed: JsonValue): When | undefined {
    if (when === null) return undefined;

    const isTimer = when.kind === 'after' || when.kind === 'every';
    if (isTimer && slot === 'seconds' && isNumber(typed)) return { kind: when.kind, seconds: typed };
    if (when.kind === 'custom' && slot === 'name' && typeof typed === 'string') return { ...when, name: typed };

    const hasCondition = when.kind === 'variableChanged' && when.becomes !== null;
    if (!hasCondition || slot !== 'becomes' || !isVariableValue(typed)) return undefined;

    return { ...when, becomes: { compare: when.becomes.compare, value: typed } };
}

// The value check's amount: a tag or a variable's value, or a number for the rest.
function checkWithTyped(check: Check, slot: TriggerWordSlot, typed: JsonValue): Check | undefined {
    if (slot !== 'amount' || !isVariableValue(typed)) return undefined;

    const readsNumber = check.value !== null && check.value.kind !== 'variable' && check.value.kind !== 'tag';
    if (readsNumber && !isNumber(typed)) return undefined;
    if (check.value?.kind === 'tag' && typeof typed !== 'string') return undefined;

    return { ...check, amount: typed };
}

function actionWithTyped(action: Action, slot: TriggerWordSlot, typed: JsonValue): Action | undefined {
    switch (action.kind) {
        case 'change':
            if (slot !== 'amount') return undefined;

            return { ...action, amount: typed };
        case 'fire':
            if (slot === 'name' && typeof typed === 'string') return { ...action, name: typed };
            if (slot === 'amount' && (typed === null || isNumber(typed))) return { ...action, amount: typed };

            return undefined;
        case 'wait': {
            if (slot !== 'seconds' || !isNumber(typed)) return undefined;

            const seconds = Math.min(Math.max(typed, 0), MAX_WAIT_SECONDS);
            return { ...action, seconds };
        }
        default:
            return undefined;
    }
}
