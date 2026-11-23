import type { PlayWarning } from '../../../core/simulation/index.ts';

// What the message pill says for a play warning, until the Console comes in v5.
export function playWarningText(warning: PlayWarning) {
    switch (warning.kind) {
        case 'chainLimit':
            return 'Triggers set each other off more than 32 times in one tick, so the rest were dropped';
        case 'valueFixedInPlay':
            return "A trigger tried to change a value that can't change during play, so it was skipped";
        case 'unknownInput':
            return `A trigger listens for the input "${warning.input}", which the World doesn't have`;
        case 'restartIgnored':
            return 'A trigger tried to restart the level in its first second, so it was ignored';
        case 'tooManyWaitingRuns':
            return 'A trigger was already waiting 32 times, so another firing was dropped';
    }
}
