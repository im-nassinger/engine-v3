import { cardTitle, InputComponent } from '../../../core/components/index.ts';
import { CustomEventNames, LevelTags } from '../../../core/derived/index.ts';
import {
    AngleFieldType,
    CheckboxFieldType,
    ChoiceFieldType,
    ColourFieldType,
    EntityFieldType,
    FillFieldType,
    NumberFieldType,
    VectorFieldType,
} from '../../../core/fields/index.ts';
import type {
    Action,
    ActionKind,
    ChangeOp,
    Check,
    CheckedValue,
    Compare,
    Condition,
    JsonValue,
    Press,
    ReadableValue,
    Target,
    Unit,
    ValueRef,
    ValueType,
    VariableRef,
    VariableType,
    VariableValue,
    When,
    WhenKind,
} from '../../../core/fields/index.ts';
import { KeyCodes } from '../../../core/keys/index.ts';
import type { KeyCode } from '../../../core/keys/index.ts';
import type { Entity, EntityId } from '../../../core/level/index.ts';
import { changeableValues, readableValues, sameValueRef, variableChangeOf } from '../../../core/triggers/index.ts';
import type { ChangeableValue, TriggerContext } from '../../../core/triggers/index.ts';

import { freshAction, freshCheck, freshWhen, targetOf } from './freshParts.ts';
import {
    amountText,
    fieldLabel,
    isPointLike,
    LIVE_LABELS,
    readableAxis,
    readableName,
    triggerLabel,
    valueName,
} from './valueNames.ts';
import { targetText } from './targetText.ts';
import { LEVEL_GROUP_TITLE, VariableMenus } from './VariableMenus.ts';
import type {
    TriggerChoice,
    TriggerEntitiesEntry,
    TriggerMenuGroup,
    TriggerPartValue,
    TriggerSubmenu,
    TriggerTypedEntry,
    TriggerWordEntry,
} from './TriggerWord.ts';

type ChangeAction = Action & { readonly kind: 'change' };
type VariableChangedWhen = When & { readonly kind: 'variableChanged' };

// What the value check's value is, which picks its compare words and its amount's field: a variable's type,
// a tag, or a number.
export type CheckedType = VariableType | 'tag';

// What a change of a value allows: its ops and the type its amount is read with.
type ValueChange = Omit<ChangeableValue, 'ref'>;

// Builds a part with the picked item in place, so every menu item carries the row it makes.
type Place<T> = (picked: T) => TriggerPartValue;

type Named<T> = {
    readonly value: T;
    // What the menu shows.
    readonly label: string;
    // What the word reads once picked.
    readonly word: string;
    // The line under the label in Add action's and Add check's menus.
    readonly description?: string;
};

export const NO_OTHER_REASON = 'This event has no other entity';

// The When menu: six events. Picking one gives its first kind; the in-place word picks the other.
const EVENTS: readonly Omit<Named<WhenKind>, 'word'>[] = [
    { value: 'touched', label: 'something starts or stops touching this' },
    { value: 'key', label: 'a key or input is pressed, released or held' },
    { value: 'after', label: 'after or every few seconds' },
    { value: 'levelStart', label: 'the level starts' },
    { value: 'variableChanged', label: 'a variable changes' },
    { value: 'custom', label: 'this gets a custom event' },
];

// The word of the When's sentence that picks the event. Touching, a key or an input and a timer have no other
// word to hold it, so it is the in-place word: starts or stops, key or input, after or every.
const EVENT_WORDS: Readonly<Record<WhenKind, string>> = {
    touched: 'starts',
    untouched: 'stops',
    key: 'key',
    input: 'input',
    after: 'after',
    every: 'every',
    levelStart: 'the level starts',
    variableChanged: 'the variable',
    custom: 'this gets the custom event',
};

const EVENTS_TITLE = 'Events';

const PRESSES: readonly Press[] = ['pressed', 'released', 'held'];

const COMPARES: readonly Named<Compare>[] = [
    { value: 'is', label: 'is', word: 'is' },
    { value: 'isNot', label: 'is not', word: 'is not' },
    { value: 'more', label: 'is more than', word: 'is more than' },
    { value: 'less', label: 'is less than', word: 'is less than' },
    { value: 'atLeast', label: 'is at least', word: 'is at least' },
    { value: 'atMost', label: 'is at most', word: 'is at most' },
];

// A string or a boolean is only compared with is and is not.
const EQUAL_COMPARES: readonly Compare[] = ['is', 'isNot'];

