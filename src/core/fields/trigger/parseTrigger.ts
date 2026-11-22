import { KeyCodes } from '../../keys/index.ts';

import type { JsonValue } from '../JsonValue.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, hasExactlyKeys, isPlainObject, parseFiniteNumber, refuse } from '../rawChecks.ts';

import type {
    Action,
    ChangeOp,
    Check,
    Compare,
    Press,
    Push,
    Repeat,
    Target,
    Trigger,
    ValueRef,
    When,
} from './Trigger.ts';

type RawRecord = Readonly<Record<string, unknown>>;

const PRESSES: readonly Press[] = ['pressed', 'released', 'held'];
const COMPARES: readonly Compare[] = ['is', 'isNot', 'more', 'less', 'atLeast', 'atMost'];
const CHANGE_OPS: readonly ChangeOp[] = ['set', 'add', 'subtract'];
// An amount is a value of a field, such as a fill: a few levels deep at most. Deeper is damaged data.
const MAX_AMOUNT_DEPTH = 8;

// A trigger from untrusted data: a file, the clipboard. Checks the shape only; normalizeTrigger cleans it.
export function parseTrigger(raw: unknown): ParseOutcome<Trigger> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });
    if (!hasExactlyKeys(raw, ['id', 'name', 'on', 'when', 'checks', 'actions', 'repeat'])) {
        return refuse({ reason: 'wrongType' });
    }

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

    const repeat = parseRepeat(raw['repeat']);
    if (!repeat.ok) return repeat;

    return accept({
        id,
        name,
        on,
        when: when.value,
        checks: checks.value,
        actions: actions.value,
        repeat: repeat.value,
    });
}

export function isPositiveWholeNumber(raw: unknown): raw is number {
    return typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 1;
}

function parseWhen(raw: unknown): ParseOutcome<When> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

    const kind = raw['kind'];
    switch (kind) {
        case 'touched':
        case 'untouched':
        case 'levelStart':
            return parseBareKind(raw, kind);
        case 'input':
            return parseInputWhen(raw);
        case 'key':
            return parseKeyWhen(raw);
        case 'after':
        case 'every':
            return parseTimerWhen(raw, kind);
        case 'tagLeft':
            return parseTagLeftWhen(raw);
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

function parseTagLeftWhen(raw: RawRecord): ParseOutcome<When> {
    if (!hasExactlyKeys(raw, ['kind', 'tag'])) return refuse({ reason: 'wrongType' });

    const tag = parseNullableText(raw['tag']);
    if (!tag.ok) return tag;

    return accept({ kind: 'tagLeft', tag: tag.value });
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

function parseCheck(raw: unknown): ParseOutcome<Check> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

    const kind = raw['kind'];
    if (kind === 'hasTag') return parseHasTagCheck(raw);
    if (kind === 'compare') return parseCompareCheck(raw);

    return refuse({ reason: 'unknownChoice' });
}

function parseHasTagCheck(raw: RawRecord): ParseOutcome<Check> {
    if (!hasExactlyKeys(raw, ['kind', 'target', 'tag'])) return refuse({ reason: 'wrongType' });

    const target = parseTarget(raw['target']);
    if (!target.ok) return target;

    const tag = parseNullableText(raw['tag']);
    if (!tag.ok) return tag;

    return accept({ kind: 'hasTag', target: target.value, tag: tag.value });
}

function parseCompareCheck(raw: RawRecord): ParseOutcome<Check> {
    if (!hasExactlyKeys(raw, ['kind', 'variable', 'compare', 'value'])) return refuse({ reason: 'wrongType' });

    const variable = parseNullableText(raw['variable']);
    if (!variable.ok) return variable;

    const compare = parseChoice(raw['compare'], COMPARES);
    if (!compare.ok) return compare;

    const value = parseNullable(raw['value'], parseFiniteNumber);
    if (!value.ok) return value;

    return accept({ kind: 'compare', variable: variable.value, compare: compare.value, value: value.value });
}

function parseAction(raw: unknown): ParseOutcome<Action> {
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
        default:
            return refuse({ reason: 'unknownChoice' });
    }
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

function parsePushAction(raw: RawRecord): ParseOutcome<Action> {
    if (!hasExactlyKeys(raw, ['kind', 'target', 'push'])) return refuse({ reason: 'wrongType' });

    const target = parseTarget(raw['target']);
    if (!target.ok) return target;

    const push = parseNullable(raw['push'], parsePush);
    if (!push.ok) return push;

    return accept({ kind: 'push', target: target.value, push: push.value });
}

function parsePush(raw: unknown): ParseOutcome<Push> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

    const kind = raw['kind'];
    if (kind === 'by') {
        if (!hasExactlyKeys(raw, ['kind', 'x', 'y'])) return refuse({ reason: 'wrongType' });

        const x = parseFiniteNumber(raw['x']);
        if (!x.ok) return x;

        const y = parseFiniteNumber(raw['y']);
        if (!y.ok) return y;

        return accept({ kind, x: x.value, y: y.value });
    }

    if (kind === 'away' || kind === 'towards') {
        if (!hasExactlyKeys(raw, ['kind', 'strength'])) return refuse({ reason: 'wrongType' });

        const strength = parseFiniteNumber(raw['strength']);
        if (!strength.ok) return strength;

        return accept({ kind, strength: strength.value });
    }

    return refuse({ reason: 'unknownChoice' });
}

function parseValueRef(raw: unknown): ParseOutcome<ValueRef> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

    const kind = raw['kind'];
    switch (kind) {
        case 'variable':
            return parseVariableRef(raw);
        case 'field':
            return parseFieldRef(raw);
        case 'tag':
            return parseBareKind(raw, kind);
        case 'triggerOn':
            return parseTriggerOnRef(raw);
        default:
            return refuse({ reason: 'unknownChoice' });
    }
}

function parseVariableRef(raw: RawRecord): ParseOutcome<ValueRef> {
    if (!hasExactlyKeys(raw, ['kind', 'name'])) return refuse({ reason: 'wrongType' });

    const name = raw['name'];
    if (typeof name !== 'string') return refuse({ reason: 'wrongType' });

    return accept({ kind: 'variable', name });
}

function parseFieldRef(raw: RawRecord): ParseOutcome<ValueRef> {
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

function parseRepeat(raw: unknown): ParseOutcome<Repeat> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

    const kind = raw['kind'];
    if (kind === 'everyTime' || kind === 'oncePerRun') return parseBareKind(raw, kind);
    if (kind !== 'atMostEvery') return refuse({ reason: 'unknownChoice' });
    if (!hasExactlyKeys(raw, ['kind', 'seconds'])) return refuse({ reason: 'wrongType' });

    const seconds = parseFiniteNumber(raw['seconds']);
    if (!seconds.ok) return seconds;

    return accept({ kind, seconds: seconds.value });
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
