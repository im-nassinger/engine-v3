import { KeyCodes } from '../../keys/index.ts';

import type { JsonValue } from '../JsonValue.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, hasExactlyKeys, isPlainObject, parseFiniteNumber, refuse } from '../rawChecks.ts';

import type {
    Action,
    ChangeOp,
    Check,
    CheckedValue,
    Compare,
    Condition,
    LiveValue,
    Press,
    ReadableValue,
    Target,
    Trigger,
    ValueRef,
    VariableRef,
    When,
} from './Trigger.ts';
import type { VariableValue } from '../variables/VariableValue.ts';

type RawRecord = Readonly<Record<string, unknown>>;

const TRIGGER_KEYS: readonly string[] = ['id', 'name', 'on', 'when', 'checks', 'actions'];
const PRESSES: readonly Press[] = ['pressed', 'released', 'held'];
const COMPARES: readonly Compare[] = ['is', 'isNot', 'more', 'less', 'atLeast', 'atMost'];
const CHANGE_OPS: readonly ChangeOp[] = ['set', 'add', 'subtract', 'flip'];
const LIVE_VALUES: readonly LiveValue[] = ['speed', 'velocityX', 'velocityY'];
// An amount is a value of a field, such as a fill: a few levels deep at most. Deeper is damaged data.
const MAX_AMOUNT_DEPTH = 8;

// A trigger from untrusted data: a file, the clipboard. Checks the shape only; normalizeTrigger cleans it.
// A `repeat` saved before v4 fix 4 is ignored, whatever it holds: Repeat is gone, and old levels aren't
// converted (owner, 2026-11-24).
export function parseTrigger(raw: unknown): ParseOutcome<Trigger> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });
    const keys = Object.hasOwn(raw, 'repeat') ? [...TRIGGER_KEYS, 'repeat'] : TRIGGER_KEYS;
    if (!hasExactlyKeys(raw, keys)) return refuse({ reason: 'wrongType' });

    const id = raw['id'];
    if (!isPositiveWholeNumber(id)) return refuse({ reason: 'wrongType' });

    const name = raw['name'];
    if (name !== null && typeof name !== 'string') return refuse({ reason: 'wrongType' });

    const on = raw['on'];
    if (typeof on !== 'boolean') return refuse({ reason: 'wrongType' });

    const when = parseNullable(raw['when'], parseWhen);
    if (!when.ok) return when;

    const checks = parseList(raw['checks'], parseCheck);
    if (!checks.ok) return checks;

    const actions = parseList(raw['actions'], parseAction);
    if (!actions.ok) return actions;
    const keptActions = actions.value.filter((action) => action !== null);

    return accept({
        id,
        name,
        on,
        when: when.value,
        checks: checks.value,
        actions: keptActions,
    });
}

export function isPositiveWholeNumber(raw: unknown): raw is number {
    return typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 1;
}

// Saved before 2026-11-23's simpler triggers: "this hits something" (`collision`) is now a touch, and "the
// last entity with a tag is gone" (`tagLeft`) and "this is destroyed" (`destroyed`) are gone, so they read as
// an unset When, keeping the trigger's If and Do.
function parseWhen(raw: unknown): ParseOutcome<When | null> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

    const kind = raw['kind'];
    switch (kind) {
        case 'touched':
        case 'untouched':
        case 'levelStart':
            return parseBareKind(raw, kind);
        case 'collision':
            return parseBareKind(raw, 'touched');
        case 'destroyed':
            return parseDroppedWhen(raw, ['kind']);
        case 'tagLeft':
            return parseDroppedWhen(raw, ['kind', 'tag']);
        case 'custom':
            return parseCustomWhen(raw);
        case 'variableChanged':
            return parseVariableChangedWhen(raw);
        case 'input':
            return parseInputWhen(raw);
        case 'key':
            return parseKeyWhen(raw);
        case 'after':
        case 'every':
            return parseTimerWhen(raw, kind);
        default:
            return refuse({ reason: 'unknownChoice' });
    }
}

