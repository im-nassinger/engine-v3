import { describe, expect, test } from 'vitest';

import { BodyComponent, ShapeComponent, SurfaceComponent, TransformComponent } from '../../components/index.ts';
import type { BodyType } from '../../components/index.ts';
import type { EntityId } from '../../fields/index.ts';
import type { TransformValues } from '../../geometry/index.ts';
import { LevelWriter } from '../../level-data/index.ts';
import type { Entity } from '../../level/index.ts';
import { Level } from '../../level/index.ts';
import type {
    BodyDefinition,
    BodyHandle,
    BodyPose,
    BodyPoses,
    PhysicsEngine,
    PhysicsWorld,
} from '../../physics/index.ts';

import { POSE_STRIDE } from '../report/TickReport.ts';

import { startSimulation } from './startSimulation.ts';

const FALL_PER_STEP = 10;
const NOTHING_HELD = { heldKeys: [] };
const START = { clockTimeMs: 0 };

type ScriptedBody = {
    readonly entity: EntityId;
    readonly type: BodyType;
    pose: BodyPose;
};

// A PhysicsWorld where every Dynamic body falls 10 px a step and nothing else moves, unless a test sets a
// body's next pose itself.
class ScriptedWorld implements PhysicsWorld {
    private readonly bodies: ScriptedBody[] = [];
    private readonly movedLastStep: ScriptedBody[] = [];
    private readonly nextPoses = new Map<EntityId, BodyPose>();
    falling = true;

    createBody(definition: BodyDefinition): BodyHandle {
        const pose = { x: definition.position.x, y: definition.position.y, angle: definition.angle };
        this.bodies.push({ entity: definition.entity, type: definition.type, pose });

        return this.bodies.length - 1;
    }

    setNextPose(entity: EntityId, pose: BodyPose) {
        this.nextPoses.set(entity, pose);
    }

    addSurface() {}
    setGravity() {}

    step() {
        this.movedLastStep.length = 0;

        for (const body of this.bodies) {
            const nextPose = this.nextPoses.get(body.entity);
            const falls = this.falling && body.type === 'dynamic';

            if (nextPose !== undefined) {
                body.pose = nextPose;
            } else if (falls) {
                body.pose = { ...body.pose, y: body.pose.y + FALL_PER_STEP };
            } else {
                continue;
            }
            this.movedLastStep.push(body);
        }
        this.nextPoses.clear();
    }

    readMovedBodies(into: BodyPoses) {
        for (const body of this.movedLastStep) {
            into.recordMove(body.entity, body.pose);
        }
    }

    velocityOf() {
        return { linear: { x: 0, y: 0 }, spin: 0 };
    }

    destroyBody() {}
    destroy() {}
}

class ScriptedEngine implements PhysicsEngine {
    readonly world = new ScriptedWorld();

    async load() {}

    createWorld() {
        return this.world;
    }
}

function transform(x: number, y: number, rotation = 0, scaleX = 1): TransformValues {
    return { position: { x, y }, rotation, scale: { x: scaleX, y: 1 }, skew: 0 };
}

function place(level: Level, parent: Entity, values: TransformValues) {
    const entity = level.createEntity(parent, parent.children.length);
    entity.addComponent(new TransformComponent(values));

    return entity;
}

function placeBody(level: Level, parent: Entity, values: TransformValues, type: BodyType = 'dynamic') {
    const entity = place(level, parent, values);
    entity.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 20, height: 20 } }));
    entity.addComponent(new SurfaceComponent());
    const body = new BodyComponent();
    body.set('type', type);
    body.set('merge', false);
    entity.addComponent(body);

    return entity;
}

function start(level: Level) {
    const engine = new ScriptedEngine();
    const levelData = new LevelWriter().write(level);
    const started = startSimulation(levelData, engine, START);
    if (!started.ok) throw new Error(`The level was refused: ${JSON.stringify(started.refusal)}`);

    return { simulation: started.value, world: engine.world };
}

function runTicks(simulation: { runTick(inputs: typeof NOTHING_HELD): void }, count: number) {
    for (let i = 0; i < count; i++) {
        simulation.runTick(NOTHING_HELD);
    }
}

function reportedIds(poses: Float64Array) {
    const ids: number[] = [];

    for (let offset = 0; offset < poses.length; offset += POSE_STRIDE) {
        ids.push(poses[offset] ?? Number.NaN);
    }

    return ids;
}

