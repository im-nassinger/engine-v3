import { describe, expect, test } from 'vitest';

import { TriggerFieldType } from './TriggerFieldType.ts';

// Fix 10: Multiply and Divide, and a variable in every value box, saved and read back.
const type = new TriggerFieldType();

const EMPTY_TRIGGER = {
    id: 1,
    name: null,
    on: true,
    when: null,
    checks: [],
    actions: [],
};

const BONUS = { kind: 'variable', name: 'bonus' };
const OWN_HEALTH = { kind: 'variable', name: 'health', own: true };

function triggerWith(parts: Record<string, unknown>) {
    return { ...EMPTY_TRIGGER, ...parts };
}

function parse(raw: unknown) {
    return type.parse(raw);
}

function requireParsed(raw: unknown) {
    const parsed = parse(raw);
    if (!parsed.ok) throw new Error(`The trigger was refused: ${parsed.problem.reason}.`);

    return parsed.value;
}

function readBack(raw: unknown) {
    const saved = type.serialize(type.normalize(requireParsed(raw)));

    return { saved, again: type.normalize(requireParsed(saved)) };
}

const WITH_VARIABLES = triggerWith({
    when: { kind: 'levelStart' },
    checks: [
        {
            kind: 'value',
            target: { kind: 'this' },
            value: { kind: 'variable', name: 'score' },
            compare: 'more',
            amount: { kind: 'variable', name: 'best' },
        },
        {
            kind: 'value',
            target: { kind: 'this' },
            value: { kind: 'tag' },
            compare: 'is',
            amount: { kind: 'variable', name: 'wanted' },
        },
    ],
    actions: [
        {
            kind: 'change',
            target: { kind: 'this' },
            value: { kind: 'variable', name: 'coins' },
            op: 'add',
            amount: BONUS,
        },
        {
            kind: 'change',
            target: { kind: 'other' },
            value: { kind: 'variable', name: 'hp', own: true },
            op: 'set',
            amount: OWN_HEALTH,
        },
        { kind: 'wait', seconds: { kind: 'variable', name: 'delay' } },
        { kind: 'fire', target: { kind: 'this' }, name: 'hit', amount: OWN_HEALTH },
    ],
});

describe('TriggerFieldType: Multiply, Divide and variables as values', () => {
    test.each(['multiply', 'divide'])('Change value with %s reads back as saved', (op) => {
        const raw = triggerWith({
            actions: [
                {
                    kind: 'change',
                    target: { kind: 'this' },
                    value: { kind: 'field', component: 'TransformComponent', field: 'position' },
                    op,
                    amount: 2,
                },
            ],
        });

        expect(readBack(raw).saved).toEqual(raw);
    });

    test('a variable in each value box is saved and read back, own or the level’s', () => {
        const { saved, again } = readBack(WITH_VARIABLES);

        expect(saved).toEqual(WITH_VARIABLES);
        expect(type.serialize(again)).toEqual(WITH_VARIABLES);
    });

    test('a variable’s name is made a word, and one with nothing left reads as unset', () => {
        const raw = triggerWith({
            actions: [
                { kind: 'wait', seconds: { kind: 'variable', name: 'Long Delay' } },
                { kind: 'fire', target: { kind: 'this' }, name: 'hit', amount: { kind: 'variable', name: '??' } },
            ],
        });

        const normalized = type.normalize(requireParsed(raw));

        expect(normalized.actions).toEqual([
            { kind: 'wait', seconds: { kind: 'variable', name: 'long_delay' } },
            { kind: 'fire', target: { kind: 'this' }, name: 'hit', amount: null },
        ]);
    });

    test('a damaged variable in a value box refuses the trigger', () => {
        const damaged = [
            { kind: 'wait', seconds: { kind: 'variable' } },
            { kind: 'wait', seconds: { kind: 'other', name: 'delay' } },
            {
                kind: 'fire',
                target: { kind: 'this' },
                name: 'hit',
                amount: { kind: 'variable', name: 'n', own: false },
            },
            {
                kind: 'change',
                target: { kind: 'this' },
                value: { kind: 'variable', name: 'coins' },
                op: 'add',
                amount: { kind: 'variable', name: 3 },
            },
        ];

        for (const action of damaged) {
            expect(parse(triggerWith({ actions: [action] })).ok).toBe(false);
        }
        const check = {
            kind: 'value',
            target: { kind: 'this' },
            value: { kind: 'tag' },
            compare: 'is',
            amount: { kind: 'variable', name: 'wanted', extra: 1 },
        };
        expect(parse(triggerWith({ checks: [check] })).ok).toBe(false);
    });

    test('a fill amount, whose kind is its own, still reads as a typed value', () => {
        const fill = { kind: 'solid', colour: '#ff0000' };
        const raw = triggerWith({
            actions: [
                {
                    kind: 'change',
                    target: { kind: 'this' },
                    value: { kind: 'field', component: 'StyleComponent', field: 'fill' },
                    op: 'set',
                    amount: fill,
                },
            ],
        });

        expect(readBack(raw).saved).toEqual(raw);
    });

    test('a clone of a trigger with variables shares nothing and equals it', () => {
        const trigger = requireParsed(WITH_VARIABLES);
        const clone = type.clone(trigger);

        expect(type.equals(trigger, clone)).toBe(true);
        expect(clone.actions[0]).not.toBe(trigger.actions[0]);
    });
});
