import { describe, expect, test } from 'vitest';

import type { Action, Check, When } from '../../../core/fields/index.ts';

import {
    buildV4TriggerLevel,
    choiceNamed,
    choicesOf,
    groupsOf,
    labelsOf,
    rowOf,
    slotOf,
} from './testing/v4TriggerLevel.ts';
import { triggerWith } from './testing/triggerLevel.ts';

const WHEN = 0;
const IF = 1;
const DO = 2;

const OWN_DOOR_OPEN = { owner: 'own', target: { kind: 'this' }, name: 'door_open' } as const;

function whenRow(when: When) {
    return rowOf(buildV4TriggerLevel([{ when }]).block(), WHEN).sentence;
}

function checkRow(check: Check, when: When = { kind: 'touched' }) {
    return rowOf(buildV4TriggerLevel([{ when, checks: [check] }]).block(), IF).sentence;
}

function actionRow(action: Action, index = 0, actions: readonly Action[] = [action]) {
    return rowOf(buildV4TriggerLevel([{ actions }]).block(), DO, index);
}

describe("TriggerCardModel's v4 kinds", () => {
    test.each([
        [{ kind: 'collision' }, 'this hits something'],
        [{ kind: 'destroyed' }, 'this is destroyed'],
        [{ kind: 'custom', name: 'open' }, 'this gets the custom event open'],
        [{ kind: 'custom', name: null }, 'this gets the custom event pick a name'],
        [{ kind: 'variableChanged', variable: null, becomes: null }, 'the variable pick a variable changes'],
        [
            {
                kind: 'variableChanged',
                variable: { owner: 'level', name: 'coins' },
                becomes: { compare: 'atLeast', value: 3 },
            },
            'the variable coins becomes 3 or more',
        ],
        [{ kind: 'variableChanged', variable: OWN_DOOR_OPEN, becomes: null }, 'the variable door_open of this changes'],
        [
            {
                kind: 'variableChanged',
                variable: { owner: 'level', name: 'player_name' },
                becomes: { compare: 'isNot', value: 'Bo' },
            },
            'the variable player_name becomes anything but "Bo"',
        ],
    ] as const)('the When %j reads "%s"', (when, text) => {
        expect(whenRow(when).text).toBe(text);
    });

    test('a hit and a custom event name an other; being destroyed does not', () => {
        const check: Check = { kind: 'hasTag', target: { kind: 'other' }, tag: 'player' };

        expect(slotOf(checkRow(check, { kind: 'collision' }), 'target').state).toBe('set');
        expect(slotOf(checkRow(check, { kind: 'custom', name: 'open' }), 'target').state).toBe('set');
        expect(slotOf(checkRow(check, { kind: 'destroyed' }), 'target').state).toBe('greyed');
    });

    test("a custom event's name menu offers the level's names, then New name…, which asks for a word", () => {
        const fire: Action = { kind: 'fire', target: { kind: 'this' }, name: 'open', amount: null };
        const { block } = buildV4TriggerLevel([{ when: { kind: 'custom', name: 'close' }, actions: [fire] }]);
        const name = slotOf(rowOf(block(), WHEN).sentence, 'name');
        const choices = choicesOf(name.entry);

        expect(labelsOf(choices)).toEqual(['close', 'open', 'New name…']);
        expect(choiceNamed(choices, 'open').asks).toBeUndefined();
        expect(choiceNamed(choices, 'New name…').asks).toEqual({
            kind: 'word',
            value: null,
            hint: 'One word, such as open',
        });
    });

    test("the variable menu has the level's group and this one's, each item with its type", () => {
        const sentence = whenRow({ kind: 'variableChanged', variable: null, becomes: null });
        const groups = groupsOf(slotOf(sentence, 'variable').entry);

        expect(groups.map((group) => group.title)).toEqual(['Level variables', 'this']);
        expect(groups.map((group) => group.choices.map((choice) => [choice.label, choice.note]))).toEqual([
            [
                ['coins', 'number'],
                ['lives', 'number'],
                ['player_name', 'string'],
                ['game_over', 'boolean'],
            ],
            [
                ['door_open', 'boolean'],
                ['state', 'string'],
            ],
        ]);
        expect(groups[1]?.choices[0]?.value).toEqual({
            section: 'when',
            when: { kind: 'variableChanged', variable: OWN_DOOR_OPEN, becomes: null },
        });
    });

    test('picking a variable of another type takes the condition away; one of the same type keeps it', () => {
        const when: When = {
            kind: 'variableChanged',
            variable: { owner: 'level', name: 'coins' },
            becomes: { compare: 'atLeast', value: 3 },
        };
        const groups = groupsOf(slotOf(whenRow(when), 'variable').entry);
        const lives = choiceNamed(groups[0]?.choices ?? [], 'lives');
        const gameOver = choiceNamed(groups[0]?.choices ?? [], 'game_over');

        expect(lives.value).toMatchObject({ when: { becomes: { compare: 'atLeast', value: 3 } } });
        expect(gameOver.value).toMatchObject({ when: { becomes: null } });
    });

    test('the condition menu follows the type: number compares and a number to type, as one word', () => {
        const when: When = { kind: 'variableChanged', variable: { owner: 'level', name: 'coins' }, becomes: null };
        const becomes = slotOf(whenRow(when), 'becomes');
        const choices = choicesOf(becomes.entry);

        expect(becomes).toMatchObject({ text: 'changes', state: 'set' });
        expect(labelsOf(choices)).toEqual([
            'changes (any change)',
            'becomes …',
            'becomes anything but …',
            'becomes more than …',
            'becomes less than …',
            'becomes … or more',
            'becomes … or less',
        ]);
        expect(choices[0]?.asks).toBeUndefined();
        expect(choices[5]?.asks).toMatchObject({ kind: 'number', value: null });
    });

    test('a string condition asks for text with is and is not; a boolean offers true and false at once', () => {
        const stringWhen: When = {
            kind: 'variableChanged',
            variable: { owner: 'level', name: 'player_name' },
            becomes: null,
        };
        const booleanWhen: When = { kind: 'variableChanged', variable: OWN_DOOR_OPEN, becomes: null };
        const stringChoices = choicesOf(slotOf(whenRow(stringWhen), 'becomes').entry);
        const booleanChoices = choicesOf(slotOf(whenRow(booleanWhen), 'becomes').entry);

        expect(labelsOf(stringChoices)).toEqual(['changes (any change)', 'becomes "…"', 'becomes anything but "…"']);
        expect(stringChoices[1]?.asks).toEqual({ kind: 'text', value: null });
        expect(labelsOf(booleanChoices)).toEqual(['changes (any change)', 'becomes true', 'becomes false']);
        expect(booleanChoices[1]).toMatchObject({
            asks: undefined,
            value: { when: { becomes: { compare: 'is', value: true } } },
        });
    });

    test("a condition the variable's type lacks makes the condition word yellow", () => {
        const when: When = {
            kind: 'variableChanged',
            variable: { owner: 'level', name: 'player_name' },
            becomes: { compare: 'more', value: 2 },
        };

        expect(slotOf(whenRow(when), 'becomes').state).toBe('unset');
    });

    test("a compared variable's menu adds other's group when the event has one, from every entity's names", () => {
        const check: Check = { kind: 'compare', variable: null, compare: 'atLeast', value: null };
        const touchedGroups = groupsOf(slotOf(checkRow(check), 'variable').entry);
        const startGroups = groupsOf(slotOf(checkRow(check, { kind: 'levelStart' }), 'variable').entry);

        expect(touchedGroups.map((group) => group.title)).toEqual(['Level variables', 'this', 'other']);
        expect(labelsOf(touchedGroups[2]?.choices ?? [])).toEqual(['health', 'door_open', 'state']);
        expect(startGroups.map((group) => group.title)).toEqual(['Level variables', 'this']);
    });

    test('the compare words and the value field follow the variable: text in quotes, true or false', () => {
        const stringCheck: Check = {
            kind: 'compare',
            variable: { owner: 'level', name: 'player_name' },
            compare: 'is',
            value: 'Ada',
        };
        const booleanCheck: Check = {
            kind: 'compare',
            variable: { owner: 'own', target: { kind: 'other' }, name: 'door_open' },
            compare: 'isNot',
            value: null,
        };
        const stringRow = checkRow(stringCheck);
        const booleanRow = checkRow(booleanCheck);

        expect(stringRow.text).toBe('player_name is "Ada"');
        expect(labelsOf(choicesOf(slotOf(stringRow, 'compare').entry))).toEqual(['is', 'is not']);
        expect(slotOf(stringRow, 'number').entry).toEqual({ kind: 'text', value: 'Ada' });
        expect(booleanRow.text).toBe('door_open of other is not true or false');
        expect(labelsOf(choicesOf(slotOf(booleanRow, 'number').entry))).toEqual(['true', 'false']);
    });

    test('picking a variable of another type resets the compare to is and the value to unset', () => {
        const check: Check = {
            kind: 'compare',
            variable: { owner: 'level', name: 'coins' },
            compare: 'more',
            value: 2,
        };
        const groups = groupsOf(slotOf(checkRow(check), 'variable').entry);

        expect(choiceNamed(groups[0]?.choices ?? [], 'player_name').value).toMatchObject({
            check: { variable: { owner: 'level', name: 'player_name' }, compare: 'is', value: null },
        });
        expect(choiceNamed(groups[0]?.choices ?? [], 'lives').value).toMatchObject({
            check: { compare: 'more', value: 2 },
        });
    });

    test('the component value check reads "this Body › Speed is more than 200"', () => {
        const check: Check = {
            kind: 'compareValue',
            target: { kind: 'this' },
            value: { kind: 'live', live: 'speed' },
            compare: 'more',
            amount: 200,
        };

        expect(checkRow(check).text).toBe('this Body › Speed is more than 200');
        expect(checkRow({ ...check, value: null, amount: null }).text).toBe('this pick a value is more than a number');
    });

    test("a vector or a body's velocity is read on one axis, a word of its own", () => {
        const check: Check = {
            kind: 'compareValue',
            target: { kind: 'this' },
            value: { kind: 'field', component: 'TransformComponent', field: 'position', axis: 'y' },
            compare: 'atMost',
            amount: 500,
        };
        const axis = slotOf(checkRow(check), 'axis');
        const velocity = checkRow({ ...check, value: { kind: 'live', live: 'velocityX' } });

        expect(checkRow(check).text).toBe('this Transform › Position y is at most 500');
        expect(labelsOf(choicesOf(axis.entry))).toEqual(['x', 'y']);
        expect(choiceNamed(choicesOf(axis.entry), 'x').value).toMatchObject({
            check: { value: { kind: 'field', field: 'position', axis: 'x' } },
        });
        expect(velocity.text).toBe('this Body › Velocity x is at most 500');
        expect(choiceNamed(choicesOf(slotOf(velocity, 'axis').entry), 'y').value).toMatchObject({
            check: { value: { kind: 'live', live: 'velocityY' } },
        });
    });

    test("the value menu lists the target's components, each with its numbers and vectors once, and the body's live values last", () => {
        const check: Check = {
            kind: 'compareValue',
            target: { kind: 'this' },
            value: null,
            compare: 'more',
            amount: 0,
        };
        const entry = slotOf(checkRow(check), 'value').entry;
        if (entry.kind !== 'submenus') throw new Error('Not a menu of submenus.');

        const transform = entry.submenus.find((submenu) => submenu.label === 'Transform');
        const body = entry.submenus.find((submenu) => submenu.label === 'Body');
        const liveChoices = body?.choices.slice(-2) ?? [];

        expect(labelsOf(transform?.choices ?? [])).toEqual(['Position', 'Rotation', 'Scale', 'Skew']);
        expect(choiceNamed(transform?.choices ?? [], 'Position').value).toMatchObject({
            check: { value: { kind: 'field', field: 'position', axis: 'x' } },
        });
        expect(liveChoices.map((choice) => [choice.label, choice.note])).toEqual([
            ['Speed', 'live'],
            ['Velocity', 'live'],
        ]);
        expect(liveChoices[1]?.value).toMatchObject({ check: { value: { kind: 'live', live: 'velocityX' } } });
    });

    test('Fire reads its name, its target and its optional number, grey while unset', () => {
        const fire: Action = { kind: 'fire', target: { kind: 'tagged', tag: 'coin' }, name: 'open', amount: null };
        const row = actionRow(fire);
        const amount = slotOf(row.sentence, 'amount');

        expect(row.sentence.text).toBe('fire open on every coin with a number (for scripts)');
        expect(amount).toMatchObject({ state: 'optional', entry: { kind: 'number', clearLabel: 'No number' } });
        expect(actionRow({ ...fire, amount: 2 }).sentence.text).toBe('fire open on every coin with the number 2');
        expect(slotOf(actionRow({ ...fire, name: null }).sentence, 'name').state).toBe('unset');
    });

    test('Wait reads "wait 2 s", with the line under it only when actions follow', () => {
        const wait: Action = { kind: 'wait', seconds: 2 };
        const actions: readonly Action[] = [wait, { kind: 'win' }, wait];

        expect(actionRow(wait).sentence.text).toBe('wait 2 s');
        expect(slotOf(actionRow(wait).sentence, 'seconds').entry).toMatchObject({ kind: 'number', unit: 's' });
        expect(actionRow({ kind: 'wait', seconds: null }).sentence.text).toBe('wait how long s');
        expect(actionRow(wait, 0, actions).hasWaitLine).toBe(true);
        expect(actionRow(wait, 1, actions).hasWaitLine).toBe(false);
        expect(actionRow(wait, 2, actions).hasWaitLine).toBe(false);
    });

    test('Change value on a boolean offers set and flip, and flip reads with no value', () => {
        const flip: Action = {
            kind: 'change',
            target: { kind: 'this' },
            value: { kind: 'variable', name: 'door_open', own: true },
            op: 'flip',
            amount: null,
        };
        const sentence = actionRow(flip).sentence;

        expect(sentence.text).toBe('flip this door_open');
        expect(labelsOf(choicesOf(slotOf(sentence, 'op').entry))).toEqual(['set', 'flip']);

        const set = actionRow({ ...flip, op: 'set', amount: true }).sentence;
        expect(set.text).toBe('set this door_open to true');
        expect(labelsOf(choicesOf(slotOf(set, 'amount').entry))).toEqual(['true', 'false']);
    });

    test('Change value on a string offers set only, its value in quotes and typed as text', () => {
        const { component, level, block } = buildV4TriggerLevel();
        const set: Action = {
            kind: 'change',
            target: { kind: 'entity', entity: level.world.id },
            value: { kind: 'variable', name: 'player_name' },
            op: 'set',
            amount: 'Bo',
        };
        component.set('triggers', [triggerWith({ actions: [set] })]);
        const sentence = rowOf(block(), DO).sentence;

        expect(sentence.text).toBe('set player_name to "Bo"');
        expect(labelsOf(choicesOf(slotOf(sentence, 'op').entry))).toEqual(['set']);
        expect(slotOf(sentence, 'amount').entry).toEqual({ kind: 'text', value: 'Bo' });
    });

    test("Change value's menu offers its target's own variables under Variables; a boolean picked over add takes flip", () => {
        const add: Action = { kind: 'change', target: { kind: 'this' }, value: null, op: 'add', amount: 1 };
        const groups = groupsOf(slotOf(actionRow(add).sentence, 'value').entry);
        const ownGroup = groups[1]?.submenus?.find((submenu) => submenu.label === 'Variables');

        expect(groups[1]?.title).toBe('Values of this');
        expect(ownGroup?.choices.map((choice) => [choice.label, choice.note])).toEqual([
            ['door_open', 'boolean'],
            ['state', 'string'],
        ]);
        expect(choiceNamed(ownGroup?.choices ?? [], 'door_open').value).toEqual({
            section: 'action',
            index: 0,
            action: {
                kind: 'change',
                target: { kind: 'this' },
                value: { kind: 'variable', name: 'door_open', own: true },
                op: 'flip',
                amount: null,
            },
        });
        expect(choiceNamed(ownGroup?.choices ?? [], 'state').value).toMatchObject({
            action: { op: 'set', amount: null },
        });
    });
});
