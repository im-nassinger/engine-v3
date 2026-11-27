import { describe, expect, test } from 'vitest';

import type { Action, Check, Trigger } from '../../../core/fields/index.ts';

import { buildTriggerLevel } from './testing/triggerLevel.ts';
import { TriggerCardModel } from './TriggerCardModel.ts';
import type { TriggerBlock } from './TriggerCardModel.ts';
import type { ScriptBlock, TriggerScript } from './TriggerScript.ts';
import type { TriggerWord } from './TriggerWord.ts';

function scriptOf(parts: Partial<Trigger>): TriggerScript {
    const { component, context } = buildTriggerLevel([parts]);
    const block = TriggerCardModel.build(component, context, []).triggers[0] as TriggerBlock;

    return block.script;
}

function wordsOf(block: ScriptBlock): TriggerWord[] {
    return block.groups.flatMap((group) => group.words);
}

function textOf(block: ScriptBlock) {
    return wordsOf(block)
        .map((word) => word.text)
        .join(' ');
}

function slotOf(block: ScriptBlock, slot: string) {
    const word = wordsOf(block).find((candidate) => candidate.kind === 'slot' && candidate.address.slot === slot);
    if (word?.kind !== 'slot') throw new Error(`No ${slot} box in "${textOf(block)}".`);

    return word;
}

function blockAt(script: TriggerScript, index: number) {
    const block = script.blocks[index];
    if (block === undefined) throw new Error(`No block ${index}.`);

    return block;
}

const PLAYER_TAG_CHECK: Check = {
    kind: 'value',
    target: { kind: 'other' },
    value: { kind: 'tag' },
    compare: 'is',
    amount: 'player',
};
const COINS_CHECK: Check = {
    kind: 'value',
    target: { kind: 'this' },
    value: { kind: 'variable', name: 'coins' },
    compare: 'atLeast',
    amount: 10,
};
const ADD_COIN: Action = {
    kind: 'change',
    target: { kind: 'this' },
    value: { kind: 'variable', name: 'coins' },
    op: 'add',
    amount: 1,
};
const DESTROY_THIS: Action = { kind: 'destroy', target: { kind: 'this' } };

