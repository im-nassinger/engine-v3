import { describe, expect, test } from 'vitest';

import type { Trigger } from '../trigger/Trigger.ts';
import { TriggerFieldType } from './TriggerFieldType.ts';

const type = new TriggerFieldType();

const EMPTY_TRIGGER = {
    id: 1,
    name: null,
    on: true,
    when: null,
    checks: [],
    actions: [],
    repeat: { kind: 'everyTime' },
};

function triggerWith(parts: Record<string, unknown>) {
    return { ...EMPTY_TRIGGER, ...parts };
}

function requireParsed(raw: unknown) {
    const parsed = type.parse(raw);
    if (!parsed.ok) throw new Error(`The trigger was refused: ${parsed.problem.reason}.`);

    return parsed.value;
}

// Parsed, saved and parsed again: what a level holds after it is saved and opened.
function readBack(raw: unknown) {
    const parsed = requireParsed(raw);
    const saved = type.serialize(parsed);

    return { parsed, saved, again: requireParsed(saved) };
}

const WHENS = [
    { kind: 'touched' },
    { kind: 'untouched' },
    { kind: 'input', input: 'jump', how: 'pressed' },
    { kind: 'input', input: null, how: 'held' },
    { kind: 'key', key: 'Space', how: 'released' },
    { kind: 'key', key: null, how: 'pressed' },
    { kind: 'after', seconds: 60 },
    { kind: 'every', seconds: null },
    { kind: 'levelStart' },
    { kind: 'custom', name: 'open' },
    { kind: 'custom', name: null },
    { kind: 'variableChanged', variable: 'coins', becomes: null },
    { kind: 'variableChanged', variable: 'coins', becomes: { compare: 'atLeast', value: 10 } },
    { kind: 'variableChanged', variable: { target: { kind: 'this' }, name: 'door_open' }, becomes: null },
    {
        kind: 'variableChanged',
        variable: { target: { kind: 'this' }, name: 'mood' },
        becomes: { compare: 'is', value: 'angry' },
    },
    { kind: 'variableChanged', variable: null, becomes: { compare: 'isNot', value: true } },
];

const CHECKS = [
    { kind: 'value', target: { kind: 'other' }, value: { kind: 'tag' }, compare: 'is', amount: 'player' },
    { kind: 'value', target: { kind: 'this' }, value: { kind: 'tag' }, compare: 'isNot', amount: null },
    {
        kind: 'value',
        target: { kind: 'this' },
        value: { kind: 'variable', name: 'coins' },
        compare: 'atLeast',
        amount: 10,
    },
    { kind: 'value', target: { kind: 'this' }, value: null, compare: 'isNot', amount: null },
    {
        kind: 'value',
        target: { kind: 'other' },
        value: { kind: 'variable', name: 'mood', own: true },
        compare: 'is',
        amount: 'calm',
    },
    {
        kind: 'value',
        target: { kind: 'entity', entity: 3 },
        value: { kind: 'variable', name: 'open', own: true },
        compare: 'is',
        amount: false,
    },
    { kind: 'value', target: { kind: 'this' }, value: { kind: 'live', live: 'speed' }, compare: 'more', amount: 200 },
    {
        kind: 'value',
        target: { kind: 'tagged', tag: 'ball' },
        value: { kind: 'field', component: 'TransformComponent', field: 'position', axis: 'y' },
        compare: 'atMost',
        amount: -10,
    },
];

