import type { TriggerComponent } from '../../../core/components/index.ts';
import type { Trigger, When } from '../../../core/fields/index.ts';
import { triggerName, triggerProblems } from '../../../core/triggers/index.ts';
import type { TriggerContext } from '../../../core/triggers/index.ts';

import type { CardNote } from '../model/CardNote.ts';

import { TriggerChoices } from './TriggerChoices.ts';
import { TriggerSentence } from './TriggerSentence.ts';
import type { SentenceSources } from './TriggerSentence.ts';
import type { TriggerRowPart, TriggerWordEntry } from './TriggerWord.ts';

export type TriggerRow = {
    readonly part: TriggerRowPart;
    readonly sentence: TriggerSentence;
    // Checks and actions show an × on hover; the When and the Repeat never go.
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
    readonly title: 'When' | 'If' | 'Do' | 'Repeat';
    // At the title's right: "optional", "all must be true", "top to bottom".
    readonly hint: string | undefined;
    readonly rows: readonly TriggerRow[];
    readonly addRow: TriggerAddRow | undefined;
};

// One trigger's block: the head (its name, which drags it, the switch and the … menu), then When, If, Do
// and Repeat, then its notes. An off trigger's sections fade.
export type TriggerBlock = {
    readonly id: number;
    readonly index: number;
    readonly name: string;
    readonly isOn: boolean;
    readonly sections: readonly [TriggerSection, TriggerSection, TriggerSection, TriggerSection];
    // The editor messages about this trigger: "Doesn't run until every yellow part is set." and the
    // missing Surface's note with its fix.
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

    // `notes` are the card's notes; each block takes the ones about its trigger.
    static build(component: TriggerComponent, context: TriggerContext, notes: readonly CardNote[]) {
        const choices = new TriggerChoices(context);
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
    const eventHasOther = whenHasOther(trigger.when);
    const sources: SentenceSources = { choices, problems, eventHasOther };
    const ownNotes = notes.filter((note) => note.itemId === trigger.id);

    return {
        id: trigger.id,
        index,
        name: triggerName(trigger),
        isOn: trigger.on,
        sections: [
            whenSection(trigger, sources),
            ifSection(trigger, sources),
            doSection(trigger, sources),
            repeatSection(trigger, sources),
        ],
        notes: ownNotes,
    };
}

// Touching, hitting and a custom event (its sender) name an `other`. An unset When greys nothing yet.
function whenHasOther(when: When | null) {
    if (when === null) return true;

    switch (when.kind) {
        case 'touched':
        case 'untouched':
        case 'collision':
        case 'custom':
            return true;
        default:
            return false;
    }
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

function repeatSection(trigger: Trigger, sources: SentenceSources): TriggerSection {
    const sentence = TriggerSentence.ofRepeat(trigger, sources);
    const row: TriggerRow = { part: { section: 'repeat' }, sentence, canRemove: false, hasWaitLine: false };

    return { title: 'Repeat', hint: undefined, rows: [row], addRow: undefined };
}