// A part that is only its kind, such as `{ "kind": "touched" }`.
function parseBareKind<Kind extends string>(raw: RawRecord, kind: Kind): ParseOutcome<{ readonly kind: Kind }> {
    if (!hasExactlyKeys(raw, ['kind'])) return refuse({ reason: 'wrongType' });

    return accept({ kind });
}

function parseInputWhen(raw: RawRecord): ParseOutcome<When> {
    if (!hasExactlyKeys(raw, ['kind', 'input', 'how'])) return refuse({ reason: 'wrongType' });

    const input = parseNullableText(raw['input']);
    if (!input.ok) return input;

    const how = parseChoice(raw['how'], PRESSES);
    if (!how.ok) return how;

    return accept({ kind: 'input', input: input.value, how: how.value });
}

function parseKeyWhen(raw: RawRecord): ParseOutcome<When> {
    if (!hasExactlyKeys(raw, ['kind', 'key', 'how'])) return refuse({ reason: 'wrongType' });

    const key = raw['key'];
    const how = parseChoice(raw['how'], PRESSES);
    if (!how.ok) return how;

    if (key === null) return accept({ kind: 'key', key: null, how: how.value });
    if (typeof key !== 'string') return refuse({ reason: 'wrongType' });
    if (!KeyCodes.isBindable(key)) return refuse({ reason: 'unbindableKey', key });

    return accept({ kind: 'key', key, how: how.value });
}

function parseTimerWhen(raw: RawRecord, kind: 'after' | 'every'): ParseOutcome<When> {
    if (!hasExactlyKeys(raw, ['kind', 'seconds'])) return refuse({ reason: 'wrongType' });

    const seconds = parseNullable(raw['seconds'], parseFiniteNumber);
    if (!seconds.ok) return seconds;

    return accept({ kind, seconds: seconds.value });
}

// A When of a kind that is gone: its shape is still checked, as any damaged data is refused.
function parseDroppedWhen(raw: RawRecord, keys: readonly string[]): ParseOutcome<null> {
    if (!hasExactlyKeys(raw, keys)) return refuse({ reason: 'wrongType' });
    if (Object.hasOwn(raw, 'tag')) {
        const tag = parseNullableText(raw['tag']);
        if (!tag.ok) return tag;
    }

    return accept(null);
}

function parseCustomWhen(raw: RawRecord): ParseOutcome<When> {
    if (!hasExactlyKeys(raw, ['kind', 'name'])) return refuse({ reason: 'wrongType' });

    const name = parseNullableText(raw['name']);
    if (!name.ok) return name;

    return accept({ kind: 'custom', name: name.value });
}

// Only the entity hears its own variables, so an own variable in a When is always `this`'s.
function parseVariableChangedWhen(raw: RawRecord): ParseOutcome<When> {
    if (!hasExactlyKeys(raw, ['kind', 'variable', 'becomes'])) return refuse({ reason: 'wrongType' });

    const variable = parseNullable(raw['variable'], parseVariableRef);
    if (!variable.ok) return variable;
    if (variable.value?.owner === 'own' && variable.value.target.kind !== 'this') {
        return refuse({ reason: 'wrongType' });
    }

    const becomes = parseNullable(raw['becomes'], parseCondition);
    if (!becomes.ok) return becomes;

    return accept({ kind: 'variableChanged', variable: variable.value, becomes: becomes.value });
}

// The level's variable as its name, as v3 saved it, or an entity's own as `{ "target": ..., "name": ... }`.
function parseVariableRef(raw: unknown): ParseOutcome<VariableRef> {
    if (typeof raw === 'string') return accept({ owner: 'level', name: raw });
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });
    if (!hasExactlyKeys(raw, ['target', 'name'])) return refuse({ reason: 'wrongType' });

    const target = parseTarget(raw['target']);
    if (!target.ok) return target;

    const name = raw['name'];
    if (typeof name !== 'string') return refuse({ reason: 'wrongType' });

    return accept({ owner: 'own', target: target.value, name });
}

