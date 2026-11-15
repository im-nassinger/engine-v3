import type { Clock } from '../Clock.ts';

// A Clock for tests: time moves only when the test moves it.
export class ManualClock implements Clock {
    private currentMs: number;

    constructor(startMs = 0) {
        this.currentMs = startMs;
    }

    nowMs() {
        return this.currentMs;
    }

    advance(ms: number) {
        if (ms < 0) throw new Error(`A ManualClock can't go back in time (${ms} ms)`);

        this.currentMs += ms;
    }
}