const ACTIONS = [
    {
        kind: 'change',
        target: { kind: 'entity', entity: 1 },
        value: { kind: 'variable', name: 'coins' },
        op: 'add',
        amount: 1,
    },
    {
        kind: 'change',
        target: { kind: 'this' },
        value: { kind: 'field', component: 'TransformComponent', field: 'position' },
        op: 'set',
        amount: { x: 10, y: 20 },
    },
    {
        kind: 'change',
        target: { kind: 'this' },
        value: { kind: 'field', component: 'TransformComponent', field: 'position', axis: 'y' },
        op: 'subtract',
        amount: 5,
    },
    { kind: 'change', target: { kind: 'other' }, value: { kind: 'tag' }, op: 'add', amount: 'hurt' },
    { kind: 'change', target: { kind: 'this' }, value: { kind: 'triggerOn', trigger: 2 }, op: 'set', amount: false },
    { kind: 'change', target: { kind: 'tagged', tag: null }, value: null, op: 'set', amount: null },
    { kind: 'destroy', target: { kind: 'this' } },
    { kind: 'destroy', target: { kind: 'entity', entity: null } },
    { kind: 'change', target: { kind: 'other' }, value: { kind: 'velocity' }, op: 'add', amount: { x: 0, y: -600 } },
    { kind: 'win' },
    { kind: 'lose' },
    { kind: 'restart' },
    {
        kind: 'change',
        target: { kind: 'this' },
        value: { kind: 'variable', name: 'door_open', own: true },
        op: 'flip',
        amount: null,
    },
    {
        kind: 'change',
        target: { kind: 'other' },
        value: { kind: 'variable', name: 'mood', own: true },
        op: 'set',
        amount: 'angry',
    },
    { kind: 'fire', target: { kind: 'tagged', tag: 'door' }, name: 'open', amount: null },
    { kind: 'fire', target: { kind: 'entity', entity: 4 }, name: null, amount: 2.5 },
    { kind: 'wait', seconds: 2 },
    { kind: 'wait', seconds: null },
];

const REPEATS = [{ kind: 'everyTime' }, { kind: 'oncePerRun' }, { kind: 'atMostEvery', seconds: 1 }];

