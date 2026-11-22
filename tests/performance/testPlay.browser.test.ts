import { afterEach, describe, expect, test } from 'vitest';
import { buildCrateStacks } from '../levels/generator/buildCrateStacks.ts';
import { closePlayPages, measurePlay, openPlayPage } from './testing/playPage.ts';
import type { PlayPage } from './testing/playPage.ts';

// performance.md's target for test play: 1,000 Dynamic crates for 10 s, 95% of frames within 16.7 ms and
// the ticks keeping 60 a second. It decides whether off-screen bodies are updated less often.
const CRATE_COUNT = 1_000;
const FRAME_TIME_LIMIT_MS = 16.7;
// The requirements give no number for the time to the first tick; it is printed, and only a stall fails.
const FIRST_TICK_LIMIT_MS = 1000;
// performance.md: CI only catches a large slowdown, since its browsers draw without a GPU.
const LARGE_SLOWDOWN = 5;

let page: PlayPage | undefined;

afterEach(() => {
    closePlayPages(page);
    page = undefined;
});

describe('test play with 1,000 Dynamic crates', () => {
    test('the first tick is drawn soon after Play, and 10 s keep 95% of frames within 16.7 ms at 60 ticks a second', async () => {
        const { level } = buildCrateStacks(CRATE_COUNT);
        const opened = await openPlayPage(level);
        page = opened;

        const measured = await measurePlay(opened);

        console.info(
            `Test play with ${CRATE_COUNT} crates: the first tick drawn ${measured.firstTickMs.toFixed(0)} ms after Play; ` +
                `in ${measured.playedSeconds.toFixed(1)} s, ${measured.frameTimes.length} frames, 95% within ${measured.smoothMs.toFixed(1)} ms ` +
                `(target ${FRAME_TIME_LIMIT_MS} ms), ${measured.ticks} ticks (target ${measured.expectedTicks}, ${measured.ticksTheFramesAllow} as the frames allow)`,
        );
        expect(opened.play.state).toBe('playing');
        expect(measured.firstTickMs).toBeLessThan(LARGE_SLOWDOWN * FIRST_TICK_LIMIT_MS);
        expect(measured.smoothMs).toBeLessThan(LARGE_SLOWDOWN * FRAME_TIME_LIMIT_MS);
        expect(measured.ticks).toBeGreaterThan(measured.ticksTheFramesAllow / LARGE_SLOWDOWN);
    });
});
