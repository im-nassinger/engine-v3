import type { Action, TimeUnit, Trigger, When } from '../../../core/fields/index.ts';

import { TriggerSentence } from './TriggerSentence.ts';
import type { SentenceSources } from './TriggerSentence.ts';
import type {
    TriggerChoice,
    TriggerMenuGroup,
    TriggerPartValue,
    TriggerRowPart,
    TriggerWord,
    TriggerWordEntry,
} from './TriggerWord.ts';

const TIME_UNITS: readonly TimeUnit[] = ['seconds', 'ticks'];

// A block's colour: one per kind of block, whatever it changes (design/controls.md, v4 fix 4). Set is blue
// whether it sets a Position or an Enabled. `action` is Fire, Win, Lose and Restart, which the mockup draws
// in the If's teal.
export type ScriptColour = 'event' | 'if' | 'set' | 'add' | 'wait' | 'destroy' | 'action';

// The one icon a block starts with, saying what it does; the view picks the drawing.
export type ScriptIcon =
    | 'noEvent'
    | 'touch'
    | 'press'
    | 'timer'
    | 'levelStart'
    | 'variable'
    | 'customEvent'
    | 'if'
    | 'set'
    | 'move'
    | 'power'
    | 'powerOff'
    | 'add'
    | 'subtract'
    | 'destroy'
    | 'fire'
    | 'win'
    | 'lose'
    | 'restart'
    | 'wait';

// Some of a block's words: one part of the trigger (the When, a check, an action) with what removes it, or
// joining words that belong to no part, such as the If's "if" and "and".
export type ScriptWordGroup = {
    readonly part: TriggerRowPart | undefined;
    readonly words: readonly TriggerWord[];
    // A check or an action: an × at the block's right end, or Delete in the block's context menu, takes it
    // away. The When never goes.
    readonly canRemove: boolean;
    // What the block's context menu's Replace opens: the events, the checks or the actions, each put in the
    // part's place. Undefined for joining words.
    readonly replaceMenu: ScriptReplaceMenu | undefined;
};

export type ScriptReplaceMenu = TriggerWordEntry & { readonly kind: 'menu' | 'groups' };

// One block of the script, top to bottom: the event, the If's top bar with its checks, each action, the
// If's bottom bar. Its slot words are its value boxes.
export type ScriptBlock = {
    readonly shape: 'event' | 'ifTop' | 'ifBottom' | 'action';
    readonly colour: ScriptColour;
    // Undefined for the If's bottom bar, which has none.
    readonly icon: ScriptIcon | undefined;
    readonly groups: readonly ScriptWordGroup[];
    // Inside the If's C, so drawn past its arm.
    readonly isInsideIf: boolean;
    // The gaps the block's top and bottom thirds open; undefined where that third acts like its middle.
    readonly gapAbove: number | undefined;
    readonly gapBelow: number | undefined;
};

// A place between two blocks where an "add a block" slot opens. Gap n is before action n, so a trigger with
// n actions has n + 1 gaps, all of them after the event and, with an If, inside it: no block goes outside
// the If, which wraps the whole Do list.
export type ScriptGap = {
    readonly index: number;
    // The add menu: the check group, then the actions, each added at the gap.
    readonly addMenu: TriggerWordEntry & { readonly kind: 'groups' };
};

export type TriggerScript = {
    readonly blocks: readonly ScriptBlock[];
    readonly gaps: readonly ScriptGap[];
};

// Point D of v4 fix 4: a check is added from any slot. With no If it wraps every action in a new one; with
// one, it is joined by "and".
const CHECK_GROUP_TITLE = 'Checks';
const CHECK_LABEL = 'if … (a value)';

// A trigger as Scratch blocks (v4 fix 4): a new view over the same words as its sentences, so every value
// box opens the same picker or box.
export function triggerScript(trigger: Trigger, sources: SentenceSources): TriggerScript {
    const hasIf = trigger.checks.length > 0;
    const blocks: ScriptBlock[] = [eventBlock(trigger, sources)];

    if (hasIf) {
        blocks.push(ifTopBlock(trigger, sources));
    }
    trigger.actions.forEach((action, index) => {
        blocks.push(actionBlock(trigger, action, index, sources, hasIf));
    });
    if (hasIf) {
        const lastGap = trigger.actions.length;
        blocks.push({
            shape: 'ifBottom',
            colour: 'if',
            icon: undefined,
            groups: [],
            isInsideIf: false,
            gapAbove: lastGap,
            gapBelow: undefined,
        });
    }

    const gapCount = trigger.actions.length + 1;
    const gaps = Array.from({ length: gapCount }, (_unused, index) => gapAt(trigger, index, sources));

    return { blocks, gaps };
}

// "when other starts touching this", "when the key Space is pressed", "when every 2 seconds".
function eventBlock(trigger: Trigger, sources: SentenceSources): ScriptBlock {
    const sentence = TriggerSentence.ofWhen(trigger, sources);
    const words = [text('when'), ...eventWords(sentence.words, trigger.when)];
    const replaceMenu: ScriptReplaceMenu = { kind: 'menu', choices: sources.choices.events() };
    const group: ScriptWordGroup = { part: { section: 'when' }, words, canRemove: false, replaceMenu };

    return {
        shape: 'event',
        colour: 'event',
        icon: eventIcon(trigger.when),
        groups: [group],
        isInsideIf: false,
        gapAbove: undefined,
        gapBelow: 0,
    };
}

