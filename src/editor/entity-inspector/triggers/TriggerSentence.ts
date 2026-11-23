import type { Action, Check, Repeat, Target, Trigger, When } from '../../../core/fields/index.ts';
import { KeyCodes } from '../../../core/keys/index.ts';
import { labelName } from '../../../core/level/index.ts';
import type { TriggerProblem } from '../../../core/triggers/index.ts';

import { NO_OTHER_REASON, TriggerChoices } from './TriggerChoices.ts';
import type {
    TriggerChoice,
    TriggerRowPart,
    TriggerWord,
    TriggerWordEntry,
    TriggerWordSlot,
    TriggerWordState,
} from './TriggerWord.ts';

type ChangeAction = Action & { readonly kind: 'change' };
type PushAction = Action & { readonly kind: 'push' };

// What every row of one trigger is built from.
export type SentenceSources = {
    readonly choices: TriggerChoices;
    readonly problems: readonly TriggerProblem[];
    // False under an event with no `other`: a key, a timer, level start, a tag running out.
    readonly eventHasOther: boolean;
};

type SlotWord = {
    readonly slot: TriggerWordSlot;
    // The word once set, or null while unset.
    readonly text: string | null;
    // What it says while unset.
    readonly need: string;
    readonly entry: TriggerWordEntry;
};

const MISSING_REASON = 'It was deleted: this part is skipped in play';

// One row of the trigger card: a sentence of plain words and slots, each slot with its state and what it
// opens. "something starts touching this", "other is tagged player", "add 1 to coins".
export class TriggerSentence {
    readonly words: readonly TriggerWord[];

    private constructor(words: readonly TriggerWord[]) {
        this.words = words;
    }

    static ofWhen(trigger: Trigger, sources: SentenceSources) {
        const builder = new SentenceBuilder({ section: 'when' }, sources);
        addWhenWords(builder, trigger.when, sources.choices);

        return new TriggerSentence(builder.words);
    }

    static ofCheck(trigger: Trigger, index: number, sources: SentenceSources) {
        const check = trigger.checks[index];
        if (check === undefined) throw new Error(`The trigger has no check ${index}.`);

        const builder = new SentenceBuilder({ section: 'check', index }, sources);
        addCheckWords(builder, check, index, sources);

        return new TriggerSentence(builder.words);
    }

    static ofAction(trigger: Trigger, index: number, sources: SentenceSources) {
        const action = trigger.actions[index];
        if (action === undefined) throw new Error(`The trigger has no action ${index}.`);

        const builder = new SentenceBuilder({ section: 'action', index }, sources);
        addActionWords(builder, action, index, sources);

        return new TriggerSentence(builder.words);
    }

    static ofRepeat(trigger: Trigger, sources: SentenceSources) {
        const builder = new SentenceBuilder({ section: 'repeat' }, sources);
        addRepeatWords(builder, trigger.repeat, sources.choices);

        return new TriggerSentence(builder.words);
    }

    // The words read as one line, unset ones by what they need: for tests and tooltips.
    get text() {
        return this.words.map((word) => word.text).join(' ');
    }
}

// Collects a row's words, giving each slot its state from the trigger's problems.
class SentenceBuilder {
    readonly words: TriggerWord[] = [];
    private readonly part: TriggerRowPart;
    private readonly sources: SentenceSources;

    constructor(part: TriggerRowPart, sources: SentenceSources) {
        this.part = part;
        this.sources = sources;
    }

    text(text: string) {
        this.words.push({ kind: 'text', text });
    }

    slot(word: SlotWord) {
        const problem = this.problemAt(word.slot);
        const { state, reason } = stateOf(word.text, problem);
        const text = word.text ?? word.need;

        this.words.push({
            kind: 'slot',
            address: { part: this.part, slot: word.slot },
            text,
            state,
            reason,
            entry: word.entry,
        });
    }

    private problemAt(slot: TriggerWordSlot) {
        return this.sources.problems.find((problem) => {
            if (problem.slot !== slot) return false;

            return samePart(problem.part, this.part);
        });
    }
}

function stateOf(text: string | null, problem: TriggerProblem | undefined) {
    let state: TriggerWordState = 'set';
    let reason: string | undefined;

    if (text === null) {
        state = 'unset';
    }
    if (problem?.reason === 'noOther') {
        state = 'greyed';
        reason = NO_OTHER_REASON;
    } else if (problem?.reason === 'missingEntity' || problem?.reason === 'missingTrigger') {
        state = 'missing';
        reason = MISSING_REASON;
    } else if (problem !== undefined) {
        state = 'unset';
    }

    return { state, reason };
}

