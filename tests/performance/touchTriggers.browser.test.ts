import { afterEach, describe, expect, test } from 'vitest';
import { VariablesComponent } from '../../src/core/components/index.ts';
import { buildTouchTriggers, TOUCHES_VARIABLE } from '../levels/generator/buildTouchTriggers.ts';
import { closePlayPages, measurePlay, openPlayPage } from './testing/playPage.ts';
import type { PlayPage } from './testing/playPage.ts';

// v3's speed test (versions/v3/architecture.md#performance): 1,000 touch triggers with 100 bodies sweeping
// through them for 10 s, in the real game worker, keeping v1's test play targets: 95% of frames within
// 16.7 ms and 600 ticks in 10 s.
const SENSOR_COUNT = 1_000;
const BALL_COUNT = 100;
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

function touchesCounted(opened: PlayPage) {
    const variables = opened.play.mirror?.level.world.getComponent(VariablesComponent)?.get('variables') ?? [];

    return variables.find((variable) => variable.name === TOUCHES_VARIABLE)?.value ?? 0;
}

describe('test play with 1,000 touch triggers', () => {
    test('100 balls sweeping through them for 10 s keep 95% of frames within 16.7 ms at 60 ticks a second', async () => {
        const { level } = buildTouchTriggers(SENSOR_COUNT, BALL_COUNT);
        const opened = await openPlayPage(level);
        page = opened;

        const measured = await measurePlay(opened);
        const touches = touchesCounted(opened);

        console.info(
            `Test play with ${SENSOR_COUNT} touch triggers and ${BALL_COUNT} balls: the first tick drawn ` +
                `${measured.firstTickMs.toFixed(0)} ms after Play; in ${measured.playedSeconds.toFixed(1)} s, ` +
                `${measured.frameTimes.length} frames, 95% within ${measured.smoothMs.toFixed(1)} ms ` +
                `(target ${FRAME_TIME_LIMIT_MS} ms), ${measured.ticks} ticks (target ${measured.expectedTicks}, ` +
                `${measured.ticksTheFramesAllow} as the frames allow), ${touches} touches counted`,
        );
        expect(opened.play.state).toBe('playing');
        // The triggers ran: the balls touched the pass-through squares all through the run.
        expect(touches).toBeGreaterThan(measured.ticks);
        expect(measured.firstTickMs).toBeLessThan(LARGE_SLOWDOWN * FIRST_TICK_LIMIT_MS);
        expect(measured.smoothMs).toBeLessThan(LARGE_SLOWDOWN * FRAME_TIME_LIMIT_MS);
        expect(measured.ticks).toBeGreaterThan(measured.ticksTheFramesAllow / LARGE_SLOWDOWN);
    });
});
