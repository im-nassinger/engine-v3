import type { Cancel } from '../FrameScheduler.ts';
import type { Timer } from '../Timer.ts';

import { ManualClock } from './ManualClock.ts';

type Waiting = {
    readonly dueMs: number;
    readonly order: number;
    readonly callback: () => void;
};

// A Timer for tests: callbacks run only when the test calls advance. It moves its clock, which a test
// can share with the code under test, so a Clock and a Timer read the same fake time.
export class ManualTimer implements Timer {
    readonly clock: ManualClock;
    private waiting: Waiting[] = [];
    private nextOrder = 0;

    constructor(clock = new ManualClock()) {
        this.clock = clock;
    }

    get pendingCount() {
        return this.waiting.length;
    }

    after(delayMs: number, callback: () => void): Cancel {
        const waiting = { dueMs: this.clock.nowMs() + delayMs, order: this.nextOrder, callback };
        this.nextOrder += 1;
        this.waiting.push(waiting);

        return () => {
            this.waiting = this.waiting.filter((other) => other !== waiting);
        };
    }

    // Moves time forward, running each callback that falls due at its own time, earliest first.
    // A callback asked for while advancing runs too if it falls due before the end.
    advance(ms: number) {
        const endMs = this.clock.nowMs() + ms;

        for (let due = this.nextDue(endMs); due !== undefined; due = this.nextDue(endMs)) {
            this.waiting = this.waiting.filter((other) => other !== due);
            this.clock.advance(due.dueMs - this.clock.nowMs());
            due.callback();
        }

        this.clock.advance(endMs - this.clock.nowMs());
    }

    private nextDue(endMs: number) {
        let earliest: Waiting | undefined;

        for (const waiting of this.waiting) {
            if (waiting.dueMs > endMs) continue;
            if (earliest !== undefined && !isEarlier(waiting, earliest)) continue;

            earliest = waiting;
        }

        return earliest;
    }
}

function isEarlier(waiting: Waiting, other: Waiting) {
    if (waiting.dueMs !== other.dueMs) return waiting.dueMs < other.dueMs;

    return waiting.order < other.order;
}
