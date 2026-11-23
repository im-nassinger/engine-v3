import { describe, expect, test } from 'vitest';

import type { Action, Check, Trigger, When } from '../../../core/fields/index.ts';
import type { KeyCode } from '../../../core/keys/index.ts';

import type { CardNote } from '../model/CardNote.ts';

import { buildTriggerLevel } from './testing/triggerLevel.ts';
import { TriggerCardModel } from './TriggerCardModel.ts';
import type { TriggerBlock } from './TriggerCardModel.ts';
import type { TriggerSentence } from './TriggerSentence.ts';
import type { TriggerWord } from './TriggerWord.ts';

function blockOf(parts: Partial<Trigger>, notes: readonly CardNote[] = []) {
    const { component, context } = buildTriggerLevel([parts]);
    const model = TriggerCardModel.build(component, context, notes);

    return model.triggers[0] as TriggerBlock;
}

function rowText(block: TriggerBlock, sectionIndex: number, rowIndex = 0) {
    return sentenceOf(block, sectionIndex, rowIndex).text;
}

function sentenceOf(block: TriggerBlock, sectionIndex: number, rowIndex = 0): TriggerSentence {
    const row = block.sections[sectionIndex]?.rows[rowIndex];
    if (row === undefined) throw new Error(`No row ${rowIndex} in section ${sectionIndex}.`);

    return row.sentence;
}

function slots(sentence: TriggerSentence) {
    return sentence.words.filter((word) => word.kind === 'slot');
}

function slotNamed(sentence: TriggerSentence, slot: string) {
    const word = slots(sentence).find((candidate) => candidate.address.slot === slot);
    if (word === undefined) throw new Error(`No ${slot} word in "${sentence.text}".`);

    return word;
}

function groupsOf(word: TriggerWord) {
    if (word.kind !== 'slot' || word.entry.kind !== 'groups') throw new Error('Not a menu in groups.');

    return word.entry.groups;
}

function menuLabels(word: TriggerWord) {
    if (word.kind !== 'slot' || word.entry.kind !== 'menu') throw new Error('Not a menu.');

    return word.entry.choices.map((choice) => choice.label);
}

function entitiesOf(word: TriggerWord) {
    if (word.kind !== 'slot' || word.entry.kind !== 'entities') throw new Error('Not the entity picker.');

    return word.entry;
}

function valueInMenu(word: TriggerWord, label: string) {
    for (const group of groupsOf(word)) {
        const direct = group.choices.find((choice) => choice.label === label);
        if (direct !== undefined) return direct;

        for (const submenu of group.submenus ?? []) {
            const inside = submenu.choices.find((choice) => `${submenu.label} › ${choice.label}` === label);
            if (inside !== undefined) return inside;
        }
    }

    throw new Error(`No value ${label}.`);
}

const WHEN_CASES: readonly (readonly [When | null, string])[] = [
    [null, 'pick an event'],
    [{ kind: 'touched' }, 'something starts touching this'],
    [{ kind: 'untouched' }, 'something stops touching this'],
    [{ kind: 'input', input: 'jump', how: 'pressed' }, 'the input jump is pressed'],
    [{ kind: 'input', input: null, how: 'held' }, 'the input pick an input is held'],
    [{ kind: 'key', key: 'ArrowLeft' as KeyCode, how: 'released' }, 'the key Left arrow is released'],
    [{ kind: 'after', seconds: 60 }, 'after 60 seconds'],
    [{ kind: 'every', seconds: null }, 'every how many seconds'],
    [{ kind: 'levelStart' }, 'the level starts'],
    [{ kind: 'tagLeft', tag: 'coin' }, 'no entity tagged coin is left'],
];

const CHECK_CASES: readonly (readonly [Check, string])[] = [
    [{ kind: 'hasTag', target: { kind: 'other' }, tag: 'player' }, 'other has the tag player'],
    [{ kind: 'hasTag', target: { kind: 'entity', entity: null }, tag: null }, 'pick an entity has the tag pick a tag'],
    [
        { kind: 'compare', variable: { owner: 'level', name: 'coins' }, compare: 'atLeast', value: 10 },
        'coins is at least 10',
    ],
    [{ kind: 'compare', variable: null, compare: 'isNot', value: null }, 'pick a variable is not a number'],
];

