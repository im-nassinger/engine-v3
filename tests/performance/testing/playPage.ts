import { expect, vi } from 'vitest';
import { SystemClock } from '../../../src/adapters/browser/time/SystemClock.ts';
import { PixiLevelView } from '../../../src/adapters/pixi/index.ts';
import { WorkerGameRunner } from '../../../src/adapters/worker/index.ts';
import type { GameAnswer } from '../../../src/adapters/worker/index.ts';
import { createGameWorker } from '../../../src/app/createGameWorker.ts';
import { PlayViewLink } from '../../../src/app/PlayViewLink.ts';
import { Signal } from '../../../src/core/events/index.ts';
import type { LevelData } from '../../../src/core/level-data/index.ts';
import type { Level } from '../../../src/core/level/index.ts';
import type { RunStart, TickInputs } from '../../../src/core/simulation/index.ts';
import { PlaySession, TickPacer } from '../../../src/editor/play/index.ts';
import type { GameRunner, StartOutcome, TicksOutcome } from '../../../src/editor/play/index.ts';
import { EditorSession } from '../../../src/editor/session/index.ts';
import { ManualFrames, ManualTimer } from '../../../src/editor/time/testing/index.ts';
import { percentile, waitForDrawing } from './levelViewPage.ts';

const PLAY_SECONDS = 10;
const TICKS_PER_SECOND = 60;
const FRAME_MS = 1000 / 60;
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

    restart(): Promise<StartOutcome> {
        return this.inner.restart();
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

export type PlayPage = {
    readonly play: PlaySession;
    readonly runner: HeldAnswersRunner;
    readonly levelView: PixiLevelView;
    readonly frames: ManualFrames;
    readonly close: () => void;
};

const workers: Worker[] = [];

// Ends the test's play page and every game worker it made, for afterEach.
export function closePlayPages(page: PlayPage | undefined) {
    page?.close();
    for (const worker of workers.splice(0)) {
        worker.terminate();
    }
}

// The editor's level view and test play on a level, built as EditorComposition builds them, with the real
// game worker prepared as the editor prepares it on opening, but on ManualFrames, so a test runs each frame
// on the clock and times the work in it.
export async function openPlayPage(level: Level): Promise<PlayPage> {
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

export type PlayMeasure = {
    readonly firstTickMs: number;
    readonly frameTimes: readonly number[];
    readonly smoothMs: number;
    readonly ticks: number;
    readonly expectedTicks: number;
    readonly ticksTheFramesAllow: number;
    readonly playedSeconds: number;
};

// Presses Play and times it until a frame with the first tick's poses is drawn, then plays 10 s on the
// computer's clock, timing every frame and counting the ticks the game answered.
export async function measurePlay(opened: PlayPage): Promise<PlayMeasure> {
    // The session draws the mirror at the frame after the report, and the level view renders it in the frame after that.
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
    const frameTimes: number[] = [];
    const playStart = performance.now();
    frameStart = playStart;
    while (performance.now() - playStart < PLAY_SECONDS * 1000) {
        frameTimes.push(await timedFrame(opened, frameStart));
        // A frame that ran over starts the next at once, without racing to catch up the time lost.
        frameStart = Math.max(frameStart + FRAME_MS, performance.now() - FRAME_MS);
    }
    const ticks = opened.runner.ticksAnswered - ticksBefore;
    const expectedTicks = PLAY_SECONDS * TICKS_PER_SECOND;

    return {
        firstTickMs,
        frameTimes,
        smoothMs: percentile(frameTimes, 0.95),
        ticks,
        expectedTicks,
        // The session asks for at most TickPacer.maxBatch ticks a frame, so a slow computer slows the game. The
        // frames here wait, untimed, for the drawing, about 0.1 to 0.35 s each without a GPU, as on CI, so there
        // the ticks are held to what the frames allow, and only a game falling behind its frames fails.
        ticksTheFramesAllow: Math.min(expectedTicks, frameTimes.length * TickPacer.maxBatch),
        playedSeconds: (performance.now() - playStart) / 1000,
    };
}
