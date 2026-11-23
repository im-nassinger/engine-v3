import type { Action, Check, Repeat, Target, Trigger, VariableValue, When } from '../../../core/fields/index.ts';
import { KeyCodes } from '../../../core/keys/index.ts';
import type { TriggerProblem } from '../../../core/triggers/index.ts';

import { NO_OTHER_REASON, shownValue, TriggerChoices } from './TriggerChoices.ts';
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
type FireAction = Action & { readonly kind: 'fire' };
type CompareCheck = Check & { readonly kind: 'compare' };
type CompareValueCheck = Check & { readonly kind: 'compareValue' };
type VariableChangedWhen = When & { readonly kind: 'variableChanged' };

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
    // Unset and nothing missing, such as Fire's number: it reads in grey, not yellow.
    readonly isOptional?: boolean;
    // The slots of triggerProblems this word shows, when it isn't its own: the condition of a variable
    // changed When is one word for its compare and its value.
    readonly problemSlots?: readonly TriggerWordSlot[];
};

type WordState = { state: TriggerWordState; reason: string | undefined };

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
        const slots = word.problemSlots ?? [word.slot];
        const problem = this.problemAt(slots);
        const isOptionalUnset = word.text === null && word.isOptional === true && problem === undefined;
        let { state, reason } = stateOf(word.text, problem);
        if (isOptionalUnset) {
            state = 'optional';
            reason = undefined;
        }

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

    private problemAt(slots: readonly TriggerWordSlot[]) {
        return this.sources.problems.find((problem) => {
            if (!slots.includes(problem.slot)) return false;

            return samePart(problem.part, this.part);
        });
    }
}

function stateOf(text: string | null, problem: TriggerProblem | undefined): WordState {
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
    return { kind: 'number', value, unit, clearLabel: undefined };
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
        case 'custom': {
            const names = choices.names((name) => ({ section: 'when', when: { ...when, name } }));
            builder.slot({ slot: 'name', text: when.name, need: 'pick a name', entry: menuOf(names) });
            return;
        }
        case 'variableChanged':
            addVariableChangedWords(builder, when, choices);
            return;
        default:
            return;
    }
}

// "the variable score becomes 3 or more", "the variable health of this changes". Picking a variable of
// another type takes the condition away.
function addVariableChangedWords(builder: SentenceBuilder, when: VariableChangedWhen, choices: TriggerChoices) {
    const type = choices.variableType(when.variable);
    const variables = choices.variableGroups([{ kind: 'this' }], (variable, pickedType) => {
        let { becomes } = when;
        if (pickedType !== (type ?? 'number')) {
            becomes = null;
        }

        return { section: 'when', when: { ...when, variable, becomes } };
    });
    const variableText = when.variable === null ? null : choices.variableWord(when.variable);
    builder.slot({ slot: 'variable', text: variableText, need: 'pick a variable', entry: variables });

    const becomesText = TriggerChoices.becomesWord(when.becomes);
    const becomes = choices.becomes(when, type);
    builder.slot({
        slot: 'becomes',
        text: becomesText,
        need: 'changes',
        entry: menuOf(becomes),
        problemSlots: ['compare', 'number'],
    });
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

    if (check.kind === 'compareValue') {
        addCompareValueWords(builder, check, index, sources);
        return;
    }

    addCompareWords(builder, check, index, sources);
}

// "coins is at least 10", "door_open of other is true", "player_name is "Ada"". The compare words and the
// value's field follow the variable's type; picking one of another type resets the value and the compare.
function addCompareWords(builder: SentenceBuilder, check: CompareCheck, index: number, sources: SentenceSources) {
    const { choices } = sources;
    const type = choices.variableType(check.variable);

    const owners: Target[] = [{ kind: 'this' }];
    if (sources.eventHasOther) {
        owners.push({ kind: 'other' });
    }
    const variables = choices.variableGroups(owners, (variable, pickedType) => {
        let picked: Check = { ...check, variable };
        if (pickedType !== (type ?? 'number')) {
            picked = { ...picked, compare: 'is', value: null };
        }

        return { section: 'check', index, check: picked };
    });
    const variableText = check.variable === null ? null : choices.variableWord(check.variable);
    builder.slot({ slot: 'variable', text: variableText, need: 'pick a variable', entry: variables });

    const compares = choices.compares((compare) => ({ section: 'check', index, check: { ...check, compare } }), type);
    const compareText = TriggerChoices.compareWord(check.compare);
    builder.slot({ slot: 'compare', text: compareText, need: 'compare', entry: menuOf(compares) });

    const valueText = check.value === null ? null : comparedText(check.value);
    const valueEntry = choices.variableValueEntry(type, check.value, (value) => ({
        section: 'check',
        index,
        check: { ...check, value },
    }));
    builder.slot({ slot: 'number', text: valueText, need: valueNeed(type), entry: valueEntry });
}

