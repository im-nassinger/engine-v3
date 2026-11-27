import { describe, expect, test } from 'vitest';

import type { Action, Check } from '../../../core/fields/index.ts';

import { buildV4TriggerLevel, choiceNamed, choicesOf, labelsOf, rowOf, slotOf } from './testing/v4TriggerLevel.ts';
import type { TriggerMenuGroup } from './TriggerWord.ts';

const IF = 1;
const DO = 2;

const THIS = { kind: 'this' } as const;
const COINS = { kind: 'variable', name: 'coins' } as const;
const POSITION = { kind: 'field', component: 'TransformComponent', field: 'position' } as const;

function actionRow(action: Action) {
    return rowOf(buildV4TriggerLevel([{ actions: [action] }]).block(), DO).sentence;
}

function checkRow(check: Check) {
    return rowOf(buildV4TriggerLevel([{ when: { kind: 'touched' }, checks: [check] }]).block(), IF).sentence;
}

function change(
    value: Extract<Action, { kind: 'change' }>['value'],
    op: 'set' | 'add' | 'multiply' | 'flip',
    amount: Extract<Action, { kind: 'change' }>['amount'],
): Action {
    return { kind: 'change', target: THIS, value, op, amount };
}

// Each group as "title: item, item", or "title: (its empty text)".
function shown(groups: readonly TriggerMenuGroup[] | undefined) {
    return groups?.map((group) => {
        const items = group.choices.length === 0 ? `(${group.emptyText ?? ''})` : labelsOf(group.choices).join(', ');
        return `${group.title}: ${items}`;
    });
}

describe("the trigger card's value boxes (fix 10)", () => {
    test("Change value's op menu offers Multiply and Divide for a number and a vector, not for a string", () => {
        const ops = (action: Action) => labelsOf(choicesOf(slotOf(actionRow(action), 'op').entry));

        expect(ops(change(COINS, 'set', 1))).toEqual(['set', 'add', 'subtract', 'multiply', 'divide']);
        expect(ops(change(POSITION, 'set', { x: 0, y: 0 }))).toEqual(['set', 'add', 'subtract', 'multiply', 'divide']);
        expect(ops(change({ kind: 'variable', name: 'player_name' }, 'set', 'Bo'))).toEqual(['set']);
    });

    test('multiply on a vector takes a factor per axis, and switching to it unsets an added vector', () => {
        const added = change(POSITION, 'add', { x: 1, y: 2 });
        const multiply = choiceNamed(choicesOf(slotOf(actionRow(added), 'op').entry), 'multiply');
        expect(multiply.value).toMatchObject({ action: { op: 'multiply', amount: null } });

        const sentence = actionRow(change(POSITION, 'multiply', { x: 2, y: 0.5 }));
        expect(sentence.text).toBe('multiply this Transform › Position by 2, 0.5');
        expect(slotOf(sentence, 'amount').entry).toMatchObject({ kind: 'vector', value: { x: 2, y: 0.5 } });
        expect(slotOf(sentence, 'amount').variables).toBeDefined();
    });

    test('a factor saved as one number before 2026-11-27 shows on both axes', () => {
        const sentence = actionRow(change(POSITION, 'multiply', 2));

        expect(sentence.text).toBe('multiply this Transform › Position by 2');
        expect(slotOf(sentence, 'amount').entry).toMatchObject({ kind: 'vector', value: { x: 2, y: 2 } });
    });

    test('a number amount offers the number variables, the level’s then the target’s own', () => {
        const groups = slotOf(actionRow(change(COINS, 'add', 1)), 'amount').variables;

        expect(shown(groups)).toEqual(['Level variables: coins, lives', 'this: (no number variables of its own)']);
    });

    test('a string or a boolean amount offers only variables of its type', () => {
        const stringGroups = slotOf(
            actionRow(change({ kind: 'variable', name: 'player_name' }, 'set', 'Bo')),
            'amount',
        );
        const booleanGroups = slotOf(actionRow(change({ kind: 'variable', name: 'game_over' }, 'set', true)), 'amount');

        expect(shown(stringGroups.variables)).toEqual(['Level variables: player_name', 'this: state']);
        expect(shown(booleanGroups.variables)).toEqual(['Level variables: game_over', 'this: door_open']);
    });

    test('a vector, a flip and an unset value offer no variable; Multiply on a vector offers numbers', () => {
        expect(slotOf(actionRow(change(POSITION, 'set', { x: 0, y: 0 })), 'amount').variables).toBeUndefined();
        expect(slotOf(actionRow(change(null, 'set', null)), 'amount').variables).toBeUndefined();

        const multiplied = slotOf(actionRow(change(POSITION, 'multiply', 2)), 'amount');
        expect(shown(multiplied.variables)?.[0]).toBe('Level variables: coins, lives');
    });

    test('picking a variable puts it in the box, which then reads its name', () => {
        const amount = slotOf(actionRow(change(COINS, 'add', 1)), 'amount');
        const lives = choiceNamed(amount.variables?.[0]?.choices ?? [], 'lives');
        expect(lives.value).toMatchObject({ action: { amount: { kind: 'variable', name: 'lives' } } });

        const own = slotOf(actionRow(change({ kind: 'variable', name: 'state', own: true }, 'set', 'x')), 'amount');
        const state = choiceNamed(own.variables?.[1]?.choices ?? [], 'state');
        expect(state.value).toMatchObject({ action: { amount: { kind: 'variable', name: 'state', own: true } } });

        expect(actionRow(change(COINS, 'add', { kind: 'variable', name: 'lives' })).text).toBe('add lives to coins');
    });

    test("Wait offers this's number variables; Fire its target's", () => {
        const wait = slotOf(actionRow({ kind: 'wait', seconds: { kind: 'variable', name: 'lives' } }), 'seconds');
        expect(wait.text).toBe('lives');
        expect(shown(wait.variables)).toEqual([
            'Level variables: coins, lives',
            'this: (no number variables of its own)',
        ]);

        const fire: Action = { kind: 'fire', target: { kind: 'other' }, name: 'open', amount: null };
        const fired = slotOf(actionRow(fire), 'amount');
        expect(shown(fired.variables)).toEqual(['Level variables: coins, lives', 'other: health']);
    });

    test("the If's amount offers the checked value's type; a level variable's check offers only the level's", () => {
        const levelCheck: Check = { kind: 'value', target: THIS, value: COINS, compare: 'atLeast', amount: 1 };
        expect(shown(slotOf(checkRow(levelCheck), 'amount').variables)).toEqual(['Level variables: coins, lives']);

        const tagCheck: Check = { kind: 'value', target: THIS, value: { kind: 'tag' }, compare: 'is', amount: 'coin' };
        expect(shown(slotOf(checkRow(tagCheck), 'amount').variables)).toEqual([
            'Level variables: player_name',
            'this: state',
        ]);

        const chosen = { ...levelCheck, amount: { kind: 'variable', name: 'lives' } } as const;
        expect(checkRow(chosen).text).toBe('coins is at least lives');
    });
});