const OPS: readonly ChangeOp[] = ['set', 'add', 'subtract'];

const ACTIONS: readonly Named<ActionKind>[] = [
    {
        value: 'change',
        label: 'change a value',
        word: 'change',
        description: 'Set, add to or subtract from coins, a Position, a Velocity, a tag…',
    },
    { value: 'destroy', label: 'destroy', word: 'destroy', description: 'Take an entity out of the level' },
    {
        value: 'fire',
        label: 'fire a custom event',
        word: 'fire',
        description: 'Triggers and scripts that listen for it run',
    },
    { value: 'wait', label: 'wait', word: 'wait', description: 'The actions after it run later' },
    { value: 'win', label: 'win', word: 'win', description: 'End the run with the win window' },
    { value: 'lose', label: 'lose', word: 'lose', description: 'End the run with the lose window' },
    { value: 'restart', label: 'restart the level', word: 'restart the level', description: 'Start the run again' },
];

// Add action's menu, in titled groups.
const ACTION_GROUPS: readonly { readonly title: string; readonly kinds: readonly ActionKind[] }[] = [
    { title: 'Values', kinds: ['change'] },
    { title: 'Entities', kinds: ['destroy'] },
    { title: 'Events', kinds: ['fire', 'wait'] },
    { title: 'The game', kinds: ['win', 'lose', 'restart'] },
];

const BOOLEAN_CHOICES: readonly Named<boolean>[] = [
    { value: true, label: 'on', word: 'on' },
    { value: false, label: 'off', word: 'off' },
];

// A boolean variable's values, which read as true and false rather than a switch's on and off.
const TRUTH_CHOICES: readonly boolean[] = [true, false];

const NEW_NAME_LABEL = 'New name…';
const NEW_TAG_LABEL = 'New tag…';
const NO_LEVEL_VARIABLES = 'None yet: add them on the World';
const OTHER_DESCRIPTION = 'The other entity of the event: the one touching or firing';
const TAG_COMPARES: readonly Named<Compare>[] = [
    { value: 'is', label: 'has', word: 'has' },
    { value: 'isNot', label: "doesn't have", word: "doesn't have" },
];
const TAG_WORD = 'the tag';
const NAME_HINT = 'One word, such as open';
const BODY_COMPONENT = 'BodyComponent';
const AXES: readonly ('x' | 'y')[] = ['x', 'y'];

// The menus of the trigger card, built from the level: the events, the targets (`this`, `other`, every
// entity but the trigger's own, every tag), the variables in their groups, the World's inputs, the keys, the
// custom events' names, the values changeableValues offers for the target picked, and the ones the value
// check reads.
export class TriggerChoices {
    private readonly context: TriggerContext;
    private readonly levelTags: readonly string[];
    private readonly eventNames: readonly string[];
    private readonly variableMenus: VariableMenus;

    constructor(context: TriggerContext) {
        this.context = context;
        this.levelTags = LevelTags.of(context.level);
        this.eventNames = CustomEventNames.of(context.level);
        this.variableMenus = new VariableMenus(context);
    }

    static eventWord(kind: WhenKind) {
        return EVENT_WORDS[kind];
    }

    static compareWord(compare: Compare) {
        return wordOf(COMPARES, compare);
    }

    static actionWord(kind: ActionKind) {
        return wordOf(ACTIONS, kind);
    }

    // "changes" with no condition; "becomes 3 or more", "becomes anything but "closed"", "becomes true".
    static becomesWord(becomes: Condition | null) {
        if (becomes === null) return 'changes';

        const shown = shownValue(becomes.value);
        const condition = conditionText(becomes.compare, shown);

        return `becomes ${condition}`;
    }

    // A variable compared or changed: its name, and the target of an own one, "health of this".
    variableWord(ref: VariableRef) {
        if (ref.owner === 'level') return ref.name;

        const owner = targetText(ref.target, this.context.level) ?? 'pick an entity';
        return `${ref.name} of ${owner}`;
    }

    // "this", "other", an entity's name, "missing entity", "every coin"; null while unset.
    targetWord(target: Target) {
        return targetText(target, this.context.level);
    }

    readableWord(value: ReadableValue) {
        return readableName(value, this.context.registry);
    }

    variableType(ref: VariableRef | null) {
        return this.variableMenus.typeOf(ref);
    }

    // The level's variables, then each owner's own, every item with its type.
    variableGroups(owners: readonly Target[], place: (ref: VariableRef, type: VariableType) => TriggerPartValue) {
        const groups = this.variableMenus.groups(owners, place);
        const entry: TriggerWordEntry = { kind: 'groups', groups };

        return entry;
    }

