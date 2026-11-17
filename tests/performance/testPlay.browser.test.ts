import { afterEach, describe, expect, test, vi } from 'vitest';
import { SystemClock } from '../../src/adapters/browser/time/SystemClock.ts';
import { PixiLevelView } from '../../src/adapters/pixi/index.ts';
import { WorkerGameRunner } from '../../src/adapters/worker/index.ts';
import type { GameAnswer } from '../../src/adapters/worker/index.ts';
import { createGameWorker } from '../../src/app/createGameWorker.ts';
import { PlayViewLink } from '../../src/app/PlayViewLink.ts';
import { Signal } from '../../src/core/events/index.ts';
import type { LevelData } from '../../src/core/level-data/index.ts';
import type { Level } from '../../src/core/level/index.ts';
import type { RunStart, TickInputs } from '../../src/core/simulation/index.ts';
import { PlaySession } from '../../src/editor/play/index.ts';
import type { GameRunner, StartOutcome, TicksOutcome } from '../../src/editor/play/index.ts';
import { EditorSession } from '../../src/editor/session/index.ts';
import { ManualFrames, ManualTimer } from '../../src/editor/time/testing/index.ts';
import { buildCrateStacks } from '../levels/generator/buildCrateStacks.ts';
import { percentile, waitForDrawing } from './testing/levelViewPage.ts';

// performance.md's target for test play: 1,000 Dynamic crates for 10 s, 95% of frames within 16.7 ms and
// the ticks keeping 60 a second. It decides whether off-screen bodies are updated less often.
const CRATE_COUNT = 1_000;
const PLAY_SECONDS = 10;
const TICKS_PER_SECOND = 60;
const FRAME_MS = 1000 / 60;
const FRAME_TIME_LIMIT_MS = 16.7;
const SMOOTH_SHARE = 0.95;
// The requirements give no number for the time to the first tick; it is printed, and only a stall fails.
const FIRST_TICK_LIMIT_MS = 1000;
// performance.md: CI only catches a large slowdown, since its browsers draw without a GPU.
const LARGE_SLOWDOWN = 5;
// A mid-sized laptop window's level view.
const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 800;

// The game's answers, held until the next frame lets them in, as a browser runs the worker's messages
// before its next animation frame. The time applying a report is then counted in the frame it lands in.
class HeldAnswersRunner implements GameRunner {
    ticksAnswered = 0;
    private readonly inner: GameRunner;
    private held: (() => void)[] = [];

    constructor(inner: GameRunner) {
        this.inner = inner;
    }

    prepare() {
        this.inner.prepare();
    }

    start(levelData: LevelData, start: RunStart): Promise<StartOutcome> {
        return this.inner.start(levelData, start);
    }

    runTicks(inputsPerTick: readonly TickInputs[]): Promise<TicksOutcome> {
        const answered = this.inner.runTicks(inputsPerTick);

        return new Promise((answer) => {
            void answered.then((outcome) => {
                this.held.push(() => {
                    this.ticksAnswered += inputsPerTick.length;
                    answer(outcome);
                });
            });
        });
    }

    stop() {
        this.inner.stop();
    }

    terminate() {
        this.inner.terminate();
    }

    // Lets in every answer that came since the last frame, and waits until the session has applied them.
    async letAnswersIn() {
        const held = this.held;
        this.held = [];
        for (const answer of held) {
            answer();
        }
        await settle();
    }
}

async function settle() {
    for (let i = 0; i < 20; i++) {
        await Promise.resolve();
    }
}

type PlayPage = {
    readonly play: PlaySession;
    readonly runner: HeldAnswersRunner;
    readonly levelView: PixiLevelView;
    readonly frames: ManualFrames;
    readonly close: () => void;
};

const workers: Worker[] = [];
let page: PlayPage | undefined;

afterEach(() => {
    page?.close();
    page = undefined;
    for (const worker of workers.splice(0)) {
        worker.terminate();
    }
});

