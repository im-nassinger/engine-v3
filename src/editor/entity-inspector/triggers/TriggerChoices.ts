import { InputComponent, VariablesComponent } from '../../../core/components/index.ts';
import { LevelTags } from '../../../core/derived/index.ts';
import { CheckboxFieldType, ChoiceFieldType, NumberFieldType } from '../../../core/fields/index.ts';
import type {
    Action,
    ActionKind,
    ChangeOp,
    Compare,
    JsonValue,
    Press,
    Push,
    RepeatKind,
    Target,
    ValueRef,
    ValueType,
    WhenKind,
} from '../../../core/fields/index.ts';
import { KeyCodes } from '../../../core/keys/index.ts';
import type { KeyCode } from '../../../core/keys/index.ts';
import { labelName } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { changeableValues, sameValueRef } from '../../../core/triggers/index.ts';
import type { ChangeableValue, TriggerContext } from '../../../core/triggers/index.ts';

import { freshAction, freshCheck, freshPush, freshRepeat, freshWhen, targetOf } from './freshParts.ts';
import { amountText, valueName } from './valueNames.ts';
import type { TriggerChoice, TriggerPartValue, TriggerWordEntry } from './TriggerWord.ts';

type ChangeAction = Action & { readonly kind: 'change' };

// Builds a part with the picked item in place, so every menu item carries the row it makes.
type Place<T> = (picked: T) => TriggerPartValue;

type Named<T> = {
    readonly value: T;
    // What the menu shows.
    readonly label: string;
    // What the word reads once picked.
    readonly word: string;
};

export const NO_OTHER_REASON = 'no other for this event';

const EVENTS: readonly Named<WhenKind>[] = [
    { value: 'touched', label: 'something starts touching this', word: 'something starts touching this' },
    { value: 'untouched', label: 'something stops touching this', word: 'something stops touching this' },
    { value: 'input', label: 'an input is pressed, released or held', word: 'the input' },
    { value: 'key', label: 'a key is pressed, released or held', word: 'the key' },
    { value: 'after', label: 'after some time', word: 'after' },
    { value: 'every', label: 'every few seconds', word: 'every' },
    { value: 'levelStart', label: 'the level starts', word: 'the level starts' },
    { value: 'tagLeft', label: 'no entity with a tag is left', word: 'no entity tagged' },
];

const PRESSES: readonly Press[] = ['pressed', 'released', 'held'];

const COMPARES: readonly Named<Compare>[] = [
    { value: 'is', label: 'is', word: 'is' },
    { value: 'isNot', label: 'is not', word: 'is not' },
    { value: 'more', label: 'is more than', word: 'is more than' },
    { value: 'less', label: 'is less than', word: 'is less than' },
    { value: 'atLeast', label: 'is at least', word: 'is at least' },
    { value: 'atMost', label: 'is at most', word: 'is at most' },
];

const OPS: readonly ChangeOp[] = ['set', 'add', 'subtract'];

const ACTIONS: readonly Named<ActionKind>[] = [
    { value: 'change', label: 'change a value', word: 'change' },
    { value: 'destroy', label: 'destroy', word: 'destroy' },
    { value: 'push', label: 'push', word: 'push' },
    { value: 'win', label: 'win', word: 'win' },
    { value: 'lose', label: 'lose', word: 'lose' },
    { value: 'restart', label: 'restart the level', word: 'restart the level' },
];

const PUSHES: readonly Named<Push['kind']>[] = [
    { value: 'by', label: 'by a fixed kick', word: 'by' },
    { value: 'away', label: 'away from this', word: 'away from this at' },
    { value: 'towards', label: 'towards this', word: 'towards this at' },
];

const REPEATS: readonly Named<RepeatKind>[] = [
    { value: 'everyTime', label: 'every time', word: 'every time' },
    { value: 'oncePerRun', label: 'once per run', word: 'once per run' },
    { value: 'atMostEvery', label: 'at most once every few seconds', word: 'at most once every' },
];

const BOOLEAN_CHOICES: readonly Named<boolean>[] = [
    { value: true, label: 'on', word: 'on' },
    { value: false, label: 'off', word: 'off' },
];

// The menus of the trigger card, built from the level: the events, the targets (`this`, `other`, every
// entity but the trigger's own, every tag), the World's variables and inputs, the keys, and the values
// changeableValues offers for the target picked.
export class TriggerChoices {
    private readonly context: TriggerContext;
    private readonly levelTags: readonly string[];

