import { describe, expect, test } from 'vitest';
import { BrowserTimer } from './BrowserTimer.ts';
import { SystemClock } from './SystemClock.ts';

function wait(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

describe('BrowserTimer', () => {
    test('fires once after its delay', async () => {
        const timer = new BrowserTimer();
        let calls = 0;

        timer.after(10, () => (calls += 1));

        expect(calls).toBe(0);

        await wait(50);

        expect(calls).toBe(1);
    });

    test('a cancelled timer never fires', async () => {
        const timer = new BrowserTimer();
        let calls = 0;

        const cancel = timer.after(10, () => (calls += 1));
        cancel();
        await wait(50);

        expect(calls).toBe(0);
    });
});

describe('SystemClock', () => {
    test('moves with real time', async () => {
        const clock = new SystemClock();
        const startMs = clock.nowMs();

        await wait(20);

        expect(clock.nowMs()).toBeGreaterThanOrEqual(startMs + 15);
    });
});
