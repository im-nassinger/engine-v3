import { describe, expect, test } from 'vitest';

import {
    InputComponent,
    TransformComponent,
    TriggerComponent,
    VariablesComponent,
    createV1Registry,
} from '../../components/index.ts';
import type { Action, Check, Target, Trigger, When } from '../../fields/index.ts';
import type { KeyCode } from '../../keys/index.ts';
import { Level } from '../../level/index.ts';

import { stopsTrigger, triggerCanRun, triggerProblems } from './triggerProblems.ts';
import type { TriggerContext } from './triggerProblems.ts';

const registry = createV1Registry();

// A level whose World has `coins`, `mood` (a string) and the input `jump`, and a door holding a trigger with
// ids 1 and 2 and its own `health`, `label` (a string) and `open` (a boolean).
function buildContext(): TriggerContext {
    const level = Level.createNew();
    level.world.removeComponent(InputComponent);
    level.world.addComponent(new InputComponent({ inputs: [{ name: 'jump', keys: ['Space' as KeyCode] }] }));
    const levelVariables = [
        { name: 'coins', value: 0 },
        { name: 'mood', value: 'calm' },
    ];
    level.world.addComponent(new VariablesComponent({ variables: levelVariables }));

    const owner = level.createEntity(level.world, 0);
    owner.addComponent(new TransformComponent());
    const ownVariables = [
        { name: 'health', value: 3 },
        { name: 'label', value: 'shut' },
        { name: 'open', value: false },
    ];
    owner.addComponent(new VariablesComponent({ variables: ownVariables }));
    owner.addComponent(new TriggerComponent({ triggers: [trigger({ id: 1 }), trigger({ id: 2 })], nextTriggerId: 3 }));

    return { owner, level, registry };
}

function trigger(parts: Partial<Trigger>): Trigger {
    return {
        id: 1,
        name: null,
        on: true,
        when: { kind: 'touched' },
        checks: [],
        actions: [],
        ...parts,
    };
}

function problemsOf(parts: Partial<Trigger>, context = buildContext()) {
    return triggerProblems(trigger(parts), context).map(({ part, slot, reason }) => ({ ...part, slot, reason }));
}

const WHEN = { section: 'when' } as const;

const WHEN_CASES: readonly (readonly [When | null, readonly object[]])[] = [
    [null, [{ ...WHEN, slot: 'event', reason: 'unset' }]],
    [{ kind: 'touched' }, []],
    [{ kind: 'untouched' }, []],
    [{ kind: 'input', input: 'jump', how: 'pressed' }, []],
    [{ kind: 'input', input: null, how: 'held' }, [{ ...WHEN, slot: 'input', reason: 'unset' }]],
    [{ kind: 'input', input: 'fly', how: 'held' }, [{ ...WHEN, slot: 'input', reason: 'unknownInput' }]],
    [{ kind: 'key', key: 'KeyW' as KeyCode, how: 'released' }, []],
    [{ kind: 'key', key: null, how: 'pressed' }, [{ ...WHEN, slot: 'key', reason: 'unset' }]],
    [{ kind: 'after', seconds: 60 }, []],
    [{ kind: 'after', seconds: null }, [{ ...WHEN, slot: 'seconds', reason: 'unset' }]],
    [{ kind: 'every', seconds: 2 }, []],
    [{ kind: 'every', seconds: null }, [{ ...WHEN, slot: 'seconds', reason: 'unset' }]],
    [{ kind: 'levelStart' }, []],
    [{ kind: 'custom', name: 'open' }, []],
    [{ kind: 'custom', name: null }, [{ ...WHEN, slot: 'name', reason: 'unset' }]],
    [{ kind: 'custom', name: 'touched' }, [{ ...WHEN, slot: 'name', reason: 'reservedName' }]],
    [{ kind: 'custom', name: 'level_start' }, [{ ...WHEN, slot: 'name', reason: 'reservedName' }]],
    [{ kind: 'variableChanged', variable: { owner: 'level', name: 'coins' }, becomes: null }, []],
    [
        {
            kind: 'variableChanged',
            variable: { owner: 'level', name: 'coins' },
            becomes: { compare: 'atLeast', value: 10 },
        },
        [],
    ],
    [{ kind: 'variableChanged', variable: null, becomes: null }, [{ ...WHEN, slot: 'variable', reason: 'unset' }]],
    [
        { kind: 'variableChanged', variable: { owner: 'level', name: 'lives' }, becomes: null },
        [{ ...WHEN, slot: 'variable', reason: 'unknownVariable' }],
    ],
    [
        {
            kind: 'variableChanged',
            variable: { owner: 'own', target: { kind: 'this' }, name: 'open' },
            becomes: { compare: 'is', value: true },
        },
        [],
    ],
    [
        { kind: 'variableChanged', variable: { owner: 'own', target: { kind: 'this' }, name: 'coins' }, becomes: null },
        [{ ...WHEN, slot: 'variable', reason: 'unknownVariable' }],
    ],
    [
        {
            kind: 'variableChanged',
            variable: { owner: 'level', name: 'mood' },
            becomes: { compare: 'more', value: 'calm' },
        },
        [{ ...WHEN, slot: 'compare', reason: 'wrongType' }],
    ],
    [
        {
            kind: 'variableChanged',
            variable: { owner: 'own', target: { kind: 'this' }, name: 'open' },
            becomes: { compare: 'is', value: 1 },
        },
        [{ ...WHEN, slot: 'number', reason: 'wrongType' }],
    ],
];