function samePart(problemPart: TriggerProblem['part'], rowPart: TriggerRowPart) {
    if (problemPart.section === 'when') return rowPart.section === 'when';
    if (rowPart.section !== problemPart.section) return false;

    return problemPart.index === rowPart.index;
}

function numberEntry(value: number | null, unit: 's' | 'px/s' | undefined): TriggerWordEntry {
    return { kind: 'number', value, unit };
}

function addWhenWords(builder: SentenceBuilder, when: When | null, choices: TriggerChoices) {
    const eventMenu: TriggerWordEntry = { kind: 'menu', choices: choices.events() };
    const eventText = when === null ? null : TriggerChoices.eventWord(when.kind);
    builder.slot({ slot: 'event', text: eventText, need: 'pick an event', entry: eventMenu });
    if (when === null) return;

    switch (when.kind) {
        case 'input': {
            const inputs = choices.inputs((input) => ({ section: 'when', when: { ...when, input } }));
            builder.slot({ slot: 'input', text: when.input, need: 'pick an input', entry: menuOf(inputs) });
            addPressWords(builder, when, choices);
            return;
        }
        case 'key': {
            const keys = choices.keys((key) => ({ section: 'when', when: { ...when, key } }));
            const keyText = when.key === null ? null : KeyCodes.label(when.key);
            builder.slot({ slot: 'key', text: keyText, need: 'pick a key', entry: menuOf(keys) });
            addPressWords(builder, when, choices);
            return;
        }
        case 'after':
        case 'every': {
            const secondsText = when.seconds === null ? null : `${when.seconds} seconds`;
            const entry = numberEntry(when.seconds, 's');
            builder.slot({ slot: 'seconds', text: secondsText, need: 'how many seconds', entry });
            return;
        }
        case 'tagLeft': {
            const tags = choices.tags((tag) => ({ section: 'when', when: { ...when, tag } }));
            builder.slot({ slot: 'tag', text: when.tag, need: 'pick a tag', entry: menuOf(tags) });
            builder.text('is left');
            return;
        }
        default:
            return;
    }
}

type PressWhen = When & { readonly kind: 'input' | 'key' };

function addPressWords(builder: SentenceBuilder, when: PressWhen, choices: TriggerChoices) {
    const presses = choices.presses((how) => ({ section: 'when', when: { ...when, how } }));
    builder.text('is');
    builder.slot({ slot: 'press', text: when.how, need: 'pressed', entry: menuOf(presses) });
}

function addCheckWords(builder: SentenceBuilder, check: Check, index: number, sources: SentenceSources) {
    const { choices } = sources;

    if (check.kind === 'hasTag') {
        const targets = choices.targets(sources.eventHasOther, false, (target) => ({
            section: 'check',
            index,
            check: { ...check, target },
        }));
        builder.slot(targetWord(check.target, targets, choices));
        builder.text('is tagged');
        const tags = choices.tags((tag) => ({ section: 'check', index, check: { ...check, tag } }));
        builder.slot({ slot: 'tag', text: check.tag, need: 'pick a tag', entry: menuOf(tags) });
        return;
    }

    // The component value check comes to the card with v4's.
    if (check.kind === 'compareValue') return;

    const variables = choices.variables((name) => ({
        section: 'check',
        index,
        check: { ...check, variable: { owner: 'level', name } },
    }));
    const variableText = check.variable?.name ?? null;
    builder.slot({ slot: 'variable', text: variableText, need: 'pick a variable', entry: menuOf(variables) });

    const compares = choices.compares((compare) => ({ section: 'check', index, check: { ...check, compare } }));
    const compareText = TriggerChoices.compareWord(check.compare);
    builder.slot({ slot: 'compare', text: compareText, need: 'compare', entry: menuOf(compares) });

    const valueText = check.value === null ? null : String(check.value);
    const numberValue = typeof check.value === 'number' ? check.value : null;
    builder.slot({ slot: 'number', text: valueText, need: 'a number', entry: numberEntry(numberValue, undefined) });
}