describe('TriggerFieldType', () => {
    test.each(WHENS)('reads back the When $kind as saved, unset parts as null', (when) => {
        const { parsed, saved, again } = readBack(triggerWith({ when }));

        expect(saved).toEqual(triggerWith({ when }));
        expect(again.when).toEqual(parsed.when);
    });

    test.each(CHECKS)('reads back the check $kind as saved', (check) => {
        const { saved } = readBack(triggerWith({ checks: [check] }));

        expect(saved).toEqual(triggerWith({ checks: [check] }));
    });

    test.each(ACTIONS)('reads back the action $kind as saved', (action) => {
        const { saved } = readBack(triggerWith({ actions: [action] }));

        expect(saved).toEqual(triggerWith({ actions: [action] }));
    });

    test.each(REPEATS)('reads back the Repeat $kind as saved', (repeat) => {
        const { saved } = readBack(triggerWith({ repeat }));

        expect(saved).toEqual(triggerWith({ repeat }));
    });

    test('a trigger half made is saved and read back half made', () => {
        const halfMade = triggerWith({
            name: 'Coin',
            on: false,
            when: { kind: 'touched' },
            checks: [{ kind: 'value', target: { kind: 'other' }, value: { kind: 'tag' }, compare: 'is', amount: null }],
            actions: [{ kind: 'destroy', target: { kind: 'entity', entity: null } }],
        });

        const { saved } = readBack(halfMade);

        expect(saved).toEqual(halfMade);
    });

    test.each([
        ['not an object', 'touched', 'wrongType'],
        ['a key missing', { id: 1, name: null, on: true, when: null, checks: [], actions: [] }, 'wrongType'],
        ['a key too many', { ...EMPTY_TRIGGER, colour: 'red' }, 'wrongType'],
        ['an id of 0', { ...EMPTY_TRIGGER, id: 0 }, 'wrongType'],
        ['an id that is not whole', { ...EMPTY_TRIGGER, id: 1.5 }, 'wrongType'],
        ['an unknown event', triggerWith({ when: { kind: 'clicked' } }), 'unknownChoice'],
        ['an unknown press', triggerWith({ when: { kind: 'key', key: 'Space', how: 'tapped' } }), 'unknownChoice'],
        [
            'a key a level can not use',
            triggerWith({ when: { kind: 'key', key: 'Tab', how: 'pressed' } }),
            'unbindableKey',
        ],
        ['a time that is not a number', triggerWith({ when: { kind: 'after', seconds: '60' } }), 'wrongType'],
        ['an unknown check', triggerWith({ checks: [{ kind: 'isMoving' }] }), 'unknownChoice'],
        [
            'an unknown comparison',
            triggerWith({
                checks: [
                    { kind: 'value', target: { kind: 'this' }, value: { kind: 'tag' }, compare: 'about', amount: 'a' },
                ],
            }),
            'unknownChoice',
        ],
        ['an unknown action', triggerWith({ actions: [{ kind: 'spawn' }] }), 'unknownChoice'],
        [
            'an unknown target',
            triggerWith({ actions: [{ kind: 'destroy', target: { kind: 'everyone' } }] }),
            'unknownChoice',
        ],
        [
            'a target entity that is no id',
            triggerWith({ actions: [{ kind: 'destroy', target: { kind: 'entity', entity: -3 } }] }),
            'badEntityId',
        ],
        [
            'a component name that is no component',
            triggerWith({
                actions: [
                    {
                        kind: 'change',
                        target: { kind: 'this' },
                        value: { kind: 'field', component: 'Transform', field: 'position' },
                        op: 'set',
                        amount: 1,
                    },
                ],
            }),
            'wrongType',
        ],
        [
            'an unknown axis',
            triggerWith({
                actions: [
                    {
                        kind: 'change',
                        target: { kind: 'this' },
                        value: { kind: 'field', component: 'TransformComponent', field: 'position', axis: 'z' },
                        op: 'add',
                        amount: 1,
                    },
                ],
            }),
            'unknownChoice',
        ],
        [
            'an amount that is not JSON',
            triggerWith({
                actions: [
                    { kind: 'change', target: { kind: 'this' }, value: { kind: 'tag' }, op: 'add', amount: Infinity },
                ],
            }),
            'notFinite',
        ],
        [
            'a push with no strength',
            triggerWith({ actions: [{ kind: 'push', target: { kind: 'this' }, push: { kind: 'away' } }] }),
            'wrongType',
        ],
        ['an unknown Repeat', triggerWith({ repeat: { kind: 'twice' } }), 'unknownChoice'],
        [
            'a custom event with a key too many',
            triggerWith({ when: { kind: 'custom', name: 'open', x: 1 } }),
            'wrongType',
        ],
        [
            "another entity's own variable in a When",
            triggerWith({
                when: { kind: 'variableChanged', variable: { target: { kind: 'other' }, name: 'hp' }, becomes: null },
            }),
            'wrongType',
        ],
        [
            'a variable that is neither a name nor an own variable',
            triggerWith({ checks: [{ kind: 'compare', variable: 3, compare: 'is', value: 1 }] }),
            'wrongType',
        ],
        [
            'a value compared that is no variable value',
            triggerWith({ checks: [{ kind: 'compare', variable: 'coins', compare: 'is', value: [1] }] }),
            'wrongType',
        ],
        [
            'an unknown live value',
            triggerWith({
                checks: [
                    {
                        kind: 'compareValue',
                        target: { kind: 'this' },
                        value: { kind: 'live', live: 'spin' },
                        compare: 'more',
                        amount: 1,
                    },
                ],
            }),
            'unknownChoice',
        ],
        [
            'own set to false',
            triggerWith({
                actions: [
                    {
                        kind: 'change',
                        target: { kind: 'this' },
                        value: { kind: 'variable', name: 'hp', own: false },
                        op: 'set',
                        amount: 1,
                    },
                ],
            }),
            'wrongType',
        ],
        ['a Wait with no seconds key', triggerWith({ actions: [{ kind: 'wait' }] }), 'wrongType'],
        [
            'a Fire custom event with no target',
            triggerWith({ actions: [{ kind: 'fire', name: 'open', amount: null }] }),
            'wrongType',
        ],
        ['a Repeat with no time', triggerWith({ repeat: { kind: 'atMostEvery' } }), 'wrongType'],
    ])('refuses %s', (_description, raw, reason) => {
        const parsed = type.parse(raw);

        expect(parsed.ok).toBe(false);
        if (parsed.ok) return;
        expect(parsed.problem.reason).toBe(reason);
    });

    test('normalize trims the name, makes words of tags, variables and inputs, and keeps times within a day', () => {
        const raw = triggerWith({
            name: '   ',
            when: { kind: 'every', seconds: -2 },
            checks: [
                {
                    kind: 'value',
                    target: { kind: 'tagged', tag: 'Big Coin' },
                    value: { kind: 'tag' },
                    compare: 'is',
                    amount: '!!',
                },
                {
                    kind: 'value',
                    target: { kind: 'this' },
                    value: { kind: 'variable', name: 'Coins' },
                    compare: 'is',
                    amount: 3,
                },
            ],
            actions: [
                { kind: 'change', target: { kind: 'this' }, value: { kind: 'tag' }, op: 'add', amount: 'Was Hit' },
                {
                    kind: 'change',
                    target: { kind: 'this' },
                    value: { kind: 'variable', name: '??' },
                    op: 'add',
                    amount: 1,
                },
            ],
            repeat: { kind: 'atMostEvery', seconds: 1_000_000 },
        });

        const normalized = type.normalize(requireParsed(raw));

        expect(normalized.name).toBeNull();
        expect(normalized.when).toEqual({ kind: 'every', seconds: 0 });
        expect(normalized.checks).toEqual([
            {
                kind: 'value',
                target: { kind: 'tagged', tag: 'big_coin' },
                value: { kind: 'tag' },
                compare: 'is',
                amount: null,
            },
            {
                kind: 'value',
                target: { kind: 'this' },
                value: { kind: 'variable', name: 'coins' },
                compare: 'is',
                amount: 3,
            },
        ]);
        expect(normalized.actions).toEqual([
            { kind: 'change', target: { kind: 'this' }, value: { kind: 'tag' }, op: 'add', amount: 'was_hit' },
            { kind: 'change', target: { kind: 'this' }, value: null, op: 'add', amount: 1 },
        ]);
        expect(normalized.repeat).toEqual({ kind: 'atMostEvery', seconds: 86_400 });
        expect(normalized.when).toEqual(type.normalize(normalized).when);
    });

    test('normalize makes words of custom event names and own variables, keeps a Wait within an hour, and cuts a string', () => {
        const raw = triggerWith({
            when: {
                kind: 'variableChanged',
                variable: { target: { kind: 'this' }, name: 'Door Open' },
                becomes: { compare: 'is', value: true },
            },
            checks: [
                {
                    kind: 'value',
                    target: { kind: 'this' },
                    value: { kind: 'variable', name: 'mood' },
                    compare: 'is',
                    amount: 'x'.repeat(1200),
                },
            ],
            actions: [
                { kind: 'fire', target: { kind: 'tagged', tag: 'Big Door' }, name: 'Open Now!', amount: null },
                { kind: 'fire', target: { kind: 'this' }, name: '??', amount: 1 },
                { kind: 'wait', seconds: 10_000 },
                { kind: 'wait', seconds: -1 },
            ],
        });

        const normalized = type.normalize(requireParsed(raw));

        expect(normalized.when).toEqual({
            kind: 'variableChanged',
            variable: { owner: 'own', target: { kind: 'this' }, name: 'door_open' },
            becomes: { compare: 'is', value: true },
        });
        expect(normalized.checks).toEqual([
            {
                kind: 'value',
                target: { kind: 'this' },
                value: { kind: 'variable', name: 'mood' },
                compare: 'is',
                amount: 'x'.repeat(1000),
            },
        ]);
        expect(normalized.actions).toEqual([
            { kind: 'fire', target: { kind: 'tagged', tag: 'big_door' }, name: 'open_now', amount: null },
            { kind: 'fire', target: { kind: 'this' }, name: null, amount: 1 },
            { kind: 'wait', seconds: 3600 },
            { kind: 'wait', seconds: 0 },
        ]);
        expect(type.normalize(normalized)).toEqual(normalized);
    });

    test('normalize turns a custom name with nothing left into unset', () => {
        const normalized = type.normalize(requireParsed(triggerWith({ when: { kind: 'custom', name: '!!' } })));

        expect(normalized.when).toEqual({ kind: 'custom', name: null });
    });

    test('normalize turns a change of one axis of a vector into a change of the whole vector', () => {
        const position = { kind: 'field', component: 'TransformComponent', field: 'position' } as const;
        const byAxis = {
            kind: 'change',
            target: { kind: 'this' },
            value: { ...position, axis: 'y' },
            op: 'subtract',
            amount: 5,
        };
        const normalized = type.normalize(requireParsed(triggerWith({ actions: [byAxis] })));

        expect(normalized.actions).toEqual([
            { kind: 'change', target: { kind: 'this' }, value: position, op: 'subtract', amount: { x: 0, y: 5 } },
        ]);
    });

    test("a v3 trigger's checks read as value checks; its When, actions and level's variables save as before", () => {
        const change = {
            kind: 'change',
            target: { kind: 'entity', entity: 1 },
            value: { kind: 'variable', name: 'coins' },
            op: 'add',
            amount: 1,
        };
        const v3 = triggerWith({
            name: 'Coin',
            when: { kind: 'variableChanged', variable: 'coins', becomes: null },
            checks: [
                { kind: 'hasTag', target: { kind: 'other' }, tag: 'player' },
                { kind: 'compare', variable: 'coins', compare: 'atLeast', value: 10 },
            ],
            actions: [change, { kind: 'destroy', target: { kind: 'this' } }],
            repeat: { kind: 'oncePerRun' },
        });

        const saved = type.serialize(type.normalize(requireParsed(v3)));

        expect(saved).toEqual({
            ...v3,
            checks: [
                { kind: 'value', target: { kind: 'other' }, value: { kind: 'tag' }, compare: 'is', amount: 'player' },
                {
                    kind: 'value',
                    target: { kind: 'this' },
                    value: { kind: 'variable', name: 'coins' },
                    compare: 'atLeast',
                    amount: 10,
                },
            ],
        });
    });

    test('the three checks saved before simpler triggers read as value checks', () => {
        const checks = [
            { kind: 'compare', variable: null, compare: 'less', value: null },
            { kind: 'compare', variable: { target: { kind: 'other' }, name: 'hp' }, compare: 'less', value: 1 },
            {
                kind: 'compareValue',
                target: { kind: 'this' },
                value: { kind: 'live', live: 'speed' },
                compare: 'more',
                amount: 200,
            },
        ];

        const parsed = requireParsed(triggerWith({ checks }));

        expect(parsed.checks).toEqual([
            { kind: 'value', target: { kind: 'this' }, value: null, compare: 'less', amount: null },
            {
                kind: 'value',
                target: { kind: 'other' },
                value: { kind: 'variable', name: 'hp', own: true },
                compare: 'less',
                amount: 1,
            },
            {
                kind: 'value',
                target: { kind: 'this' },
                value: { kind: 'live', live: 'speed' },
                compare: 'more',
                amount: 200,
            },
        ]);
    });

    test('this hits something reads as a touch; a tag left and this is destroyed as an unset When', () => {
        const actions = [{ kind: 'win' }];

        expect(requireParsed(triggerWith({ when: { kind: 'collision' }, actions })).when).toEqual({ kind: 'touched' });
        for (const when of [{ kind: 'tagLeft', tag: 'coin' }, { kind: 'tagLeft', tag: null }, { kind: 'destroyed' }]) {
            const parsed = requireParsed(triggerWith({ when, actions }));

            expect(parsed.when).toBeNull();
            expect(parsed.actions).toEqual(actions);
        }
    });

    test("Push's fixed kick reads as adding to Body › Velocity; away, towards and unset are dropped", () => {
        const actions = [
            { kind: 'push', target: { kind: 'other' }, push: { kind: 'by', x: 0, y: -600 } },
            { kind: 'push', target: { kind: 'other' }, push: { kind: 'away', strength: 400 } },
            { kind: 'win' },
            { kind: 'push', target: { kind: 'tagged', tag: 'ball' }, push: { kind: 'towards', strength: 100 } },
            { kind: 'push', target: { kind: 'this' }, push: null },
        ];

        const parsed = requireParsed(triggerWith({ actions }));

        expect(parsed.actions).toEqual([
            {
                kind: 'change',
                target: { kind: 'other' },
                value: { kind: 'velocity' },
                op: 'add',
                amount: { x: 0, y: -600 },
            },
            { kind: 'win' },
        ]);
    });

    test('normalize keeps a name of its own, trimmed and cut at 60 characters', () => {
        const long = `  ${'a'.repeat(70)}  `;

        const normalized = type.normalize(requireParsed(triggerWith({ name: long })));

        expect(normalized.name).toBe('a'.repeat(60));
    });

    test('a clone shares nothing, and equals ignores the order of an amount’s keys', () => {
        const first = requireParsed(triggerWith({ actions: [ACTIONS[1]] }));
        const reordered = requireParsed(triggerWith({ actions: [{ ...ACTIONS[1], amount: { y: 20, x: 10 } }] }));

        const clone = type.clone(first);

        expect(clone).toEqual(first);
        expect(clone.actions).not.toBe(first.actions);
        expect(type.equals(first, reordered)).toBe(true);
        expect(type.equals(first, { ...first, on: false })).toBe(false);
    });

    test('a value without an axis is saved without one', () => {
        const trigger: Trigger = {
            ...requireParsed(EMPTY_TRIGGER),
            actions: [
                {
                    kind: 'change',
                    target: { kind: 'this' },
                    value: { kind: 'field', component: 'StyleComponent', field: 'opacity', axis: undefined },
                    op: 'set',
                    amount: 0.5,
                },
            ],
        };

        const saved = type.serialize(trigger);
        const text = JSON.stringify(saved);

        expect(text).not.toContain('axis');
        expect(type.parse(saved).ok).toBe(true);
    });

    test('mapEntities rewires the entity targets of checks and actions, and nothing else', () => {
        const raw = triggerWith({
            id: 7,
            checks: [{ kind: 'hasTag', target: { kind: 'entity', entity: 4 }, tag: 'open' }],
            actions: [
                { kind: 'destroy', target: { kind: 'entity', entity: 5 } },
                { kind: 'destroy', target: { kind: 'entity', entity: null } },
                {
                    kind: 'change',
                    target: { kind: 'this' },
                    value: { kind: 'triggerOn', trigger: 4 },
                    op: 'set',
                    amount: true,
                },
                { kind: 'win' },
            ],
        });

        const mapped = type.mapEntities(raw, (id) => id + 100);

        expect(mapped).toEqual({
            ...raw,
            checks: [{ kind: 'hasTag', target: { kind: 'entity', entity: 104 }, tag: 'open' }],
            actions: [
                { kind: 'destroy', target: { kind: 'entity', entity: 105 } },
                { kind: 'destroy', target: { kind: 'entity', entity: null } },
                {
                    kind: 'change',
                    target: { kind: 'this' },
                    value: { kind: 'triggerOn', trigger: 4 },
                    op: 'set',
                    amount: true,
                },
                { kind: 'win' },
            ],
        });
    });

    test("mapEntities rewires a Change value's amount that links to an entity, such as the camera's Follow", () => {
        const follow = {
            kind: 'change',
            target: { kind: 'this' },
            value: { kind: 'field', component: 'CameraComponent', field: 'follow' },
            op: 'set',
            amount: { entity: 3 },
        };
        const position = { ...follow, amount: { x: 3, y: 4 } };
        const raw = triggerWith({ actions: [follow, position] });

        const mapped = type.mapEntities(raw, (id) => id + 100);

        expect(mapped).toEqual(triggerWith({ actions: [{ ...follow, amount: { entity: 103 } }, position] }));
    });

    test("mapEntities rewires Fire custom event's and the component value check's targets, and an own variable's", () => {
        const raw = triggerWith({
            when: { kind: 'variableChanged', variable: { target: { kind: 'this' }, name: 'hp' }, becomes: null },
            checks: [
                {
                    kind: 'compareValue',
                    target: { kind: 'entity', entity: 2 },
                    value: { kind: 'live', live: 'speed' },
                    compare: 'more',
                    amount: 200,
                },
                {
                    kind: 'compare',
                    variable: { target: { kind: 'entity', entity: 3 }, name: 'hp' },
                    compare: 'is',
                    value: 1,
                },
                { kind: 'compare', variable: 'coins', compare: 'is', value: 1 },
            ],
            actions: [{ kind: 'fire', target: { kind: 'entity', entity: 4 }, name: 'open', amount: 5 }],
        });

        const mapped = type.mapEntities(raw, (id) => id + 100);

        expect(mapped).toEqual({
            ...raw,
            checks: [
                {
                    kind: 'compareValue',
                    target: { kind: 'entity', entity: 102 },
                    value: { kind: 'live', live: 'speed' },
                    compare: 'more',
                    amount: 200,
                },
                {
                    kind: 'compare',
                    variable: { target: { kind: 'entity', entity: 103 }, name: 'hp' },
                    compare: 'is',
                    value: 1,
                },
                { kind: 'compare', variable: 'coins', compare: 'is', value: 1 },
            ],
            actions: [{ kind: 'fire', target: { kind: 'entity', entity: 104 }, name: 'open', amount: 5 }],
        });
    });

    test('mapEntities copies damaged data as it is', () => {
        const damaged = { checks: 'none', actions: [{ target: { kind: 'entity', entity: 'x' } }] };

        expect(type.mapEntities('trigger', (id) => id + 1)).toBe('trigger');
        expect(type.mapEntities(damaged, (id) => id + 1)).toEqual(damaged);
    });
});
