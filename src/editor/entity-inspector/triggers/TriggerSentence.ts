import type { Action, Check, Repeat, Target, Trigger, Unit, VariableValue, When } from '../../../core/fields/index.ts';
import { KeyCodes } from '../../../core/keys/index.ts';
import type { TriggerProblem } from '../../../core/triggers/index.ts';

import { NO_OTHER_REASON, shownValue, TriggerChoices } from './TriggerChoices.ts';
import { readableAxis } from './valueNames.ts';
import type { CheckedType } from './TriggerChoices.ts';
import type {
    TriggerRowPart,
    TriggerWord,
    TriggerWordEntry,
    TriggerWordSlot,
    TriggerWordState,
} from './TriggerWord.ts';

type ChangeAction = Action & { readonly kind: 'change' };
type TriggerMenuChoices = (TriggerWordEntry & { readonly kind: 'menu' })['choices'];
type FireAction = Action & { readonly kind: 'fire' };
type VariableChangedWhen = When & { readonly kind: 'variableChanged' };

// What every row of one trigger is built from.
export type SentenceSources = {
    readonly choices: TriggerChoices;
    readonly problems: readonly TriggerProblem[];
    // False under an event with no `other`: a key, a timer, level start, a variable changing.
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
// opens. "something starts touching this", "other has the tag player", "add 1 to coins".
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

function numberEntry(value: number | null, unit: Unit | undefined): TriggerWordEntry {
    return { kind: 'number', value, unit, clearLabel: undefined };
}

// "something starts touching this", "the key Space is pressed", "every 2 seconds", "the level starts". The
// event word is the in-place word where the event has one (starts, key, every), so it opens both.
function addWhenWords(builder: SentenceBuilder, when: When | null, choices: TriggerChoices) {
    const eventMenu = choices.eventEntry(when);
    const eventText = when === null ? null : TriggerChoices.eventWord(when.kind);
    const isTouch = when?.kind === 'touched' || when?.kind === 'untouched';
    const isPress = when?.kind === 'key' || when?.kind === 'input';
    if (isTouch) {
        builder.text('something');
    }
    if (isPress) {
        builder.text('the');
    }
    builder.slot({ slot: 'event', text: eventText, need: 'pick an event', entry: eventMenu });
    if (when === null) return;

    switch (when.kind) {
        case 'touched':
        case 'untouched':
            builder.text('touching this');
            return;
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

// The value check: "coins is 10 or more" (a level's variable names no entity: it is the World's), "other
// has the tag player", "this health is less than 1", "this Body › Speed is more than 200", "other
// Transform › Position y is at most 500". Until the value is picked, only the entity and the value show.
function addCheckWords(builder: SentenceBuilder, check: Check, index: number, sources: SentenceSources) {
    const { choices } = sources;
    const { value } = check;
    const type = choices.checkType(check);

    const isLevelVariable = value?.kind === 'variable' && value.own !== true;
    if (!isLevelVariable) {
        const targets = choices.targets(check.target, sources.eventHasOther, true, (target) => ({
            section: 'check',
            index,
            check: { ...check, target },
        }));
        builder.slot(targetWord(check.target, targets, choices));
    }

    const values = choices.checkValues(check, index);
    const valueText = value === null ? null : choices.checkValueWord(value);
    const valueWord: SlotWord = { slot: 'value', text: valueText, need: 'pick a value', entry: values };
    if (value === null) {
        builder.slot(valueWord);
        return;
    }

    const compares = choices.checkCompares(check, index);
    const compareText = TriggerChoices.checkCompareWord(check.compare, type);
    const compareWord: SlotWord = { slot: 'compare', text: compareText, need: 'compare', entry: menuOf(compares) };

    if (type === 'tag') {
        builder.slot(compareWord);
        builder.slot(valueWord);
    } else {
        builder.slot(valueWord);
        addCheckAxisWord(builder, check, index, choices);
        builder.slot(compareWord);
    }

    const amountText = check.amount === null ? null : checkedAmountText(check.amount, type);
    const amountEntry = choices.checkAmountEntry(check, index);
    builder.slot({ slot: 'amount', text: amountText, need: amountNeed(type), entry: amountEntry });
}

// x or y, for a vector or a body's velocity.
function addCheckAxisWord(builder: SentenceBuilder, check: Check, index: number, choices: TriggerChoices) {
    const { value } = check;
    if (value === null || value.kind === 'variable' || value.kind === 'tag') return;

    const axis = readableAxis(value);
    if (axis === undefined) return;

    const axes = choices.axes(value, (picked) => ({ section: 'check', index, check: { ...check, value: picked } }));
    builder.slot({ slot: 'axis', text: axis, need: 'x or y', entry: menuOf(axes) });
}

// A tag as it is; a string variable's value in quotes.
function checkedAmountText(amount: VariableValue, type: CheckedType | undefined) {
    if (type === 'tag' && typeof amount === 'string') return amount;

    return comparedText(amount);
}

function amountNeed(type: CheckedType | undefined) {
    if (type === 'tag') return 'pick a tag';

    return valueNeed(type);
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

    if (action.kind === 'destroy') {
        const targets = choices.targets(action.target, sources.eventHasOther, true, (target) => ({
            section: 'action',
            index,
            action: { ...action, target },
        }));
        builder.slot(targetWord(action.target, targets, choices));
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

// "fire open on every door", then "with the number 2" for scripts, which is optional.
function addFireWords(builder: SentenceBuilder, action: FireAction, index: number, sources: SentenceSources) {
    const { choices } = sources;

    const names = choices.names((name) => ({ section: 'action', index, action: { ...action, name } }));
    builder.slot({ slot: 'name', text: action.name, need: 'pick a name', entry: menuOf(names) });

    builder.text('on');
    const targets = choices.targets(action.target, sources.eventHasOther, true, (target) => ({
        section: 'action',
        index,
        action: { ...action, target },
    }));
    builder.slot(targetWord(action.target, targets, choices));

    const amountText = action.amount === null ? null : `with the number ${action.amount}`;
    const amountEntry: TriggerWordEntry = {
        kind: 'number',
        value: action.amount,
        unit: undefined,
        clearLabel: 'No number',
    };
    builder.slot({
        slot: 'amount',
        text: amountText,
        need: 'with a number (for scripts)',
        entry: amountEntry,
        isOptional: true,
    });
}

// The entity before the value, since the values offered are the entity's: "set this
// Transform › Position to 0, 0", "add 1 to coins", "subtract coin from this tags", "flip this door_open". A
// level's variable names no entity: it is the World's.
function addChangeWords(builder: SentenceBuilder, action: ChangeAction, index: number, sources: SentenceSources) {
    const { choices } = sources;

    const ops = choices.ops(action, (op) => ({ section: 'action', index, action: { ...action, op } }));
    builder.slot({ slot: 'op', text: action.op, need: 'set, add or subtract', entry: menuOf(ops) });

    const amountEntry = choices.amountEntry(action, index);
    const amountText = action.amount === null ? null : choices.amountWord(action, action.amount);
    const amountWord: SlotWord = { slot: 'amount', text: amountText, need: 'a value', entry: amountEntry };
    const amountFirst = action.op === 'add' || action.op === 'subtract';
    if (amountFirst) {
        builder.slot(amountWord);
        builder.text(joiningWord(action));
    }

    const isLevelVariable = action.value?.kind === 'variable' && action.value.own !== true;
    if (!isLevelVariable) {
        const targets = choices.targets(action.target, sources.eventHasOther, true, (target) => ({
            section: 'action',
            index,
            action: { ...action, target },
        }));
        builder.slot(targetWord(action.target, targets, choices));
    }

    const values = choices.values(action, index);
    const valueText = action.value === null ? null : choices.valueWord(action, action.value);
    builder.slot({ slot: 'value', text: valueText, need: 'pick a value', entry: values });

    if (action.op === 'set') {
        builder.text('to');
        builder.slot(amountWord);
    }
}

function joiningWord(action: ChangeAction) {
    if (action.op === 'subtract') return 'from';

    return 'to';
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

function targetWord(target: Target, entry: TriggerWordEntry, choices: TriggerChoices): SlotWord {
    const text = choices.targetWord(target);

    return { slot: 'target', text, need: 'pick an entity', entry };
}

function menuOf(choices: TriggerMenuChoices): TriggerWordEntry {
    return { kind: 'menu', choices };
}
