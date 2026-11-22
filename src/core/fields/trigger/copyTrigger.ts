import type { JsonValue } from '../JsonValue.ts';

import type { Action, Check, Push, Repeat, Target, Trigger, ValueRef, When } from './Trigger.ts';

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
        repeat: copyRepeat(trigger.repeat),
    };
}

function copyWhen(when: When | null): When | null {
    if (when === null) return null;

    switch (when.kind) {
        case 'touched':
        case 'untouched':
        case 'levelStart':
            return { kind: when.kind };
        case 'input':
            return { kind: 'input', input: when.input, how: when.how };
        case 'key':
            return { kind: 'key', key: when.key, how: when.how };
        case 'after':
        case 'every':
            return { kind: when.kind, seconds: when.seconds };
        case 'tagLeft':
            return { kind: 'tagLeft', tag: when.tag };
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
    if (check.kind === 'hasTag') {
        return { kind: 'hasTag', target: copyTarget(check.target), tag: check.tag };
    }

    return { kind: 'compare', variable: check.variable, compare: check.compare, value: check.value };
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
        case 'push':
            return { kind: 'push', target: copyTarget(action.target), push: copyPush(action.push) };
        case 'win':
        case 'lose':
        case 'restart':
            return { kind: action.kind };
    }
}

function copyPush(push: Push | null): Push | null {
    if (push === null) return null;
    if (push.kind === 'by') return { kind: 'by', x: push.x, y: push.y };

    return { kind: push.kind, strength: push.strength };
}

function copyValueRef(value: ValueRef | null): ValueRef | null {
    if (value === null) return null;

    switch (value.kind) {
        case 'variable':
            return { kind: 'variable', name: value.name };
        case 'field':
            if (value.axis === undefined) {
                return { kind: 'field', component: value.component, field: value.field };
            }

            return { kind: 'field', component: value.component, field: value.field, axis: value.axis };
        case 'tag':
            return { kind: 'tag' };
        case 'triggerOn':
            return { kind: 'triggerOn', trigger: value.trigger };
    }
}

function copyRepeat(repeat: Repeat): Repeat {
    if (repeat.kind === 'atMostEvery') return { kind: 'atMostEvery', seconds: repeat.seconds };

    return { kind: repeat.kind };
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