describe('Simulation', () => {
    test('a child of a falling body follows it on screen', () => {
        const level = Level.createNew();
        const group = place(level, level.world, transform(100, 0));
        const crate = placeBody(level, group, transform(0, 50, 90, 2));
        const label = place(level, crate, transform(5, 0));
        const { simulation } = start(level);
        const playLabel = simulation.level.requireEntity(label.id);

        const labelAtStart = simulation.caches.worldMatrices.matrixOf(playLabel).apply({ x: 0, y: 0 });
        expect(labelAtStart.x).toBeCloseTo(100, 9);
        expect(labelAtStart.y).toBeCloseTo(60, 9);

        runTicks(simulation, 3);

        const labelPosition = simulation.caches.worldMatrices.matrixOf(playLabel).apply({ x: 0, y: 0 });
        expect(labelPosition.x).toBeCloseTo(100, 9);
        expect(labelPosition.y).toBeCloseTo(90, 9);
        expect(simulation.tick).toBe(3);
    });

    test("a body's bounds follow it", () => {
        const level = Level.createNew();
        const crate = placeBody(level, level.world, transform(0, 0));
        const { simulation } = start(level);
        const playCrate = simulation.level.requireEntity(crate.id);
        const bounds = simulation.caches.bounds;

        expect(bounds.ownBoundsOf(playCrate)?.top).toBeCloseTo(-10, 9);
        runTicks(simulation, 2);
        expect(bounds.ownBoundsOf(playCrate)?.top).toBeCloseTo(10, 9);
    });

    test('the report holds only the moved bodies, each once with its latest pose', () => {
        const level = Level.createNew();
        const floor = placeBody(level, level.world, transform(0, 300), 'static');
        const crate = placeBody(level, level.world, transform(40, 0));
        const { simulation } = start(level);

        runTicks(simulation, 3);
        const report = simulation.takeReport();

        expect(report.lastTick).toBe(3);
        expect(reportedIds(report.poses)).toEqual([crate.id]);
        expect([...report.poses]).toEqual([crate.id, 40, 30, 0, 0]);
        expect(reportedIds(report.poses)).not.toContain(floor.id);
        expect(report.removed).toEqual([]);
    });

    test('a report after no ticks is empty', () => {
        const level = Level.createNew();
        placeBody(level, level.world, transform(0, 0));
        const { simulation } = start(level);

        runTicks(simulation, 2);
        simulation.takeReport();
        const report = simulation.takeReport();

        expect(report.poses).toHaveLength(0);
        expect(report.lastTick).toBe(2);
    });

    test("the report's camera is the camera entity's level position", () => {
        const level = Level.createNew();
        level.camera.requireComponent(TransformComponent).set('position', { x: 320, y: 180 });
        const { simulation } = start(level);

        expect(simulation.takeReport().camera).toEqual({ x: 320, y: 180 });
    });

    test('stateHash changes when one body moves by one bit, and not when nothing moves', () => {
        const level = Level.createNew();
        const crate = placeBody(level, level.world, transform(0, 1));
        const { simulation, world } = start(level);
        world.falling = false;

        runTicks(simulation, 1);
        const before = simulation.stateHash();
        const sameAgain = simulation.stateHash();

        const oneBitLower = 1 - Number.EPSILON / 2;
        world.setNextPose(crate.id, { x: 0, y: oneBitLower, angle: 0 });
        runTicks(simulation, 1);
        const afterTheNudge = simulation.stateHash();
        world.setNextPose(crate.id, { x: 0, y: oneBitLower, angle: 0 });
        runTicks(simulation, 1);
        const atTheSameTick = { tick: simulation.tick, hash: simulation.stateHash() };

        expect(sameAgain).toBe(before);
        expect(before).toMatch(/^[0-9a-f]{8}$/);
        expect(afterTheNudge).not.toBe(before);
        expect(atTheSameTick.hash).not.toBe(afterTheNudge);
    });

    test('a level from a newer version is refused', () => {
        const engine = new ScriptedEngine();
        const levelData = new LevelWriter().write(Level.createNew());
        const fromTheFuture = { ...levelData, formatVersion: levelData.formatVersion + 1 };

        const started = startSimulation(fromTheFuture, engine, START);

        expect(started.ok).toBe(false);
    });
});