    constructor(context: TriggerContext) {
        this.context = context;
        this.levelTags = LevelTags.of(context.level);
    }

    static eventWord(kind: WhenKind) {
        return wordOf(EVENTS, kind);
    }

    static compareWord(compare: Compare) {
        return wordOf(COMPARES, compare);
    }

    static actionWord(kind: ActionKind) {
        return wordOf(ACTIONS, kind);
    }

    static pushWord(kind: Push['kind']) {
        return wordOf(PUSHES, kind);
    }

    static repeatWord(kind: RepeatKind) {
        return wordOf(REPEATS, kind);
    }

    events(): readonly TriggerChoice[] {
        return EVENTS.map((event) => {
            const when = freshWhen(event.value);

            return choice(event.label, { section: 'when', when });
        });
    }

    presses(place: Place<Press>) {
        return PRESSES.map((press) => choice(press, place(press)));
    }

    inputs(place: Place<string>) {
        const inputs = this.context.level.world.getComponent(InputComponent)?.get('inputs') ?? [];

        return inputs.map((input) => choice(input.name, place(input.name)));
    }

    keys(place: Place<KeyCode>) {
        return KeyCodes.all.map((key) => {
            const label = KeyCodes.label(key);

            return choice(label, place(key));
        });
    }

    tags(place: Place<string>) {
        return this.levelTags.map((tag) => choice(tag, place(tag)));
    }

    variables(place: Place<string>) {
        return this.variableNames().map((name) => choice(name, place(name)));
    }

    compares(place: Place<Compare>) {
        return COMPARES.map((compare) => choice(compare.label, place(compare.value)));
    }

    ops(place: Place<ChangeOp>) {
        return OPS.map((op) => choice(op, place(op)));
    }

    pushes(place: Place<Push>) {
        return PUSHES.map((push) => {
            const fresh = freshPush(push.value);

            return choice(push.label, place(fresh));
        });
    }

    repeats() {
        return REPEATS.map((repeat) => {
            const fresh = freshRepeat(repeat.value);

            return choice(repeat.label, { section: 'repeat', repeat: fresh });
        });
    }

    // Add check's menu.
    newChecks(index: number, eventHasOther: boolean): readonly TriggerChoice[] {
        const tagCheck = freshCheck('hasTag', eventHasOther);
        const compareCheck = freshCheck('compare', eventHasOther);

        return [
            choice('who is tagged…', { section: 'check', index, check: tagCheck }),
            choice('a variable compared with a number', { section: 'check', index, check: compareCheck }),
        ];
    }

    // Add action's menu, and the menu of an action's own word, which keeps its target.
    actions(index: number, replaced: Action | undefined) {
        const keptTarget = replaced === undefined ? undefined : targetOf(replaced);

        return ACTIONS.map((action) => {
            const fresh = freshAction(action.value, keptTarget);

            return choice(action.label, { section: 'action', index, action: fresh });
        });
    }

    // `this`, `other` (greyed with its reason under an event with none), every entity but this one, and,
    // where a tag can be a target, every tag in the level.
    targets(eventHasOther: boolean, withTags: boolean, place: Place<Target>) {
        const choices: TriggerChoice[] = [choice('this', place({ kind: 'this' }))];

        const otherReason = eventHasOther ? undefined : NO_OTHER_REASON;
        choices.push({ label: 'other', disabledReason: otherReason, value: place({ kind: 'other' }) });

        for (const entity of this.context.level.entitiesInPanelOrder()) {
            if (entity === this.context.owner) continue;

            const name = labelName(entity);
            choices.push(choice(`the entity ${name}`, place({ kind: 'entity', entity: entity.id })));
        }

        if (!withTags) return choices;

        for (const tag of this.levelTags) {
            choices.push(choice(`every entity tagged ${tag}`, place({ kind: 'tagged', tag })));
        }

        return choices;
    }

    // The World's variables first, which make the World the target, then what the action's target may
    // change. Picking one keeps the operation when the value allows it, and the amount when its type reads it.
    values(action: ChangeAction, index: number) {
        const choices: TriggerChoice[] = [];
        const world = this.context.level.world;
        const worldTarget: Target = { kind: 'entity', entity: world.id };

        for (const name of this.variableNames()) {
            const ref: ValueRef = { kind: 'variable', name };
            const offer = this.offerFor(world, ref);
            const changed = withValue(action, ref, worldTarget, offer);
            choices.push(choice(`the variable ${name}`, { section: 'action', index, action: changed }));
        }

        const target = this.knownTarget(action.target);
        const keptTarget = keptTargetFor(action, world);
        for (const offer of changeableValues(target, this.context.registry)) {
            if (offer.ref.kind === 'variable') continue;

            const name = valueName(offer.ref, this.context.registry, target);
            const changed = withValue(action, offer.ref, keptTarget, offer);
            choices.push(choice(`a value of an entity: ${name}`, { section: 'action', index, action: changed }));
        }

        return choices;
    }