    // What a variable of this type is compared with: a number field, a text field, or true or false. A
    // variable not known yet takes a number, as v3's did.
    variableValueEntry(type: VariableType | undefined, value: VariableValue | null, place: Place<VariableValue>) {
        if (type === 'string') {
            const text = typeof value === 'string' ? value : null;
            const entry: TriggerWordEntry = { kind: 'text', value: text };
            return entry;
        }
        if (type === 'boolean') {
            const choices = TRUTH_CHOICES.map((truth) => choice(String(truth), place(truth)));
            const entry: TriggerWordEntry = { kind: 'menu', choices };
            return entry;
        }

        const number = typeof value === 'number' ? value : null;
        return numberEntry(number);
    }

    // "changes (any change)", then each condition the variable's type allows. A condition with a value to
    // type asks for it before it is made.
    becomes(when: VariableChangedWhen, type: VariableType | undefined) {
        const place = (becomes: Condition | null) => ({ section: 'when', when: { ...when, becomes } }) as const;
        const anyChange = choice('changes (any change)', place(null));
        const choices: TriggerChoice[] = [anyChange];

        if (type === 'boolean') {
            for (const truth of TRUTH_CHOICES) {
                const condition: Condition = { compare: 'is', value: truth };
                choices.push(choice(`becomes ${String(truth)}`, place(condition)));
            }

            return choices;
        }

        const isString = type === 'string';
        let placeholder = '…';
        let startingValue: VariableValue = 0;
        let asks: TriggerTypedEntry = numberEntry(null);
        if (isString) {
            placeholder = '"…"';
            startingValue = '';
            asks = { kind: 'text', value: null };
        }

        for (const compare of comparesOf(type)) {
            const condition: Condition = { compare, value: startingValue };
            const label = conditionText(compare, placeholder);
            const asked = choice(`becomes ${label}`, place(condition));
            choices.push({ ...asked, asks });
        }

        return choices;
    }

    // The custom events' names used in the level, then "New name…", which asks for one word.
    names(place: Place<string | null>) {
        const choices = this.eventNames.map((name) => choice(name, place(name)));
        const asks: TriggerTypedEntry = { kind: 'word', value: null, hint: NAME_HINT };
        const newName = choice(NEW_NAME_LABEL, place(null));
        choices.push({ ...newName, asks });

        return choices;
    }

    // The value check's value menu, laid out as Change value's: the level's variables first, which make the
    // World the target, then the target's values, each component opening its values in a submenu: its
    // numbers and each vector once (its axis is a word of its own), a body's live Speed and Velocity after
    // Body's, the target's own variables under Variables, and its tags under Tags. Picking one keeps the
    // compare and the amount when the new value's type reads them.
    checkValues(check: Check, index: number) {
        const world = this.context.level.world;
        const worldTarget: Target = { kind: 'entity', entity: world.id };
        const keptTarget = keptCheckTargetFor(check, world);
        const keptAxis = check.value === null ? 'x' : (checkedAxis(check.value) ?? 'x');
        const placed = (value: CheckedValue, target: Target, type: CheckedType) => {
            const changed = withCheckedValue(check, value, target, type, this.checkType(check));
            return { section: 'check', index, check: changed } as const;
        };

        const levelChoices = this.variableMenus.levelVariables().map((variable) => {
            const value: CheckedValue = { kind: 'variable', name: variable.name };
            const picked = choice(variable.name, placed(value, worldTarget, variable.type));

            return { ...picked, note: variable.type };
        });
        const levelGroup: TriggerMenuGroup = {
            title: LEVEL_GROUP_TITLE,
            choices: levelChoices,
            emptyText: NO_LEVEL_VARIABLES,
        };

        const entity = this.knownTarget(keptTarget);
        const submenus = new Map<string, TriggerChoice[]>();
        const addTo = (component: string, picked: TriggerChoice) => {
            const choices = submenus.get(component) ?? [];
            choices.push(picked);
            submenus.set(component, choices);
        };

        const seen = new Set<string>();
        for (const value of readableValues(entity, this.context.registry)) {
            const withAxis = withReadableAxis(value, keptAxis);
            const key = readableKey(withAxis);
            if (seen.has(key)) continue;

            seen.add(key);
            const component = withAxis.kind === 'field' ? withAxis.component : BODY_COMPONENT;
            addTo(
                component,
                this.readableChoice(withAxis, (picked) => placed(picked, keptTarget, 'number')),
            );
        }

        const ownVariables = this.variableMenus.ownVariables(keptTarget) ?? [];
        for (const variable of ownVariables) {
            const value: CheckedValue = { kind: 'variable', name: variable.name, own: true };
            const picked = choice(variable.name, placed(value, keptTarget, variable.type));
            addTo('VariablesComponent', { ...picked, note: variable.type });
        }

        addTo('TagsComponent', choice('Tags', placed({ kind: 'tag' }, keptTarget, 'tag')));

        const componentMenus: TriggerSubmenu[] = [];
        for (const [component, choices] of submenus) {
            componentMenus.push({ label: cardTitleOf(component), choices });
        }

        const owner = this.targetWord(keptTarget) ?? 'the entity';
        const valuesGroup: TriggerMenuGroup = {
            title: `Values of ${owner}`,
            choices: [],
            submenus: componentMenus,
            emptyText: undefined,
        };

        const entry: TriggerWordEntry = { kind: 'groups', groups: [levelGroup, valuesGroup] };
        return entry;
    }

