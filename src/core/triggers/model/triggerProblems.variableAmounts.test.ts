import { describe, expect, test } from 'vitest';

import { TransformComponent, VariablesComponent, createV1Registry } from '../../components/index.ts';
import type { Action, Check, Target, Trigger, VariableAmount } from '../../fields/index.ts';
import { Level } from '../../level/index.ts';

import { triggerProblems } from './triggerProblems.ts';
import type { TriggerContext } from './triggerProblems.ts';

// Fix 10: a variable in a value box must be known where it is read and of the box's type.
const registry = createV1Registry();
const THIS: Target = { kind: 'this' };
const OTHER: Target = { kind: 'other' };

// The World has `bonus` (a number) and `mood` (a string); the trigger's entity its own `delay` (a number).
function buildContext(): TriggerContext {
    const level = Level.createNew();
    const levelVariables = [
        { name: 'bonus', value: 2 },
        { name: 'mood', value: 'calm' },
    ];
    level.world.addComponent(new VariablesComponent({ variables: levelVariables }));

    const owner = level.createEntity(level.world, 0);
    owner.addComponent(new TransformComponent());
    owner.addComponent(new VariablesComponent({ variables: [{ name: 'delay', value: 1 }] }));

    return { owner, level, registry };
}

function level(name: string): VariableAmount {
    return { kind: 'variable', name };
}

function own(name: string): VariableAmount {
    return { kind: 'variable', name, own: true };
}

function problemsOf(parts: { checks?: readonly Check[]; actions?: readonly Action[] }) {
    const trigger: Trigger = {
        id: 1,
        name: null,
        on: true,
        when: { kind: 'touched' },
        checks: parts.checks ?? [],
        actions: parts.actions ?? [],
    };

    return triggerProblems(trigger, buildContext()).map(({ slot, reason }) => ({ slot, reason }));
}

function change(target: Target, op: 'set' | 'add' | 'multiply', amount: VariableAmount, field = 'rotation'): Action {
    return { kind: 'change', target, value: { kind: 'field', component: 'TransformComponent', field }, op, amount };
}

describe('triggerProblems: variables as values', () => {
    test('a number variable in a number box, the level’s or the target’s own, is fine', () => {
        expect(problemsOf({ actions: [change(THIS, 'add', level('bonus'))] })).toEqual([]);
        expect(problemsOf({ actions: [change(THIS, 'set', own('delay'))] })).toEqual([]);
        expect(problemsOf({ actions: [{ kind: 'wait', seconds: own('delay') }] })).toEqual([]);
        expect(problemsOf({ actions: [{ kind: 'fire', target: THIS, name: 'hit', amount: level('bonus') }] })).toEqual(
            [],
        );
    });

    test('Multiply takes a number variable even on a vector', () => {
        expect(problemsOf({ actions: [change(THIS, 'multiply', level('bonus'), 'position')] })).toEqual([]);
    });

    test('a vector box takes no variable', () => {
        expect(problemsOf({ actions: [change(THIS, 'set', level('bonus'), 'position')] })).toEqual([
            { slot: 'amount', reason: 'wrongType' },
        ]);
    });

    test('a variable of another type is wrongType, an unknown one unknownVariable', () => {
        expect(problemsOf({ actions: [{ kind: 'wait', seconds: level('mood') }] })).toEqual([
            { slot: 'seconds', reason: 'wrongType' },
        ]);
        expect(problemsOf({ actions: [{ kind: 'wait', seconds: level('nope') }] })).toEqual([
            { slot: 'seconds', reason: 'unknownVariable' },
        ]);
        expect(problemsOf({ actions: [change(THIS, 'add', own('nope'))] })).toEqual([
            { slot: 'amount', reason: 'unknownVariable' },
        ]);
    });

    test('an own variable on a target only known in play is checked there', () => {
        expect(problemsOf({ actions: [change(OTHER, 'add', own('anything'))] })).toEqual([]);
    });

    test('the If’s amount takes a variable of the compared value’s type', () => {
        const compared: Check = {
            kind: 'value',
            target: THIS,
            value: { kind: 'variable', name: 'delay', own: true },
            compare: 'more',
            amount: level('bonus'),
        };
        expect(problemsOf({ checks: [compared] })).toEqual([]);
        expect(problemsOf({ checks: [{ ...compared, amount: level('mood') }] })).toEqual([
            { slot: 'amount', reason: 'wrongType' },
        ]);

        const tagged: Check = {
            kind: 'value',
            target: THIS,
            value: { kind: 'tag' },
            compare: 'is',
            amount: level('mood'),
        };
        expect(problemsOf({ checks: [tagged] })).toEqual([]);
    });
});
