import { BodyComponent, VariablesComponent } from '../../../../core/components/index.ts';
import type { Trigger } from '../../../../core/fields/index.ts';

import { TriggerCardModel } from '../TriggerCardModel.ts';
import type { TriggerBlock } from '../TriggerCardModel.ts';
import type { TriggerSentence } from '../TriggerSentence.ts';
import type { TriggerChoice, TriggerWord, TriggerWordEntry } from '../TriggerWord.ts';

import { buildTriggerLevel } from './triggerLevel.ts';

type SlotWord = TriggerWord & { readonly kind: 'slot' };

// The trigger level with v4's variables: the World's `coins`, `lives`, the string `player_name` and the
// boolean `game_over`; the Coin, which holds the triggers, is a body with its own boolean `door_open` and
// string `state`; the Player has its own number `health`. The Coin's triggers fire `open` and hear `close`.
export function buildV4TriggerLevel(triggers: readonly Partial<Trigger>[] = [{}]) {
    const built = buildTriggerLevel(triggers);
    const { level, player, coin } = built;

    level.world.getComponent(VariablesComponent)?.set('variables', [
        { name: 'coins', value: 0 },
        { name: 'lives', value: 3 },
        { name: 'player_name', value: 'Ada' },
        { name: 'game_over', value: false },
    ]);
    coin.addComponent(
        new VariablesComponent({
            variables: [
                { name: 'door_open', value: false },
                { name: 'state', value: 'closed' },
            ],
        }),
    );
    coin.addComponent(new BodyComponent());
    player.addComponent(new VariablesComponent({ variables: [{ name: 'health', value: 3 }] }));

    function block(index = 0) {
        const model = TriggerCardModel.build(built.component, built.context, []);

        return model.triggers[index] as TriggerBlock;
    }

    return { ...built, block };
}

export function rowOf(block: TriggerBlock, sectionIndex: number, rowIndex = 0) {
    const row = block.sections[sectionIndex]?.rows[rowIndex];
    if (row === undefined) throw new Error(`No row ${rowIndex} in section ${sectionIndex}.`);

    return row;
}

export function slotOf(sentence: TriggerSentence, slot: string): SlotWord {
    const word = sentence.words.find((candidate) => candidate.kind === 'slot' && candidate.address.slot === slot);
    if (word?.kind !== 'slot') throw new Error(`No ${slot} word in "${sentence.text}".`);

    return word;
}

// A menu's items; for the entity picker, the items above its tree: this, other, then each tag.
export function choicesOf(entry: TriggerWordEntry) {
    if (entry.kind === 'entities') return [...entry.choices, ...(entry.tagged?.choices ?? [])];
    if (entry.kind !== 'menu') throw new Error(`A ${entry.kind}, not a menu.`);

    return entry.choices;
}

export function groupsOf(entry: TriggerWordEntry) {
    if (entry.kind !== 'groups') throw new Error(`A ${entry.kind}, not a menu in groups.`);

    return entry.groups;
}

export function labelsOf(choices: readonly TriggerChoice[]) {
    return choices.map((choice) => choice.label);
}

export function choiceNamed(choices: readonly TriggerChoice[], label: string) {
    const choice = choices.find((candidate) => candidate.label === label);
    if (choice === undefined) throw new Error(`No choice ${label}.`);

    return choice;
}