function parseCondition(raw: unknown): ParseOutcome<Condition> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });
    if (!hasExactlyKeys(raw, ['compare', 'value'])) return refuse({ reason: 'wrongType' });

    const compare = parseChoice(raw['compare'], COMPARES);
    if (!compare.ok) return compare;

    const value = parseVariableValue(raw['value']);
    if (!value.ok) return value;

    return accept({ compare: compare.value, value: value.value });
}

function parseVariableValue(raw: unknown): ParseOutcome<VariableValue> {
    if (typeof raw === 'string' || typeof raw === 'boolean') return accept(raw);

    return parseFiniteNumber(raw);
}

function parseTarget(raw: unknown): ParseOutcome<Target> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

    const kind = raw['kind'];
    switch (kind) {
        case 'this':
        case 'other':
            return parseBareKind(raw, kind);
        case 'entity':
            return parseEntityTarget(raw);
        case 'tagged':
            return parseTaggedTarget(raw);
        default:
            return refuse({ reason: 'unknownChoice' });
    }
}

function parseEntityTarget(raw: RawRecord): ParseOutcome<Target> {
    if (!hasExactlyKeys(raw, ['kind', 'entity'])) return refuse({ reason: 'wrongType' });

    const entity = raw['entity'];
    if (entity === null) return accept({ kind: 'entity', entity: null });
    if (!isPositiveWholeNumber(entity)) return refuse({ reason: 'badEntityId' });

    return accept({ kind: 'entity', entity });
}

function parseTaggedTarget(raw: RawRecord): ParseOutcome<Target> {
    if (!hasExactlyKeys(raw, ['kind', 'tag'])) return refuse({ reason: 'wrongType' });

    const tag = parseNullableText(raw['tag']);
    if (!tag.ok) return tag;

    return accept({ kind: 'tagged', tag: tag.value });
}

// Saved before 2026-11-23's simpler triggers as three checks: "an entity has a tag" (`hasTag`), "a
// variable's value" (`compare`) and "a component value" (`compareValue`), now each the value check.
function parseCheck(raw: unknown): ParseOutcome<Check> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

    const kind = raw['kind'];
    if (kind === 'value') return parseValueCheck(raw);
    if (kind === 'hasTag') return parseHasTagCheck(raw);
    if (kind === 'compare') return parseCompareCheck(raw);
    if (kind === 'compareValue') return parseCompareValueCheck(raw);

    return refuse({ reason: 'unknownChoice' });
}

function parseValueCheck(raw: RawRecord): ParseOutcome<Check> {
    if (!hasExactlyKeys(raw, ['kind', 'target', 'value', 'compare', 'amount'])) {
        return refuse({ reason: 'wrongType' });
    }

    const target = parseTarget(raw['target']);
    if (!target.ok) return target;

    const value = parseNullable(raw['value'], parseCheckedValue);
    if (!value.ok) return value;

    const compare = parseChoice(raw['compare'], COMPARES);
    if (!compare.ok) return compare;

    const amount = parseNullable(raw['amount'], parseVariableValue);
    if (!amount.ok) return amount;

    return accept({
        kind: 'value',
        target: target.value,
        value: value.value,
        compare: compare.value,
        amount: amount.value,
    });
}

function parseCheckedValue(raw: unknown): ParseOutcome<CheckedValue> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

    const kind = raw['kind'];
    if (kind === 'variable') return parseVariableValueRef(raw);
    if (kind === 'tag') return parseBareKind(raw, kind);

    return parseReadableValue(raw);
}

// "other has the tag player" was its own check.
function parseHasTagCheck(raw: RawRecord): ParseOutcome<Check> {
    if (!hasExactlyKeys(raw, ['kind', 'target', 'tag'])) return refuse({ reason: 'wrongType' });

    const target = parseTarget(raw['target']);
    if (!target.ok) return target;

    const tag = parseNullableText(raw['tag']);
    if (!tag.ok) return tag;

    return accept({ kind: 'value', target: target.value, value: { kind: 'tag' }, compare: 'is', amount: tag.value });
}