// The sentence's words, as the event block reads them (`other`, who touches, is already an entity's blue
// with no box, since it can't be changed); a time is a number with its unit, seconds or ticks, as a menu.
function eventWords(words: readonly TriggerWord[], when: When | null): TriggerWord[] {
    if (when?.kind !== 'after' && when?.kind !== 'every') return [...words];

    const timed = when;
    const withNumbers = words.map((word) => {
        if (word.kind !== 'slot' || word.address.slot !== 'time' || timed.time === null) return word;

        return { ...word, text: String(timed.time) };
    });
    const units = TIME_UNITS.map((unit) => unitChoice(unit, { section: 'when', when: { ...timed, unit } }));

    return [...withNumbers, unitWord({ section: 'when' }, timed.unit, units)];
}

function ifTopBlock(trigger: Trigger, sources: SentenceSources): ScriptBlock {
    const groups: ScriptWordGroup[] = [joiningGroup('if')];
    trigger.checks.forEach((_check, index) => {
        if (index > 0) {
            groups.push(joiningGroup('and'));
        }

        const sentence = TriggerSentence.ofCheck(trigger, index, sources);
        const checks = sources.choices.newChecks(index, sources.eventHasOther);
        const replaceMenu: ScriptReplaceMenu = { kind: 'menu', choices: checks };
        groups.push({ part: { section: 'check', index }, words: sentence.words, canRemove: true, replaceMenu });
    });

    return {
        shape: 'ifTop',
        colour: 'if',
        icon: 'if',
        groups,
        isInsideIf: false,
        gapAbove: undefined,
        gapBelow: 0,
    };
}

function actionBlock(
    trigger: Trigger,
    action: Action,
    index: number,
    sources: SentenceSources,
    hasIf: boolean,
): ScriptBlock {
    const part: TriggerRowPart = { section: 'action', index };
    const sentence = TriggerSentence.ofAction(trigger, index, sources);
    let { words } = sentence;
    if (action.kind === 'wait') {
        words = waitWords(words, part, { section: 'action', index, action });
    }
    const actionGroups = sources.choices.actionGroups(index, action);
    const replaceMenu: ScriptReplaceMenu = { kind: 'groups', groups: actionGroups };

    return {
        shape: 'action',
        colour: actionColour(action),
        icon: actionIcon(action),
        groups: [{ part, words, canRemove: true, replaceMenu }],
        isInsideIf: hasIf,
        gapAbove: index,
        gapBelow: index + 1,
    };
}

// "wait 2 seconds": the sentence's fixed "s" becomes the unit menu.
function waitWords(words: readonly TriggerWord[], part: TriggerRowPart, same: TriggerPartValue) {
    const shown = words.filter((word) => word.kind !== 'text' || word.text !== 's');

    return [...shown, unitWord(part, 'seconds', [unitChoice('seconds', same)])];
}

function gapAt(trigger: Trigger, index: number, sources: SentenceSources): ScriptGap {
    const checks = sources.choices.newChecks(trigger.checks.length, sources.eventHasOther);
    const checkChoices = checks.map((check) => ({ ...check, label: CHECK_LABEL }));
    const checkGroup: TriggerMenuGroup = { title: CHECK_GROUP_TITLE, choices: checkChoices, emptyText: undefined };
    const actionGroups = sources.choices.actionGroups(index);

    return { index, addMenu: { kind: 'groups', groups: [checkGroup, ...actionGroups] } };
}

// A time's unit as a menu: a timer's offers seconds and ticks, a Wait's seconds only.
function unitWord(part: TriggerRowPart, unit: TimeUnit, choices: readonly TriggerChoice[]): TriggerWord {
    return {
        kind: 'slot',
        address: { part, slot: 'unit' },
        text: unit,
        state: 'set',
        reason: undefined,
        entry: { kind: 'menu', choices },
    };
}

function unitChoice(unit: TimeUnit, value: TriggerPartValue): TriggerChoice {
    return { label: unit, disabledReason: undefined, value, note: undefined, asks: undefined };
}

function joiningGroup(word: string): ScriptWordGroup {
    return { part: undefined, words: [text(word)], canRemove: false, replaceMenu: undefined };
}

function text(word: string): TriggerWord {
    return { kind: 'text', text: word };
}

function eventIcon(when: When | null): ScriptIcon {
    switch (when?.kind) {
        case undefined:
            return 'noEvent';
        case 'touched':
        case 'untouched':
            return 'touch';
        case 'key':
        case 'input':
            return 'press';
        case 'after':
        case 'every':
            return 'timer';
        case 'levelStart':
            return 'levelStart';
        case 'variableChanged':
            return 'variable';
        case 'custom':
            return 'customEvent';
    }
}

function actionColour(action: Action): ScriptColour {
    switch (action.kind) {
        case 'change':
            return action.op === 'set' ? 'set' : 'add';
        case 'wait':
            return 'wait';
        case 'destroy':
            return 'destroy';
        default:
            return 'action';
    }
}

function actionIcon(action: Action): ScriptIcon {
    switch (action.kind) {
        case 'change':
            return changeIcon(action);
        case 'destroy':
            return 'destroy';
        case 'fire':
            return 'fire';
        case 'wait':
            return 'wait';
        case 'win':
            return 'win';
        case 'lose':
            return 'lose';
        case 'restart':
            return 'restart';
    }
}

// Add and subtract say so; a Set says what it sets where the mockup has an icon for it: the power icon for
// an Enabled (off for false), the move icon for a Position.
function changeIcon(action: Action & { readonly kind: 'change' }): ScriptIcon {
    if (action.op === 'add') return 'add';
    if (action.op === 'subtract') return 'subtract';

    const { value } = action;
    if (value?.kind === 'triggerOn') return action.amount === false ? 'powerOff' : 'power';
    if (value?.kind === 'field' && value.component === 'TransformComponent' && value.field === 'position') {
        return 'move';
    }

    return 'set';
}
