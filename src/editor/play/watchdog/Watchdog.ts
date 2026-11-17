import type { Clock } from '../../time/index.ts';

// What the watchdog says about the game: `fine` while nothing is unanswered or the answer is still in time,
// `notResponding` once the notice should show, `hung` once the run should end.
export type WatchdogVerdict = 'fine' | 'notResponding' | 'hung';

// Notices a game that stopped answering. It waits only while a request is unanswered, so a paused run, which asks
// for nothing, can't look hung. It is checked once a frame, and a gap between frames longer than a second means the
// tab was hidden or the computer asleep, so the wait starts again instead of counting that time.
export class Watchdog {
    static readonly noticeAfterMs = 2_000;
    static readonly endAfterMs = 5_000;
    static readonly sleepingFrameGapMs = 1_000;

    private readonly clock: Clock;
    private waitStartedMs: number | undefined;
    private lastFrameMs: number | undefined;

    constructor(clock: Clock) {
        this.clock = clock;
    }

    requestSent() {
        const nowMs = this.clock.nowMs();

        this.waitStartedMs = nowMs;
        this.lastFrameMs = nowMs;
    }

    answerReceived() {
        this.waitStartedMs = undefined;
    }

    // Forgets the request waited for, as when the run ends.
    reset() {
        this.waitStartedMs = undefined;
        this.lastFrameMs = undefined;
    }

    // Called once a frame.
    check(): WatchdogVerdict {
        const nowMs = this.clock.nowMs();
        const pageSlept = this.lastFrameMs !== undefined && nowMs - this.lastFrameMs > Watchdog.sleepingFrameGapMs;
        this.lastFrameMs = nowMs;

        if (this.waitStartedMs === undefined) return 'fine';

        if (pageSlept) {
            this.waitStartedMs = nowMs;
            return 'fine';
        }

        const waitedMs = nowMs - this.waitStartedMs;
        if (waitedMs >= Watchdog.endAfterMs) return 'hung';
        if (waitedMs >= Watchdog.noticeAfterMs) return 'notResponding';

        return 'fine';
    }
}
