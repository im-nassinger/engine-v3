import { VariablesComponent } from '../../components/index.ts';
import { isVariableAmount } from '../../fields/index.ts';
import type { VariableAmount, VariableValue } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';

import type { PlayRun } from '../run/PlayRun.ts';

// What a value box holds as its block runs: a typed value as it is, or a variable's value at this moment,
// the level's read on the World, an own one on `holder` (the block's target, or `this` for a Wait).
// Undefined when the variable isn't there; the caller skips that target.
export function amountNow<Typed>(
    amount: Typed | VariableAmount,
    holder: Entity,
    run: PlayRun,
): Typed | VariableValue | undefined {
    if (!isVariableAmount(amount)) return amount;

    const owner = amount.own === true ? holder : run.level.world;

    return variableOf(owner, amount.name);
}

// Whether the value box's variable is read on each target, rather than once on the World.
export function isOwnAmount(amount: unknown) {
    return isVariableAmount(amount) && amount.own === true;
}

export function variableOf(holder: Entity, name: string) {
    const variables = holder.getComponent(VariablesComponent)?.get('variables') ?? [];

    return variables.find((candidate) => candidate.name === name)?.value;
}