// A variable compared named its owner in the variable: the level's is now read on the World whatever the
// target, so it keeps `this`; an own one's owner becomes the check's target.
function parseCompareCheck(raw: RawRecord): ParseOutcome<Check> {
    if (!hasExactlyKeys(raw, ['kind', 'variable', 'compare', 'value'])) return refuse({ reason: 'wrongType' });

    const variable = parseNullable(raw['variable'], parseVariableRef);
    if (!variable.ok) return variable;

    const compare = parseChoice(raw['compare'], COMPARES);
    if (!compare.ok) return compare;

    const amount = parseNullable(raw['value'], parseVariableValue);
    if (!amount.ok) return amount;

    const ref = variable.value;
    let target: Target = { kind: 'this' };
    let value: CheckedValue | null = null;
    if (ref?.owner === 'level') {
        value = { kind: 'variable', name: ref.name };
    } else if (ref?.owner === 'own') {
        target = ref.target;
        value = { kind: 'variable', name: ref.name, own: true };
    }

    return accept({ kind: 'value', target, value, compare: compare.value, amount: amount.value });
}

function parseCompareValueCheck(raw: RawRecord): ParseOutcome<Check> {
    if (!hasExactlyKeys(raw, ['kind', 'target', 'value', 'compare', 'amount'])) {
        return refuse({ reason: 'wrongType' });
    }

    const target = parseTarget(raw['target']);
    if (!target.ok) return target;

    const value = parseNullable(raw['value'], parseReadableValue);
    if (!value.ok) return value;

    const compare = parseChoice(raw['compare'], COMPARES);
    if (!compare.ok) return compare;

    const amount = parseNullable(raw['amount'], parseFiniteNumber);
    if (!amount.ok) return amount;

    return accept({
        kind: 'value',
        target: target.value,
        value: value.value,
        compare: compare.value,
        amount: amount.value,
    });
}

function parseReadableValue(raw: unknown): ParseOutcome<ReadableValue> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

    const kind = raw['kind'];
    if (kind === 'field') return parseFieldRef(raw);
    if (kind !== 'live') return refuse({ reason: 'unknownChoice' });
    if (!hasExactlyKeys(raw, ['kind', 'live'])) return refuse({ reason: 'wrongType' });

    const live = parseChoice(raw['live'], LIVE_VALUES);
    if (!live.ok) return live;

    return accept({ kind: 'live', live: live.value });
}

// Null for an action that is gone and has no replacement: it is dropped, keeping the trigger's other actions.
function parseAction(raw: unknown): ParseOutcome<Action | null> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

    const kind = raw['kind'];
    switch (kind) {
        case 'change':
            return parseChangeAction(raw);
        case 'destroy':
            return parseDestroyAction(raw);
        case 'push':
            return parsePushAction(raw);
        case 'win':
        case 'lose':
        case 'restart':
            return parseBareKind(raw, kind);
        case 'fire':
            return parseFireAction(raw);
        case 'wait':
            return parseWaitAction(raw);
        default:
            return refuse({ reason: 'unknownChoice' });
    }
}

function parseFireAction(raw: RawRecord): ParseOutcome<Action> {
    if (!hasExactlyKeys(raw, ['kind', 'target', 'name', 'amount'])) return refuse({ reason: 'wrongType' });

    const target = parseTarget(raw['target']);
    if (!target.ok) return target;

    const name = parseNullableText(raw['name']);
    if (!name.ok) return name;

    const amount = parseNullable(raw['amount'], parseFiniteNumber);
    if (!amount.ok) return amount;

    return accept({ kind: 'fire', target: target.value, name: name.value, amount: amount.value });
}

