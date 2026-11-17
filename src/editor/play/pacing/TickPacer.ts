import type { Clock } from '../../time/index.ts';

// Ticks closer than this to a whole tick count as one, so a sum of frame times like 1000 / 60 can't lose a tick
// to rounding.
const TICK_TOLERANCE = 1e-6;

// Decides when the game's ticks run. The tick itself is always 1/60 s; pacing only decides how many are asked for
// on each frame. At most one batch is in flight, and a stall longer than the backlog is dropped, so a slow
// computer slows the game instead of racing to catch up.
export class TickPacer {
    static readonly ticksPerSecond = 60;
    static readonly maxBatch = 4;
    static readonly maxBacklogSeconds = 0.25;

    private readonly clock: Clock;
    private started = false;
    private paused = false;
    private batchInFlight = false;
    private stepsAsked = 0;
    // Time owed to the game, in ticks, up to lastCountedMs.
    private ticksOwed = 0;
    private lastCountedMs = 0;

    constructor(clock: Clock) {
        this.clock = clock;
    }

    get isPaused() {
        return this.paused;
    }

    // Starts counting time from now, with nothing owed.
    start() {
        this.started = true;
        this.paused = false;
        this.batchInFlight = false;
        this.stepsAsked = 0;
        this.ticksOwed = 0;
        this.lastCountedMs = this.clock.nowMs();
    }

    // How many ticks to send now: 0 while a batch is in flight, at most maxBatch.
    ticksDue() {
        if (!this.started || this.batchInFlight) return 0;

        if (this.paused) {
            return Math.min(this.stepsAsked, TickPacer.maxBatch);
        }

        this.countTimeUntilNow();
        const wholeTicksOwed = Math.floor(this.ticksOwed + TICK_TOLERANCE);

        return Math.min(wholeTicksOwed, TickPacer.maxBatch);
    }

    batchSent(count: number) {
        this.batchInFlight = true;

        if (this.paused) {
            this.stepsAsked = Math.max(0, this.stepsAsked - count);
            return;
        }

        this.ticksOwed = Math.max(0, this.ticksOwed - count);
    }

    reportReceived() {
        this.batchInFlight = false;
    }

    // Time while paused is never owed, so resuming after a minute adds no ticks.
    pause() {
        if (!this.started || this.paused) return;

        this.countTimeUntilNow();
        this.paused = true;
    }

    resume() {
        if (!this.started || !this.paused) return;

        this.paused = false;
        this.stepsAsked = 0;
        this.lastCountedMs = this.clock.nowMs();
    }

    // Asks for exactly one more tick while paused. Ignored while running.
    stepOnce() {
        if (!this.started || !this.paused) return;

        this.stepsAsked += 1;
    }

    // 0 to 1: how far between the last two ticks to draw. While paused it stays where it was, so a frozen frame
    // doesn't jump, and each Step moves the drawing by exactly one tick.
    get interpolation() {
        if (!this.started) return 0;

        let ticksOwed = this.ticksOwed;

        if (!this.paused) {
            const elapsedMs = this.clock.nowMs() - this.lastCountedMs;
            ticksOwed += ticksIn(elapsedMs);
        }

        // A whole tick owed is a tick not run yet, so the drawing waits at the latest one.
        const tickNotRunYet = ticksOwed >= 1 - TICK_TOLERANCE;
        if (tickNotRunYet) return 1;

        return ticksOwed;
    }

    private countTimeUntilNow() {
        const nowMs = this.clock.nowMs();
        const elapsedMs = nowMs - this.lastCountedMs;
        const maxBacklogTicks = TickPacer.maxBacklogSeconds * TickPacer.ticksPerSecond;

        this.ticksOwed = Math.min(this.ticksOwed + ticksIn(elapsedMs), maxBacklogTicks);
        this.lastCountedMs = nowMs;
    }
}

function ticksIn(elapsedMs: number) {
    return (elapsedMs * TickPacer.ticksPerSecond) / 1000;
}