// The editor's level view and test play on a level, built as EditorComposition builds them, with the real
// game worker prepared as the editor prepares it on opening, but on ManualFrames, so a test runs each frame
// on the clock and times the work in it.
async function openPlayPage(level: Level): Promise<PlayPage> {
    const clock = new SystemClock();
    const timer = new ManualTimer();
    const frames = new ManualFrames();
    const session = new EditorSession({ level, clock, timer, frames });
    let gameReady: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
        gameReady = resolve;
    });
    const runner = new HeldAnswersRunner(
        new WorkerGameRunner(() => {
            const worker = createGameWorker();
            worker.addEventListener('message', (event: MessageEvent<GameAnswer>) => {
                if (event.data.kind === 'ready') {
                    gameReady();
                }
            });
            workers.push(worker);

            return worker;
        }),
    );
    const play = new PlaySession({
        session,
        runner,
        clock,
        timer,
        frames,
        commitTyping: () => {},
        saveNow: () => Promise.resolve(),
        isDialogOpen: () => false,
    });
    const pixelRatio = {
        current: () => 1,
        onChange: (listener: (ratio: number) => void) => new Signal<number>().subscribe(listener),
    };
    const levelView = await PixiLevelView.create({
        view: session.view,
        settings: session.viewSettings,
        frames,
        pixelRatio,
        drawing: { showUnstyled: true },
    });

    const host = document.createElement('div');
    host.style.cssText = `width: ${VIEW_WIDTH}px; height: ${VIEW_HEIGHT}px;`;
    document.body.appendChild(host);
    levelView.mount(host);
    await vi.waitFor(() => expect(session.view.size).toEqual({ width: VIEW_WIDTH, height: VIEW_HEIGHT }));
    levelView.follow(session);
    const disconnect = new PlayViewLink(play, levelView, session).connect();

    runner.prepare();
    await ready;

    const close = () => {
        play.stop();
        disconnect();
        levelView.destroy();
        host.remove();
    };

    return { play, runner, levelView, frames, close };
}

// One frame on the clock: the answers that came are applied, then the frame's work runs, the session's
// ticks and drawing between them and the level view's render. Returns the time the work took; waits,
// untimed, for the GPU to draw it, for the browser's next animation frame and for the frame's time to pass.
// Waiting on timers alone starves the worker's messages in a browser drawing without a GPU, as on CI: the
// game's answers never land and the watchdog ends the run.
async function timedFrame(opened: PlayPage, frameStartMs: number) {
    const start = performance.now();
    await opened.runner.letAnswersIn();
    opened.frames.runFrame(start);
    const elapsed = performance.now() - start;
    waitForDrawing(opened);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const wait = frameStartMs + FRAME_MS - performance.now();
    if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
    }

    return elapsed;
}

describe('test play with 1,000 Dynamic crates', () => {
    test('the first tick is drawn soon after Play, and 10 s keep 95% of frames within 16.7 ms at 60 ticks a second', async () => {
        const { level } = buildCrateStacks(CRATE_COUNT);
        const opened = await openPlayPage(level);
        page = opened;

        // From the press until a frame with the first tick's poses is drawn: the session draws the mirror at
        // the frame after the report, and the level view renders it in the frame after that.
        const pressed = performance.now();
        opened.play.play();
        let frameStart = performance.now();
        let firstTickFrames = 0;
        while (firstTickFrames < 2) {
            await timedFrame(opened, frameStart);
            frameStart += FRAME_MS;
            if ((opened.play.mirror?.tick ?? 0) > 0) {
                firstTickFrames += 1;
            }
        }
        const firstTickMs = performance.now() - pressed;
        expect(opened.play.state).toBe('playing');

        const ticksBefore = opened.runner.ticksAnswered;
        const times: number[] = [];
        const playStart = performance.now();
        frameStart = playStart;
        while (performance.now() - playStart < PLAY_SECONDS * 1000) {
            times.push(await timedFrame(opened, frameStart));
            // A frame that ran over starts the next at once, without racing to catch up the time lost.
            frameStart = Math.max(frameStart + FRAME_MS, performance.now() - FRAME_MS);
        }
        const ticks = opened.runner.ticksAnswered - ticksBefore;
        const playedSeconds = (performance.now() - playStart) / 1000;

        const smooth = percentile(times, SMOOTH_SHARE);
        const expectedTicks = PLAY_SECONDS * TICKS_PER_SECOND;
        console.info(
            `Test play with ${CRATE_COUNT} crates: the first tick drawn ${firstTickMs.toFixed(0)} ms after Play; ` +
                `in ${playedSeconds.toFixed(1)} s, ${times.length} frames, 95% within ${smooth.toFixed(1)} ms ` +
                `(target ${FRAME_TIME_LIMIT_MS} ms), ${ticks} ticks (target ${expectedTicks})`,
        );
        expect(opened.play.state).toBe('playing');
        expect(firstTickMs).toBeLessThan(LARGE_SLOWDOWN * FIRST_TICK_LIMIT_MS);
        expect(smooth).toBeLessThan(LARGE_SLOWDOWN * FRAME_TIME_LIMIT_MS);
        expect(ticks).toBeGreaterThan(expectedTicks / LARGE_SLOWDOWN);
    });
});
