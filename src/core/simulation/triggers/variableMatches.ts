import type { Compare, VariableValue } from '../../fields/index.ts';

// Whether a variable's value compares as asked with a value: a number with any comparison, a string or a
// boolean only with is and is not. Values of two types never match, not even with is not, so a check
// triggerProblems would mark wrongType is false in play too.
export function variableMatches(held: VariableValue, compare: Compare, value: VariableValue) {
    if (typeof held !== typeof value) return false;
    if (typeof held !== 'number' || typeof value !== 'number') return sameOrNot(held === value, compare);

    switch (compare) {
        case 'is':
        case 'isNot':
            return sameOrNot(held === value, compare);
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

function sameOrNot(same: boolean, compare: Compare) {
    if (compare === 'is') return same;
    if (compare === 'isNot') return !same;

    return false;
}
