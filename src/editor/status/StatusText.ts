import { VersionCounter } from '../../core/events/index.ts';
import type { Cancel, Timer } from '../time/index.ts';

// What the message pill shows: the last short result, cleared after 4 seconds.
export class StatusText {
    static readonly showMs = 4_000;

    readonly version = new VersionCounter();
    private readonly timer: Timer;
    private text: string | undefined;
    private cancelClear: Cancel | undefined;

    constructor(timer: Timer) {
        this.timer = timer;
    }

    get current() {
        return this.text;
    }

    // Replaces what is there, and the 4 seconds start again.
    show(text: string) {
        this.cancelClear?.();
        this.text = text;
        this.cancelClear = this.timer.after(StatusText.showMs, () => this.clear());
        this.version.increment();
    }

    private clear() {
        this.cancelClear = undefined;
        this.text = undefined;
        this.version.increment();
    }
}
