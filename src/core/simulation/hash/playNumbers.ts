import { VariablesComponent } from '../../components/index.ts';
import type { VariableValue } from '../../fields/index.ts';
import type { Entity, Level } from '../../level/index.ts';

import type { WaitingRun } from '../triggers/WaitingRuns.ts';

// The type marks a value is hashed with, so `true`, `1` and "1" never hash alike.
const NUMBER_MARK = 1;
const STRING_MARK = 2;
const BOOLEAN_MARK = 3;

// The numbers stateHash folds in after the camera: the World's variables, then each other entity's with a
// VariablesComponent in Entities viewer order, then the waiting runs. A World number is the number alone,
// as v3 hashed it, so a level with only World numbers and nothing waiting hashes as it did in v3; every
// other value carries its type mark.
export function playNumbers(level: Level, waiting: readonly WaitingRun[]): number[] {
    const numbers: number[] = [];

    for (const variable of variablesOf(level.world)) {
        const world = typeof variable === 'number' ? [variable] : markedValue(variable);
        numbers.push(...world);
    }

    for (const entity of level.entitiesInPanelOrder()) {
        if (entity === level.world || !entity.hasComponent(VariablesComponent)) continue;

        const values = variablesOf(entity);
        numbers.push(entity.id, values.length);
        for (const value of values) {
            numbers.push(...markedValue(value));
        }
    }

    if (waiting.length > 0) {
        numbers.push(waiting.length);
        for (const run of waiting) {
            numbers.push(run.dueTick, run.nextAction);
        }
    }

    return numbers;
}

function variablesOf(entity: Entity): VariableValue[] {
    const variables = entity.getComponent(VariablesComponent)?.get('variables') ?? [];

    return variables.map((variable) => variable.value);
}

// A string as its length and its UTF-16 code units, so "ab" then "c" differs from "a" then "bc".
function markedValue(value: VariableValue): number[] {
    if (typeof value === 'number') return [NUMBER_MARK, value];
    if (typeof value === 'boolean') return [BOOLEAN_MARK, value ? 1 : 0];

    const units = Array.from({ length: value.length }, (_, i) => value.charCodeAt(i));

    return [STRING_MARK, value.length, ...units];
}
