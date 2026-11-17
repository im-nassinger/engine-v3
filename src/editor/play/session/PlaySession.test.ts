import { describe, expect, test } from 'vitest';

import { NameComponent, PhysicsWorldComponent, TransformComponent } from '../../../core/components/index.ts';
import type { LevelData } from '../../../core/level-data/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { RunStart, TickInputs, TickReport } from '../../../core/simulation/index.ts';
import { ScriptedEngine } from '../../../core/simulation/testing/ScriptedPhysics.ts';
import { placeBody, transform } from '../../../core/simulation/testing/scriptedLevel.ts';
import { EditorSession } from '../../session/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';

import { HeldKeys } from '../inputs/HeldKeys.ts';
import type { GameRunner, StartOutcome, TicksOutcome } from '../runner/GameRunner.ts';
import { DirectGameRunner } from '../testing/DirectGameRunner.ts';
import { FakePageLifecycle } from '../testing/FakePageLifecycle.ts';
import { Watchdog } from '../watchdog/Watchdog.ts';

import {
    CRASHED_TEXT,
    FAILED_TEXT,
    HUNG_TEXT,
    NOT_RESPONDING_TEXT,
    PlaySession,
    STOP_TO_EDIT_TEXT,
} from './PlaySession.ts';

const FRAME_MS = 1000 / 60;
const NEVER_ANSWERED = new Promise<never>(() => {});

// A DirectGameRunner that can be told to never answer, or to crash, and writes down what it was asked.
class ControlledRunner implements GameRunner {
    readonly direct: DirectGameRunner;
    readonly batches: (readonly TickInputs[])[] = [];
    readonly asked: string[] = [];
    hangBatches = false;
    hangStart = false;
    crashNextBatch = false;
    startAnswer: StartOutcome | undefined;

    constructor(engine: ScriptedEngine) {
        this.direct = new DirectGameRunner(engine);
    }

    prepare() {
        this.direct.prepare();
    }

    start(levelData: LevelData, start: RunStart) {
        this.asked.push('start');
        if (this.hangStart) return NEVER_ANSWERED;
        if (this.startAnswer !== undefined) return Promise.resolve(this.startAnswer);

        return this.direct.start(levelData, start);
    }

    runTicks(inputsPerTick: readonly TickInputs[]): Promise<TicksOutcome> {
        this.batches.push(inputsPerTick);
        if (this.hangBatches) return NEVER_ANSWERED;
        if (this.crashNextBatch) {
            this.crashNextBatch = false;
            return Promise.resolve({ kind: 'crashed', detail: 'boom' });
        }

        return this.direct.runTicks(inputsPerTick);
    }

    stop() {
        this.asked.push('stop');
        this.direct.stop();
    }

    terminate() {
        this.asked.push('terminate');
        this.hangBatches = false;
        this.direct.terminate();
    }
}

type SetUpOptions = {
    readonly dialogOpen?: boolean;
};

function setUp(level = levelWithACrate(), setUpOptions: SetUpOptions = {}) {
    const timer = new ManualTimer();
    const clock = timer.clock;
    const frames = new ManualFrames();
    const engine = new ScriptedEngine();
    const runner = new ControlledRunner(engine);
    const session = new EditorSession({ level, clock, timer, frames: new ManualFrames() });
    const calls: string[] = [];
    const heldKeys = new HeldKeys();
    const page = new FakePageLifecycle();
    const play = new PlaySession({
        session,
        runner,
        clock,
        timer,
        frames,
        commitTyping: () => calls.push('commit'),
        saveNow: () => {
            calls.push('save');
            return NEVER_ANSWERED;
        },
        isDialogOpen: () => setUpOptions.dialogOpen ?? false,
        heldKeys,
    });
    play.connectPage(page);

    // One frame later, with every answer due by then taken in.
    async function nextFrame(ms = FRAME_MS) {
        clock.advance(ms);
        frames.runFrame(clock.nowMs());
        await settle();
    }

    // Frames one after the other for this long, as a page that is awake runs them.
    async function framesFor(ms: number) {
        const frameCount = Math.ceil(ms / FRAME_MS);
        for (let i = 0; i < frameCount; i++) {
            await nextFrame();
        }
    }

    return { timer, clock, frames, engine, runner, session, play, calls, heldKeys, page, nextFrame, framesFor };
}

// Lets every promise already answered run its callbacks.
async function settle() {
    for (let i = 0; i < 20; i++) {
        await Promise.resolve();
    }
}

