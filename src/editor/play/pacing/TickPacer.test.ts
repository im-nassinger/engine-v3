import { describe, expect, test } from 'vitest';

import { ManualClock } from '../../time/testing/index.ts';
import { TickPacer } from './TickPacer.ts';

// Runs one frame: sends the ticks due and answers at once, like a game that is never slow.
function runFrame(pacer: TickPacer) {
    const due = pacer.ticksDue();
    if (due === 0) return 0;

    pacer.batchSent(due);
    pacer.reportReceived();

    return due;
}

function ticksInOneSecondAt(framesPerSecond: number) {
    const clock = new ManualClock(1_000);
    const pacer = new TickPacer(clock);
    let ticks = 0;

    pacer.start();

    for (let frame = 0; frame < framesPerSecond; frame += 1) {
        clock.advance(1_000 / framesPerSecond);
        ticks += runFrame(pacer);
    }

    return ticks;
}

function drainBacklog(pacer: TickPacer) {
    const batches: number[] = [];
    let due = runFrame(pacer);

    while (due > 0) {
        batches.push(due);
        due = runFrame(pacer);
    }

    return batches;
}

describe('TickPacer', () => {
    test.each([60, 144, 30])('one second of frames at %i Hz asks for 60 ticks', (framesPerSecond) => {
        expect(ticksInOneSecondAt(framesPerSecond)).toBe(60);
    });

    test('nothing is due before start', () => {
        const clock = new ManualClock();
        const pacer = new TickPacer(clock);

        clock.advance(1_000);

        expect(pacer.ticksDue()).toBe(0);
        expect(pacer.interpolation).toBe(0);
    });

    test('nothing is due while a batch is in flight', () => {
        const clock = new ManualClock();
        const pacer = new TickPacer(clock);
        pacer.start();

        clock.advance(50);
        pacer.batchSent(pacer.ticksDue());
        clock.advance(50);

        expect(pacer.ticksDue()).toBe(0);

        pacer.reportReceived();

        expect(pacer.ticksDue()).toBe(3);
    });

    test('never asks for more than maxBatch ticks at once', () => {
        const clock = new ManualClock();
        const pacer = new TickPacer(clock);
        pacer.start();

        clock.advance(200);

        expect(pacer.ticksDue()).toBe(TickPacer.maxBatch);
    });

    test('a 3-second stall asks for 15 ticks, not 180', () => {
        const clock = new ManualClock();
        const pacer = new TickPacer(clock);
        pacer.start();

        clock.advance(3_000);

        expect(drainBacklog(pacer)).toEqual([4, 4, 4, 3]);
    });

    test('a slow game slows down: time while a batch is in flight is capped too', () => {
        const clock = new ManualClock();
        const pacer = new TickPacer(clock);
        pacer.start();

        clock.advance(1_000 / 60);
        pacer.batchSent(pacer.ticksDue());
        clock.advance(2_000);
        pacer.reportReceived();

        expect(drainBacklog(pacer)).toEqual([4, 4, 4, 3]);
    });

    test('pausing for a minute adds no ticks', () => {
        const clock = new ManualClock();
        const pacer = new TickPacer(clock);
        pacer.start();

        clock.advance(10);
        pacer.pause();
        clock.advance(60_000);

        expect(pacer.ticksDue()).toBe(0);

        pacer.resume();

        expect(pacer.ticksDue()).toBe(0);

        clock.advance(10);

        expect(pacer.ticksDue()).toBe(1);
    });

    test('stepOnce asks for exactly one tick while paused', () => {
        const clock = new ManualClock();
        const pacer = new TickPacer(clock);
        pacer.start();
        pacer.pause();
        clock.advance(5_000);

        pacer.stepOnce();

        expect(pacer.ticksDue()).toBe(1);

        pacer.batchSent(1);

        expect(pacer.ticksDue()).toBe(0);

        pacer.reportReceived();

        expect(pacer.ticksDue()).toBe(0);
    });

    test('each Step pressed while paused runs one tick', () => {
        const clock = new ManualClock();
        const pacer = new TickPacer(clock);
        pacer.start();
        pacer.pause();

        pacer.stepOnce();
        pacer.stepOnce();

        expect(drainBacklog(pacer)).toEqual([2]);
    });

    test('stepOnce while running is ignored', () => {
        const clock = new ManualClock();
        const pacer = new TickPacer(clock);
        pacer.start();

        pacer.stepOnce();

        expect(pacer.ticksDue()).toBe(0);
    });

    test('steps not run before resuming are dropped', () => {
        const clock = new ManualClock();
        const pacer = new TickPacer(clock);
        pacer.start();
        pacer.pause();
        pacer.stepOnce();

        pacer.resume();

        expect(pacer.ticksDue()).toBe(0);
    });

    test('interpolation runs from 0 to 1 between ticks', () => {
        const clock = new ManualClock();
        const pacer = new TickPacer(clock);
        const tickMs = 1_000 / 60;
        pacer.start();

        expect(pacer.interpolation).toBe(0);

        clock.advance(tickMs / 4);
        expect(pacer.interpolation).toBeCloseTo(0.25);

        clock.advance(tickMs / 4);
        expect(pacer.interpolation).toBeCloseTo(0.5);

        clock.advance(tickMs / 2);
        expect(pacer.interpolation).toBe(1);

        runFrame(pacer);
        expect(pacer.interpolation).toBeCloseTo(0);
    });

    test('interpolation waits at 1 while a tick is owed but not run', () => {
        const clock = new ManualClock();
        const pacer = new TickPacer(clock);
        pacer.start();

        clock.advance(1_000 / 60);
        pacer.batchSent(pacer.ticksDue());
        clock.advance(1_000 / 30);

        expect(pacer.interpolation).toBe(1);
    });

    test('interpolation stays where it was while paused', () => {
        const clock = new ManualClock();
        const pacer = new TickPacer(clock);
        pacer.start();

        clock.advance(1_000 / 120);
        pacer.pause();
        clock.advance(1_000);

        expect(pacer.interpolation).toBeCloseTo(0.5);

        pacer.resume();
        clock.advance(1_000 / 240);

        expect(pacer.interpolation).toBeCloseTo(0.75);
    });

    test('start again forgets the last run', () => {
        const clock = new ManualClock();
        const pacer = new TickPacer(clock);
        pacer.start();
        clock.advance(100);
        pacer.batchSent(4);
        pacer.pause();

        pacer.start();

        expect(pacer.isPaused).toBe(false);
        expect(pacer.ticksDue()).toBe(0);
    });
});