    // What the value check's value word reads: "coins", "health", "the tag", "Body › Speed".
    checkValueWord(value: CheckedValue) {
        if (value.kind === 'variable') return value.name;
        if (value.kind === 'tag') return TAG_WORD;

        return readableName(value, this.context.registry);
    }

    // The type of the value a check reads; undefined while unset, or for a variable not known.
    checkType(check: Check): CheckedType | undefined {
        const { value } = check;
        if (value === null) return undefined;
        if (value.kind === 'tag') return 'tag';
        if (value.kind !== 'variable') return 'number';

        let ref: VariableRef = { owner: 'level', name: value.name };
        if (value.own === true) {
            ref = { owner: 'own', target: check.target, name: value.name };
        }

        return this.variableMenus.typeOf(ref);
    }

    // has and doesn't have for a tag, else the compares the type allows.
    checkCompares(check: Check, index: number) {
        const place = (compare: Compare) => ({ section: 'check', index, check: { ...check, compare } }) as const;
        const type = this.checkType(check);
        if (type !== 'tag') return this.compares(place, type);

        return TAG_COMPARES.map((compare) => choice(compare.label, place(compare.value)));
    }

    static checkCompareWord(compare: Compare, type: CheckedType | undefined) {
        if (type !== 'tag') return wordOf(COMPARES, compare);

        const tagCompare = TAG_COMPARES.find((candidate) => candidate.value === compare);
        return tagCompare?.word ?? wordOf(COMPARES, compare);
    }

    // The amount's field: the level's tags and "New tag…" for a tag, the variable's type's field for a
    // variable, a number for the rest.
    checkAmountEntry(check: Check, index: number): TriggerWordEntry {
        const place = (amount: VariableValue) => ({ section: 'check', index, check: { ...check, amount } }) as const;
        const type = this.checkType(check);

        if (type === 'tag') return { kind: 'menu', choices: this.tagsWithNew(place) };
        if (check.value?.kind === 'variable') return this.variableValueEntry(type, check.amount, place);

        return numberEntry(check.amount);
    }

    // x and y, for a vector the value check reads.
    axes(value: ReadableValue, place: Place<ReadableValue>) {
        return AXES.map((axis) => choice(axis, place(withReadableAxis(value, axis))));
    }

    events(): readonly TriggerChoice[] {
        return EVENTS.map((event) => {
            const when = freshWhen(event.value);

            return choice(event.label, { section: 'when', when });
        });
    }

