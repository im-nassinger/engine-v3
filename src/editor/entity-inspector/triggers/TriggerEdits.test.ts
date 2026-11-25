import { describe, expect, test } from 'vitest';

import type { Check, Trigger } from '../../../core/fields/index.ts';

import { buildTriggerLevel } from './testing/triggerLevel.ts';
import { TriggerCardModel } from './TriggerCardModel.ts';
import type { TriggerBlock } from './TriggerCardModel.ts';
import { TriggerEdits } from './TriggerEdits.ts';
import type { TriggerChoice } from './TriggerWord.ts';

const TAG_CHECK: Check = {
    kind: 'value',
    target: { kind: 'other' },
    value: { kind: 'tag' },
    compare: 'is',
    amount: 'player',
};

function buildCard(triggers: readonly Partial<Trigger>[] = [{}]) {
    const built = buildTriggerLevel(triggers);

    function block(index = 0) {
        const model = TriggerCardModel.build(built.component, built.context, []);

        return model.triggers[index] as TriggerBlock;
    }

    return { ...built, block };
}

function choiceOf(block: TriggerBlock, sectionIndex: number, slot: string, label: string, rowIndex = 0) {
    const sentence = block.sections[sectionIndex]?.rows[rowIndex]?.sentence;
    const word = sentence?.words.find((candidate) => candidate.kind === 'slot' && candidate.address.slot === slot);
    if (word?.kind !== 'slot') throw new Error(`No ${slot} word.`);

    const { entry } = word;
    if (entry.kind === 'menu') return requireChoice(entry.choices, label);
    if (entry.kind === 'groups') {
        const choices = entry.groups.flatMap((group) => group.choices);
        return requireChoice(choices, label);
    }

    throw new Error(`No ${slot} menu.`);
}

// An item of the Replace menu of a script block's first part.
function replaceChoiceOf(block: TriggerBlock, blockIndex: number, label: string) {
    const group = block.script.blocks[blockIndex]?.groups.find((candidate) => candidate.replaceMenu !== undefined);
    const menu = group?.replaceMenu;
    if (menu === undefined) throw new Error(`No Replace menu on block ${blockIndex}.`);

    if (menu.kind === 'menu') return requireChoice(menu.choices, label);

    const choices = menu.groups.flatMap((menuGroup) => menuGroup.choices);
    return requireChoice(choices, label);
}

function requireChoice(choices: readonly TriggerChoice[], label: string) {
    const choice = choices.find((candidate) => candidate.label === label);
    if (choice === undefined) throw new Error(`No choice ${label}.`);

    return choice;
}

