import { VariablesComponent } from '../../components/index.ts';
import type { Check, Compare } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';

import type { PlayRun } from '../run/PlayRun.ts';
import type { TriggerFiring } from '../triggers/TriggerFiring.ts';

import { ownTagsOf, targetsOf } from './targetsOf.ts';

// Whether every check of the trigger is true for this firing. A tag check is true when one of its targets
// has the tag, on itself or on a group above it; with no target left (a missing entity, a tag nobody holds)
// it is false. A variable is the World's.
export function checksPass(checks: readonly Check[], firing: TriggerFiring, run: PlayRun) {
    return checks.every((check) => checkPasses(check, firing, run));
}

function checkPasses(check: Check, firing: TriggerFiring, run: PlayRun) {
    if (check.kind === 'hasTag') {
        const { tag } = check;
        if (tag === null) return false;

        return targetsOf(check.target, firing, run).some((entity) => isTaggedWith(entity, tag));
    }

    const { variable, value } = check;
    if (variable === null || value === null) return false;

    const variables = run.level.world.getComponent(VariablesComponent)?.get('variables') ?? [];
    const held = variables.find((candidate) => candidate.name === variable);
    if (held === undefined) return false;

    return compared(held.value, check.compare, value);
}

function isTaggedWith(entity: Entity, tag: string) {
    for (let current: Entity | undefined = entity; current !== undefined; current = current.parent) {
        if (ownTagsOf(current).includes(tag)) return true;
    }

    return false;
}

function compared(held: number, compare: Compare, value: number) {
    switch (compare) {
        case 'is':
            return held === value;
        case 'isNot':
            return held !== value;
        case 'more':
            return held > value;
        case 'less':
            return held < value;
        case 'atLeast':
            return held >= value;
        case 'atMost':
            return held <= value;
    }
}
