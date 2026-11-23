import { VariablesComponent } from '../../components/index.ts';
import type { Check } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';

import type { PlayRun } from '../run/PlayRun.ts';
import type { TriggerFiring } from '../triggers/TriggerFiring.ts';
import { variableMatches } from '../triggers/variableMatches.ts';

import { readableValueOf } from './readableValueOf.ts';
import { ownTagsOf, targetsOf } from './targetsOf.ts';

// Whether every check of the trigger is true for this firing. A tag check is true when one of its targets
// has the tag, on itself or on a group above it; with no target left (a missing entity, a tag nobody holds)
// it is false. A variable compare reads the level's variable, on the World, or the target's own; with a tag
// as the target, it is true when one tagged entity's passes, and a target without the variable is false.
// The component value check reads the same way: a number, a vector's axis, or a body's live speed or
// velocity, compared with its amount, true when one target passes and false for a target without it.
export function checksPass(checks: readonly Check[], firing: TriggerFiring, run: PlayRun) {
    return checks.every((check) => checkPasses(check, firing, run));
}

function checkPasses(check: Check, firing: TriggerFiring, run: PlayRun) {
    if (check.kind === 'hasTag') {
        const { tag } = check;
        if (tag === null) return false;

        return targetsOf(check.target, firing, run).some((entity) => isTaggedWith(entity, tag));
    }

    if (check.kind === 'compareValue') {
        const { value, compare, amount } = check;
        if (value === null || amount === null) return false;

        return targetsOf(check.target, firing, run).some((entity) => {
            const held = readableValueOf(entity, value, run);

            return held !== undefined && variableMatches(held, compare, amount);
        });
    }

    const { variable, value, compare } = check;
    if (variable === null || value === null) return false;

    const holders = variable.owner === 'level' ? [run.level.world] : targetsOf(variable.target, firing, run);

    return holders.some((holder) => {
        const held = variableOf(holder, variable.name);

        return held !== undefined && variableMatches(held, compare, value);
    });
}

function variableOf(holder: Entity, name: string) {
    const variables = holder.getComponent(VariablesComponent)?.get('variables') ?? [];

    return variables.find((candidate) => candidate.name === name)?.value;
}

function isTaggedWith(entity: Entity, tag: string) {
    for (let current: Entity | undefined = entity; current !== undefined; current = current.parent) {
        if (ownTagsOf(current).includes(tag)) return true;
    }

    return false;
}
