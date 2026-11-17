import { describe, expect, test } from 'vitest';

import { Box2dPhysicsEngine } from '../adapters/box2d/index.ts';
import { WorkerGameRunner } from '../adapters/worker/index.ts';
import { BodyComponent, ShapeComponent, SurfaceComponent, TransformComponent } from '../core/components/index.ts';
import { LevelWriter } from '../core/level-data/index.ts';
import type { LevelData } from '../core/level-data/index.ts';
import { Level } from '../core/level/index.ts';
import type { Entity } from '../core/level/index.ts';
import type { GameRunner } from '../editor/play/index.ts';
import { DirectGameRunner } from '../editor/play/testing/index.ts';

import { createGameWorker } from './createGameWorker.ts';

const NOTHING_HELD = { heldKeys: [] };
const START = { clockTimeMs: 0 };
// Ten ticks, in batches no larger than the pacer sends.
const BATCHES = [4, 4, 2].map((count) => Array.from({ length: count }, () => NOTHING_HELD));

function place(level: Level, parent: Entity, x: number, y: number) {
    const entity = level.createEntity(parent, parent.children.length);
    const values = { position: { x, y }, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 };
    entity.addComponent(new TransformComponent(values));

    return entity;
}

// A crate that falls onto a tilted plank, so it moves and turns.
function crateLevel() {
    const level = Level.createNew();
    const crate = place(level, level.world, 0, 0);
    crate.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 40, height: 40 } }));
    crate.addComponent(new SurfaceComponent());
    crate.addComponent(new BodyComponent());
    const plank = place(level, level.world, 0, 120);
    plank.requireComponent(TransformComponent).set('rotation', 15);
    plank.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 400, height: 20 } }));
    plank.addComponent(new SurfaceComponent());

    return new LevelWriter().write(level);
}

// Play, ten ticks and Stop: the poses of each batch.
async function playTenTicks(runner: GameRunner, levelData: LevelData) {
    const started = await runner.start(levelData, START);
    expect(started).toEqual({ kind: 'started' });

    const poses: number[][] = [];
    for (const batch of BATCHES) {
        const outcome = await runner.runTicks(batch);
        if (outcome.kind !== 'ticked') throw new Error(`The batch answered ${outcome.kind}.`);
        poses.push([...outcome.report.poses]);
    }
    runner.stop();

    return poses;
}

function countedWorkers() {
    const workers: Worker[] = [];
    const runner = new WorkerGameRunner(() => {
        const worker = createGameWorker();
        workers.push(worker);

        return worker;
    });

    return { runner, workers };
}

describe('the game worker', () => {
    test('a Play, ten ticks and a Stop give the same poses as the run in this thread', async () => {
        const levelData = crateLevel();
        const { runner } = countedWorkers();
        runner.prepare();

        const throughWorker = await playTenTicks(runner, levelData);
        const direct = await playTenTicks(new DirectGameRunner(new Box2dPhysicsEngine()), levelData);

        expect(throughWorker).toEqual(direct);
        expect(throughWorker[2]).not.toEqual(throughWorker[0]);
        runner.terminate();
    });

    test('a second Play reuses the worker, and after terminate the next Play starts in a new one', async () => {
        const levelData = crateLevel();
        const { runner, workers } = countedWorkers();
        runner.prepare();

        const first = await playTenTicks(runner, levelData);
        const second = await playTenTicks(runner, levelData);
        expect(workers).toHaveLength(1);

        runner.terminate();
        const third = await playTenTicks(runner, levelData);

        expect(workers).toHaveLength(2);
        expect(second).toEqual(first);
        expect(third).toEqual(first);
        workers[1]?.terminate();
    });
});