const CHECK = { section: 'check', index: 0 } as const;

// The value check, `this` unless said otherwise.
function check(value: Check['value'], compare: Check['compare'], amount: Check['amount'], target?: Target): Check {
    return { kind: 'value', target: target ?? { kind: 'this' }, value, compare, amount };
}

const TAG = { kind: 'tag' } as const;
const OTHER = { kind: 'other' } as const;

function levelVariable(name: string) {
    return { kind: 'variable', name } as const;
}

function ownVariable(name: string) {
    return { kind: 'variable', name, own: true } as const;
}

const CHECK_CASES: readonly (readonly [Check, readonly object[]])[] = [
    [check(TAG, 'is', 'player', OTHER), []],
    [check(TAG, 'isNot', 'player', OTHER), []],
    [check(TAG, 'is', null, OTHER), [{ ...CHECK, slot: 'amount', reason: 'unset' }]],
    [check(TAG, 'more', 'player', OTHER), [{ ...CHECK, slot: 'compare', reason: 'wrongType' }]],
    [check(TAG, 'is', 3, OTHER), [{ ...CHECK, slot: 'amount', reason: 'wrongType' }]],
    [check(TAG, 'is', 'player', { kind: 'tagged', tag: null }), [{ ...CHECK, slot: 'target', reason: 'unset' }]],
    [check(null, 'is', null), [{ ...CHECK, slot: 'value', reason: 'unset' }]],
    [check(levelVariable('coins'), 'atLeast', 10), []],
    // A level's variable is read on the World, so its target says nothing.
    [check(levelVariable('coins'), 'atLeast', 10, { kind: 'entity', entity: null }), []],
    [check(levelVariable('lives'), 'less', 1), [{ ...CHECK, slot: 'value', reason: 'unknownVariable' }]],
    [check(levelVariable('mood'), 'isNot', 'angry'), []],
    [check(levelVariable('mood'), 'more', 'angry'), [{ ...CHECK, slot: 'compare', reason: 'wrongType' }]],
    [
        check(levelVariable('mood'), 'atMost', null),
        [
            { ...CHECK, slot: 'amount', reason: 'unset' },
            { ...CHECK, slot: 'compare', reason: 'wrongType' },
        ],
    ],
    [check(levelVariable('coins'), 'is', 'ten'), [{ ...CHECK, slot: 'amount', reason: 'wrongType' }]],
    [check(ownVariable('health'), 'less', 1), []],
    [check(ownVariable('open'), 'is', true), []],
    [check(ownVariable('speed'), 'is', 1), [{ ...CHECK, slot: 'value', reason: 'unknownVariable' }]],
    // `other` and a tag are only known in play, where a target without the variable is skipped.
    [check(ownVariable('speed'), 'is', 1, OTHER), []],
    [
        check(ownVariable('health'), 'is', 1, { kind: 'entity', entity: null }),
        [{ ...CHECK, slot: 'target', reason: 'unset' }],
    ],
    [check({ kind: 'field', component: 'TransformComponent', field: 'position', axis: 'y' }, 'more', 200), []],
    [check({ kind: 'live', live: 'speed' }, 'more', 200), [{ ...CHECK, slot: 'value', reason: 'unknownValue' }]],
    [check({ kind: 'live', live: 'speed' }, 'more', 200, OTHER), []],
    [
        check({ kind: 'live', live: 'speed' }, 'more', 'fast', OTHER),
        [{ ...CHECK, slot: 'amount', reason: 'wrongType' }],
    ],
    [
        check(null, 'less', null, { kind: 'tagged', tag: null }),
        [
            { ...CHECK, slot: 'target', reason: 'unset' },
            { ...CHECK, slot: 'value', reason: 'unset' },
        ],
    ],
];

const ACTION = { section: 'action', index: 0 } as const;

