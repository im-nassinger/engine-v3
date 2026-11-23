import type {
    Action,
    ActionKind,
    Check,
    CheckKind,
    Push,
    Repeat,
    RepeatKind,
    Target,
    When,
    WhenKind,
} from '../../../core/fields/index.ts';

// "pick who": a target not picked yet.
export const UNSET_TARGET: Target = { kind: 'entity', entity: null };

const THIS_TARGET: Target = { kind: 'this' };

// The kick the menu's "by" starts with: up, as a jump pad.
const DEFAULT_PUSH_BY: Push = { kind: 'by', x: 0, y: -600 };
const DEFAULT_PUSH_STRENGTH = 400;
const DEFAULT_REPEAT_SECONDS = 1;

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
        case 'tagLeft':
            return { kind, tag: null };
        case 'custom':
            return { kind, name: null };
        case 'variableChanged':
            return { kind, variable: null, becomes: null };
        default:
            return { kind };
    }
}

// Add check's kinds. The tag check starts on `other` when the event has one, as most do; the component value
// check on `this`.
export function freshCheck(kind: CheckKind, eventHasOther: boolean): Check {
    if (kind === 'compare') return { kind, variable: null, compare: 'atLeast', value: null };
    if (kind === 'compareValue') return { kind, target: THIS_TARGET, value: null, compare: 'more', amount: null };

    let target = UNSET_TARGET;
    if (eventHasOther) {
        target = { kind: 'other' };
    }

    return { kind, target, tag: null };
}

// An action of this kind, keeping the target it replaces when it has one, so destroy other turns into
// push other.
export function freshAction(kind: ActionKind, keptTarget: Target | undefined): Action {
    const target = keptTarget ?? THIS_TARGET;

    switch (kind) {
        case 'change':
            return { kind, target, value: null, op: 'add', amount: null };
        case 'destroy':
            return { kind, target };
        case 'push':
            return { kind, target, push: null };
        case 'fire':
            return { kind, target, name: null, amount: null };
        case 'wait':
            return { kind, seconds: null };
        default:
            return { kind };
    }
}

export function freshPush(kind: Push['kind']): Push {
    if (kind === 'by') return DEFAULT_PUSH_BY;

    return { kind, strength: DEFAULT_PUSH_STRENGTH };
}

export function freshRepeat(kind: RepeatKind): Repeat {
    if (kind === 'atMostEvery') return { kind, seconds: DEFAULT_REPEAT_SECONDS };

    return { kind };
}

export function targetOf(action: Action) {
    switch (action.kind) {
        case 'change':
        case 'destroy':
        case 'push':
        case 'fire':
            return action.target;
        default:
            return undefined;
    }
}
