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
    Compare,
    Condition,
    JsonValue,
    Press,
    Push,
    ReadableValue,
    RepeatKind,
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

import { freshAction, freshCheck, freshPush, freshRepeat, freshWhen, targetOf } from './freshParts.ts';
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

const EVENTS: readonly Named<WhenKind>[] = [
    { value: 'touched', label: 'something starts touching this', word: 'something starts touching this' },
    { value: 'untouched', label: 'something stops touching this', word: 'something stops touching this' },
    { value: 'input', label: 'an input is pressed, released or held', word: 'the input' },
    { value: 'key', label: 'a key is pressed, released or held', word: 'the key' },
    { value: 'after', label: 'after some time', word: 'after' },
    { value: 'every', label: 'every few seconds', word: 'every' },
    { value: 'levelStart', label: 'the level starts', word: 'the level starts' },
    { value: 'tagLeft', label: 'the last entity with a tag is gone', word: 'no entity tagged' },
    { value: 'collision', label: 'this hits something', word: 'this hits something' },
    { value: 'custom', label: 'this gets a custom event', word: 'this gets the custom event' },
    { value: 'destroyed', label: 'this is destroyed', word: 'this is destroyed' },
    { value: 'variableChanged', label: 'a variable changes', word: 'the variable' },
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

// A string or a boolean is only compared with is and is not.
const EQUAL_COMPARES: readonly Compare[] = ['is', 'isNot'];

const OPS: readonly ChangeOp[] = ['set', 'add', 'subtract'];

const ACTIONS: readonly Named<ActionKind>[] = [
    {
        value: 'change',
        label: 'change a value',
        word: 'change',
        description: 'Set, add to or subtract from coins, a Position, a tag…',
    },
    { value: 'destroy', label: 'destroy', word: 'destroy', description: 'Take an entity out of the level' },
    { value: 'push', label: 'push', word: 'push', description: 'Kick a body, whatever its mass' },
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
    { title: 'Entities', kinds: ['destroy', 'push'] },
    { title: 'Events', kinds: ['fire', 'wait'] },
    { title: 'The game', kinds: ['win', 'lose', 'restart'] },
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

// A boolean variable's values, which read as true and false rather than a switch's on and off.
const TRUTH_CHOICES: readonly boolean[] = [true, false];

const NEW_NAME_LABEL = 'New name…';
const NEW_TAG_LABEL = 'New tag…';
const NO_LEVEL_VARIABLES = 'None yet: add them on the World';
const OTHER_DESCRIPTION = 'The other entity of the event: the one touching, hit or firing';
const NAME_HINT = 'One word, such as open';
const BODY_COMPONENT = 'BodyComponent';
const AXES: readonly ('x' | 'y')[] = ['x', 'y'];

// The menus of the trigger card, built from the level: the events, the targets (`this`, `other`, every
// entity but the trigger's own, every tag), the variables in their groups, the World's inputs, the keys, the
// custom events' names, the values changeableValues offers for the target picked, and the ones
// readableValues offers for the component value check.
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

    // The component value check's menu: each component of the target, opening its number and vector
    // values, a vector once (its axis is a word of its own); a body's ends with its live Speed and
    // Velocity. A vector picked keeps the axis the check had.
    readables(target: Target, current: ReadableValue | null, place: Place<ReadableValue>) {
        const entity = this.knownTarget(target);
        const values = readableValues(entity, this.context.registry);
        const keptAxis = current === null ? 'x' : (readableAxis(current) ?? 'x');
        const submenus = new Map<string, TriggerChoice[]>();
        const seen = new Set<string>();

        for (const value of values) {
            const picked = withReadableAxis(value, keptAxis);
            const key = readableKey(picked);
            if (seen.has(key)) continue;

            seen.add(key);
            const component = value.kind === 'field' ? value.component : BODY_COMPONENT;
            const choices = submenus.get(component) ?? [];
            choices.push(this.readableChoice(picked, place));
            submenus.set(component, choices);
        }

        const menus: TriggerSubmenu[] = [];
        for (const [component, choices] of submenus) {
            const label = cardTitleOf(component);
            menus.push({ label, choices });
        }

        const entry: TriggerWordEntry = { kind: 'submenus', submenus: menus };
        return entry;
    }

    // x and y, for a vector the component value check reads.
    axes(value: ReadableValue, place: Place<ReadableValue>) {
        return AXES.map((axis) => choice(axis, place(withReadableAxis(value, axis))));
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
        const valueCheck = freshCheck('compareValue', eventHasOther);

        return [
            described(
                choice('an entity has a tag', { section: 'check', index, check: tagCheck }),
                'Such as: other has the tag player',
            ),
            described(
                choice("a variable's value", { section: 'check', index, check: compareCheck }),
                'Such as: coins is at least 10',
            ),
            described(
                choice('a component value', { section: 'check', index, check: valueCheck }),
                'Such as: this Transform › Position y is more than 500',
            ),
        ];
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

    private readableChoice(value: ReadableValue, place: Place<ReadableValue>) {
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
