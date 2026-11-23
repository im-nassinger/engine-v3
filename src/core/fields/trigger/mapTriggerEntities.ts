import type { EntityLinkMapper } from '../FieldType.ts';
import { isPlainObject } from '../rawChecks.ts';

import { isPositiveWholeNumber } from './parseTrigger.ts';

type RawRecord = Readonly<Record<string, unknown>>;

// A saved trigger with each entity it names given linkTo's id: the target `{ "kind": "entity", "entity": 12 }`
// of its checks and actions (a Fire custom event and the component value check included), the target of an
// own variable a check compares, and a Change value's amount `{ "entity": 12 }`, such as the camera's Follow
// set to an entity. A When's own variable is always `this`'s, so it names no entity. The data is untrusted:
// anything else is copied as it is, for parse to refuse.
export function mapTriggerEntities(raw: unknown, linkTo: EntityLinkMapper): unknown {
    if (!isPlainObject(raw)) return raw;

    const copy: Record<string, unknown> = { ...raw };
    copy['checks'] = mapParts(raw['checks'], linkTo);
    copy['actions'] = mapParts(raw['actions'], linkTo);

    return copy;
}

function mapParts(raw: unknown, linkTo: EntityLinkMapper) {
    if (!Array.isArray(raw)) return raw;

    return raw.map((part: unknown) => mapPart(part, linkTo));
}

function mapPart(raw: unknown, linkTo: EntityLinkMapper) {
    if (!isPlainObject(raw)) return raw;

    const copy: Record<string, unknown> = { ...raw };
    if (Object.hasOwn(raw, 'target')) {
        copy['target'] = mapTarget(raw['target'], linkTo);
    }
    if (Object.hasOwn(raw, 'amount')) {
        copy['amount'] = mapAmount(raw['amount'], linkTo);
    }
    if (Object.hasOwn(raw, 'variable')) {
        copy['variable'] = mapVariable(raw['variable'], linkTo);
    }

    return copy;
}

// An own variable, saved as `{ "target": ..., "name": ... }`; the level's is a name and names no entity.
function mapVariable(raw: unknown, linkTo: EntityLinkMapper) {
    if (!isPlainObject(raw) || !Object.hasOwn(raw, 'target')) return raw;

    return { ...raw, target: mapTarget(raw['target'], linkTo) };
}

// An amount saved the way an entity field is: `{ "entity": 12 }` and nothing else.
function mapAmount(raw: unknown, linkTo: EntityLinkMapper) {
    if (!isPlainObject(raw) || Object.keys(raw).length !== 1) return raw;

    const entity = raw['entity'];
    if (!isPositiveWholeNumber(entity)) return raw;

    return { entity: linkTo(entity) };
}

function mapTarget(raw: unknown, linkTo: EntityLinkMapper) {
    if (!isEntityTarget(raw)) return raw;

    const entity = raw['entity'];
    if (!isPositiveWholeNumber(entity)) return raw;

    return { kind: 'entity', entity: linkTo(entity) };
}

function isEntityTarget(raw: unknown): raw is RawRecord {
    return isPlainObject(raw) && raw['kind'] === 'entity';
}
