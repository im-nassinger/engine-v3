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
    { kind: 'tagLeft', tag: 'coin' },
    { kind: 'tagLeft', tag: null },
];

const CHECKS = [
    { kind: 'hasTag', target: { kind: 'other' }, tag: 'player' },
    { kind: 'hasTag', target: { kind: 'this' }, tag: null },
    { kind: 'compare', variable: 'coins', compare: 'atLeast', value: 10 },
    { kind: 'compare', variable: null, compare: 'isNot', value: null },
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
    { kind: 'push', target: { kind: 'other' }, push: { kind: 'by', x: 0, y: -600 } },
    { kind: 'push', target: { kind: 'other' }, push: { kind: 'away', strength: 400 } },
    { kind: 'push', target: { kind: 'tagged', tag: 'ball' }, push: { kind: 'towards', strength: 100 } },
    { kind: 'push', target: { kind: 'this' }, push: null },
    { kind: 'win' },
    { kind: 'lose' },
    { kind: 'restart' },
];

const REPEATS = [{ kind: 'everyTime' }, { kind: 'oncePerRun' }, { kind: 'atMostEvery', seconds: 1 }];

describe('TriggerFieldType', () => {
    test.each(WHENS)('reads back the When $kind as saved, unset parts as null', (when) => {
        const { saved, again } = readBack(triggerWith({ when }));

        expect(saved).toEqual(triggerWith({ when }));
        expect(again.when).toEqual(when);
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
            checks: [{ kind: 'hasTag', target: { kind: 'other' }, tag: null }],
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
            triggerWith({ checks: [{ kind: 'compare', variable: 'coins', compare: 'about', value: 1 }] }),
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
                { kind: 'hasTag', target: { kind: 'tagged', tag: 'Big Coin' }, tag: '!!' },
                { kind: 'compare', variable: 'Coins', compare: 'is', value: 3 },
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
            { kind: 'hasTag', target: { kind: 'tagged', tag: 'big_coin' }, tag: null },
            { kind: 'compare', variable: 'coins', compare: 'is', value: 3 },
        ]);
        expect(normalized.actions).toEqual([
            { kind: 'change', target: { kind: 'this' }, value: { kind: 'tag' }, op: 'add', amount: 'was_hit' },
            { kind: 'change', target: { kind: 'this' }, value: null, op: 'add', amount: 1 },
        ]);
        expect(normalized.repeat).toEqual({ kind: 'atMostEvery', seconds: 86_400 });
        expect(normalized.when).toEqual(type.normalize(normalized).when);
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

    test('mapEntities copies damaged data as it is', () => {
        const damaged = { checks: 'none', actions: [{ target: { kind: 'entity', entity: 'x' } }] };

        expect(type.mapEntities('trigger', (id) => id + 1)).toBe('trigger');
        expect(type.mapEntities(damaged, (id) => id + 1)).toEqual(damaged);
    });
});