function parseWaitAction(raw: RawRecord): ParseOutcome<Action> {
    if (!hasExactlyKeys(raw, ['kind', 'seconds'])) return refuse({ reason: 'wrongType' });

    const seconds = parseNullable(raw['seconds'], parseFiniteNumber);
    if (!seconds.ok) return seconds;

    return accept({ kind: 'wait', seconds: seconds.value });
}

function parseChangeAction(raw: RawRecord): ParseOutcome<Action> {
    if (!hasExactlyKeys(raw, ['kind', 'target', 'value', 'op', 'amount'])) return refuse({ reason: 'wrongType' });

    const target = parseTarget(raw['target']);
    if (!target.ok) return target;

    const value = parseNullable(raw['value'], parseValueRef);
    if (!value.ok) return value;

    const op = parseChoice(raw['op'], CHANGE_OPS);
    if (!op.ok) return op;

    const amount = parseJsonValue(raw['amount'], 0);
    if (!amount.ok) return amount;

    return accept({ kind: 'change', target: target.value, value: value.value, op: op.value, amount: amount.value });
}

function parseDestroyAction(raw: RawRecord): ParseOutcome<Action> {
    if (!hasExactlyKeys(raw, ['kind', 'target'])) return refuse({ reason: 'wrongType' });

    const target = parseTarget(raw['target']);
    if (!target.ok) return target;

    return accept({ kind: 'destroy', target: target.value });
}

// Push, saved before 2026-11-23's simpler triggers, changed velocity whatever the mass, as adding to Body ›
// Velocity does. Its fixed kick becomes that change; away from or towards `this` has none, so it is dropped.
function parsePushAction(raw: RawRecord): ParseOutcome<Action | null> {
    if (!hasExactlyKeys(raw, ['kind', 'target', 'push'])) return refuse({ reason: 'wrongType' });

    const target = parseTarget(raw['target']);
    if (!target.ok) return target;

    const push = parseNullable(raw['push'], parsePush);
    if (!push.ok) return push;
    if (push.value === null) return accept(null);

    return accept({ kind: 'change', target: target.value, value: { kind: 'velocity' }, op: 'add', amount: push.value });
}

// The fixed kick as a vector; null for away from or towards `this`.
function parsePush(raw: unknown): ParseOutcome<{ readonly x: number; readonly y: number } | null> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

    const kind = raw['kind'];
    if (kind === 'by') {
        if (!hasExactlyKeys(raw, ['kind', 'x', 'y'])) return refuse({ reason: 'wrongType' });

        const x = parseFiniteNumber(raw['x']);
        if (!x.ok) return x;

        const y = parseFiniteNumber(raw['y']);
        if (!y.ok) return y;

        return accept({ x: x.value, y: y.value });
    }

    if (kind === 'away' || kind === 'towards') {
        if (!hasExactlyKeys(raw, ['kind', 'strength'])) return refuse({ reason: 'wrongType' });

        const strength = parseFiniteNumber(raw['strength']);
        if (!strength.ok) return strength;

        return accept(null);
    }

    return refuse({ reason: 'unknownChoice' });
}

function parseValueRef(raw: unknown): ParseOutcome<ValueRef> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

    const kind = raw['kind'];
    switch (kind) {
        case 'variable':
            return parseVariableValueRef(raw);
        case 'field':
            return parseFieldRef(raw);
        case 'tag':
            return parseBareKind(raw, kind);
        case 'triggerOn':
            return parseTriggerOnRef(raw);
        case 'velocity':
            return parseBareKind(raw, kind);
        default:
            return refuse({ reason: 'unknownChoice' });
    }
}

// The level's variable as v3 saved it, or the target's own with `"own": true`.
function parseVariableValueRef(raw: RawRecord): ParseOutcome<ValueRef & CheckedValue & { readonly kind: 'variable' }> {
    const isOwn = Object.hasOwn(raw, 'own');
    const keys = isOwn ? ['kind', 'name', 'own'] : ['kind', 'name'];
    if (!hasExactlyKeys(raw, keys)) return refuse({ reason: 'wrongType' });

    const name = raw['name'];
    if (typeof name !== 'string') return refuse({ reason: 'wrongType' });
    if (!isOwn) return accept({ kind: 'variable', name });
    if (raw['own'] !== true) return refuse({ reason: 'wrongType' });

    return accept({ kind: 'variable', name, own: true });
}

