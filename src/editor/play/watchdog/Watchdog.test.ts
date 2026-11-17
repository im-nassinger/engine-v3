import { describe, expect, test } from 'vitest';

import { ManualClock } from '../../time/testing/index.ts';
import { Watchdog } from './Watchdog.ts';

// Moves time on in frames of 10 ms, checking the watchdog on each, and returns the last verdict. Whole
// milliseconds keep the sums exact.
function runFrames(clock: ManualClock, watchdog: Watchdog, ms: number) {
    const frameMs = 10;
    let verdict = watchdog.check();

    for (let elapsedMs = 0; elapsedMs < ms; elapsedMs += frameMs) {
        clock.advance(Math.min(frameMs, ms - elapsedMs));
        verdict = watchdog.check();
    }

    return verdict;
}

function startWaiting() {
    const clock = new ManualClock(1_000);
    const watchdog = new Watchdog(clock);
    watchdog.requestSent();

    return { clock, watchdog };
}

describe('Watchdog', () => {
    test('an answer within 2 s shows nothing', () => {
        const { clock, watchdog } = startWaiting();

        expect(runFrames(clock, watchdog, 1_900)).toBe('fine');

        watchdog.answerReceived();

        expect(runFrames(clock, watchdog, 10_000)).toBe('fine');
    });

    test('2 s unanswered shows the notice, and an answer clears it', () => {
        const { clock, watchdog } = startWaiting();

        expect(runFrames(clock, watchdog, 1_990)).toBe('fine');
        expect(runFrames(clock, watchdog, 10)).toBe('notResponding');

        watchdog.answerReceived();

        expect(watchdog.check()).toBe('fine');
    });

    test('5 s unanswered ends the run', () => {
        const { clock, watchdog } = startWaiting();

        expect(runFrames(clock, watchdog, 4_990)).toBe('notResponding');
        expect(runFrames(clock, watchdog, 10)).toBe('hung');
    });

    test('nothing unanswered never looks hung, as in a paused run', () => {
        const clock = new ManualClock();
        const watchdog = new Watchdog(clock);
        watchdog.requestSent();
        watchdog.answerReceived();

        expect(runFrames(clock, watchdog, 60_000)).toBe('fine');
    });

    test('a 30-second frame gap ends nothing', () => {
        const { clock, watchdog } = startWaiting();
        runFrames(clock, watchdog, 500);

        clock.advance(30_000);

        expect(watchdog.check()).toBe('fine');
        expect(runFrames(clock, watchdog, 1_900)).toBe('fine');
        expect(runFrames(clock, watchdog, 200)).toBe('notResponding');
    });

    test('a frame gap of a second exactly still counts', () => {
        const { clock, watchdog } = startWaiting();
        runFrames(clock, watchdog, 1_500);

        clock.advance(Watchdog.sleepingFrameGapMs);

        expect(watchdog.check()).toBe('notResponding');
    });

    test('the wait starts again with each request', () => {
        const { clock, watchdog } = startWaiting();
        runFrames(clock, watchdog, 1_500);
        watchdog.answerReceived();
        watchdog.requestSent();

        expect(runFrames(clock, watchdog, 1_500)).toBe('fine');
    });

    test('reset forgets the request', () => {
        const { clock, watchdog } = startWaiting();
        runFrames(clock, watchdog, 4_000);

        watchdog.reset();

        expect(runFrames(clock, watchdog, 10_000)).toBe('fine');
    });
});
