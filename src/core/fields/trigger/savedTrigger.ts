import type { JsonValue } from '../JsonValue.ts';

import { copyTrigger } from './copyTrigger.ts';
import type { Check, Trigger, VariableRef, When } from './Trigger.ts';

// The trigger as level.json holds it: the same shape as its type, but for a variable, saved as v3 saved it:
// the level's as its name, an entity's own as `{ "target": ..., "name": ... }`. So a v3 level saves byte for
// byte the same. Its one optional key, a value's axis, is left out when unset.
export function savedTrigger(trigger: Trigger): JsonValue {
    const copy = copyTrigger(trigger);

    return {
        ...copy,
        when: savedWhen(copy.when),
        checks: copy.checks.map(savedCheck),
    };
}

function savedWhen(when: When | null) {
    if (when?.kind !== 'variableChanged') return when;

    return { kind: when.kind, variable: savedVariable(when.variable), becomes: when.becomes };
}

function savedCheck(check: Check) {
    if (check.kind !== 'compare') return check;

    return { kind: check.kind, variable: savedVariable(check.variable), compare: check.compare, value: check.value };
}

function savedVariable(variable: VariableRef | null) {
    if (variable === null) return null;
    if (variable.owner === 'level') return variable.name;

    return { target: variable.target, name: variable.name };
}