describe('TriggerEdits', () => {
    test('replacing the event resets the When and keeps the checks and actions, as `Change trigger "Touched"`', () => {
        const { component, block } = buildCard([{ checks: [TAG_CHECK], actions: [{ kind: 'win' }] }]);
        const choice = replaceChoiceOf(block(), 0, 'a key or input is pressed, released or held');

        const edit = TriggerEdits.picked(component, 0, choice.value);

        expect(edit.label).toBe('Change trigger "Touched"');
        expect(edit.triggers[0]).toMatchObject({
            when: { kind: 'key', key: null, how: 'pressed' },
            checks: [TAG_CHECK],
            actions: [{ kind: 'win' }],
        });
        expect(edit.nextTriggerId).toBe(2);
    });

    test("a tag picked on a check's word goes into that check", () => {
        const { component, block } = buildCard([{ checks: [{ ...TAG_CHECK, amount: null }] }]);
        const choice = choiceOf(block(), 1, 'amount', 'coin');

        const edit = TriggerEdits.picked(component, 0, choice.value);

        expect(edit.triggers[0]?.checks).toEqual([{ ...TAG_CHECK, amount: 'coin' }]);
    });

    test('Add check and Add action add their row at the end, each labelled', () => {
        const { component, block } = buildCard();
        const addCheck = block().sections[1].addRow;
        const addAction = block().sections[2].addRow;
        if (addCheck === undefined || addAction === undefined) throw new Error('No add rows.');

        if (addCheck.entry.kind !== 'menu' || addAction.entry.kind !== 'groups') throw new Error('No add menus.');
        const actionChoices = addAction.entry.groups.flatMap((group) => group.choices);

        const checkEdit = TriggerEdits.picked(component, 0, requireChoice(addCheck.entry.choices, 'a value').value);
        const actionEdit = TriggerEdits.picked(component, 0, requireChoice(actionChoices, 'win').value);

        expect(checkEdit.label).toBe('Add check to trigger "Touched"');
        expect(checkEdit.triggers[0]?.checks).toEqual([
            { kind: 'value', target: { kind: 'other' }, value: null, compare: 'is', amount: null },
        ]);
        expect(actionEdit.label).toBe('Add action to trigger "Touched"');
        expect(actionEdit.triggers[0]?.actions).toEqual([{ kind: 'win' }]);
    });

    test("a slot's add menu puts an action in at its gap, and a check with the If's others, each labelled", () => {
        const actions = [{ kind: 'win' }, { kind: 'lose' }] as const;
        const { component, block } = buildCard([{ actions }]);
        const middleGap = block().script.gaps[1];
        if (middleGap === undefined) throw new Error('No gap 1.');
        const choices = middleGap.addMenu.groups.flatMap((group) => group.choices);

        const actionEdit = TriggerEdits.inserted(component, 0, requireChoice(choices, 'restart the level').value);
        const checkEdit = TriggerEdits.inserted(component, 0, requireChoice(choices, 'if … (a value)').value);

        expect(actionEdit.label).toBe('Add action to trigger "Touched"');
        expect(actionEdit.triggers[0]?.actions).toEqual([{ kind: 'win' }, { kind: 'restart' }, { kind: 'lose' }]);
        expect(checkEdit.label).toBe('Add check to trigger "Touched"');
        expect(checkEdit.triggers[0]?.checks).toEqual([
            { kind: 'value', target: { kind: 'other' }, value: null, compare: 'is', amount: null },
        ]);
        expect(checkEdit.triggers[0]?.actions).toEqual(actions);
    });

    test('replacing an action turns it into another kind, keeping its target', () => {
        const { component, block } = buildCard([{ actions: [{ kind: 'destroy', target: { kind: 'other' } }] }]);
        const choice = replaceChoiceOf(block(), 1, 'fire a custom event');

        const edit = TriggerEdits.picked(component, 0, choice.value);

        expect(edit.triggers[0]?.actions).toEqual([
            { kind: 'fire', target: { kind: 'other' }, name: null, amount: null },
        ]);
    });

    test('a number is typed into its word; a word that takes none gives no edit', () => {
        const { component } = buildCard([
            {
                when: { kind: 'after', seconds: null },
                checks: [
                    {
                        kind: 'value',
                        target: { kind: 'this' },
                        value: { kind: 'variable', name: 'coins' },
                        compare: 'atLeast',
                        amount: null,
                    },
                ],
                actions: [
                    {
                        kind: 'change',
                        target: { kind: 'other' },
                        value: { kind: 'velocity' },
                        op: 'add',
                        amount: { x: 0, y: -600 },
                    },
                ],
            },
        ]);

        const seconds = TriggerEdits.typed(component, 0, { part: { section: 'when' }, slot: 'seconds' }, 60);
        const value = TriggerEdits.typed(component, 0, { part: { section: 'check', index: 0 }, slot: 'amount' }, 10);
        const kickAt = { part: { section: 'action', index: 0 }, slot: 'amount' } as const;
        const kick = TriggerEdits.typed(component, 0, kickAt, { x: 200, y: -600 });
        const refused = TriggerEdits.typed(component, 0, { part: { section: 'when' }, slot: 'event' }, 3);

        expect(seconds?.label).toBe('Change trigger "After a time"');
        expect(seconds?.triggers[0]?.when).toEqual({ kind: 'after', seconds: 60 });
        expect(value?.triggers[0]?.checks[0]).toMatchObject({ amount: 10 });
        expect(kick?.triggers[0]?.actions[0]).toMatchObject({ amount: { x: 200, y: -600 } });
        expect(refused).toBeUndefined();
    });

    test("a row's × removes it", () => {
        const { component } = buildCard([{ checks: [TAG_CHECK], actions: [{ kind: 'win' }, { kind: 'lose' }] }]);

        const check = TriggerEdits.removed(component, 0, { section: 'check', index: 0 });
        const action = TriggerEdits.removed(component, 0, { section: 'action', index: 0 });

        expect(check).toMatchObject({ label: 'Remove check from trigger "Touched"' });
        expect(check.triggers[0]?.checks).toEqual([]);
        expect(action.label).toBe('Remove action from trigger "Touched"');
        expect(action.triggers[0]?.actions).toEqual([{ kind: 'lose' }]);
    });

    test('the switch turns a trigger off and on', () => {
        const { component } = buildCard([{ on: true }]);

        const off = TriggerEdits.switched(component, 0);
        component.set('triggers', off.triggers);
        const on = TriggerEdits.switched(component, 0);

        expect(off.label).toBe('Switch off trigger "Touched"');
        expect(off.triggers[0]?.on).toBe(false);
        expect(on.label).toBe('Switch on trigger "Touched"');
        expect(on.triggers[0]?.on).toBe(true);
    });

    test('Rename sets its own name, and an empty one gives back the name made from its When', () => {
        const { component } = buildCard([{ name: 'Pick up' }]);

        const renamed = TriggerEdits.renamed(component, 0, '  Grab  ');
        const cleared = TriggerEdits.renamed(component, 0, '   ');

        expect(renamed.label).toBe('Rename trigger "Pick up"');
        expect(renamed.triggers[0]?.name).toBe('Grab');
        expect(cleared.triggers[0]?.name).toBeNull();
    });

    test('Duplicate puts a copy with a new id under the trigger', () => {
        const { component } = buildCard([{ actions: [{ kind: 'win' }] }, { when: { kind: 'levelStart' } }]);

        const edit = TriggerEdits.duplicated(component, 0);

        expect(edit.label).toBe('Duplicate trigger "Touched"');
        expect(edit.triggers.map((trigger) => trigger.id)).toEqual([1, 3, 2]);
        expect(edit.triggers[1]?.actions).toEqual([{ kind: 'win' }]);
        expect(edit.nextTriggerId).toBe(4);
    });

    test('Delete removes the trigger and never gives its id again', () => {
        const { component } = buildCard([{}, { when: { kind: 'levelStart' } }]);

        const edit = TriggerEdits.deleted(component, 1);
        component.set('triggers', edit.triggers);
        component.set('nextTriggerId', edit.nextTriggerId);
        const added = TriggerEdits.added(component);

        expect(edit.label).toBe('Delete trigger "Level start"');
        expect(edit.triggers.map((trigger) => trigger.id)).toEqual([1]);
        expect(added.label).toBe('Add trigger');
        expect(added.triggers.map((trigger) => trigger.id)).toEqual([1, 3]);
        expect(added.triggers[1]).toMatchObject({ name: null, on: true, when: null, checks: [], actions: [] });
    });

    test('dragging moves a trigger, and a drop where it already is makes no edit', () => {
        const { component } = buildCard([{}, { when: { kind: 'levelStart' } }, { when: { kind: 'untouched' } }]);

        const moved = TriggerEdits.moved(component, 0, 2);

        expect(moved?.label).toBe('Move trigger "Touched"');
        expect(moved?.triggers.map((trigger) => trigger.id)).toEqual([2, 3, 1]);
        expect(TriggerEdits.moved(component, 1, 1)).toBeUndefined();
    });
});