const ACTION_CASES: readonly (readonly [Action, readonly object[]])[] = [
    [{ kind: 'change', target: { kind: 'other' }, value: { kind: 'tag' }, op: 'add', amount: 'used' }, []],
    [
        { kind: 'change', target: { kind: 'this' }, value: { kind: 'tag' }, op: 'add', amount: 'used' },
        [{ ...ACTION, slot: 'value', reason: 'unknownValue' }],
    ],
    [
        { kind: 'change', target: { kind: 'this' }, value: null, op: 'set', amount: null },
        [
            { ...ACTION, slot: 'value', reason: 'unset' },
            { ...ACTION, slot: 'amount', reason: 'unset' },
        ],
    ],
    [{ kind: 'destroy', target: { kind: 'this' } }, []],
    [{ kind: 'destroy', target: { kind: 'entity', entity: null } }, [{ ...ACTION, slot: 'target', reason: 'unset' }]],
    [
        { kind: 'change', target: { kind: 'other' }, value: { kind: 'velocity' }, op: 'add', amount: { x: 0, y: -6 } },
        [],
    ],
    [
        { kind: 'change', target: { kind: 'this' }, value: { kind: 'velocity' }, op: 'add', amount: { x: 0, y: -6 } },
        [{ ...ACTION, slot: 'value', reason: 'unknownValue' }],
    ],
    [{ kind: 'win' }, []],
    [{ kind: 'lose' }, []],
    [{ kind: 'restart' }, []],
    [{ kind: 'fire', target: { kind: 'tagged', tag: 'door' }, name: 'open', amount: null }, []],
    [{ kind: 'fire', target: { kind: 'other' }, name: 'open', amount: 2 }, []],
    [
        { kind: 'fire', target: { kind: 'entity', entity: null }, name: null, amount: null },
        [
            { ...ACTION, slot: 'target', reason: 'unset' },
            { ...ACTION, slot: 'name', reason: 'unset' },
        ],
    ],
    [
        { kind: 'fire', target: { kind: 'this' }, name: 'level_start', amount: null },
        [{ ...ACTION, slot: 'name', reason: 'reservedName' }],
    ],
    [{ kind: 'wait', seconds: 2 }, []],
    [{ kind: 'wait', seconds: 0 }, []],
    [{ kind: 'wait', seconds: null }, [{ ...ACTION, slot: 'seconds', reason: 'unset' }]],
    [
        {
            kind: 'change',
            target: { kind: 'this' },
            value: { kind: 'variable', name: 'open', own: true },
            op: 'flip',
            amount: null,
        },
        [],
    ],
    [
        {
            kind: 'change',
            target: { kind: 'this' },
            value: { kind: 'variable', name: 'health', own: true },
            op: 'flip',
            amount: null,
        },
        [{ ...ACTION, slot: 'value', reason: 'unknownValue' }],
    ],
    [
        {
            kind: 'change',
            target: { kind: 'this' },
            value: { kind: 'variable', name: 'label', own: true },
            op: 'add',
            amount: 'x',
        },
        [{ ...ACTION, slot: 'value', reason: 'unknownValue' }],
    ],
    [
        {
            kind: 'change',
            target: { kind: 'this' },
            value: { kind: 'variable', name: 'label', own: true },
            op: 'set',
            amount: 'open',
        },
        [],
    ],
    [
        {
            kind: 'change',
            target: { kind: 'this' },
            value: { kind: 'variable', name: 'gold', own: true },
            op: 'set',
            amount: 1,
        },
        [{ ...ACTION, slot: 'value', reason: 'unknownVariable' }],
    ],
];

