import { describe, expect, test } from 'vitest';

import { ManualClock } from './ManualClock.ts';
import { ManualTimer } from './ManualTimer.ts';

describe('ManualClock', () => {
    test('moves only when advanced', () => {
        const clock = new ManualClock(100);

        expect(clock.nowMs()).toBe(100);

        clock.advance(50);

        expect(clock.nowMs()).toBe(150);
    });

    test('refuses to go back', () => {
        const clock = new ManualClock();

        expect(() => clock.advance(-1)).toThrow();
    });
});

describe('ManualTimer', () => {
    test('runs a callback once its delay has passed', () => {
        const timer = new ManualTimer();
        let calls = 0;

        timer.after(1_000, () => (calls += 1));
        timer.advance(999);

        expect(calls).toBe(0);

        timer.advance(1);

        expect(calls).toBe(1);
        expect(timer.pendingCount).toBe(0);
    });

    test('a cancelled callback never runs', () => {
        const timer = new ManualTimer();
        let calls = 0;

        const cancel = timer.after(10, () => (calls += 1));
        cancel();
        timer.advance(100);

        expect(calls).toBe(0);
    });

    test('runs callbacks earliest first, each at its own time', () => {
        const clock = new ManualClock();
        const timer = new ManualTimer(clock);
        const seen: string[] = [];

        timer.after(30, () => seen.push(`late at ${clock.nowMs()}`));
        timer.after(10, () => seen.push(`early at ${clock.nowMs()}`));
        timer.after(10, () => seen.push(`second early at ${clock.nowMs()}`));
        timer.advance(100);

        expect(seen).toEqual(['early at 10', 'second early at 10', 'late at 30']);
        expect(clock.nowMs()).toBe(100);
    });

    test('a callback asked for while advancing runs if it falls due in time', () => {
        const timer = new ManualTimer();
        const seen: number[] = [];

        timer.after(10, () => timer.after(10, () => seen.push(timer.clock.nowMs())));
        timer.advance(15);

        expect(seen).toEqual([]);

        timer.advance(5);

        expect(seen).toEqual([20]);
    });
});
