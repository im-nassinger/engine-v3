import { describe, expect, test } from 'vitest';

import {
    InputComponent,
    TransformComponent,
    TriggerComponent,
    VariablesComponent,
    createV1Registry,
} from '../../components/index.ts';
import type { Action, Check, Repeat, Target, Trigger, When } from '../../fields/index.ts';
import type { KeyCode } from '../../keys/index.ts';
import { Level } from '../../level/index.ts';

import { stopsTrigger, triggerCanRun, triggerProblems } from './triggerProblems.ts';
import type { TriggerContext } from './triggerProblems.ts';

const registry = createV1Registry();

// A level whose World has `coins` and the input `jump`, and a coin holding a trigger with ids 1 and 2.
function buildContext(): TriggerContext {
    const level = Level.createNew();
    level.world.removeComponent(InputComponent);
    level.world.addComponent(new InputComponent({ inputs: [{ name: 'jump', keys: ['Space' as KeyCode] }] }));
    level.world.addComponent(new VariablesComponent({ variables: [{ name: 'coins', value: 0 }] }));

    const owner = level.createEntity(level.world, 0);
    owner.addComponent(new TransformComponent());
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
        repeat: { kind: 'everyTime' },
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
    [{ kind: 'tagLeft', tag: 'coin' }, []],
    [{ kind: 'tagLeft', tag: null }, [{ ...WHEN, slot: 'tag', reason: 'unset' }]],
];

const CHECK = { section: 'check', index: 0 } as const;

const CHECK_CASES: readonly (readonly [Check, readonly object[]])[] = [
    [{ kind: 'hasTag', target: { kind: 'other' }, tag: 'player' }, []],
    [{ kind: 'hasTag', target: { kind: 'other' }, tag: null }, [{ ...CHECK, slot: 'tag', reason: 'unset' }]],
    [
        { kind: 'hasTag', target: { kind: 'tagged', tag: null }, tag: 'player' },
        [{ ...CHECK, slot: 'target', reason: 'unset' }],
    ],
    [{ kind: 'compare', variable: 'coins', compare: 'atLeast', value: 10 }, []],
    [
        { kind: 'compare', variable: null, compare: 'is', value: null },
        [
            { ...CHECK, slot: 'variable', reason: 'unset' },
            { ...CHECK, slot: 'number', reason: 'unset' },
        ],
    ],
    [
        { kind: 'compare', variable: 'lives', compare: 'less', value: 1 },
        [{ ...CHECK, slot: 'variable', reason: 'unknownVariable' }],
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
    [{ kind: 'push', target: { kind: 'other' }, push: { kind: 'by', x: 0, y: -600 } }, []],
    [{ kind: 'push', target: { kind: 'other' }, push: { kind: 'away', strength: 400 } }, []],
    [{ kind: 'push', target: { kind: 'other' }, push: null }, [{ ...ACTION, slot: 'push', reason: 'unset' }]],
    [{ kind: 'win' }, []],
    [{ kind: 'lose' }, []],
    [{ kind: 'restart' }, []],
];

const REPEATS: readonly Repeat[] = [{ kind: 'everyTime' }, { kind: 'oncePerRun' }, { kind: 'atMostEvery', seconds: 1 }];

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

    test.each(REPEATS)('the Repeat %j stops nothing', (repeat) => {
        expect(problemsOf({ repeat, actions: [{ kind: 'win' }] })).toEqual([]);
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
        expect(problemsOf({ actions: [change({ value: position })] })).toEqual([
            { ...ACTION, slot: 'value', reason: 'unknownValue' },
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

    test('each part is placed by its index', () => {
        const checks: Check[] = [
            { kind: 'hasTag', target: { kind: 'other' }, tag: 'player' },
            { kind: 'hasTag', target: { kind: 'other' }, tag: null },
        ];
        const actions: Action[] = [{ kind: 'win' }, { kind: 'destroy', target: { kind: 'tagged', tag: null } }];

        expect(problemsOf({ checks, actions })).toEqual([
            { section: 'check', index: 1, slot: 'tag', reason: 'unset' },
            { section: 'action', index: 1, slot: 'target', reason: 'unset' },
        ]);
    });
});