// "this Body speed is more than 200".
function addCompareValueWords(
    builder: SentenceBuilder,
    check: CompareValueCheck,
    index: number,
    sources: SentenceSources,
) {
    const { choices } = sources;

    const targets = choices.targets(sources.eventHasOther, true, (target) => ({
        section: 'check',
        index,
        check: { ...check, target },
    }));
    builder.slot(targetWord(check.target, targets, choices));

    const values = choices.readables(check.target, (value) => ({
        section: 'check',
        index,
        check: { ...check, value },
    }));
    const valueText = check.value === null ? null : choices.readableWord(check.value);
    builder.slot({ slot: 'value', text: valueText, need: 'pick a value', entry: values });

    const compares = choices.compares((compare) => ({ section: 'check', index, check: { ...check, compare } }));
    const compareText = TriggerChoices.compareWord(check.compare);
    builder.slot({ slot: 'compare', text: compareText, need: 'compare', entry: menuOf(compares) });

    const amountText = check.amount === null ? null : String(check.amount);
    const amountEntry = numberEntry(check.amount, undefined);
    builder.slot({ slot: 'number', text: amountText, need: 'a number', entry: amountEntry });
}

// A number as it is; a string in quotes.
function comparedText(value: VariableValue) {
    if (typeof value === 'number') return String(value);

    return shownValue(value);
}

function valueNeed(type: string | undefined) {
    if (type === 'string') return 'some text';
    if (type === 'boolean') return 'true or false';

    return 'a number';
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
    if (action.kind === 'fire') {
        addFireWords(builder, action, index, sources);
    }
    if (action.kind === 'wait') {
        const secondsText = action.seconds === null ? null : String(action.seconds);
        const entry = numberEntry(action.seconds, 's');
        builder.slot({ slot: 'seconds', text: secondsText, need: 'how long', entry });
        builder.text('s');
    }
}

// "fire open on every door with 2"; the number is optional.
function addFireWords(builder: SentenceBuilder, action: FireAction, index: number, sources: SentenceSources) {
    const { choices } = sources;

    const names = choices.names((name) => ({ section: 'action', index, action: { ...action, name } }));
    builder.slot({ slot: 'name', text: action.name, need: 'pick a name', entry: menuOf(names) });

    builder.text('on');
    const targets = choices.targets(sources.eventHasOther, true, (target) => ({
        section: 'action',
        index,
        action: { ...action, target },
    }));
    builder.slot(targetWord(action.target, targets, choices));

    builder.text('with');
    const amountText = action.amount === null ? null : String(action.amount);
    const amountEntry: TriggerWordEntry = {
        kind: 'number',
        value: action.amount,
        unit: undefined,
        clearLabel: 'No number',
    };
    builder.slot({ slot: 'amount', text: amountText, need: 'no number', entry: amountEntry, isOptional: true });
}

// "add 1 to coins", "set 0, 0 as Transform position of other", "subtract coin from tags of this", "flip
// door_open of this". A level's variable names no target; an own one and any other value do.
function addChangeWords(builder: SentenceBuilder, action: ChangeAction, index: number, sources: SentenceSources) {
    const { choices } = sources;

    const ops = choices.ops(action, (op) => ({ section: 'action', index, action: { ...action, op } }));
    builder.slot({ slot: 'op', text: action.op, need: 'set, add or subtract', entry: menuOf(ops) });

    const isFlip = action.op === 'flip';
    if (!isFlip) {
        const amountEntry = choices.amountEntry(action, index);
        const amountText = action.amount === null ? null : choices.amountWord(action, action.amount);
        builder.slot({ slot: 'amount', text: amountText, need: 'a value', entry: amountEntry });

        builder.text(joiningWord(action));
    }

    const values = choices.values(action, index);
    const valueText = action.value === null ? null : choices.valueWord(action, action.value);
    builder.slot({ slot: 'value', text: valueText, need: 'pick a value', entry: values });

    const isLevelVariable = action.value?.kind === 'variable' && action.value.own !== true;
    if (action.value === null || isLevelVariable) return;

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
    const text = choices.targetWord(target);

    return { slot: 'target', text, need: 'pick who', entry: menuOf(targets) };
}

function menuOf(choices: readonly TriggerChoice[]): TriggerWordEntry {
    return { kind: 'menu', choices };
}