function addActionWords(builder: SentenceBuilder, action: Action, index: number, sources: SentenceSources) {
    const { choices } = sources;

    if (action.kind === 'change') {
        addChangeWords(builder, action, index, sources);
        return;
    }

    const kinds = choices.actions(index, action);
    const kindText = TriggerChoices.actionWord(action.kind);
    builder.slot({ slot: 'action', text: kindText, need: 'pick an action', entry: menuOf(kinds) });

    if (action.kind === 'destroy' || action.kind === 'push') {
        const targets = choices.targets(sources.eventHasOther, true, (target) => ({
            section: 'action',
            index,
            action: { ...action, target },
        }));
        builder.slot(targetWord(action.target, targets, choices));
    }

    if (action.kind === 'push') {
        addPushWords(builder, action, index, choices);
    }
}

// "add 1 to coins", "set 0, 0 as Transform position of other", "subtract coin from tags of this".
function addChangeWords(builder: SentenceBuilder, action: ChangeAction, index: number, sources: SentenceSources) {
    const { choices } = sources;

    const ops = choices.ops((op) => ({ section: 'action', index, action: { ...action, op } }));
    builder.slot({ slot: 'op', text: action.op, need: 'set, add or subtract', entry: menuOf(ops) });

    const amountEntry = choices.amountEntry(action, index);
    const amountText = action.amount === null ? null : choices.amountWord(action, action.amount);
    builder.slot({ slot: 'amount', text: amountText, need: 'a value', entry: amountEntry });

    builder.text(joiningWord(action));

    const values = choices.values(action, index);
    const valueText = action.value === null ? null : choices.valueWord(action, action.value);
    builder.slot({ slot: 'value', text: valueText, need: 'pick a value', entry: { kind: 'menu', choices: values } });

    const isVariable = action.value?.kind === 'variable';
    if (action.value === null || isVariable) return;

    builder.text('of');
    const targets = choices.targets(sources.eventHasOther, true, (target) => ({
        section: 'action',
        index,
        action: { ...action, target },
    }));
    builder.slot(targetWord(action.target, targets, choices));
}

function joiningWord(action: ChangeAction) {
    if (action.op === 'set') return 'as';
    if (action.op === 'subtract') return 'from';

    return 'to';
}

// "by 0, -600 px/s", "away from this at 400 px/s".
function addPushWords(builder: SentenceBuilder, action: PushAction, index: number, choices: TriggerChoices) {
    const pushes = choices.pushes((push) => ({ section: 'action', index, action: { ...action, push } }));
    const { push } = action;
    const pushText = push === null ? null : TriggerChoices.pushWord(push.kind);
    builder.slot({ slot: 'push', text: pushText, need: 'how', entry: menuOf(pushes) });
    if (push === null) return;

    if (push.kind === 'by') {
        builder.slot({ slot: 'pushX', text: String(push.x), need: 'x', entry: numberEntry(push.x, 'px/s') });
        builder.text(',');
        builder.slot({ slot: 'pushY', text: String(push.y), need: 'y', entry: numberEntry(push.y, 'px/s') });
    } else {
        const strengthEntry = numberEntry(push.strength, 'px/s');
        builder.slot({ slot: 'strength', text: String(push.strength), need: 'how strong', entry: strengthEntry });
    }
    builder.text('px/s');
}

function addRepeatWords(builder: SentenceBuilder, repeat: Repeat, choices: TriggerChoices) {
    const repeatText = TriggerChoices.repeatWord(repeat.kind);
    const entry: TriggerWordEntry = { kind: 'menu', choices: choices.repeats() };
    builder.slot({ slot: 'repeat', text: repeatText, need: 'every time', entry });
    if (repeat.kind !== 'atMostEvery') return;

    const secondsText = `${repeat.seconds} s`;
    const secondsEntry = numberEntry(repeat.seconds, 's');
    builder.slot({ slot: 'repeatSeconds', text: secondsText, need: 'how many seconds', entry: secondsEntry });
}

function targetWord(target: Target, targets: readonly TriggerChoice[], choices: TriggerChoices): SlotWord {
    return { slot: 'target', text: targetText(target, choices), need: 'pick who', entry: menuOf(targets) };
}

// "this", "other", an entity's name, "missing entity", "every coin"; null while unset.
function targetText(target: Target, choices: TriggerChoices) {
    switch (target.kind) {
        case 'this':
        case 'other':
            return target.kind;
        case 'tagged':
            if (target.tag === null) return null;

            return `every ${target.tag}`;
        case 'entity': {
            if (target.entity === null) return null;

            const entity = choices.knownTarget(target);
            if (entity === undefined) return 'missing entity';

            return labelName(entity);
        }
    }
}

function menuOf(choices: readonly TriggerChoice[]): TriggerWordEntry {
    return { kind: 'menu', choices };
}