// A field by its key, and a vector's axis when it has one: in Change value, and in the value check.
function parseFieldRef(raw: RawRecord): ParseOutcome<ValueRef & ReadableValue & { readonly kind: 'field' }> {
    const hasAxis = Object.hasOwn(raw, 'axis');
    const keys = hasAxis ? ['kind', 'component', 'field', 'axis'] : ['kind', 'component', 'field'];
    if (!hasExactlyKeys(raw, keys)) return refuse({ reason: 'wrongType' });

    const component = raw['component'];
    const isComponentName = typeof component === 'string' && component.endsWith('Component');
    if (!isComponentName) return refuse({ reason: 'wrongType' });

    const field = raw['field'];
    if (typeof field !== 'string') return refuse({ reason: 'wrongType' });

    const componentName = component as `${string}Component`;
    if (!hasAxis) return accept({ kind: 'field', component: componentName, field });

    const axis = raw['axis'];
    if (axis !== 'x' && axis !== 'y') return refuse({ reason: 'unknownChoice' });

    return accept({ kind: 'field', component: componentName, field, axis });
}

function parseTriggerOnRef(raw: RawRecord): ParseOutcome<ValueRef> {
    if (!hasExactlyKeys(raw, ['kind', 'trigger'])) return refuse({ reason: 'wrongType' });

    const trigger = raw['trigger'];
    if (!isPositiveWholeNumber(trigger)) return refuse({ reason: 'wrongType' });

    return accept({ kind: 'triggerOn', trigger });
}

// Change value's amount: any JSON value, since it is the changed field's own value, which the field's type
// checks in play. Only its shape is checked here: finite numbers, plain objects, not too deep.
function parseJsonValue(raw: unknown, depth: number): ParseOutcome<JsonValue> {
    if (depth > MAX_AMOUNT_DEPTH) return refuse({ reason: 'wrongType' });
    if (raw === null || typeof raw === 'boolean' || typeof raw === 'string') return accept(raw);
    if (typeof raw === 'number') return parseFiniteNumber(raw);

    if (Array.isArray(raw)) {
        const items: JsonValue[] = [];
        for (const rawItem of raw) {
            const item = parseJsonValue(rawItem, depth + 1);
            if (!item.ok) return item;

            items.push(item.value);
        }

        return accept(items);
    }

    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

    const record: Record<string, JsonValue> = {};
    for (const [key, rawItem] of Object.entries(raw)) {
        const item = parseJsonValue(rawItem, depth + 1);
        if (!item.ok) return item;

        record[key] = item.value;
    }

    return accept(record);
}

function parseNullable<T>(raw: unknown, parse: (raw: unknown) => ParseOutcome<T>): ParseOutcome<T | null> {
    if (raw === null) return accept(null);

    return parse(raw);
}

function parseNullableText(raw: unknown): ParseOutcome<string | null> {
    if (raw === null || typeof raw === 'string') return accept(raw);

    return refuse({ reason: 'wrongType' });
}

function parseChoice<T extends string>(raw: unknown, choices: readonly T[]): ParseOutcome<T> {
    const choice = choices.find((candidate) => candidate === raw);
    if (choice === undefined) return refuse({ reason: 'unknownChoice' });

    return accept(choice);
}

function parseList<T>(raw: unknown, parseItem: (raw: unknown) => ParseOutcome<T>): ParseOutcome<T[]> {
    if (!Array.isArray(raw)) return refuse({ reason: 'wrongType' });

    const items: T[] = [];
    for (const rawItem of raw) {
        const item = parseItem(rawItem);
        if (!item.ok) return item;

        items.push(item.value);
    }

    return accept(items);
}
