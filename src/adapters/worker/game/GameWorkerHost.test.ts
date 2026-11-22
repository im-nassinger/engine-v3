import { beforeAll, describe, expect, test, vi } from 'vitest';

import { BodyComponent, ShapeComponent, SurfaceComponent, TransformComponent } from '../../../core/components/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import type { LevelData } from '../../../core/level-data/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { PhysicsEngine, WorldSettings } from '../../../core/physics/index.ts';
import { startSimulation } from '../../../core/simulation/index.ts';
import { Box2dPhysicsEngine } from '../../box2d/index.ts';

import { GameWorkerHost } from './GameWorkerHost.ts';
import type { GameWorkerScope } from './GameWorkerHost.ts';
import type { GameAnswer, GameRequest } from './gameProtocol.ts';

const NOTHING_HELD = { heldKeys: [], pressedKeys: [] };
const BATCH = [NOTHING_HELD, NOTHING_HELD, NOTHING_HELD, NOTHING_HELD];
const START = { clockTimeMs: 0 };

const engine = new Box2dPhysicsEngine();

beforeAll(async () => {
    await engine.load();
});

class FakeScope implements GameWorkerScope {
    onmessage: ((event: MessageEvent<GameRequest>) => void) | null = null;
    readonly answers: GameAnswer[] = [];
    readonly transfers: Transferable[][] = [];

    postMessage(answer: GameAnswer, transfer: Transferable[]) {
        this.answers.push(answer);
        this.transfers.push(transfer);
    }

    send(request: GameRequest) {
        this.onmessage?.(new MessageEvent('message', { data: request }));
    }

    async answerCount(count: number) {
        await vi.waitFor(() => {
            expect(this.answers).toHaveLength(count);
        });
    }
}

function place(level: Level, parent: Entity, x: number, y: number) {
    const entity = level.createEntity(parent, parent.children.length);
    const values = { position: { x, y }, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 };
    entity.addComponent(new TransformComponent(values));

    return entity;
}

// A crate that falls onto a tilted plank, so it moves and turns.
function crateLevel(crateX: number) {
    const level = Level.createNew();
    const crate = place(level, level.world, crateX, 0);
    crate.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 40, height: 40 } }));
    crate.addComponent(new SurfaceComponent());
    crate.addComponent(new BodyComponent());
    const plank = place(level, level.world, 0, 120);
    plank.requireComponent(TransformComponent).set('rotation', 15);
    plank.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 400, height: 20 } }));
    plank.addComponent(new SurfaceComponent());

    return new LevelWriter().write(level);
}

// The poses of each batch of 4, from the same run built straight in this thread. runHeadless records
// hashes, not reports, so the run it is built from stands in for it.
function directPoses(levelData: LevelData, batches: number) {
    const started = startSimulation(levelData, engine, START);
    if (!started.ok) throw new Error('The crate level was refused.');

    const simulation = started.value;
    const poses: number[][] = [];
    for (let batch = 0; batch < batches; batch++) {
        for (const inputs of BATCH) {
            simulation.runTick(inputs);
        }
        poses.push([...simulation.takeReport().poses]);
    }
    simulation.destroy();

    return poses;
}

function reportedPoses(answers: readonly GameAnswer[]) {
    return answers.flatMap((answer) => (answer.kind === 'ticked' ? [[...answer.report.poses]] : []));
}

// An engine whose worlds throw on their 10th step.
function failingEngine(): PhysicsEngine {
    return {
        load: () => engine.load(),
        createWorld: (settings: WorldSettings) => {
            const world = engine.createWorld(settings);
            let steps = 0;
            const step = world.step.bind(world);
            world.step = (...args: Parameters<typeof world.step>) => {
                steps += 1;
                if (steps === 10) throw new Error('step failed');
                step(...args);
            };

            return world;
        },
    };
}

function startedHost(physics: PhysicsEngine = engine) {
    const scope = new FakeScope();
    new GameWorkerHost(scope, physics).listen();

    return scope;
}

