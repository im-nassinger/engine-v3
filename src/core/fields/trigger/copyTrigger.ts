import type { JsonValue } from '../JsonValue.ts';

import type {
    Action,
    Check,
    CheckedValue,
    Condition,
    Target,
    Trigger,
    ValueRef,
    VariableRef,
    When,
} from './Trigger.ts';

// A copy sharing nothing with the trigger, its keys always in the same order, so two equal triggers save
// as the same text. The optional axis is left out when it isn't set.
export function copyTrigger(trigger: Trigger): Trigger {
    return {
        id: trigger.id,
        name: trigger.name,
        on: trigger.on,
        when: copyWhen(trigger.when),
        checks: trigger.checks.map(copyCheck),
        actions: trigger.actions.map(copyAction),
    };
}

function copyWhen(when: When | null): When | null {
    if (when === null) return null;

    switch (when.kind) {
        case 'touched':
        case 'untouched':
        case 'levelStart':
            return { kind: when.kind };
        case 'custom':
            return { kind: 'custom', name: when.name };
        case 'variableChanged':
            return {
                kind: 'variableChanged',
                variable: copyVariableRef(when.variable),
                becomes: copyCondition(when.becomes),
            };
        case 'input':
            return { kind: 'input', input: when.input, how: when.how };
        case 'key':
            return { kind: 'key', key: when.key, how: when.how };
        case 'after':
        case 'every':
            return { kind: when.kind, seconds: when.seconds };
    }
}

export function copyTarget(target: Target): Target {
    switch (target.kind) {
        case 'this':
        case 'other':
            return { kind: target.kind };
        case 'entity':
            return { kind: 'entity', entity: target.entity };
        case 'tagged':
            return { kind: 'tagged', tag: target.tag };
    }
}

function copyCheck(check: Check): Check {
    return {
        kind: 'value',
        target: copyTarget(check.target),
        value: copyCheckedValue(check.value),
        compare: check.compare,
        amount: check.amount,
    };
}

export function copyVariableRef(variable: VariableRef | null): VariableRef | null {
    if (variable === null) return null;
    if (variable.owner === 'level') return { owner: 'level', name: variable.name };

    return { owner: 'own', target: copyTarget(variable.target), name: variable.name };
}

function copyCondition(condition: Condition | null): Condition | null {
    if (condition === null) return null;

    return { compare: condition.compare, value: condition.value };
}

function copyCheckedValue(value: CheckedValue | null): CheckedValue | null {
    if (value === null) return null;

    switch (value.kind) {
        case 'variable':
            if (value.own === undefined) return { kind: 'variable', name: value.name };

            return { kind: 'variable', name: value.name, own: true };
        case 'tag':
            return { kind: 'tag' };
        case 'live':
            return { kind: 'live', live: value.live };
        case 'field':
            if (value.axis === undefined) return { kind: 'field', component: value.component, field: value.field };

            return { kind: 'field', component: value.component, field: value.field, axis: value.axis };
    }
}

function copyAction(action: Action): Action {
    switch (action.kind) {
        case 'change':
            return {
                kind: 'change',
                target: copyTarget(action.target),
                value: copyValueRef(action.value),
                op: action.op,
                amount: copyJson(action.amount),
            };
        case 'destroy':
            return { kind: 'destroy', target: copyTarget(action.target) };
        case 'win':
        case 'lose':
        case 'restart':
            return { kind: action.kind };
        case 'fire':
            return { kind: 'fire', target: copyTarget(action.target), name: action.name, amount: action.amount };
        case 'wait':
            return { kind: 'wait', seconds: action.seconds };
    }
}

function copyValueRef(value: ValueRef | null): ValueRef | null {
    if (value === null) return null;

    switch (value.kind) {
        case 'variable':
            if (value.own === undefined) return { kind: 'variable', name: value.name };

            return { kind: 'variable', name: value.name, own: true };
        case 'field':
            if (value.axis === undefined) {
                return { kind: 'field', component: value.component, field: value.field };
            }

            return { kind: 'field', component: value.component, field: value.field, axis: value.axis };
        case 'tag':
            return { kind: 'tag' };
        case 'triggerOn':
            return { kind: 'triggerOn', trigger: value.trigger };
        case 'velocity':
            return { kind: 'velocity' };
    }
}

function copyJson(value: JsonValue | null): JsonValue | null {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(copyJson);

    const record: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
        record[key] = copyJson(item);
    }

    return record;
}

// Equal when both hold the same data, whatever the order of an amount's keys.
export function jsonEquals(first: unknown, second: unknown): boolean {
    if (first === second) return true;
    if (typeof first !== 'object' || typeof second !== 'object') return false;
    if (first === null || second === null) return false;

    if (Array.isArray(first) || Array.isArray(second)) {
        if (!Array.isArray(first) || !Array.isArray(second)) return false;
        if (first.length !== second.length) return false;

        return first.every((item: unknown, index) => jsonEquals(item, second[index]));
    }

    const firstEntries = Object.entries(first).filter(([, item]) => item !== undefined);
    const secondRecord = second as Readonly<Record<string, unknown>>;
    const secondCount = Object.values(second).filter((item) => item !== undefined).length;
    if (firstEntries.length !== secondCount) return false;

    return firstEntries.every(([key, item]) => jsonEquals(item, secondRecord[key]));
}
