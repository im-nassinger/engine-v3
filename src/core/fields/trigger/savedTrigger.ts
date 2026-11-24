import type { JsonValue } from '../JsonValue.ts';

import { copyTrigger } from './copyTrigger.ts';
import type { Trigger, VariableRef, When } from './Trigger.ts';

// The trigger as level.json holds it: the same shape as its type, but for a "variable changes" When's
// variable, saved as v3 saved it: the level's as its name, an entity's own as `{ "target": ..., "name": ... }`.
// Its optional keys, a value's axis and a variable's `own`, are left out when unset.
export function savedTrigger(trigger: Trigger): JsonValue {
    const copy = copyTrigger(trigger);

    return {
        ...copy,
        when: savedWhen(copy.when),
    };
}

function savedWhen(when: When | null) {
    if (when?.kind !== 'variableChanged') return when;

    return { kind: when.kind, variable: savedVariable(when.variable), becomes: when.becomes };
}

function savedVariable(variable: VariableRef | null) {
    if (variable === null) return null;
    if (variable.owner === 'level') return variable.name;

    return { target: variable.target, name: variable.name };
}