describe('GameWorkerHost', () => {
    test('prepare loads the engine and answers ready', async () => {
        const scope = startedHost();

        scope.send({ kind: 'prepare' });

        await scope.answerCount(1);
        expect(scope.answers).toEqual([{ kind: 'ready' }]);
    });

    test('60 ticks in batches of 4 give the same poses as the run built in this thread', async () => {
        const levelData = crateLevel(0);
        const scope = startedHost();

        scope.send({ kind: 'prepare' });
        scope.send({ kind: 'start', levelData, clockTimeMs: 0 });
        for (let batch = 0; batch < 15; batch++) {
            scope.send({ kind: 'runTicks', inputsPerTick: BATCH });
        }

        await scope.answerCount(17);
        expect(scope.answers.slice(0, 2)).toEqual([{ kind: 'ready' }, { kind: 'started' }]);
        const poses = reportedPoses(scope.answers);
        expect(poses).toEqual(directPoses(levelData, 15));
        expect(poses[14]).not.toEqual(poses[0]);
        const last = scope.answers[16];
        expect(last?.kind === 'ticked' && last.report.lastTick).toBe(60);
    });

    test("each report's poses are transferred, not copied", async () => {
        const scope = startedHost();

        scope.send({ kind: 'start', levelData: crateLevel(0), clockTimeMs: 0 });
        scope.send({ kind: 'runTicks', inputsPerTick: BATCH });

        await scope.answerCount(2);
        const answer = scope.answers[1];
        if (answer?.kind !== 'ticked') throw new Error('No report came.');
        expect(scope.transfers[1]).toEqual([answer.report.poses.buffer]);
    });

    test("unreadable level data answers failed with the reader's reason", async () => {
        const scope = startedHost();
        const levelData = { ...crateLevel(0), formatVersion: 99 };

        scope.send({ kind: 'start', levelData, clockTimeMs: 0 });

        await scope.answerCount(1);
        expect(scope.answers).toEqual([{ kind: 'failed', reason: { reason: 'newerVersion', fileVersion: 99 } }]);
    });

    test('an exception in a tick answers crashed and drops the run', async () => {
        const scope = startedHost(failingEngine());

        scope.send({ kind: 'start', levelData: crateLevel(0), clockTimeMs: 0 });
        scope.send({ kind: 'runTicks', inputsPerTick: BATCH });
        scope.send({ kind: 'runTicks', inputsPerTick: BATCH });
        scope.send({ kind: 'runTicks', inputsPerTick: BATCH });
        scope.send({ kind: 'runTicks', inputsPerTick: BATCH });

        await scope.answerCount(4);
        expect(scope.answers[0]).toEqual({ kind: 'started' });
        expect(scope.answers[1]?.kind).toBe('ticked');
        expect(scope.answers[2]?.kind).toBe('ticked');
        expect(scope.answers[3]).toEqual({ kind: 'crashed', detail: 'step failed' });
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(scope.answers).toHaveLength(4);
    });

    test('a batch after stop is dropped, and stop then start runs a new level', async () => {
        const first = crateLevel(0);
        const second = crateLevel(-80);
        const scope = startedHost();

        scope.send({ kind: 'start', levelData: first, clockTimeMs: 0 });
        scope.send({ kind: 'runTicks', inputsPerTick: BATCH });
        scope.send({ kind: 'stop' });
        scope.send({ kind: 'runTicks', inputsPerTick: BATCH });
        scope.send({ kind: 'start', levelData: second, clockTimeMs: 0 });
        scope.send({ kind: 'runTicks', inputsPerTick: BATCH });
        scope.send({ kind: 'runTicks', inputsPerTick: BATCH });

        await scope.answerCount(5);
        expect(scope.answers.map((answer) => answer.kind)).toEqual([
            'started',
            'ticked',
            'started',
            'ticked',
            'ticked',
        ]);
        const poses = reportedPoses(scope.answers);
        expect(poses[0]).toEqual(directPoses(first, 1)[0]);
        expect(poses.slice(1)).toEqual(directPoses(second, 2));
    });
});
