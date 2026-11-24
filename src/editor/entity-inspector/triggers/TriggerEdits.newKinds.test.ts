import { describe, expect, test } from 'vitest';

import type { Action, Check, When } from '../../../core/fields/index.ts';

import { buildV4TriggerLevel, choiceNamed, choicesOf, rowOf, slotOf } from './testing/v4TriggerLevel.ts';
import { TriggerEdits } from './TriggerEdits.ts';
import { TriggerTyping } from './TriggerTyping.ts';

const WHEN = 0;
const DO = 2;

describe("TriggerEdits on v4's kinds", () => {
    test('a condition that asks for its value and the typed value are one step', () => {
        const when: When = { kind: 'variableChanged', variable: { owner: 'level', name: 'coins' }, becomes: null };
        const { component, block } = buildV4TriggerLevel([{ when }]);
        const becomes = slotOf(rowOf(block(), WHEN).sentence, 'becomes');
        const orMore = choiceNamed(choicesOf(becomes.entry), 'becomes … or more');

        const edit = TriggerEdits.pickedAndTyped(component, 0, orMore.value, becomes.address, 3);

        expect(edit?.label).toBe('Change trigger "coins changes"');
        expect(edit?.triggers[0]?.when).toEqual({ ...when, becomes: { compare: 'atLeast', value: 3 } });
    });

    test('a typed value changes a set condition, keeping its compare', () => {
        const when: When = {
            kind: 'variableChanged',
            variable: { owner: 'level', name: 'player_name' },
            becomes: { compare: 'isNot', value: '' },
        };
        const { component, block } = buildV4TriggerLevel([{ when }]);
        const becomes = slotOf(rowOf(block(), WHEN).sentence, 'becomes');

        const edit = TriggerEdits.typed(component, 0, becomes.address, 'Bo');

        expect(edit?.triggers[0]?.when).toMatchObject({ becomes: { compare: 'isNot', value: 'Bo' } });
    });

    test('New name… and the word typed are one step, on a When and on Fire', () => {
        const fire: Action = { kind: 'fire', target: { kind: 'this' }, name: null, amount: null };
        const { component, block } = buildV4TriggerLevel([{ when: { kind: 'custom', name: null }, actions: [fire] }]);
        const whenName = slotOf(rowOf(block(), WHEN).sentence, 'name');
        const fireName = slotOf(rowOf(block(), DO).sentence, 'name');
        const newForWhen = choiceNamed(choicesOf(whenName.entry), 'New name…');
        const newForFire = choiceNamed(choicesOf(fireName.entry), 'New name…');

        const whenEdit = TriggerEdits.pickedAndTyped(component, 0, newForWhen.value, whenName.address, 'open');
        const fireEdit = TriggerEdits.pickedAndTyped(component, 0, newForFire.value, fireName.address, 'close');

        expect(whenEdit?.label).toBe('Change trigger "Gets an event"');
        expect(whenEdit?.triggers[0]?.when).toEqual({ kind: 'custom', name: 'open' });
        expect(fireEdit?.triggers[0]?.actions[0]).toEqual({ ...fire, name: 'close' });
    });

    test("Fire's number is typed in, and cleared with null", () => {
        const fire: Action = { kind: 'fire', target: { kind: 'this' }, name: 'open', amount: 2 };
        const { component, block } = buildV4TriggerLevel([{ actions: [fire] }]);
        const amount = slotOf(rowOf(block(), DO).sentence, 'amount');

        expect(TriggerEdits.typed(component, 0, amount.address, 5)?.triggers[0]?.actions[0]).toEqual({
            ...fire,
            amount: 5,
        });
        expect(TriggerEdits.typed(component, 0, amount.address, null)?.triggers[0]?.actions[0]).toEqual({
            ...fire,
            amount: null,
        });
        expect(TriggerEdits.typed(component, 0, amount.address, 'two')).toBeUndefined();
    });

    test("a Wait's seconds are kept within 0 to 3,600", () => {
        const { component, block } = buildV4TriggerLevel([{ actions: [{ kind: 'wait', seconds: 1 }] }]);
        const seconds = slotOf(rowOf(block(), DO).sentence, 'seconds');

        expect(TriggerEdits.typed(component, 0, seconds.address, 2)?.triggers[0]?.actions[0]).toEqual({
            kind: 'wait',
            seconds: 2,
        });
        expect(TriggerEdits.typed(component, 0, seconds.address, 5000)?.triggers[0]?.actions[0]).toEqual({
            kind: 'wait',
            seconds: 3600,
        });
        expect(TriggerEdits.typed(component, 0, seconds.address, -1)?.triggers[0]?.actions[0]).toEqual({
            kind: 'wait',
            seconds: 0,
        });
    });

    test("a compared string and a component value's number are typed in", () => {
        const stringCheck: Check = {
            kind: 'value',
            target: { kind: 'this' },
            value: { kind: 'variable', name: 'player_name' },
            compare: 'is',
            amount: null,
        };
        const valueCheck: Check = {
            kind: 'value',
            target: { kind: 'this' },
            value: { kind: 'live', live: 'speed' },
            compare: 'more',
            amount: null,
        };
        const { component, block } = buildV4TriggerLevel([{ checks: [stringCheck, valueCheck] }]);
        const stringValue = slotOf(rowOf(block(), 1, 0).sentence, 'amount');
        const amount = slotOf(rowOf(block(), 1, 1).sentence, 'amount');

        const stringEdit = TriggerEdits.typed(component, 0, stringValue.address, 'Ada');
        const amountEdit = TriggerEdits.typed(component, 0, amount.address, 200);

        expect(stringEdit?.label).toBe('Change trigger "Touched"');
        expect(stringEdit?.triggers[0]?.checks[0]).toEqual({ ...stringCheck, amount: 'Ada' });
        expect(amountEdit?.triggers[0]?.checks[1]).toEqual({ ...valueCheck, amount: 200 });
        expect(TriggerEdits.typed(component, 0, amount.address, 'fast')).toBeUndefined();
    });

    test('a picked boolean condition is one step at once', () => {
        const when: When = {
            kind: 'variableChanged',
            variable: { owner: 'own', target: { kind: 'this' }, name: 'door_open' },
            becomes: null,
        };
        const { component, block } = buildV4TriggerLevel([{ when }]);
        const becomes = slotOf(rowOf(block(), WHEN).sentence, 'becomes');
        const becomesTrue = choiceNamed(choicesOf(becomes.entry), 'becomes true');

        const edit = TriggerEdits.picked(component, 0, becomesTrue.value);

        expect(edit.label).toBe('Change trigger "door_open changes"');
        expect(edit.triggers[0]?.when).toEqual({ ...when, becomes: { compare: 'is', value: true } });
    });
});

describe("TriggerTyping's text and word fields", () => {
    const text = { kind: 'text', value: null } as const;
    const word = { kind: 'word', value: null, hint: 'One word, such as open' } as const;

    test('a text field takes any text up to 1,000 characters, the empty one included', () => {
        expect(TriggerTyping.parse(text, ' Ada ')).toEqual({ kind: 'value', value: ' Ada ' });
        expect(TriggerTyping.parse(text, '')).toEqual({ kind: 'value', value: '' });
        expect(TriggerTyping.parse(text, 'a'.repeat(1001))).toMatchObject({ kind: 'invalid' });
    });

    test("a name is made one word as a tag is, and can't be a builtin event's name", () => {
        expect(TriggerTyping.parse(word, 'Open Door')).toEqual({ kind: 'value', value: 'open_door' });
        expect(TriggerTyping.parse(word, '   ')).toEqual({ kind: 'restore' });
        expect(TriggerTyping.parse(word, '!!')).toMatchObject({ kind: 'invalid' });
        expect(TriggerTyping.parse(word, 'touched')).toEqual({
            kind: 'invalid',
            reason: 'touched is the name of an event',
        });
    });
});
