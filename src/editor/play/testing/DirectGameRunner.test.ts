import { describe, expect, test } from 'vitest';

import { LevelWriter } from '../../../core/level-data/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { PhysicsEngine } from '../../../core/physics/index.ts';
import { POSE_STRIDE } from '../../../core/simulation/index.ts';
import { ScriptedEngine } from '../../../core/simulation/testing/ScriptedPhysics.ts';
import { placeBody, transform } from '../../../core/simulation/testing/scriptedLevel.ts';

import { DirectGameRunner } from './DirectGameRunner.ts';

const NOTHING_HELD = { heldKeys: [] };
const BATCH = [NOTHING_HELD, NOTHING_HELD, NOTHING_HELD, NOTHING_HELD];
const START = { clockTimeMs: 0 };

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

function yOfFirstPose(poses: Float64Array) {
    expect(poses.length).toBe(POSE_STRIDE);

    return poses[2];
}

describe('DirectGameRunner', () => {
    test('starts a run and answers each batch with its report', async () => {
        const runner = new DirectGameRunner(new ScriptedEngine());

        runner.prepare();
        const started = await runner.start(fallingBoxLevel(), START);
        const first = await runner.runTicks(BATCH);
        const second = await runner.runTicks(BATCH);

        expect(started).toEqual({ kind: 'started' });
        if (first.kind !== 'ticked' || second.kind !== 'ticked') throw new Error('A batch was not answered.');
        expect(first.report.lastTick).toBe(4);
        expect(second.report.lastTick).toBe(8);
        expect(yOfFirstPose(first.report.poses)).toBe(40);
        expect(yOfFirstPose(second.report.poses)).toBe(80);
    });

    test("unreadable level data answers failed with the reader's reason", async () => {
        const runner = new DirectGameRunner(new ScriptedEngine());
        const levelData = { ...fallingBoxLevel(), formatVersion: 99 };

        const started = await runner.start(levelData, START);

        expect(started).toEqual({ kind: 'failed', reason: { reason: 'newerVersion', fileVersion: 99 } });
    });

    test('a throw in a tick answers crashed, and the next start works', async () => {
        const runner = new DirectGameRunner(failingEngine());

        await runner.start(fallingBoxLevel(), START);
        const first = await runner.runTicks(BATCH);
        const second = await runner.runTicks(BATCH);
        const third = await runner.runTicks(BATCH);
        const restarted = await runner.start(fallingBoxLevel(), START);

        expect(first.kind).toBe('ticked');
        expect(second).toEqual({ kind: 'crashed', detail: 'step failed' });
        expect(third).toEqual({ kind: 'crashed', detail: 'A batch was sent with no run.' });
        expect(restarted).toEqual({ kind: 'started' });
    });

    test('nothing asked before terminate is answered, and the next start works', async () => {
        const runner = new DirectGameRunner(new ScriptedEngine());
        runner.prepare();
        await runner.start(fallingBoxLevel(), START);

        let answered = false;
        void runner.runTicks(BATCH).then(() => {
            answered = true;
        });
        runner.terminate();
        // Answers come in the order asked, so the batch's would have come before this one.
        const restarted = await runner.start(fallingBoxLevel(), START);

        expect(answered).toBe(false);
        expect(restarted).toEqual({ kind: 'started' });
        expect(runner.terminations).toBe(1);
        expect(runner.prepares).toBe(2);
    });

    test('stop drops the run after the batch sent before it', async () => {
        const runner = new DirectGameRunner(new ScriptedEngine());
        await runner.start(fallingBoxLevel(), START);

        const beforeStop = runner.runTicks(BATCH);
        runner.stop();
        const afterStop = runner.runTicks(BATCH);

        expect((await beforeStop).kind).toBe('ticked');
        expect(await afterStop).toEqual({ kind: 'crashed', detail: 'A batch was sent with no run.' });
    });
});
