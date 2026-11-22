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
    // Ticks sent and not reported yet: the drawing can't go past the last report until they come back.
    private ticksInFlight = 0;
    // Ticks in the last report: the mirror draws between that report's start and end.
    private lastBatch = 1;
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
        this.ticksInFlight = 0;
        this.lastBatch = 1;
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
        this.ticksInFlight = count;

        if (this.paused) {
            this.stepsAsked = Math.max(0, this.stepsAsked - count);
            return;
        }

        this.ticksOwed = Math.max(0, this.ticksOwed - count);
    }

    reportReceived() {
        this.batchInFlight = false;
        if (this.ticksInFlight > 0) {
            this.lastBatch = this.ticksInFlight;
        }
        this.ticksInFlight = 0;
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

    // 0 to 1: how far from the second last report to the last one to draw, which is the last report's tick
    // less the part of a tick not owed yet. Ticks in flight count as owed, so sending a batch never moves
    // the drawing back: until its report comes, the drawing waits at the last one. While paused it stays
    // where it was, so a frozen frame doesn't jump, and each Step moves the drawing by exactly one tick.
    get interpolation() {
        if (!this.started) return 0;

        let ticksOwed = this.ticksOwed + this.ticksInFlight;

        if (!this.paused) {
            const elapsedMs = this.clock.nowMs() - this.lastCountedMs;
            ticksOwed += ticksIn(elapsedMs);
        }

        // A whole tick owed is a tick not reported yet, so the drawing waits at the latest one.
        const tickNotReportedYet = ticksOwed >= 1 - TICK_TOLERANCE;
        if (tickNotReportedYet) return 1;

        // A report of several ticks moves each body across all of them, so the part of the last tick owed
        // is the same part of only the last tick of that move.
        return (this.lastBatch - 1 + ticksOwed) / this.lastBatch;
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
