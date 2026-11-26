import type { TriggerComponent } from '../../../core/components/index.ts';
import type { Trigger } from '../../../core/fields/index.ts';
import { eventHasOther, triggerName, triggerProblems } from '../../../core/triggers/index.ts';
import type { TriggerContext } from '../../../core/triggers/index.ts';

import type { CardNote } from '../model/CardNote.ts';

import { LengthDisplay } from '../../units/index.ts';
import { TriggerChoices } from './TriggerChoices.ts';
import { TriggerSentence } from './TriggerSentence.ts';
import type { SentenceSources } from './TriggerSentence.ts';
import { triggerScript } from './TriggerScript.ts';
import type { TriggerScript } from './TriggerScript.ts';
import type { TriggerRowPart, TriggerWordEntry } from './TriggerWord.ts';

export type TriggerRow = {
    readonly part: TriggerRowPart;
    readonly sentence: TriggerSentence;
    // Checks and actions show an × on hover; the When never goes.
    readonly canRemove: boolean;
    // A Wait with actions after it: a faint line under its row, so the actions after it read as later.
    readonly hasWaitLine: boolean;
};

// Add check or Add action, at the end of If and Do.
export type TriggerAddRow = {
    readonly label: 'Add check' | 'Add action';
    // The kinds of row it adds: a menu for checks, titled groups for actions.
    readonly entry: TriggerWordEntry & { readonly kind: 'menu' | 'groups' };
    // Yellow: a trigger with no action does nothing.
    readonly isNeeded: boolean;
};

export type TriggerSection = {
    readonly title: 'When' | 'If' | 'Do';
    // At the title's right: "optional", "all must be true", "top to bottom".
    readonly hint: string | undefined;
    readonly rows: readonly TriggerRow[];
    readonly addRow: TriggerAddRow | undefined;
};

// One trigger's block: the head (its name, which drags it, the switch and the … menu), then When, If and
// Do, then its notes. An off trigger's sections fade.
export type TriggerBlock = {
    readonly id: number;
    readonly index: number;
    readonly name: string;
    readonly isOn: boolean;
    readonly sections: readonly [TriggerSection, TriggerSection, TriggerSection];
    // The same trigger as Scratch blocks (v4 fix 4), which the card draws. The sections above stay as the
    // sentences' view its unit tests read (standing yes, 2026-11-24, docs/decisions.md).
    readonly script: TriggerScript;
    // The editor messages about this trigger, such as "Doesn't run until every yellow part is set.".
    readonly notes: readonly CardNote[];
};

// The Triggers card of one entity, as the mockup draws it: a block per trigger, then + Add trigger. React
// draws the blocks and their sentences and never needs to know what a trigger is; each edit is a
// TriggerEdits call.
export class TriggerCardModel {
    readonly triggers: readonly TriggerBlock[];

    private constructor(triggers: readonly TriggerBlock[]) {
        this.triggers = triggers;
    }

    // `notes` are the card's notes; each block takes the ones about its trigger. `lengths` is how the blocks
    // show a length or a speed, pixels when not given.
    static build(
        component: TriggerComponent,
        context: TriggerContext,
        notes: readonly CardNote[],
        lengths: LengthDisplay = LengthDisplay.inPixels,
    ) {
        const choices = new TriggerChoices(context, lengths);
        const triggers = component.get('triggers');
        const blocks = triggers.map((trigger, index) => blockOf(trigger, index, context, choices, notes));

        return new TriggerCardModel(blocks);
    }
}

function blockOf(
    trigger: Trigger,
    index: number,
    context: TriggerContext,
    choices: TriggerChoices,
    notes: readonly CardNote[],
): TriggerBlock {
    const problems = triggerProblems(trigger, context);
    const sources: SentenceSources = { choices, problems, eventHasOther: eventHasOther(trigger.when) };
    const ownNotes = notes.filter((note) => note.itemId === trigger.id);

    return {
        id: trigger.id,
        index,
        name: triggerName(trigger),
        isOn: trigger.on,
        sections: [whenSection(trigger, sources), ifSection(trigger, sources), doSection(trigger, sources)],
        script: triggerScript(trigger, sources),
        notes: ownNotes,
    };
}

function whenSection(trigger: Trigger, sources: SentenceSources): TriggerSection {
    const sentence = TriggerSentence.ofWhen(trigger, sources);
    const row: TriggerRow = { part: { section: 'when' }, sentence, canRemove: false, hasWaitLine: false };

    return { title: 'When', hint: undefined, rows: [row], addRow: undefined };
}

function ifSection(trigger: Trigger, sources: SentenceSources): TriggerSection {
    const rows = trigger.checks.map((_check, index) => {
        const sentence = TriggerSentence.ofCheck(trigger, index, sources);
        const row: TriggerRow = { part: { section: 'check', index }, sentence, canRemove: true, hasWaitLine: false };

        return row;
    });

    const hint = rows.length === 0 ? 'optional' : 'all must be true';
    const newIndex = trigger.checks.length;
    const choices = sources.choices.newChecks(newIndex, sources.eventHasOther);
    const addRow: TriggerAddRow = { label: 'Add check', entry: { kind: 'menu', choices }, isNeeded: false };

    return { title: 'If', hint, rows, addRow };
}

function doSection(trigger: Trigger, sources: SentenceSources): TriggerSection {
    const lastIndex = trigger.actions.length - 1;
    const rows = trigger.actions.map((action, index) => {
        const sentence = TriggerSentence.ofAction(trigger, index, sources);
        const hasWaitLine = action.kind === 'wait' && index < lastIndex;
        const row: TriggerRow = { part: { section: 'action', index }, sentence, canRemove: true, hasWaitLine };

        return row;
    });

    let hint: string | undefined;
    if (rows.length > 1) {
        hint = 'top to bottom';
    }

    const newIndex = trigger.actions.length;
    const groups = sources.choices.actionGroups(newIndex);
    const entry = { kind: 'groups', groups } as const;
    const addRow: TriggerAddRow = { label: 'Add action', entry, isNeeded: rows.length === 0 };

    return { title: 'Do', hint, rows, addRow };
}
