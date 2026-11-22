import { beforeAll, describe, expect, test } from 'vitest';

import {
    BodyComponent,
    PhysicsWorldComponent,
    ShapeComponent,
    SurfaceComponent,
    TransformComponent,
} from '../../core/components/index.ts';
import { LevelWriter } from '../../core/level-data/index.ts';
import { Level } from '../../core/level/index.ts';
import type { Entity } from '../../core/level/index.ts';
import { startSimulation } from '../../core/simulation/index.ts';

import { Box2dPhysicsEngine } from './Box2dPhysicsEngine.ts';

const NOTHING_HELD = { heldKeys: [], pressedKeys: [] };
const START = { clockTimeMs: 0 };
const ORIGIN = { x: 0, y: 0 };

const engine = new Box2dPhysicsEngine();

beforeAll(async () => {
    await engine.load();
});

function place(level: Level, parent: Entity, x: number, y: number) {
    const entity = level.createEntity(parent, parent.children.length);
    const values = { position: { x, y }, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 };
    entity.addComponent(new TransformComponent(values));

    return entity;
}

// A falling crate with a label on it, above a Static floor.
function crateLevel() {
    const level = Level.createNew();
    const crate = place(level, level.world, 0, 0);
    crate.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 40, height: 40 } }));
    crate.addComponent(new SurfaceComponent());
    crate.addComponent(new BodyComponent());
    const label = place(level, crate, 0, -30);
    const floor = place(level, level.world, 0, 300);
    floor.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 400, height: 20 } }));
    floor.addComponent(new SurfaceComponent());

    return { levelData: new LevelWriter().write(level), crate, label };
}

function startCrateLevel() {
    const { levelData, crate, label } = crateLevel();
    const started = startSimulation(levelData, engine, START);
    if (!started.ok) throw new Error('The crate level was refused.');

    return { simulation: started.value, crate, label };
}

// A crate falling in a level 400 px square, whose bottom edge is at y 200.
function startSmallLevel(walls: boolean) {
    const level = Level.createNew();
    level.world.requireComponent(ShapeComponent).set('geometry', { kind: 'rectangle', width: 400, height: 400 });
    level.world.requireComponent(PhysicsWorldComponent).set('walls', walls);
    const crate = place(level, level.world, 0, 0);
    crate.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 40, height: 40 } }));
    crate.addComponent(new SurfaceComponent());
    crate.addComponent(new BodyComponent());
    const started = startSimulation(new LevelWriter().write(level), engine, START);
    if (!started.ok) throw new Error('The small level was refused.');

    return { simulation: started.value, crate };
}

describe('a Simulation with Box2D', () => {
    test('a label on a falling crate follows it, and the crate lands on the floor', () => {
        const { simulation, crate, label } = startCrateLevel();
        const playCrate = simulation.level.requireEntity(crate.id);
        const playLabel = simulation.level.requireEntity(label.id);
        const matrices = simulation.caches.worldMatrices;

        for (let i = 0; i < 60; i++) {
            simulation.runTick(NOTHING_HELD);
        }
        const crateAfterASecond = matrices.matrixOf(playCrate).apply(ORIGIN);
        const labelAfterASecond = matrices.matrixOf(playLabel).apply(ORIGIN);

        expect(crateAfterASecond.y).toBeGreaterThan(200);
        expect(labelAfterASecond.y - crateAfterASecond.y).toBeCloseTo(-30, 6);

        for (let i = 0; i < 120; i++) {
            simulation.runTick(NOTHING_HELD);
        }
        const restingCrate = matrices.matrixOf(playCrate).apply(ORIGIN);
        expect(restingCrate.y).toBeCloseTo(270, 0);

        simulation.destroy();
    });

    test('two runs of one level give the same hashes tick by tick', () => {
        const first = startCrateLevel().simulation;
        const second = startCrateLevel().simulation;

        for (let i = 0; i < 120; i++) {
            first.runTick(NOTHING_HELD);
            second.runTick(NOTHING_HELD);
            expect(second.stateHash()).toBe(first.stateHash());
        }

        first.destroy();
        second.destroy();
    });

    test('a crate falling out of open bounds is removed, and with Walls on it lands on the bottom edge', () => {
        const open = startSmallLevel(false);
        const walled = startSmallLevel(true);

        for (let i = 0; i < 180; i++) {
            open.simulation.runTick(NOTHING_HELD);
            walled.simulation.runTick(NOTHING_HELD);
        }

        expect(open.simulation.level.findEntity(open.crate.id)).toBeUndefined();
        expect(open.simulation.takeReport().removed).toEqual([open.crate.id]);
        const playCrate = walled.simulation.level.requireEntity(walled.crate.id);
        const restingCrate = walled.simulation.caches.worldMatrices.matrixOf(playCrate).apply(ORIGIN);
        expect(restingCrate.y).toBeCloseTo(180, 0);
        expect(walled.simulation.takeReport().removed).toEqual([]);

        open.simulation.destroy();
        walled.simulation.destroy();
    });
});