function levelWithACrate() {
    const level = Level.createNew();
    const crate = placeBody(level, level.world, transform(0, 0));
    crate.addComponent(new NameComponent({ name: 'Crate' }));

    return level;
}

function crateOf(level: Level) {
    const crate = level.world.children.find((child) => child.getComponent(NameComponent)?.get('name') === 'Crate');
    if (crate === undefined) throw new Error('The level has no crate.');

    return crate;
}

function emptyReport(lastTick: number): TickReport {
    return {
        lastTick,
        poses: new Float64Array(),
        removed: [],
        removedPastHardLimit: [],
        paths: [],
        camera: { x: 0, y: 0 },
    };
}

describe('PlaySession', () => {
    test('Play commits the field being typed, saves, writes the level and starts', async () => {
        const { play, calls, runner } = setUp();

        play.play();
        expect(calls).toEqual(['commit', 'save']);
        expect(play.state).toBe('starting');
        expect(runner.asked).toEqual(['start']);

        await settle();

        expect(play.state).toBe('playing');
        expect(play.mirror).toBeDefined();
    });

    test('Play is ignored in the middle of a drag', () => {
        const level = levelWithACrate();
        const { play, session, runner } = setUp(level);
        session.openLevel.liveEdit.begin([
            { entityId: crateOf(level).id, schema: TransformComponent.schema, key: 'position' },
        ]);

        play.play();

        expect(play.state).toBe('idle');
        expect(runner.asked).toEqual([]);
    });

    test('Play is ignored while a dialog is open', () => {
        const { play, runner, calls } = setUp(levelWithACrate(), { dialogOpen: true });

        play.play();

        expect(play.state).toBe('idle');
        expect(runner.asked).toEqual([]);
        expect(calls).toEqual([]);
    });

    test('Stop leaves the level, its history, the selection, the view and the group exactly as before Play', async () => {
        const level = levelWithACrate();
        const crate = crateOf(level);
        const { play, session, engine, nextFrame } = setUp(level);
        const openLevel = session.openLevel;
        openLevel.selection.replace([crate.id]);
        session.view.place({ x: 40, y: -20 }, 2);
        const levelBefore = new LevelWriter().write(level);
        const historyBefore = openLevel.history.undoCount;
        const groupBefore = openLevel.currentGroup.path;
        const viewBefore = { zoom: session.view.zoom, middle: session.view.middle };

        play.play();
        await settle();
        engine.world.setNextPose(crate.id, { x: 300, y: 300, angle: 45 });
        await nextFrame();
        await nextFrame();
        expect(play.mirror?.tick).toBeGreaterThan(0);
        play.stop();

        expect(play.state).toBe('idle');
        expect(play.mirror).toBeUndefined();
        expect(session.openLevel).toBe(openLevel);
        expect(new LevelWriter().write(level)).toEqual(levelBefore);
        expect(openLevel.history.undoCount).toBe(historyBefore);
        expect([...openLevel.selection.entities]).toEqual([crate]);
        expect(openLevel.currentGroup.path).toEqual(groupBefore);
        expect({ zoom: session.view.zoom, middle: session.view.middle }).toEqual(viewBefore);
        expect(crate.requireComponent(TransformComponent).get('position')).toEqual({ x: 0, y: 0 });
    });

    test('a run asks for 60 ticks a second, with the keys held when each batch is sent', async () => {
        const { play, runner, heldKeys, nextFrame } = setUp();
        play.play();
        await settle();

        heldKeys.press('ArrowRight');
        for (let i = 0; i < 60; i++) {
            await nextFrame();
        }

        const ticksAsked = runner.batches.reduce((sum, batch) => sum + batch.length, 0);
        expect(ticksAsked).toBe(60);
        expect(runner.batches[0]).toEqual([{ heldKeys: ['ArrowRight'] }]);
        expect(play.mirror?.tick).toBe(60);
    });

    test('Stop during starting cancels the start', async () => {
        const { play, runner, frames } = setUp();

        play.play();
        play.stop();
        await settle();

        expect(play.state).toBe('idle');
        expect(play.mirror).toBeUndefined();
        expect(runner.asked).toEqual(['start', 'stop']);
        expect(runner.direct.simulation).toBeUndefined();
        expect(frames.pendingCount).toBe(0);
    });

    test('Pause stops asking for ticks, Step runs exactly one tick, Resume goes on', async () => {
        const { play, runner, nextFrame } = setUp();
        play.play();
        await settle();
        await nextFrame();
        expect(play.mirror?.tick).toBe(1);

        play.pause();
        expect(play.state).toBe('paused');
        await nextFrame(60_000);
        expect(play.mirror?.tick).toBe(1);

        play.step();
        await nextFrame();
        await nextFrame();
        expect(play.mirror?.tick).toBe(2);
        expect(runner.batches.at(-1)).toHaveLength(1);

        play.resume();
        expect(play.state).toBe('playing');
        await nextFrame();
        expect(play.mirror?.tick).toBe(3);
    });

    test('Step is ignored while playing', async () => {
        const { play, nextFrame } = setUp();
        play.play();
        await settle();

        play.step();
        await nextFrame();

        expect(play.mirror?.tick).toBe(1);
    });

    test('Pause or Resume and Play or Stop toggle', async () => {
        const { play } = setUp();

        play.playOrStop();
        await settle();
        play.pauseOrResume();
        expect(play.state).toBe('paused');
        play.pauseOrResume();
        expect(play.state).toBe('playing');
        play.playOrStop();
        expect(play.state).toBe('idle');
    });

    test('a hung runner shows the notice, then ends the run with its message, and the next Play works', async () => {
        const { play, runner, nextFrame, framesFor } = setUp();
        play.play();
        await settle();
        runner.hangBatches = true;
        await nextFrame();
        expect(runner.batches).toHaveLength(1);

        await framesFor(Watchdog.noticeAfterMs);
        expect(play.notice).toBe(NOT_RESPONDING_TEXT);
        expect(play.state).toBe('playing');

        await framesFor(Watchdog.endAfterMs - Watchdog.noticeAfterMs);
        expect(play.state).toBe('ended');
        expect(play.endedMessage).toBe(HUNG_TEXT);
        expect(play.notice).toBeUndefined();
        expect(play.mirror).toBeDefined();
        expect(runner.asked).toEqual(['start', 'terminate']);

        play.step();
        expect(play.canStep).toBe(false);

        play.stop();
        expect(play.endedMessage).toBeUndefined();
        play.play();
        await settle();
        await nextFrame();
        expect(play.state).toBe('playing');
        expect(play.mirror?.tick).toBe(1);
    });

    test('an answer clears the notice', async () => {
        const { play, runner, nextFrame, framesFor } = setUp();
        play.play();
        await settle();
        let answer: (outcome: TicksOutcome) => void = () => {};
        runner.runTicks = (inputsPerTick) => {
            runner.batches.push(inputsPerTick);
            return new Promise((resolve) => (answer = resolve));
        };
        await nextFrame();
        await framesFor(Watchdog.noticeAfterMs);
        expect(play.notice).toBe(NOT_RESPONDING_TEXT);

        answer({ kind: 'ticked', report: emptyReport(1) });
        await settle();

        expect(play.notice).toBeUndefined();
        expect(play.state).toBe('playing');
    });

    test('a 30-second frame gap ends nothing', async () => {
        const { play, runner, nextFrame } = setUp();
        play.play();
        await settle();
        runner.hangBatches = true;
        await nextFrame();

        await nextFrame(30_000);

        expect(play.state).toBe('playing');
        expect(play.notice).toBeUndefined();
    });

    test('Stop clears the notice', async () => {
        const { play, runner, nextFrame, framesFor } = setUp();
        play.play();
        await settle();
        runner.hangBatches = true;
        await nextFrame();
        await framesFor(Watchdog.noticeAfterMs);

        play.stop();

        expect(play.notice).toBeUndefined();
    });

    test('a crash in a tick ends the run with its message', async () => {
        const { play, runner, nextFrame } = setUp();
        play.play();
        await settle();
        runner.crashNextBatch = true;

        await nextFrame();

        expect(play.state).toBe('ended');
        expect(play.endedMessage).toBe(CRASHED_TEXT);
        expect(play.endedDetail).toBe('boom');
        expect(play.canStep).toBe(false);
    });

    test('a crash or a failure while starting ends the run with its message', async () => {
        const crashed = setUp();
        crashed.runner.startAnswer = { kind: 'crashed', detail: 'no wasm' };
        crashed.play.play();
        await settle();
        expect(crashed.play.state).toBe('ended');
        expect(crashed.play.endedMessage).toBe(CRASHED_TEXT);
        expect(crashed.play.mirror).toBeUndefined();

        const failed = setUp();
        failed.runner.startAnswer = { kind: 'failed', reason: { reason: 'notALevel' } };
        failed.play.play();
        await settle();
        expect(failed.play.endedMessage).toBe(FAILED_TEXT);
        expect(failed.play.endedDetail).toBe('notALevel');
    });

    test('Stop during a long start asks nothing more of it', async () => {
        const { play, runner, frames } = setUp();
        runner.hangStart = true;

        play.play();
        await settle();
        expect(play.state).toBe('starting');
        play.stop();

        expect(play.state).toBe('idle');
        expect(frames.pendingCount).toBe(0);
    });

    test("the hard limit's warning names the body, and goes after 4 seconds", async () => {
        const level = levelWithACrate();
        level.world.requireComponent(PhysicsWorldComponent).set('walls', true);
        const crate = crateOf(level);
        const { play, engine, timer, nextFrame } = setUp(level);
        play.play();
        await settle();

        engine.world.setNextPose(crate.id, { x: 100_001, y: 0, angle: 0 });
        await nextFrame();

        expect(play.mirror?.level.findEntity(crate.id)).toBeUndefined();
        expect(play.hint.current).toBe('Crate went past the hard limit and was removed');

        timer.advance(4_000);
        expect(play.hint.current).toBeUndefined();
    });

    test('an edit tried during play shows "Stop to edit"', async () => {
        const { play } = setUp();
        play.play();
        await settle();

        play.refuseEdit();

        expect(play.hint.current).toBe(STOP_TO_EDIT_TEXT);
    });

    test('a second Play during a run is ignored', async () => {
        const { play, runner } = setUp();
        play.play();
        await settle();

        play.play();

        expect(runner.asked).toEqual(['start']);
    });

    test('the mirror is drawn once a frame, between ticks', async () => {
        const { play, nextFrame } = setUp();
        play.play();
        await settle();
        let drawnCount = 0;
        play.drawn.subscribe(() => (drawnCount += 1));

        await nextFrame(FRAME_MS / 2);
        await nextFrame(FRAME_MS / 2);

        expect(drawnCount).toBe(2);
    });

    test('while paused nothing is drawn again, until Step brings a tick', async () => {
        const { play, nextFrame } = setUp();
        play.play();
        await settle();
        await nextFrame();
        play.pause();
        await nextFrame();
        let drawnCount = 0;
        play.drawn.subscribe(() => (drawnCount += 1));

        await nextFrame();
        await nextFrame();
        expect(drawnCount).toBe(0);

        play.step();
        await nextFrame();
        await nextFrame();
        expect(play.mirror?.tick).toBe(2);
        expect(drawnCount).toBeGreaterThan(0);
    });

    test('a hidden tab pauses the run, and its ticks stay at what they were', async () => {
        const { play, page, nextFrame } = setUp();
        play.play();
        await settle();
        await nextFrame();
        expect(play.mirror?.tick).toBe(1);

        page.change('hidden');
        await nextFrame(60_000);
        await nextFrame();

        expect(play.state).toBe('paused');
        expect(play.mirror?.tick).toBe(1);
    });

    test('a key held while the tab hides is released, and the next batch sends none', async () => {
        const { play, page, runner, heldKeys, nextFrame } = setUp();
        play.play();
        await settle();
        heldKeys.press('ArrowRight');

        page.change('hidden');
        expect(heldKeys.codes()).toEqual([]);

        play.resume();
        await nextFrame();
        expect(runner.batches.at(-1)).toEqual([{ heldKeys: [] }]);
    });

    test('a tab hidden while the game loads starts the run paused', async () => {
        const { play, page, nextFrame } = setUp();
        play.play();
        page.change('hidden');
        await settle();
        await nextFrame(60_000);

        expect(play.state).toBe('paused');
        expect(play.mirror?.tick).toBe(0);
    });

    test('a hidden tab during a run that ended or was stopped changes nothing', async () => {
        const { play, page } = setUp();
        page.change('hidden');
        expect(play.state).toBe('idle');

        play.play();
        play.stop();
        page.change('hidden');
        play.play();
        await settle();

        expect(play.state).toBe('playing');
    });

    test('a lost window focus or a click on the Play bar releases the keys and keeps the run going', async () => {
        const { play, page, heldKeys, nextFrame } = setUp();
        play.play();
        await settle();

        heldKeys.press('KeyW');
        page.change('focusLost');
        expect(heldKeys.codes()).toEqual([]);

        heldKeys.press('KeyW');
        play.releaseKeys();
        expect(heldKeys.codes()).toEqual([]);

        await nextFrame();
        expect(play.state).toBe('playing');
        expect(play.mirror?.tick).toBe(1);
    });

    test('connectPage gives back a way to stop listening', () => {
        const { play } = setUp();
        const page = new FakePageLifecycle();

        const disconnect = play.connectPage(page);
        expect(page.listenerCount).toBe(1);
        disconnect();

        expect(page.listenerCount).toBe(0);
    });
});