    // What the event word opens: the When menu, and first, for touching, a key or an input, and a timer,
    // the in-place choice between its two kinds, which keeps the rest of the When.
    eventEntry(when: When | null): TriggerWordEntry {
        const events = this.events();
        const variants = when === null ? undefined : eventVariantsOf(when);
        if (variants === undefined) return { kind: 'menu', choices: events };

        const variantGroup: TriggerMenuGroup = {
            title: variants.title,
            choices: variants.choices,
            emptyText: undefined,
        };
        const eventGroup: TriggerMenuGroup = { title: EVENTS_TITLE, choices: events, emptyText: undefined };

        return { kind: 'groups', groups: [variantGroup, eventGroup] };
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

    // Every compare for a number (or a variable not known yet), is and is not for a string or a boolean.
    compares(place: Place<Compare>, type: VariableType | undefined = 'number') {
        const allowed = comparesOf(type);
        const named = COMPARES.filter((compare) => allowed.includes(compare.value));

        return named.map((compare) => choice(compare.label, place(compare.value)));
    }

    // A variable's ops follow its type: Set, Add and Subtract for a number, Set for a string, Set and Flip
    // for a boolean. Any other value offers v3's three.
    ops(action: ChangeAction, place: Place<ChangeOp>) {
        const type = this.changedVariableType(action);
        let ops = OPS;
        if (type !== undefined) {
            ops = variableChangeOf(type).ops;
        }

        return ops.map((op) => choice(op, place(op)));
    }

    // Add check's menu: the one check, a value.
    newChecks(index: number, eventHasOther: boolean): readonly TriggerChoice[] {
        const check = freshCheck(eventHasOther);
        const picked = choice('a value', { section: 'check', index, check });

        return [described(picked, 'Such as: other has the tag player, coins is 10 or more, this Body › Speed')];
    }

    // The menu of an action's own word, which keeps its target.
    actions(index: number, replaced: Action | undefined) {
        const keptTarget = replaced === undefined ? undefined : targetOf(replaced);

        return ACTIONS.map((action) => {
            const fresh = freshAction(action.value, keptTarget);
            const picked = choice(action.label, { section: 'action', index, action: fresh });

            return described(picked, action.description);
        });
    }

    // Add action's menu: the actions in their groups, each with what it does.
    actionGroups(index: number): readonly TriggerMenuGroup[] {
        const choices = this.actions(index, undefined);

        return ACTION_GROUPS.map((group) => {
            const inGroup = choices.filter((_choice, position) => {
                const kind = ACTIONS[position]?.value;
                return kind !== undefined && group.kinds.includes(kind);
            });

            return { title: group.title, choices: inGroup, emptyText: undefined };
        });
    }

    // The entity picker: `this`, `other` (greyed with its reason under an event with none), every entity
    // with a tag where a tag can be the target, then the level's tree, where the trigger's own entity is
    // `this`.
    targets(current: Target, eventHasOther: boolean, withTags: boolean, place: Place<Target>) {
        const { owner } = this.context;

        const thisChoice = described(choice('this', place({ kind: 'this' })), `The entity this trigger is on`);
        const otherReason = eventHasOther ? undefined : NO_OTHER_REASON;
        const otherChoice = described(choice('other', place({ kind: 'other' })), OTHER_DESCRIPTION);

        const tagged: TriggerChoice[] = [];
        if (withTags) {
            for (const tag of this.levelTags) {
                tagged.push(choice(`every entity tagged ${tag}`, place({ kind: 'tagged', tag })));
            }
        }

        const placeEntity = (entityId: EntityId) => {
            if (entityId === owner.id) return place({ kind: 'this' });

            return place({ kind: 'entity', entity: entityId });
        };

        const entry: TriggerEntitiesEntry = {
            kind: 'entities',
            choices: [thisChoice, { ...otherChoice, disabledReason: otherReason }],
            tagged,
            chosenId: chosenIdOf(current, owner),
            placeEntity,
        };
        return entry;
    }

    // The level's variables first, which make the World the target, then the target's values: each of
    // its components opening its values, a vector whole, its own variables under Variables, its tags
    // and each trigger's on/off. Picking one keeps the operation when the value allows it (a boolean takes
    // Flip otherwise), and the amount when its type reads it.
    values(action: ChangeAction, index: number) {
        const world = this.context.level.world;
        const worldTarget: Target = { kind: 'entity', entity: world.id };
        const keptTarget = keptTargetFor(action, world);
        const placed = (value: ValueRef, target: Target, offer: ValueChange | undefined, type?: VariableType) => {
            const changed = withValue(action, value, target, offer, type);
            return { section: 'action', index, action: changed } as const;
        };

        const levelChoices = this.variableMenus.levelVariables().map((variable) => {
            const value: ValueRef = { kind: 'variable', name: variable.name };
            const change = variableChangeOf(variable.type);
            const picked = choice(variable.name, placed(value, worldTarget, change, variable.type));

            return { ...picked, note: variable.type };
        });
        const levelGroup: TriggerMenuGroup = {
            title: LEVEL_GROUP_TITLE,
            choices: levelChoices,
            emptyText: NO_LEVEL_VARIABLES,
        };

        const target = this.knownTarget(keptTarget);
        const submenus = new Map<string, TriggerChoice[]>();
        const addTo = (component: string, picked: TriggerChoice) => {
            const choices = submenus.get(component) ?? [];
            choices.push(picked);
            submenus.set(component, choices);
        };

        for (const offer of changeableValues(target, this.context.registry)) {
            const { ref } = offer;
            if (ref.kind === 'variable') continue;

            const picked = choice(this.valueLabel(ref, target), placed(ref, keptTarget, offer));
            addTo(componentOfValue(ref), picked);
        }

        const ownVariables = this.variableMenus.ownVariables(keptTarget) ?? [];
        for (const variable of ownVariables) {
            const value: ValueRef = { kind: 'variable', name: variable.name, own: true };
            const change = variableChangeOf(variable.type);
            const picked = choice(variable.name, placed(value, keptTarget, change, variable.type));
            addTo('VariablesComponent', { ...picked, note: variable.type });
        }

        const componentMenus: TriggerSubmenu[] = [];
        for (const [component, choices] of submenus) {
            componentMenus.push({ label: cardTitleOf(component), choices });
        }

        const owner = this.targetWord(keptTarget) ?? 'the entity';
        const valuesGroup: TriggerMenuGroup = {
            title: `Values of ${owner}`,
            choices: [],
            submenus: componentMenus,
            emptyText: undefined,
        };

        const entry: TriggerWordEntry = { kind: 'groups', groups: [levelGroup, valuesGroup] };
        return entry;
    }

    // The amount's field: a menu for on/off, a choice or a tag, the number box with the field's unit for a
    // number or an angle, the two boxes of a vector, the colour box, and the value's own type for the
    // rest. A number until the value is picked.
    amountEntry(action: ChangeAction, index: number): TriggerWordEntry {
        const amountType = this.amountTypeOf(action);
        const place = (amount: JsonValue) => ({ section: 'action', index, action: { ...action, amount } }) as const;

        const variableType = this.changedVariableType(action);
        if (variableType !== undefined) {
            const amount = isVariableValue(action.amount) ? action.amount : null;
            return this.variableValueEntry(variableType, amount, place);
        }

        if (action.value?.kind === 'tag') return { kind: 'menu', choices: this.tagsWithNew(place) };

        const unit = this.unitOf(action);
        if (amountType === undefined) return numberEntry(action.amount, unit);

        const isNumber = amountType instanceof NumberFieldType || amountType instanceof AngleFieldType;
        if (isNumber) return numberEntry(action.amount, unit);
        if (amountType instanceof VectorFieldType) {
            const value = isPointLike(action.amount) ? { x: action.amount.x, y: action.amount.y } : null;
            return { kind: 'vector', value, unit };
        }
        if (amountType instanceof ColourFieldType) {
            const value = typeof action.amount === 'string' ? action.amount : null;
            return { kind: 'colour', value };
        }
        if (amountType instanceof FillFieldType) {
            const colour = solidColourOf(action.amount);
            return { kind: 'colour', value: colour, isFill: true };
        }
        if (amountType instanceof EntityFieldType) return this.entityAmountEntry(action.amount, place);
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

    // An entity a field points at, such as the camera's Follow, picked in the entity picker's tree.
    private entityAmountEntry(amount: JsonValue | null, place: Place<JsonValue>): TriggerEntitiesEntry {
        const chosenId = entityIdOf(amount);
        const placeEntity = (entityId: EntityId) => place({ entity: entityId });

        return { kind: 'entities', choices: [], tagged: [], chosenId, placeEntity };
    }

    // The level's tags, then "New tag…", which asks for one.
    tagsWithNew(place: Place<string>) {
        const choices = this.tags(place);
        const newTag = choice(NEW_TAG_LABEL, place(''));
        const asks: TriggerTypedEntry = { kind: 'text', value: null };

        return [...choices, { ...newTag, asks }];
    }

    // What the amount word reads once set: a choice's label rather than its stored value.
    amountWord(action: ChangeAction, amount: JsonValue) {
        const variableType = this.changedVariableType(action);
        if (variableType !== undefined && isVariableValue(amount)) return shownValue(amount);

        const amountType = this.amountTypeOf(action);
        if (amountType instanceof ChoiceFieldType) {
            const options: readonly { value: string; label: string }[] = amountType.options;
            const option = options.find((candidate) => candidate.value === amount);
            if (option !== undefined) return option.label;
        }
        if (amountType instanceof FillFieldType) return solidColourOf(amount) ?? 'a gradient';
        if (amountType instanceof EntityFieldType) {
            const target: Target = { kind: 'entity', entity: entityIdOf(amount) ?? null };
            return this.targetWord(target) ?? 'pick an entity';
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

    // The type of the variable a Change value changes; undefined for any other value, or a variable not known.
    changedVariableType(action: ChangeAction) {
        const { value } = action;
        if (value?.kind !== 'variable') return undefined;

        let ref: VariableRef = { owner: 'level', name: value.name };
        if (value.own === true) {
            ref = { owner: 'own', target: action.target, name: value.name };
        }

        return this.variableMenus.typeOf(ref);
    }

    private readableChoice(value: ReadableValue, place: (value: ReadableValue) => TriggerPartValue) {
        if (value.kind === 'field') {
            const label = fieldLabel(value, this.context.registry);
            return choice(label, place(value));
        }

        const live = choice(LIVE_LABELS[value.live], place(value));
        return { ...live, note: 'live' };
    }

    // A value as its component's submenu lists it: "Position", "Tags", "Touched" for a trigger's on/off.
    private valueLabel(value: ValueRef, target: Entity | undefined) {
        if (value.kind === 'field') return fieldLabel(value, this.context.registry);
        if (value.kind === 'tag') return 'Tags';
        if (value.kind === 'velocity') return LIVE_LABELS.velocityX;
        if (value.kind === 'triggerOn') return `${triggerLabel(value.trigger, target)} on/off`;

        return value.name;
    }

    private unitOf(action: ChangeAction) {
        if (action.value === null) return undefined;

        const target = this.knownTarget(action.target);
        return this.offerFor(target, action.value)?.unit;
    }

    private amountTypeOf(action: ChangeAction): ValueType<unknown> | undefined {
        const value = action.value;
        if (value === null) return undefined;

        const variableType = this.changedVariableType(action);
        if (variableType !== undefined) return variableChangeOf(variableType).amountType;

        const target = this.knownTarget(action.target);
        return this.offerFor(target, value)?.amountType;
    }

    private offerFor(target: Entity | undefined, value: ValueRef) {
        const offers = changeableValues(target, this.context.registry);

        return offers.find((offer) => sameValueRef(offer.ref, value));
    }
}

function choice(label: string, value: TriggerPartValue): TriggerChoice {
    return { label, disabledReason: undefined, value, note: undefined, asks: undefined };
}

function numberEntry(amount: JsonValue | null, unit?: Unit) {
    const value = typeof amount === 'number' ? amount : null;
    const entry: TriggerTypedEntry = { kind: 'number', value, unit, clearLabel: undefined };

    return entry;
}

// A solid fill's colour; undefined for a gradient or no fill.
function solidColourOf(amount: JsonValue | null) {
    if (typeof amount !== 'object' || amount === null) return null;
    if (!('kind' in amount) || amount.kind !== 'solid' || !('colour' in amount)) return null;

    return typeof amount.colour === 'string' ? amount.colour : null;
}

function entityIdOf(amount: JsonValue | null) {
    if (typeof amount !== 'object' || amount === null || !('entity' in amount)) return undefined;

    return typeof amount.entity === 'number' ? amount.entity : undefined;
}

function described(picked: TriggerChoice, description: string | undefined): TriggerChoice {
    if (description === undefined) return picked;

    return { ...picked, description };
}

// The component a value of Change value belongs to, for its submenu.
function componentOfValue(value: ValueRef) {
    switch (value.kind) {
        case 'field':
            return value.component;
        case 'tag':
            return 'TagsComponent';
        case 'triggerOn':
            return 'TriggerComponent';
        case 'variable':
            return 'VariablesComponent';
        case 'velocity':
            return BODY_COMPONENT;
    }
}

function chosenIdOf(target: Target, owner: Entity) {
    if (target.kind === 'this') return owner.id;
    if (target.kind !== 'entity' || target.entity === null) return undefined;

    return target.entity;
}

// The same value read on the other axis, for a vector or a body's velocity; a number as it is.
function withReadableAxis(value: ReadableValue, axis: 'x' | 'y'): ReadableValue {
    if (value.kind === 'field') {
        if (value.axis === undefined) return value;

        return { ...value, axis };
    }
    if (value.live === 'speed') return value;

    const live = axis === 'x' ? 'velocityX' : 'velocityY';
    return { kind: 'live', live };
}

function readableKey(value: ReadableValue) {
    if (value.kind === 'field') return `${value.component}.${value.field}.${value.axis ?? ''}`;

    return value.live;
}

function comparesOf(type: VariableType | undefined) {
    if (type === 'string' || type === 'boolean') return EQUAL_COMPARES;

    return COMPARES.map((compare) => compare.value);
}

// A string reads in quotes, so an empty one still shows.
export function shownValue(value: VariableValue) {
    if (typeof value === 'string') return `"${value}"`;

    return String(value);
}

// "3 or more", "anything but "closed"", "more than 3".
function conditionText(compare: Compare, shown: string) {
    switch (compare) {
        case 'is':
            return shown;
        case 'isNot':
            return `anything but ${shown}`;
        case 'more':
            return `more than ${shown}`;
        case 'less':
            return `less than ${shown}`;
        case 'atLeast':
            return `${shown} or more`;
        case 'atMost':
            return `${shown} or less`;
    }
}

function isVariableValue(value: JsonValue | null): value is VariableValue {
    return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean';
}

function cardTitleOf(component: string) {
    if (!component.endsWith('Component')) return component;

    const typeName = component as `${string}Component`;
    return cardTitle(typeName);
}

function wordOf<T>(list: readonly Named<T>[], value: T) {
    const named = list.find((candidate) => candidate.value === value);
    if (named === undefined) throw new Error(`No word for ${String(value)}.`);

    return named.word;
}

// The touching, a key or an input, and a timer's in-place choice between its two kinds.
function eventVariantsOf(when: When) {
    const place = (picked: When) => ({ section: 'when', when: picked }) as const;

    switch (when.kind) {
        case 'touched':
        case 'untouched':
            return {
                title: 'Touching',
                choices: [
                    choice('starts touching', place({ kind: 'touched' })),
                    choice('stops touching', place({ kind: 'untouched' })),
                ],
            };
        case 'key':
        case 'input': {
            let key: When = { kind: 'key', key: null, how: when.how };
            let input: When = { kind: 'input', input: null, how: when.how };
            if (when.kind === 'key') {
                key = when;
            } else {
                input = when;
            }

            return { title: 'Key or input', choices: [choice('a key', place(key)), choice('an input', place(input))] };
        }
        case 'after':
        case 'every': {
            const { seconds } = when;
            const after = choice('after', place({ kind: 'after', seconds }));
            const every = choice('every', place({ kind: 'every', seconds }));

            return { title: 'Timer', choices: [after, every] };
        }
        default:
            return undefined;
    }
}

// The value check, its value picked: a level's variable makes the World the target. The compare is kept when
// the new type allows it (else is), and the amount when the type is the same. A check's first value starts it
// as v4's checks started: a number variable at "is at least", any other number at "is more than".
function withCheckedValue(
    check: Check,
    value: CheckedValue,
    target: Target,
    type: CheckedType,
    oldType: CheckedType | undefined,
): Check {
    let { compare, amount } = check;
    const allowed = type === 'tag' ? EQUAL_COMPARES : comparesOf(type);
    if (!allowed.includes(compare)) {
        compare = 'is';
    }
    if (check.value === null && type === 'number') {
        compare = value.kind === 'variable' ? 'atLeast' : 'more';
    }
    if (type !== oldType) {
        amount = null;
    }

    return { kind: 'value', target, value, compare, amount };
}

// A level's variable made the World the target; any other value is about `this` unless another target was
// picked.
function keptCheckTargetFor(check: Check, world: Entity): Target {
    const isWorldForVariable =
        check.value?.kind === 'variable' && check.target.kind === 'entity' && check.target.entity === world.id;
    if (isWorldForVariable) return { kind: 'this' };

    return check.target;
}

// The axis a checked number reads on a vector or a body's velocity; undefined for any other.
function checkedAxis(value: CheckedValue) {
    if (value.kind === 'variable' || value.kind === 'tag') return undefined;

    return readableAxis(value);
}

// A variable made the World the target; any other value is about `this` unless another target was picked.
function keptTargetFor(action: ChangeAction, world: Entity): Target {
    const isWorldForVariable =
        action.value?.kind === 'variable' && action.target.kind === 'entity' && action.target.entity === world.id;
    if (isWorldForVariable) return { kind: 'this' };

    return action.target;
}

function withValue(
    action: ChangeAction,
    value: ValueRef,
    target: Target,
    offer: ValueChange | undefined,
    variableType: VariableType | undefined,
) {
    let op = action.op;
    let amount = action.amount;

    if (offer !== undefined) {
        const firstOp = offer.ops[0] ?? op;
        if (!offer.ops.includes(op)) {
            op = firstOp;
        }
        if (!offer.ops.includes(action.op) && variableType === 'boolean') {
            op = 'flip';
        }

        const readsAmount = amount === null || offer.amountType.parse(amount).ok;
        if (!readsAmount) {
            amount = null;
        }
    }

    const changed: ChangeAction = { kind: 'change', target, value, op, amount };
    return changed;
}
