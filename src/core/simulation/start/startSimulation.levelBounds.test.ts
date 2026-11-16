import { describe, expect, test } from 'vitest';

import { PhysicsWorldComponent, ShapeComponent } from '../../components/index.ts';
import { LevelWriter } from '../../level-data/index.ts';
import { Level } from '../../level/index.ts';

import { ScriptedEngine } from '../testing/ScriptedPhysics.ts';
import { place, placeBody, runTicks, transform } from '../testing/scriptedLevel.ts';

import { startSimulation } from './startSimulation.ts';

const START = { clockTimeMs: 0 };

// The level written and read back, as the game worker will get it, run on a ScriptedWorld.
function startScripted(level: Level) {
    const engine = new ScriptedEngine();
    const levelData = new LevelWriter().write(level);
    const started = startSimulation(levelData, engine, START);
    if (!started.ok) throw new Error(`The level was refused: ${JSON.stringify(started.refusal)}`);

    return { simulation: started.value, world: engine.world };
}

// A level 1,000 px square, so its bottom edge is at y 500. A 20 px square at y 490 is fully below it once
// it has fallen 21 px, on the third tick.
function smallLevel(walls = false) {
    const level = Level.createNew();
    level.world.requireComponent(ShapeComponent).set('geometry', { kind: 'rectangle', width: 1000, height: 1000 });
    level.world.requireComponent(PhysicsWorldComponent).set('walls', walls);

    return level;
}

describe('LevelBoundsPhase', () => {
    test('a body falling fully out of open bounds is removed with everything inside it', () => {
        const level = smallLevel();
        const crate = placeBody(level, level.world, transform(0, 490));
        const label = place(level, crate, transform(0, -5));
        const { simulation, world } = startScripted(level);

        runTicks(simulation, 2);
        expect(simulation.level.findEntity(crate.id)).toBeDefined();

        runTicks(simulation, 1);
        const report = simulation.takeReport();

        expect(simulation.level.findEntity(crate.id)).toBeUndefined();
        expect(simulation.level.findEntity(label.id)).toBeUndefined();
        expect(world.destroyedEntities).toEqual([crate.id]);
        expect(report.removed).toEqual([crate.id]);
        expect(report.removedPastHardLimit).toEqual([]);
        expect(report.poses).toHaveLength(0);
        expect(simulation.stateHash()).toMatch(/^[0-9a-f]{8}$/);
    });

    test('a body touching the edge is still inside', () => {
        const level = smallLevel();
        const crate = placeBody(level, level.world, transform(0, 490));
        const { simulation, world } = startScripted(level);
        world.falling = false;

        world.setNextPose(crate.id, { x: 0, y: 510, angle: 0 });
        runTicks(simulation, 1);

        expect(simulation.level.findEntity(crate.id)).toBeDefined();
    });

    test('with Walls on, nothing is removed for leaving the bounds', () => {
        const level = smallLevel(true);
        const crate = placeBody(level, level.world, transform(0, 490));
        const { simulation } = startScripted(level);

        runTicks(simulation, 10);

        expect(simulation.level.findEntity(crate.id)).toBeDefined();
        expect(simulation.takeReport().removed).toEqual([]);
    });

    test('a body starting outside stays until it has been inside, and is removed when it leaves again', () => {
        const level = smallLevel();
        const crate = placeBody(level, level.world, transform(0, -560));
        const { simulation } = startScripted(level);

        runTicks(simulation, 5);
        expect(simulation.level.findEntity(crate.id)).toBeDefined();

        // In through the top edge after 5 ticks, out through the bottom about 100 ticks later.
        runTicks(simulation, 110);
        expect(simulation.level.findEntity(crate.id)).toBeUndefined();
    });

    test('a body that never comes inside is never removed', () => {
        const level = smallLevel();
        const crate = placeBody(level, level.world, transform(2000, 0));
        const { simulation, world } = startScripted(level);
        world.falling = false;

        world.setNextPose(crate.id, { x: 3000, y: 0, angle: 0 });
        runTicks(simulation, 3);

        expect(simulation.level.findEntity(crate.id)).toBeDefined();
    });

    test('a body past the hard limit is removed and named, even with Walls on', () => {
        const level = smallLevel(true);
        const crate = placeBody(level, level.world, transform(0, 0));
        const atTheLimit = placeBody(level, level.world, transform(50, 0));
        const { simulation, world } = startScripted(level);
        world.falling = false;

        world.setNextPose(crate.id, { x: 0, y: -100_001, angle: 0 });
        world.setNextPose(atTheLimit.id, { x: 100_000, y: 0, angle: 0 });
        runTicks(simulation, 1);
        const report = simulation.takeReport();

        expect(simulation.level.findEntity(crate.id)).toBeUndefined();
        expect(simulation.level.findEntity(atTheLimit.id)).toBeDefined();
        expect(report.removed).toEqual([crate.id]);
        expect(report.removedPastHardLimit).toEqual([crate.id]);
    });

    test('a body inside a removed body leaves the physics world too, and only the top one is reported', () => {
        const level = smallLevel();
        const cart = placeBody(level, level.world, transform(0, 490));
        const passenger = placeBody(level, cart, transform(0, 0));
        const { simulation, world } = startScripted(level);

        runTicks(simulation, 3);
        const report = simulation.takeReport();

        expect(simulation.level.findEntity(passenger.id)).toBeUndefined();
        expect([...world.destroyedEntities].sort()).toEqual([cart.id, passenger.id].sort());
        expect(report.removed).toEqual([cart.id]);
        expect(report.poses).toHaveLength(0);
    });
});
