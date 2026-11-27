import type { Action, Check, Compare, VariableValue, When } from '../../../../../src/core/fields/index.ts';
import type { Entity } from '../../../../../src/core/level/index.ts';

// The trigger blocks the example platformer is made of, in the words of the trigger card. Every variable
// here is the blob's own, read and changed on `this` unless an entity is named.
const THIS = { kind: 'this' } as const;

export type Axis = 'velocityX' | 'velocityY';

export function everyTick(): When {
    return { kind: 'every', time: 1, unit: 'ticks' };
}

export function whenEvent(name: string): When {
    return { kind: 'custom', name };
}

export function whenInput(input: string, how: 'pressed' | 'released'): When {
    return { kind: 'input', input, how };
}

export function whenOwnVariableBecomes(name: string, value: VariableValue): When {
    const variable = { owner: 'own', target: THIS, name } as const;

    return { kind: 'variableChanged', variable, becomes: { compare: 'is', value } };
}

export function fire(name: string): Action {
    return { kind: 'fire', target: THIS, name, amount: null };
}

export function ifOwn(name: string, compare: Compare, amount: VariableValue): Check {
    const value = { kind: 'variable', name, own: true } as const;

    return { kind: 'value', target: THIS, value, compare, amount };
}

// Compares an own variable with another own variable, read when the check runs.
export function ifOwnAgainst(name: string, compare: Compare, otherName: string): Check {
    const value = { kind: 'variable', name, own: true } as const;
    const amount = { kind: 'variable', name: otherName, own: true } as const;

    return { kind: 'value', target: THIS, value, compare, amount };
}

export function ifVelocity(axis: Axis, compare: Compare, amount: number): Check {
    return { kind: 'value', target: THIS, value: { kind: 'live', live: axis }, compare, amount };
}

export function setOwn(name: string, amount: VariableValue): Action {
    return { kind: 'change', target: THIS, value: { kind: 'variable', name, own: true }, op: 'set', amount };
}

export function addOwn(name: string, amount: number): Action {
    return { kind: 'change', target: THIS, value: { kind: 'variable', name, own: true }, op: 'add', amount };
}

// Change value with another own variable in the amount box.
export function changeOwnBy(name: string, op: 'set' | 'add' | 'subtract', otherName: string): Action {
    const value = { kind: 'variable', name, own: true } as const;
    const amount = { kind: 'variable', name: otherName, own: true } as const;

    return { kind: 'change', target: THIS, value, op, amount };
}

// Changes an own variable of another entity, such as the Feet counting on the blob.
export function addToVariableOf(entity: Entity, name: string, amount: number): Action {
    const target = { kind: 'entity', entity: entity.id } as const;

    return { kind: 'change', target, value: { kind: 'variable', name, own: true }, op: 'add', amount };
}

export function addVelocity(x: number, y: number): Action {
    return { kind: 'change', target: THIS, value: { kind: 'velocity' }, op: 'add', amount: { x, y } };
}

export function setOpacityOfTagged(tag: string, opacity: number): Action {
    const target = { kind: 'tagged', tag } as const;
    const value = { kind: 'field', component: 'StyleComponent', field: 'opacity' } as const;

    return { kind: 'change', target, value, op: 'set', amount: opacity };
}

export function win(): Action {
    return { kind: 'win' };
}

export function otherHasTag(tag: string): Check {
    return { kind: 'value', target: { kind: 'other' }, value: { kind: 'tag' }, compare: 'is', amount: tag };
}
