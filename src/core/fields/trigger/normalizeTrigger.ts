import { MAX_STRING_VARIABLE_LENGTH } from '../variables/VariableValue.ts';
import type { VariableValue } from '../variables/VariableValue.ts';
import { wordName } from '../names/wordName.ts';
import { clamp } from '../rawChecks.ts';
import type { JsonValue } from '../JsonValue.ts';

import type { Action, Check, Condition, Repeat, Target, Trigger, ValueRef, VariableRef, When } from './Trigger.ts';

// The same as an entity's name.
export const MAX_TRIGGER_NAME_LENGTH = 60;
// A day: a timer longer than that is a mistake, and the tick count it makes stays small.
export const MAX_TRIGGER_SECONDS = 86_400;
// An hour: a Wait holds a run in play until it is due, so a long one is a mistake.
export const MAX_WAIT_SECONDS = 3600;

// The trigger made clean: its own name trimmed (null when empty), every tag, variable, input and custom event
// name made a word (null when nothing is left, so it reads as unset), every time between 0 s and a day, a
// Wait's between 0 s and an hour, and a string compared cut as a string variable is.
export function normalizeTrigger(trigger: Trigger): Trigger {
    return {
        id: trigger.id,
        name: normalizeName(trigger.name),
        on: trigger.on,
        when: normalizeWhen(trigger.when),
        checks: trigger.checks.map(normalizeCheck),
        actions: trigger.actions.map(normalizeAction),
        repeat: normalizeRepeat(trigger.repeat),
    };
}

function normalizeName(name: string | null) {
    if (name === null) return null;

    const trimmed = name.trim().slice(0, MAX_TRIGGER_NAME_LENGTH);
    if (trimmed === '') return null;

    return trimmed;
}

// A word, or null when it is unset or nothing is left of it.
function wordOrNull(typed: string | null) {
    if (typed === null) return null;

    const word = wordName(typed);
    if (word === '') return null;

    return word;
}

function normalizeSeconds(seconds: number) {
    return clamp(seconds, 0, MAX_TRIGGER_SECONDS);
}

function normalizeWhen(when: When | null): When | null {
    if (when === null) return null;

    switch (when.kind) {
        case 'input':
            return { kind: 'input', input: wordOrNull(when.input), how: when.how };
        case 'after':
        case 'every':
            if (when.seconds === null) return { kind: when.kind, seconds: null };

            return { kind: when.kind, seconds: normalizeSeconds(when.seconds) };
        case 'tagLeft':
            return { kind: 'tagLeft', tag: wordOrNull(when.tag) };
        case 'custom':
            return { kind: 'custom', name: wordOrNull(when.name) };
        case 'variableChanged':
            return {
                kind: 'variableChanged',
                variable: normalizeVariableRef(when.variable),
                becomes: normalizeCondition(when.becomes),
            };
        default:
            return when;
    }
}

function normalizeVariableRef(variable: VariableRef | null): VariableRef | null {
    if (variable === null) return null;

    const name = wordOrNull(variable.name);
    if (name === null) return null;
    if (variable.owner === 'level') return { owner: 'level', name };

    return { owner: 'own', target: normalizeTarget(variable.target), name };
}

function normalizeCondition(condition: Condition | null): Condition | null {
    if (condition === null) return null;

    return { compare: condition.compare, value: normalizeVariableValue(condition.value) };
}

function normalizeVariableValue(value: VariableValue) {
    if (typeof value !== 'string') return value;

    return value.slice(0, MAX_STRING_VARIABLE_LENGTH);
}

function normalizeTarget(target: Target): Target {
    if (target.kind !== 'tagged') return target;

    return { kind: 'tagged', tag: wordOrNull(target.tag) };
}

function normalizeCheck(check: Check): Check {
    if (check.kind === 'hasTag') {
        return { kind: 'hasTag', target: normalizeTarget(check.target), tag: wordOrNull(check.tag) };
    }

    if (check.kind === 'compare') {
        const value = check.value === null ? null : normalizeVariableValue(check.value);

        return { ...check, variable: normalizeVariableRef(check.variable), value };
    }

    return { ...check, target: normalizeTarget(check.target) };
}

function normalizeAction(action: Action): Action {
    switch (action.kind) {
        case 'change': {
            const whole = wholeVectorChange(action.value, action.amount);
            const value = normalizeValueRef(whole.value);
            const amount = normalizeAmount(value, whole.amount);

            return { kind: 'change', target: normalizeTarget(action.target), value, op: action.op, amount };
        }
        case 'destroy':
            return { kind: 'destroy', target: normalizeTarget(action.target) };
        case 'push':
            return { kind: 'push', target: normalizeTarget(action.target), push: action.push };
        case 'fire':
            return { ...action, target: normalizeTarget(action.target), name: wordOrNull(action.name) };
        case 'wait':
            if (action.seconds === null) return action;

            return { kind: 'wait', seconds: clamp(action.seconds, 0, MAX_WAIT_SECONDS) };
        default:
            return action;
    }
}

function normalizeValueRef(value: ValueRef | null): ValueRef | null {
    if (value?.kind !== 'variable') return value;

    const name = wordOrNull(value.name);
    if (name === null) return null;

    return { ...value, name };
}

// Before 2026-11-23 a vector was added to one axis at a time, `{ ..., "axis": "x" }` with a number. It is
// now added whole, so such a change reads as the same vector with 0 on the other axis.
function wholeVectorChange(value: ValueRef | null, amount: JsonValue | null) {
    if (value?.kind !== 'field' || value.axis === undefined) return { value, amount };

    const wholeValue: ValueRef = { kind: 'field', component: value.component, field: value.field };
    if (typeof amount !== 'number') return { value: wholeValue, amount };

    const wholeAmount = value.axis === 'x' ? { x: amount, y: 0 } : { x: 0, y: amount };
    return { value: wholeValue, amount: wholeAmount };
}

// A tag added or removed is a word like any tag. Any other amount is checked by its field's type in play.
function normalizeAmount(value: ValueRef | null, amount: JsonValue | null) {
    const isTagAmount = value?.kind === 'tag' && typeof amount === 'string';
    if (!isTagAmount) return amount;

    return wordOrNull(amount);
}

function normalizeRepeat(repeat: Repeat): Repeat {
    if (repeat.kind !== 'atMostEvery') return repeat;

    return { kind: 'atMostEvery', seconds: normalizeSeconds(repeat.seconds) };
}
