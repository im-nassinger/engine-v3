import { describe, expect, test } from 'vitest';

import { LevelWriter } from '../../../core/level-data/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { PhysicsEngine } from '../../../core/physics/index.ts';
import { ScriptedEngine } from '../../../core/simulation/testing/ScriptedPhysics.ts';
import { placeBody, transform } from '../../../core/simulation/testing/scriptedLevel.ts';

import { GameWorkerHost } from './GameWorkerHost.ts';
import type { GameWorkerScope } from './GameWorkerHost.ts';
import type { GameAnswer, GameRequest } from './gameProtocol.ts';
import { WorkerGameRunner } from './WorkerGameRunner.ts';

const NOTHING_HELD = { heldKeys: [], pressedKeys: [] };
const BATCH = [NOTHING_HELD, NOTHING_HELD, NOTHING_HELD, NOTHING_HELD];
const START = { clockTimeMs: 0 };
const NOT_YET = 'not yet';

// The parts of a Worker WorkerGameRunner uses, with GameWorkerHost answering in the same thread.
class InThreadWorker {
    onmessage: ((event: MessageEvent<GameAnswer>) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    onmessageerror: (() => void) | null = null;
    readonly requests: GameRequest[] = [];
    terminated = false;
    private readonly scope: GameWorkerScope;

    constructor(engine: PhysicsEngine) {
        this.scope = {
            onmessage: null,
            postMessage: (answer) => {
                if (this.terminated) return;

                this.onmessage?.(new MessageEvent('message', { data: answer }));
            },
        };
        new GameWorkerHost(this.scope, engine).listen();
    }

    postMessage(request: GameRequest) {
        if (this.terminated) return;

        this.requests.push(request);
        this.scope.onmessage?.(new MessageEvent('message', { data: request }));
    }

    terminate() {
        this.terminated = true;
    }
}

function fallingBoxLevel() {
    const level = Level.createNew();
    placeBody(level, level.world, transform(0, 0));

    return new LevelWriter().write(level);
}

// An engine whose world throws on its 6th step.
function failingEngine(): PhysicsEngine {
    const engine = new ScriptedEngine();
    let steps = 0;
    const step = engine.world.step.bind(engine.world);
    engine.world.step = () => {
        steps += 1;
        if (steps === 6) throw new Error('step failed');
        step();
    };

    return engine;
}

// A runner whose workers are kept, newest last, each with its own engine from makeEngine.
function runnerWithWorkers(makeEngine: () => PhysicsEngine = () => new ScriptedEngine()) {
    const workers: InThreadWorker[] = [];
    const runner = new WorkerGameRunner(() => {
        const worker = new InThreadWorker(makeEngine());
        workers.push(worker);

        return worker as unknown as Worker;
    });

    return { runner, workers };
}

async function answeredSoon<T>(answer: Promise<T>) {
    const later = new Promise<typeof NOT_YET>((resolve) => setTimeout(() => resolve(NOT_YET), 20));

    return Promise.race([answer, later]);
}

describe('WorkerGameRunner', () => {
    test('prepare creates one worker and asks it to load the game', () => {
        const { runner, workers } = runnerWithWorkers();

        runner.prepare();
        runner.prepare();

        expect(workers).toHaveLength(1);
        expect(workers[0]?.requests).toEqual([{ kind: 'prepare' }]);
    });

    test('a start and its batches are answered in order, and a second run reuses the worker', async () => {
        const { runner, workers } = runnerWithWorkers();
        runner.prepare();

        const started = await runner.start(fallingBoxLevel(), START);
        const first = await runner.runTicks(BATCH);
        const second = await runner.runTicks(BATCH);
        runner.stop();
        const restarted = await runner.start(fallingBoxLevel(), START);
        const afterRestart = await runner.runTicks(BATCH);

        expect(started).toEqual({ kind: 'started' });
        expect(first.kind === 'ticked' && first.report.lastTick).toBe(4);
        expect(second.kind === 'ticked' && second.report.lastTick).toBe(8);
        expect(restarted).toEqual({ kind: 'started' });
        expect(afterRestart.kind === 'ticked' && afterRestart.report.lastTick).toBe(4);
        expect(workers).toHaveLength(1);
    });

    test("unreadable level data answers failed with the reader's reason, and no batch can be sent", async () => {
        const { runner } = runnerWithWorkers();
        const levelData = { ...fallingBoxLevel(), formatVersion: 99 };

        const started = await runner.start(levelData, START);

        expect(started).toEqual({ kind: 'failed', reason: { reason: 'newerVersion', fileVersion: 99 } });
        expect(() => runner.runTicks(BATCH)).toThrow('A batch was sent with no run.');
    });

    test('a crash answers what is waiting and replaces the worker with a prepared one', async () => {
        const { runner, workers } = runnerWithWorkers(failingEngine);
        await runner.start(fallingBoxLevel(), START);

        const first = await runner.runTicks(BATCH);
        const second = await runner.runTicks(BATCH);

        expect(first.kind).toBe('ticked');
        expect(second).toEqual({ kind: 'crashed', detail: 'step failed' });
        expect(workers).toHaveLength(2);
        expect(workers[0]?.terminated).toBe(true);
        expect(workers[1]?.requests).toEqual([{ kind: 'prepare' }]);
        expect(() => runner.runTicks(BATCH)).toThrow('A batch was sent with no run.');
    });

    test('after terminate nothing asked before is answered, and the next start uses a fresh worker', async () => {
        const { runner, workers } = runnerWithWorkers();
        runner.prepare();
        await runner.start(fallingBoxLevel(), START);
        workers[0]?.terminate();

        const unanswered = runner.runTicks(BATCH);
        runner.terminate();
        const restarted = await runner.start(fallingBoxLevel(), START);

        expect(await answeredSoon(unanswered)).toBe(NOT_YET);
        expect(restarted).toEqual({ kind: 'started' });
        expect(workers).toHaveLength(2);
        expect(workers[1]?.requests.map((request) => request.kind)).toEqual(['prepare', 'start']);
    });

    test('an error in the worker itself answers crashed', async () => {
        const { runner, workers } = runnerWithWorkers();
        await runner.start(fallingBoxLevel(), START);
        workers[0]?.terminate();

        const batch = runner.runTicks(BATCH);
        workers[0]?.onerror?.(new ErrorEvent('error', { message: 'out of memory' }));

        expect(await batch).toEqual({ kind: 'crashed', detail: 'out of memory' });
        expect(workers).toHaveLength(2);
    });
});