describe('TriggerScript', () => {
    test('with no check: the event, then each action, with no If and a gap under each', () => {
        const script = scriptOf({ when: { kind: 'touched' }, actions: [ADD_COIN, DESTROY_THIS] });

        expect(script.blocks.map((block) => [block.shape, block.colour, block.icon])).toEqual([
            ['event', 'event', 'touch'],
            ['action', 'add', 'add'],
            ['action', 'destroy', 'destroy'],
        ]);
        expect(script.blocks.map(textOf)).toEqual([
            'when other starts touching this',
            'add 1 to coins',
            'destroy this',
        ]);
        expect(script.blocks.map((block) => [block.gapAbove, block.gapBelow])).toEqual([
            [undefined, 0],
            [0, 1],
            [1, 2],
        ]);
        expect(script.gaps.map((gap) => gap.index)).toEqual([0, 1, 2]);
        expect(script.blocks.some((block) => block.isInsideIf)).toBe(false);
    });

    test("the event names who touches as `other`, an entity's word with no box", () => {
        const event = blockAt(scriptOf({ when: { kind: 'untouched' } }), 0);

        expect(wordsOf(event)[1]).toEqual({ kind: 'text', text: 'other', isEntity: true });
        expect(event.groups).toMatchObject([{ part: { section: 'when' }, canRemove: false }]);
    });

    test("with checks: the If's two bars wrap every action, its checks joined by and, and no gap is outside it", () => {
        const script = scriptOf({ checks: [PLAYER_TAG_CHECK, COINS_CHECK], actions: [ADD_COIN, DESTROY_THIS] });

        expect(script.blocks.map((block) => [block.shape, block.isInsideIf])).toEqual([
            ['event', false],
            ['ifTop', false],
            ['action', true],
            ['action', true],
            ['ifBottom', false],
        ]);
        const ifTop = blockAt(script, 1);
        const ifBottom = blockAt(script, 4);
        expect(textOf(ifTop)).toBe('if other has the tag player and coins is at least 10');
        expect([ifTop.colour, ifTop.icon, ifBottom.colour, ifBottom.icon]).toEqual(['if', 'if', 'if', undefined]);
        expect(ifTop.groups.map((group) => [group.part, group.canRemove])).toEqual([
            [undefined, false],
            [{ section: 'check', index: 0 }, true],
            [undefined, false],
            [{ section: 'check', index: 1 }, true],
        ]);

        // The event and the If's top bar both open the If's first inner gap; the If's outer thirds act like
        // its middle.
        expect(script.blocks.map((block) => [block.gapAbove, block.gapBelow])).toEqual([
            [undefined, 0],
            [undefined, 0],
            [0, 1],
            [1, 2],
            [2, undefined],
        ]);
        expect(script.gaps.map((gap) => gap.index)).toEqual([0, 1, 2]);
    });

    test('an If with no action still has its two bars and one gap inside', () => {
        const script = scriptOf({ checks: [PLAYER_TAG_CHECK] });

        expect(script.blocks.map((block) => block.shape)).toEqual(['event', 'ifTop', 'ifBottom']);
        expect(script.gaps.map((gap) => gap.index)).toEqual([0]);
    });

    test("a Wait is rose, with the hourglass, its number and its unit's menu", () => {
        const script = scriptOf({ actions: [{ kind: 'wait', seconds: 2 }] });
        const wait = blockAt(script, 1);

        expect([wait.colour, wait.icon]).toEqual(['wait', 'wait']);
        expect(textOf(wait)).toBe('wait 2 seconds');
        expect(slotOf(wait, 'seconds').entry).toMatchObject({ kind: 'number', value: 2, unit: 's' });

        const unit = slotOf(wait, 'unit');
        expect(unit.entry.kind === 'menu' && unit.entry.choices.map((choice) => choice.label)).toEqual(['seconds']);
        expect(unit.entry).toMatchObject({
            choices: [{ value: { section: 'action', index: 0, action: { kind: 'wait', seconds: 2 } } }],
        });
    });

    test("a timer event's time is a number with its unit's menu, seconds or ticks", () => {
        const event = blockAt(scriptOf({ when: { kind: 'every', time: 2, unit: 'seconds' } }), 0);
        const unit = slotOf(event, 'unit');

        expect([event.icon, textOf(event)]).toEqual(['timer', 'when every 2 seconds']);
        expect(unit.text).toBe('seconds');
        expect(unit.entry).toMatchObject({
            choices: [
                { label: 'seconds', value: { section: 'when', when: { kind: 'every', time: 2, unit: 'seconds' } } },
                { label: 'ticks', value: { section: 'when', when: { kind: 'every', time: 2, unit: 'ticks' } } },
            ],
        });
    });

    test('Set shows the path of its value, with the power or move icon', () => {
        const enabledOff: Action = {
            kind: 'change',
            target: { kind: 'this' },
            value: { kind: 'triggerOn', trigger: 1 },
            op: 'set',
            amount: false,
        };
        const position: Action = {
            kind: 'change',
            target: { kind: 'this' },
            value: { kind: 'field', component: 'TransformComponent', field: 'position' },
            op: 'set',
            amount: { x: 0, y: -200 },
        };
        const script = scriptOf({ name: 'Timed door', actions: [enabledOff, position] });

        const enabled = blockAt(script, 1);
        const move = blockAt(script, 2);
        expect(slotOf(enabled, 'value').text).toBe('Triggers › Timed door › Enabled');
        expect(slotOf(move, 'value').text).toBe('Transform › Position');
        expect([enabled.colour, enabled.icon, move.colour, move.icon]).toEqual(['set', 'powerOff', 'set', 'move']);
    });

    test('a missing entity reads as missing in its value box', () => {
        const script = scriptOf({ actions: [{ kind: 'destroy', target: { kind: 'entity', entity: 999 } }] });

        expect(slotOf(blockAt(script, 1), 'target')).toMatchObject({ text: 'missing entity', state: 'missing' });
    });

    test('an unset part says what it needs, in yellow', () => {
        const unsetValue: Action = { kind: 'change', target: { kind: 'this' }, value: null, op: 'set', amount: null };
        const script = scriptOf({ when: null, actions: [unsetValue] });

        const event = blockAt(script, 0);
        expect([event.icon, textOf(event)]).toEqual(['noEvent', 'when pick an event']);
        expect(slotOf(event, 'event').state).toBe('unset');
        expect(slotOf(blockAt(script, 1), 'value')).toMatchObject({ text: 'pick a value', state: 'unset' });
    });

    test("a gap's add menu: the check group first, then the actions, each added at the gap", () => {
        const script = scriptOf({ checks: [PLAYER_TAG_CHECK], actions: [ADD_COIN, DESTROY_THIS] });
        const gap = script.gaps[1];
        if (gap === undefined) throw new Error('No gap 1.');

        const { groups } = gap.addMenu;
        expect(groups.map((group) => group.title)).toEqual(['Checks', 'Values', 'Entities', 'Events', 'The game']);
        expect(groups[0]?.choices.map((choice) => choice.label)).toEqual(['if … (a value)']);
        expect(groups[0]?.choices[0]?.value).toMatchObject({ section: 'check', index: 1 });
        expect(groups[1]?.choices[0]?.value).toMatchObject({ section: 'action', index: 1, action: { kind: 'change' } });
    });

    test("each block's Replace menu puts a part in its place: the events, a check, the actions keeping the target", () => {
        const script = scriptOf({
            checks: [PLAYER_TAG_CHECK, PLAYER_TAG_CHECK],
            actions: [{ kind: 'destroy', target: { kind: 'other' } }],
        });
        const [event, ifTop, destroy] = script.blocks.map((block) => block.groups);

        const eventGroup = event?.find((group) => group.replaceMenu !== undefined);
        expect(eventGroup?.canRemove).toBe(false);
        expect(eventGroup?.replaceMenu).toMatchObject({ kind: 'menu' });

        const secondCheck = ifTop?.find((group) => group.part?.section === 'check' && group.part.index === 1);
        expect(secondCheck?.replaceMenu).toMatchObject({
            kind: 'menu',
            choices: [{ value: { section: 'check', index: 1 } }],
        });
        expect(ifTop?.[0]?.replaceMenu).toBeUndefined();

        const destroyMenu = destroy?.[0]?.replaceMenu;
        if (destroyMenu?.kind !== 'groups') throw new Error('No action groups.');
        const wait = destroyMenu.groups.flatMap((group) => group.choices).find((choice) => choice.label === 'wait');
        expect(wait?.value).toEqual({ section: 'action', index: 0, action: { kind: 'wait', seconds: null } });
    });

    test("an action's own word is plain text, not a box", () => {
        const script = scriptOf({ actions: [{ kind: 'destroy', target: { kind: 'other' } }] });

        expect(wordsOf(blockAt(script, 1))[0]).toEqual({ kind: 'text', text: 'destroy' });
    });
});
