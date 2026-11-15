import type { Cancel, FrameScheduler } from '../FrameScheduler.ts';

// A FrameScheduler for tests: frames run only when the test calls runFrame.
export class ManualFrames implements FrameScheduler {
    private waiting: ((timeMs: number) => void)[] = [];

    get pendingCount() {
        return this.waiting.length;
    }

    nextFrame(callback: (timeMs: number) => void): Cancel {
        this.waiting.push(callback);

        return () => {
            this.waiting = this.waiting.filter((waitingCallback) => waitingCallback !== callback);
        };
    }

    // Runs the callbacks asked for before this frame. Ones asked for while it runs wait for the next.
    runFrame(timeMs = 0) {
        const callbacks = this.waiting;
        this.waiting = [];

        for (const callback of callbacks) {
            callback(timeMs);
        }
    }
}