describe('TriggerCardModel', () => {
    test("the head gives the trigger's name, made from its When or its own, and its switch", () => {
        expect(blockOf({ when: { kind: 'touched' } }).name).toBe('Touched');
        expect(blockOf({ name: 'Pick up', on: false })).toMatchObject({ name: 'Pick up', isOn: false });
    });

    test('a block has When, If, Do and Repeat, with their hints', () => {
        const empty = blockOf({ actions: [{ kind: 'win' }] });
        const full = blockOf({
            checks: [{ kind: 'hasTag', target: { kind: 'other' }, tag: 'player' }],
            actions: [{ kind: 'win' }, { kind: 'lose' }],
        });

        expect(empty.sections.map((section) => [section.title, section.hint])).toEqual([
            ['When', undefined],
            ['If', 'optional'],
            ['Do', undefined],
            ['Repeat', undefined],
        ]);
        expect(full.sections[1].hint).toBe('all must be true');
        expect(full.sections[2].hint).toBe('top to bottom');
    });

    test.each(WHEN_CASES)('the When %j reads "%s"', (when, text) => {
        expect(rowText(blockOf({ when }), 0)).toBe(text);
    });

    test('an unset word is unset and says what it needs; a set one is set', () => {
        const sentence = sentenceOf(blockOf({ when: { kind: 'input', input: null, how: 'held' } }), 0);

        expect(slots(sentence).map((word) => [word.text, word.state])).toEqual([
            ['the input', 'set'],
            ['pick an input', 'unset'],
            ['held', 'set'],
        ]);
    });

    test('an input the World lacks is yellow, as it stops the trigger', () => {
        const sentence = sentenceOf(blockOf({ when: { kind: 'input', input: 'fly', how: 'held' } }), 0);

        expect(slotNamed(sentence, 'input')).toMatchObject({ text: 'fly', state: 'unset' });
    });

    test("the event menu lists every event, and picking one resets the When's own parts", () => {
        const sentence = sentenceOf(blockOf({ when: { kind: 'after', seconds: 5 } }), 0);
        const event = slotNamed(sentence, 'event');
        if (event.entry.kind !== 'menu') throw new Error('Not a menu.');

        expect(event.entry.choices.map((choice) => choice.label)).toEqual([
            'something starts touching this',
            'something stops touching this',
            'an input is pressed, released or held',
            'a key is pressed, released or held',
            'after some time',
            'every few seconds',
            'the level starts',
            'the last entity with a tag is gone',
            'this hits something',
            'this gets a custom event',
            'this is destroyed',
            'a variable changes',
        ]);
        expect(event.entry.choices[4]?.value).toEqual({ section: 'when', when: { kind: 'after', seconds: null } });
    });

    test("a word's menu offers the World's inputs, the level's tags, and the keys", () => {
        const input = slotNamed(sentenceOf(blockOf({ when: { kind: 'input', input: null, how: 'held' } }), 0), 'input');
        const tag = slotNamed(sentenceOf(blockOf({ when: { kind: 'tagLeft', tag: null } }), 0), 'tag');
        const key = slotNamed(sentenceOf(blockOf({ when: { kind: 'key', key: null, how: 'held' } }), 0), 'key');

        expect(menuLabels(input)).toEqual(['left', 'right', 'up', 'down', 'jump']);
        expect(menuLabels(tag)).toEqual(['coin', 'player']);
        expect(menuLabels(key)).toContain('Left arrow');
    });

    test('seconds open a number field in seconds', () => {
        const seconds = slotNamed(sentenceOf(blockOf({ when: { kind: 'every', seconds: 2 } }), 0), 'seconds');

        expect(seconds.entry).toEqual({ kind: 'number', value: 2, unit: 's' });
    });

    test.each(CHECK_CASES)('the check %j reads "%s"', (check, text) => {
        expect(rowText(blockOf({ checks: [check] }), 1)).toBe(text);
    });

    test("a check's target opens the entity picker: this, other, then the tree, never a tag", () => {
        const check: Check = { kind: 'hasTag', target: { kind: 'other' }, tag: 'player' };
        const { component, context, player, coin } = buildTriggerLevel([{ checks: [check] }]);
        const block = TriggerCardModel.build(component, context, []).triggers[0] as TriggerBlock;
        const picker = entitiesOf(slotNamed(sentenceOf(block, 1), 'target'));

        expect(picker.choices.map((choice) => [choice.label, choice.description])).toEqual([
            ['this', 'The entity this trigger is on'],
            ['other', 'The other entity of the event: the one touching, hit or firing'],
        ]);
        expect(picker.tagged).toEqual([]);
        expect(picker.chosenId).toBeUndefined();
        expect(picker.placeEntity(player.id)).toMatchObject({
            check: { ...check, target: { kind: 'entity', entity: player.id } },
        });
        expect(picker.placeEntity(coin.id)).toMatchObject({ check: { ...check, target: { kind: 'this' } } });
    });

    test("an action's target picker also offers every entity with a tag, and marks the entity picked", () => {
        const { component, context, player } = buildTriggerLevel([
            { actions: [{ kind: 'destroy', target: { kind: 'entity', entity: 0 } }] },
        ]);
        const trigger = component.get('triggers')[0] as Trigger;
        const action: Action = { kind: 'destroy', target: { kind: 'entity', entity: player.id } };
        component.set('triggers', [{ ...trigger, actions: [action] }]);
        const block = TriggerCardModel.build(component, context, []).triggers[0] as TriggerBlock;
        const picker = entitiesOf(slotNamed(sentenceOf(block, 2), 'target'));

        expect(picker.tagged.map((choice) => choice.label)).toEqual([
            'every entity tagged coin',
            'every entity tagged player',
        ]);
        expect(picker.chosenId).toBe(player.id);
    });

    test('`other` under an event with none is greyed, with its reason, in the word and the menu', () => {
        const check: Check = { kind: 'hasTag', target: { kind: 'other' }, tag: 'player' };
        const block = blockOf({ when: { kind: 'levelStart' }, checks: [check] });
        const target = slotNamed(sentenceOf(block, 1), 'target');
        const reason = 'This event has no other entity';

        expect(target).toMatchObject({ text: 'other', state: 'greyed', reason });
        expect(entitiesOf(target).choices[1]).toMatchObject({ label: 'other', disabledReason: reason });
    });

    test('a deleted entity reads `missing entity`', () => {
        const action: Action = { kind: 'destroy', target: { kind: 'entity', entity: 999 } };
        const target = slotNamed(sentenceOf(blockOf({ actions: [action] }), 2), 'target');

        expect(target).toMatchObject({ text: 'missing entity', state: 'missing' });
    });

    test.each([
        [{ kind: 'win' }, 'win'],
        [{ kind: 'lose' }, 'lose'],
        [{ kind: 'restart' }, 'restart the level'],
        [{ kind: 'destroy', target: { kind: 'this' } }, 'destroy this'],
        [{ kind: 'destroy', target: { kind: 'tagged', tag: 'coin' } }, 'destroy every coin'],
        [{ kind: 'push', target: { kind: 'other' }, push: null }, 'push other how'],
        [
            { kind: 'push', target: { kind: 'other' }, push: { kind: 'by', x: 0, y: -600 } },
            'push other by 0, -600 px/s',
        ],
        [
            { kind: 'push', target: { kind: 'other' }, push: { kind: 'away', strength: 400 } },
            'push other away from this at 400 px/s',
        ],
        [
            { kind: 'change', target: { kind: 'entity', entity: null }, value: null, op: 'add', amount: null },
            'add a value to pick an entity pick a value',
        ],
    ] as const)('the action %j reads "%s"', (action, text) => {
        expect(rowText(blockOf({ actions: [action] }), 2)).toBe(text);
    });

    test('Change value on a variable reads without a target; on a field with one', () => {
        const { component, context, level } = buildTriggerLevel([
            {
                actions: [
                    {
                        kind: 'change',
                        target: { kind: 'entity', entity: 0 },
                        value: { kind: 'variable', name: 'coins' },
                        op: 'add',
                        amount: 1,
                    },
                    {
                        kind: 'change',
                        target: { kind: 'other' },
                        value: { kind: 'field', component: 'TransformComponent', field: 'position', axis: 'x' },
                        op: 'subtract',
                        amount: 10,
                    },
                    { kind: 'change', target: { kind: 'this' }, value: { kind: 'tag' }, op: 'add', amount: 'gone' },
                    {
                        kind: 'change',
                        target: { kind: 'this' },
                        value: { kind: 'field', component: 'TransformComponent', field: 'position' },
                        op: 'set',
                        amount: { x: 5, y: 6 },
                    },
                ],
            },
        ]);
        const worldTrigger = component.get('triggers')[0] as Trigger;
        const withWorld = {
            ...worldTrigger,
            actions: worldTrigger.actions.map((action, index) => {
                if (index !== 0 || action.kind !== 'change') return action;

                return { ...action, target: { kind: 'entity', entity: level.world.id } } as const;
            }),
        };
        component.set('triggers', [withWorld]);
        const block = TriggerCardModel.build(component, context, []).triggers[0] as TriggerBlock;

        expect(rowText(block, 2, 0)).toBe('add 1 to coins');
        expect(rowText(block, 2, 1)).toBe('subtract 10, 0 from other Transform › Position');
        expect(rowText(block, 2, 2)).toBe('add gone to this tags');
        expect(rowText(block, 2, 3)).toBe('set this Transform › Position to 5, 6');
    });

    test("the value menu lists the level's variables, then the target's components, each opening its values", () => {
        const action: Action = { kind: 'change', target: { kind: 'this' }, value: null, op: 'add', amount: null };
        const value = slotNamed(sentenceOf(blockOf({ actions: [action] }), 2), 'value');
        const groups = groupsOf(value);

        expect(groups.map((group) => group.title)).toEqual(['Level variables', 'Values of this']);
        expect(groups[0]?.choices.map((choice) => [choice.label, choice.note])).toEqual([
            ['coins', 'number'],
            ['lives', 'number'],
        ]);
        expect(
            groups[1]?.submenus?.map((submenu) => [submenu.label, submenu.choices.map((choice) => choice.label)]),
        ).toEqual([
            ['Transform', ['Position', 'Rotation']],
            ['Tags', ['Tags']],
            ['Trigger', ['Touched on/off']],
        ]);
    });

    test('picking a variable makes the World the target; a field keeps the target and fixes the op', () => {
        const action: Action = { kind: 'change', target: { kind: 'other' }, value: null, op: 'add', amount: 'x' };
        const { component, context, level } = buildTriggerLevel([{ actions: [action] }]);
        const block = TriggerCardModel.build(component, context, []).triggers[0] as TriggerBlock;
        const groups = groupsOf(slotNamed(sentenceOf(block, 2), 'value'));

        const valueWord = slotNamed(sentenceOf(block, 2), 'value');
        const coins = groups[0]?.choices.find((choice) => choice.label === 'coins');
        const fill = valueInMenu(valueWord, 'Style › Fill');

        expect(coins?.value).toEqual({
            section: 'action',
            index: 0,
            action: {
                kind: 'change',
                target: { kind: 'entity', entity: level.world.id },
                value: { kind: 'variable', name: 'coins' },
                op: 'add',
                amount: null,
            },
        });
        expect(fill?.value).toMatchObject({ action: { target: { kind: 'other' }, op: 'set' } });
    });

    test('an amount opens what its value takes: a number, on and off, or a tag', () => {
        const triggerOn: Action = {
            kind: 'change',
            target: { kind: 'this' },
            value: { kind: 'triggerOn', trigger: 1 },
            op: 'set',
            amount: false,
        };
        const tag: Action = {
            kind: 'change',
            target: { kind: 'this' },
            value: { kind: 'tag' },
            op: 'add',
            amount: null,
        };
        const block = blockOf({ actions: [triggerOn, tag] });

        const onAmount = slotNamed(sentenceOf(block, 2, 0), 'amount');
        const tagAmount = slotNamed(sentenceOf(block, 2, 1), 'amount');

        expect(onAmount.text).toBe('off');
        expect(menuLabels(onAmount)).toEqual(['on', 'off']);
        expect(menuLabels(tagAmount)).toEqual(['coin', 'player', 'New tag…']);
        expect(rowText(block, 2, 0)).toBe('set this Trigger › Touched to off');
    });

    test("an amount opens the inspector's own boxes: a vector's two, a number with its unit, the colour box", () => {
        const change = (field: string, component: `${string}Component`, amount: unknown) =>
            ({
                kind: 'change',
                target: { kind: 'other' },
                value: { kind: 'field', component, field },
                op: 'set',
                amount,
            }) as Action;
        const block = blockOf({
            actions: [
                change('position', 'TransformComponent', { x: 5, y: 6 }),
                change('rotation', 'TransformComponent', 90),
                change('outlineColour', 'StyleComponent', '#FF0000FF'),
                change('fill', 'StyleComponent', { kind: 'solid', colour: '#00FF00FF' }),
            ],
        });

        expect(slotNamed(sentenceOf(block, 2, 0), 'amount').entry).toEqual({
            kind: 'vector',
            value: { x: 5, y: 6 },
            unit: 'px',
        });
        expect(slotNamed(sentenceOf(block, 2, 1), 'amount').entry).toEqual({ kind: 'number', value: 90, unit: '°' });
        expect(slotNamed(sentenceOf(block, 2, 2), 'amount').entry).toEqual({ kind: 'colour', value: '#FF0000FF' });
        expect(slotNamed(sentenceOf(block, 2, 3), 'amount')).toMatchObject({
            text: '#00FF00FF',
            entry: { kind: 'colour', value: '#00FF00FF', isFill: true },
        });
    });

    test("an entity amount, such as the camera's Follow, opens the entity picker and reads the entity's name", () => {
        const { component, context, level, player } = buildTriggerLevel([{}]);
        const follow: Action = {
            kind: 'change',
            target: { kind: 'entity', entity: level.camera.id },
            value: { kind: 'field', component: 'CameraComponent', field: 'follow' },
            op: 'set',
            amount: { entity: player.id },
        };
        const trigger = component.get('triggers')[0] as Trigger;
        component.set('triggers', [{ ...trigger, actions: [follow] }]);
        const block = TriggerCardModel.build(component, context, []).triggers[0] as TriggerBlock;
        const amount = slotNamed(sentenceOf(block, 2), 'amount');

        expect(rowText(block, 2)).toBe('set Camera Camera › Follow to Player');
        expect(entitiesOf(amount).chosenId).toBe(player.id);
        expect(entitiesOf(amount).placeEntity(level.world.id)).toMatchObject({
            action: { amount: { entity: level.world.id } },
        });
    });

    test('Push by a fixed kick is one vector word', () => {
        const push: Action = { kind: 'push', target: { kind: 'other' }, push: { kind: 'by', x: 0, y: -600 } };
        const kick = slotNamed(sentenceOf(blockOf({ actions: [push] }), 2), 'pushBy');

        expect(kick).toMatchObject({
            text: '0, -600',
            entry: { kind: 'vector', value: { x: 0, y: -600 }, unit: 'px/s' },
        });
    });

    test('Add check offers its three kinds and Add action its eight in groups, each saying what it does; with no action, Add action is needed', () => {
        const block = blockOf({ when: { kind: 'touched' } });
        const addCheck = block.sections[1].addRow;
        const addAction = block.sections[2].addRow;

        if (addCheck?.entry.kind !== 'menu' || addAction?.entry.kind !== 'groups') throw new Error('No add menus.');

        expect(addCheck.entry.choices.map((choice) => [choice.label, choice.description])).toEqual([
            ['an entity has a tag', 'Such as: other has the tag player'],
            ["a variable's value", 'Such as: coins is at least 10'],
            ['a component value', 'Such as: this Transform › Position y is more than 500'],
        ]);
        expect(addCheck.entry.choices[0]?.value).toEqual({
            section: 'check',
            index: 0,
            check: { kind: 'hasTag', target: { kind: 'other' }, tag: null },
        });
        const actionGroups = addAction.entry.groups.map((group) => [
            group.title,
            group.choices.map((choice) => choice.label),
        ]);
        expect(actionGroups).toEqual([
            ['Values', ['change a value']],
            ['Entities', ['destroy', 'push']],
            ['Events', ['fire a custom event', 'wait']],
            ['The game', ['win', 'lose', 'restart the level']],
        ]);
        expect(addAction.entry.groups[1]?.choices[1]?.description).toBe('Kick a body, whatever its mass');
        expect(addAction.isNeeded).toBe(true);
        expect(blockOf({ actions: [{ kind: 'win' }] }).sections[2].addRow?.isNeeded).toBe(false);
    });

    test('checks and actions can be removed; the When and the Repeat cannot', () => {
        const block = blockOf({ checks: [CHECK_CASES[0]?.[0] as Check], actions: [{ kind: 'win' }] });

        expect(block.sections.map((section) => section.rows.map((row) => row.canRemove))).toEqual([
            [false],
            [true],
            [true],
            [false],
        ]);
    });

    test('Repeat reads its setting, with the time for "at most once every"', () => {
        expect(rowText(blockOf({ repeat: { kind: 'everyTime' } }), 3)).toBe('every time');
        expect(rowText(blockOf({ repeat: { kind: 'oncePerRun' } }), 3)).toBe('once per run');
        expect(rowText(blockOf({ repeat: { kind: 'atMostEvery', seconds: 2 } }), 3)).toBe('at most once every 2 s');
    });

    test("a block takes the card's notes about its own trigger", () => {
        const note: CardNote = {
            kind: 'warning',
            text: "Doesn't run until every yellow part is set.",
            fieldKey: 'triggers',
            itemId: 1,
            fix: undefined,
            entityIds: [],
        };
        const otherNote: CardNote = { ...note, itemId: 2 };

        expect(blockOf({}, [note, otherNote]).notes).toEqual([note]);
    });
});
