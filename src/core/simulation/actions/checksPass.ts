import type { Check, CheckedValue, VariableValue } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';

import type { PlayRun } from '../run/PlayRun.ts';
import type { TriggerFiring } from '../triggers/TriggerFiring.ts';
import { variableMatches } from '../triggers/variableMatches.ts';

import { amountNow, isOwnAmount, variableOf } from './amountNow.ts';
import { readableValueOf } from './readableValueOf.ts';
import { ownTagsOf, targetsOf } from './targetsOf.ts';

// Whether every check of the trigger is true for this firing. A check reads its value on each of its
// targets and is true when one of them passes; with no target left (a missing entity, a tag nobody holds) it
// is false, and so is a target without the value. The level's variable is read on the World whatever the
// target. A tag is held when the target or a group above it has it: "has the tag" passes then, "doesn't
// have the tag" when it isn't. A number is a field, a vector's axis, or a body's live speed or velocity.
// A variable as the amount (fix 10) is read now: the level's on the World, an own one on each target, so a
// level's variable compared with an own amount is read on the targets too.
export function checksPass(checks: readonly Check[], firing: TriggerFiring, run: PlayRun) {
    return checks.every((check) => checkPasses(check, firing, run));
}

function checkPasses(check: Check, firing: TriggerFiring, run: PlayRun) {
    const { value, compare, amount } = check;
    if (value === null || amount === null) return false;

    const isLevelVariable = value.kind === 'variable' && value.own !== true;
    const readsOnWorld = isLevelVariable && !isOwnAmount(amount);
    const holders = readsOnWorld ? [run.level.world] : targetsOf(check.target, firing, run);

    return holders.some((holder) => {
        const amountHere = amountNow(amount, holder, run);
        if (amountHere === undefined) return false;

        const valueHolder = isLevelVariable ? run.level.world : holder;
        const held = heldValueOf(valueHolder, value, amountHere, run);

        return held !== undefined && variableMatches(held, compare, amountHere);
    });
}

// What the entity holds for the value, as the amount is compared with it; undefined when it doesn't have it.
// A tag held reads as the tag itself, so "is" passes and "isNot" doesn't.
function heldValueOf(holder: Entity, value: CheckedValue, amount: VariableValue, run: PlayRun) {
    switch (value.kind) {
        case 'variable':
            return variableOf(holder, value.name);
        case 'tag':
            if (typeof amount !== 'string') return undefined;

            return isTaggedWith(holder, amount) ? amount : '';
        default:
            return readableValueOf(holder, value, run);
    }
}

function isTaggedWith(entity: Entity, tag: string) {
    for (let current: Entity | undefined = entity; current !== undefined; current = current.parent) {
        if (ownTagsOf(current).includes(tag)) return true;
    }

    return false;
}