describe('triggerProblems', () => {
    test.each(WHEN_CASES)('the When %j has the problems %j', (when, problems) => {
        expect(problemsOf({ when })).toEqual(problems);
    });

    test.each(CHECK_CASES)('the check %j has the problems %j', (check, problems) => {
        expect(problemsOf({ checks: [check] })).toEqual(problems);
    });

    test.each(ACTION_CASES)('the action %j has the problems %j', (action, problems) => {
        expect(problemsOf({ actions: [action] })).toEqual(problems);
    });

    test('`other` under an event that has none is a problem, under touching it is not', () => {
        const destroyOther: Action = { kind: 'destroy', target: { kind: 'other' } };

        expect(problemsOf({ when: { kind: 'levelStart' }, actions: [destroyOther] })).toEqual([
            { ...ACTION, slot: 'target', reason: 'noOther' },
        ]);
        expect(problemsOf({ when: { kind: 'untouched' }, actions: [destroyOther] })).toEqual([]);
        expect(problemsOf({ when: null, actions: [destroyOther] })).toEqual([
            { ...WHEN, slot: 'event', reason: 'unset' },
        ]);
    });

    test('a missing entity skips only its own action, so the trigger can still run', () => {
        const context = buildContext();
        const gone = context.level.createEntity(context.level.world, 0);
        const goneId = gone.id;
        context.level.removeEntity(gone);
        const actions: Action[] = [{ kind: 'destroy', target: { kind: 'entity', entity: goneId } }, { kind: 'win' }];

        const problems = triggerProblems(trigger({ actions }), context);

        expect(problems).toEqual([{ part: ACTION, slot: 'target', reason: 'missingEntity' }]);
        expect(problems.some(stopsTrigger)).toBe(false);
        expect(triggerCanRun(problems)).toBe(true);
    });

    test('an unset part stops the whole trigger', () => {
        const problems = triggerProblems(trigger({ when: null, actions: [{ kind: 'win' }] }), buildContext());

        expect(triggerCanRun(problems)).toBe(false);
    });

    test('Change value is checked against what the target offers: the value, the way it changes and the amount', () => {
        const change = (parts: Partial<Action & { kind: 'change' }>): Action => ({
            kind: 'change',
            target: { kind: 'this' },
            value: { kind: 'field', component: 'TransformComponent', field: 'rotation' },
            op: 'add',
            amount: 90,
            ...parts,
        });
        const position = { kind: 'field', component: 'TransformComponent', field: 'position' } as const;
        const body = { kind: 'field', component: 'BodyComponent', field: 'gravityScale' } as const;

        expect(problemsOf({ actions: [change({})] })).toEqual([]);
        expect(problemsOf({ actions: [change({ value: position, op: 'set', amount: { x: 1, y: 2 } })] })).toEqual([]);
        expect(problemsOf({ actions: [change({ value: position, amount: { x: 5, y: 0 } })] })).toEqual([]);
        expect(problemsOf({ actions: [change({ value: position })] })).toEqual([
            { ...ACTION, slot: 'amount', reason: 'badAmount' },
        ]);
        expect(problemsOf({ actions: [change({ amount: 'ninety' })] })).toEqual([
            { ...ACTION, slot: 'amount', reason: 'badAmount' },
        ]);
        expect(problemsOf({ actions: [change({ value: body })] })).toEqual([
            { ...ACTION, slot: 'value', reason: 'unknownValue' },
        ]);
        expect(problemsOf({ actions: [change({ target: { kind: 'other' }, value: body, amount: 1 })] })).toEqual([]);
    });

    test("a trigger's on/off is checked on the target, and a deleted trigger is missing", () => {
        const switchTrigger = (id: number): Action => ({
            kind: 'change',
            target: { kind: 'this' },
            value: { kind: 'triggerOn', trigger: id },
            op: 'set',
            amount: false,
        });

        expect(problemsOf({ actions: [switchTrigger(2)] })).toEqual([]);
        expect(problemsOf({ actions: [switchTrigger(5)] })).toEqual([
            { ...ACTION, slot: 'value', reason: 'missingTrigger' },
        ]);
        expect(triggerCanRun(triggerProblems(trigger({ actions: [switchTrigger(5)] }), buildContext()))).toBe(true);
    });

    test('a variable is checked on a known target, and left to play on one known only in play', () => {
        const addTo = (target: Target, name: string): Action => ({
            kind: 'change',
            target,
            value: { kind: 'variable', name },
            op: 'add',
            amount: 1,
        });
        const context = buildContext();
        const world = { kind: 'entity', entity: context.level.world.id } as const;

        expect(problemsOf({ actions: [addTo(world, 'coins')] }, context)).toEqual([]);
        expect(problemsOf({ actions: [addTo(world, 'lives')] }, context)).toEqual([
            { ...ACTION, slot: 'value', reason: 'unknownVariable' },
        ]);
        expect(problemsOf({ actions: [addTo({ kind: 'other' }, 'lives')] }, context)).toEqual([]);
    });

    test('`other` is the sender under a custom event and the entity touching under touching, and absent elsewhere', () => {
        const destroyOther: Action = { kind: 'destroy', target: { kind: 'other' } };
        const noOther = [{ ...ACTION, slot: 'target', reason: 'noOther' }];

        expect(problemsOf({ when: { kind: 'touched' }, actions: [destroyOther] })).toEqual([]);
        expect(problemsOf({ when: { kind: 'custom', name: 'open' }, actions: [destroyOther] })).toEqual([]);
        expect(problemsOf({ when: { kind: 'every', seconds: 1 }, actions: [destroyOther] })).toEqual(noOther);
        const coinsChange: When = {
            kind: 'variableChanged',
            variable: { owner: 'level', name: 'coins' },
            becomes: null,
        };
        expect(problemsOf({ when: coinsChange, actions: [destroyOther] })).toEqual(noOther);
    });

    test('each part is placed by its index', () => {
        const checks: Check[] = [check(TAG, 'is', 'player', OTHER), check(TAG, 'is', null, OTHER)];
        const actions: Action[] = [{ kind: 'win' }, { kind: 'destroy', target: { kind: 'tagged', tag: null } }];

        expect(problemsOf({ checks, actions })).toEqual([
            { section: 'check', index: 1, slot: 'amount', reason: 'unset' },
            { section: 'action', index: 1, slot: 'target', reason: 'unset' },
        ]);
    });
});
