// What went wrong in play without stopping the run. Reasons, never sentences: the page writes what the
// user reads. chainLimit: triggers setting off triggers went past 32 rounds in one tick, and the rest were
// dropped. valueFixedInPlay: Change value asked for a value physics owns that a running world can't change
// yet, such as a body's Type, so it was skipped. unknownInput: a trigger listens for an input the World
// doesn't have, which reads as never held. restartIgnored: a Restart action ran in the run's first second,
// which guards against a restart loop. tooManyWaitingRuns: a trigger already held 32 runs stopped at a
// Wait, so another firing was dropped.
export type PlayWarning =
    | { readonly kind: 'chainLimit' }
    | { readonly kind: 'valueFixedInPlay' }
    | { readonly kind: 'unknownInput'; readonly input: string }
    | { readonly kind: 'restartIgnored' }
    | { readonly kind: 'tooManyWaitingRuns' };

// The run's warnings, each kept once per run, in the order they first came.
export class PlayWarnings {
    private readonly given: PlayWarning[] = [];
    private reported = 0;

    get all(): readonly PlayWarning[] {
        return this.given;
    }

    warn(warning: PlayWarning) {
        const alreadyGiven = this.given.some((given) => sameWarning(given, warning));
        if (alreadyGiven) return;

        this.given.push(warning);
    }

    // The warnings given since the last call, for the next report.
    takeNew(): readonly PlayWarning[] {
        const fresh = this.given.slice(this.reported);
        this.reported = this.given.length;

        return fresh;
    }
}

function sameWarning(first: PlayWarning, second: PlayWarning) {
    if (first.kind === 'unknownInput' && second.kind === 'unknownInput') return first.input === second.input;

    return first.kind === second.kind;
}
