// How a run ends: won or lost on a tick, or asked to start again.
export type RunEndKind = 'won' | 'lost' | 'restart';

export type RunEnd = { readonly kind: 'won' | 'lost'; readonly tick: number } | { readonly kind: 'restart' };

// The run's end once a Win, Lose or Restart action ran. The first one recorded wins; the rest of its tick
// still runs.
export class RunEnding {
    private recorded: RunEnd | null = null;

    get end() {
        return this.recorded;
    }

    record(kind: RunEndKind, tick: number) {
        if (this.recorded !== null) return;

        this.recorded = kind === 'restart' ? { kind } : { kind, tick };
    }
}
