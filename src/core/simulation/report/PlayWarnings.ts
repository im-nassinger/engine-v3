// What went wrong in play without stopping the run. Reasons, never sentences: the page writes what the
// user reads. chainLimit: triggers setting off triggers went past 32 rounds in one tick, and the rest were
// dropped. valueFixedInPlay: Change value asked for a value physics owns that a running world can't change
// yet, such as a body's Type, so it was skipped.
export type PlayWarning = 'chainLimit' | 'valueFixedInPlay';

// The run's warnings, each kept once per run, in the order they first came.
export class PlayWarnings {
    private readonly given: PlayWarning[] = [];

    get all(): readonly PlayWarning[] {
        return this.given;
    }

    warn(warning: PlayWarning) {
        if (this.given.includes(warning)) return;

        this.given.push(warning);
    }
}
