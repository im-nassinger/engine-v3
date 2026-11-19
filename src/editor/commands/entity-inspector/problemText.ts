import type { ParseProblem } from '../../../core/fields/index.ts';

// The message pill's sentence for a value a field refused, such as "Points needs at least 3".
export function problemText(label: string, problem: ParseProblem) {
    switch (problem.reason) {
        case 'wrongType':
            return `${label} can't hold that value`;
        case 'notFinite':
            return 'Not a number';
        case 'zero':
            return `${label} can't be 0`;
        case 'tooShort':
            return `${label} needs at least ${problem.minLength} characters`;
        case 'outsideLimits':
            return `${label} must be between ${problem.min} and ${problem.max}`;
        case 'unknownChoice':
            return `${label} has no such choice`;
        case 'badColour':
            return 'Not a colour';
        case 'badEntityId':
            return 'Not an entity in this level';
        case 'tooFewPoints':
            return `A polygon needs at least ${problem.minCount} points`;
        case 'tooFewItems':
            return `${label} needs at least ${problem.minCount}`;
        case 'tooManyItems':
            return `${label} holds at most ${problem.maxCount}`;
        case 'flatShape':
            return `Its points are in one line, so ${label} can't spread them`;
    }
}