    // The amount's field: a menu for on/off, a choice or a tag, a number field for a number, and the value's
    // own type for the rest. A number until the value is picked.
    amountEntry(action: ChangeAction, index: number): TriggerWordEntry {
        const amountType = this.amountTypeOf(action);
        const place = (amount: JsonValue) => ({ section: 'action', index, action: { ...action, amount } }) as const;

        if (action.value?.kind === 'tag') return { kind: 'menu', choices: this.tags(place) };
        if (amountType === undefined) return numberEntry(action.amount);
        if (amountType instanceof NumberFieldType) return numberEntry(action.amount);
        if (amountType instanceof CheckboxFieldType) {
            const choices = BOOLEAN_CHOICES.map((named) => choice(named.label, place(named.value)));
            return { kind: 'menu', choices };
        }
        if (amountType instanceof ChoiceFieldType) {
            const options: readonly { value: string; label: string }[] = amountType.options;
            const choices = options.map((option) => choice(option.label, place(option.value)));
            return { kind: 'menu', choices };
        }

        return { kind: 'value', value: action.amount, valueType: amountType };
    }

    // What the amount word reads once set: a choice's label rather than its stored value.
    amountWord(action: ChangeAction, amount: JsonValue) {
        const amountType = this.amountTypeOf(action);
        if (amountType instanceof ChoiceFieldType) {
            const options: readonly { value: string; label: string }[] = amountType.options;
            const option = options.find((candidate) => candidate.value === amount);
            if (option !== undefined) return option.label;
        }

        return amountText(amount);
    }

    valueWord(action: ChangeAction, value: ValueRef) {
        const target = this.knownTarget(action.target);

        return valueName(value, this.context.registry, target);
    }

    // The entity a target names while editing: the trigger's own, or one by its id that is still there.
    knownTarget(target: Target): Entity | undefined {
        if (target.kind === 'this') return this.context.owner;
        if (target.kind !== 'entity' || target.entity === null) return undefined;

        return this.context.level.findEntity(target.entity);
    }

    private amountTypeOf(action: ChangeAction): ValueType<unknown> | undefined {
        const value = action.value;
        if (value === null) return undefined;

        let target = this.knownTarget(action.target);
        if (value.kind === 'variable') {
            target = this.context.level.world;
        }

        return this.offerFor(target, value)?.amountType;
    }

    private offerFor(target: Entity | undefined, value: ValueRef) {
        const offers = changeableValues(target, this.context.registry);

        return offers.find((offer) => sameValueRef(offer.ref, value));
    }

    private variableNames() {
        const variables = this.context.level.world.getComponent(VariablesComponent)?.get('variables') ?? [];

        return variables.map((variable) => variable.name);
    }
}

function choice(label: string, value: TriggerPartValue): TriggerChoice {
    return { label, disabledReason: undefined, value };
}

function numberEntry(amount: JsonValue | null): TriggerWordEntry {
    const value = typeof amount === 'number' ? amount : null;

    return { kind: 'number', value, unit: undefined };
}

function wordOf<T>(list: readonly Named<T>[], value: T) {
    const named = list.find((candidate) => candidate.value === value);
    if (named === undefined) throw new Error(`No word for ${String(value)}.`);

    return named.word;
}

// A variable made the World the target; any other value is about `this` unless another target was picked.
function keptTargetFor(action: ChangeAction, world: Entity): Target {
    const isWorldForVariable =
        action.value?.kind === 'variable' && action.target.kind === 'entity' && action.target.entity === world.id;
    if (isWorldForVariable) return { kind: 'this' };

    return action.target;
}

function withValue(action: ChangeAction, value: ValueRef, target: Target, offer: ChangeableValue | undefined) {
    let op = action.op;
    let amount = action.amount;

    if (offer !== undefined) {
        const firstOp = offer.ops[0] ?? op;
        if (!offer.ops.includes(op)) {
            op = firstOp;
        }

        const readsAmount = amount === null || offer.amountType.parse(amount).ok;
        if (!readsAmount) {
            amount = null;
        }
    }

    const changed: ChangeAction = { kind: 'change', target, value, op, amount };
    return changed;
}
