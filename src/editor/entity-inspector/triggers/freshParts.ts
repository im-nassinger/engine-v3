import type { Action, ActionKind, Check, Target, When, WhenKind } from '../../../core/fields/index.ts';

// "pick an entity": a target not picked yet.
export const UNSET_TARGET: Target = { kind: 'entity', entity: null };

const THIS_TARGET: Target = { kind: 'this' };

// A When of this kind with its own parts unset, as picking a new event gives.
export function freshWhen(kind: WhenKind): When {
    switch (kind) {
        case 'input':
            return { kind, input: null, how: 'pressed' };
        case 'key':
            return { kind, key: null, how: 'pressed' };
        case 'after':
        case 'every':
            return { kind, seconds: null };
        case 'custom':
            return { kind, name: null };
        case 'variableChanged':
            return { kind, variable: null, becomes: null };
        default:
            return { kind };
    }
}

// The value check, its value still to pick: about `other` when the event has one, as most checks are ("other
// has the tag player"), else about `this`.
export function freshCheck(eventHasOther: boolean): Check {
    let target = THIS_TARGET;
    if (eventHasOther) {
        target = { kind: 'other' };
    }

    return { kind: 'value', target, value: null, compare: 'is', amount: null };
}

// An action of this kind, keeping the target it replaces when it has one, so destroy other turns into fire
// on other.
export function freshAction(kind: ActionKind, keptTarget: Target | undefined): Action {
    const target = keptTarget ?? THIS_TARGET;

    switch (kind) {
        case 'change':
            return { kind, target, value: null, op: 'add', amount: null };
        case 'destroy':
            return { kind, target };
        case 'fire':
            return { kind, target, name: null, amount: null };
        case 'wait':
            return { kind, seconds: null };
        default:
            return { kind };
    }
}

export function targetOf(action: Action) {
    switch (action.kind) {
        case 'change':
        case 'destroy':
        case 'fire':
            return action.target;
        default:
            return undefined;
    }
}
