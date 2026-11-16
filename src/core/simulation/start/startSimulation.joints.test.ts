import { describe, expect, test } from 'vitest';

import { JointComponent, PathComponent, PhysicsWorldComponent, ShapeComponent } from '../../components/index.ts';
import type { JointValues } from '../../components/index.ts';
import type { EntityId } from '../../fields/index.ts';
import type { Point } from '../../geometry/index.ts';
import { LevelWriter } from '../../level-data/index.ts';
import { Level } from '../../level/index.ts';
import type { Entity } from '../../level/index.ts';
import { jointPathPoints } from '../../physics/index.ts';

import type { Simulation } from '../run/Simulation.ts';
import { ScriptedEngine } from '../testing/ScriptedPhysics.ts';
import { place, placeBody, runTicks, transform } from '../testing/scriptedLevel.ts';

import { startSimulation } from './startSimulation.ts';

const START = { clockTimeMs: 0 };
const ORIGIN = { x: 0, y: 0 };

function startScripted(level: Level) {
    const engine = new ScriptedEngine();
    const levelData = new LevelWriter().write(level);
    const started = startSimulation(levelData, engine, START);
    if (!started.ok) throw new Error(`The level was refused: ${JSON.stringify(started.refusal)}`);

    return { simulation: started.value, world: engine.world };
}

// A joint at the level's origin, so its ends are in level positions too.
function placeJoint(level: Level, values: Partial<JointValues>) {
    const joint = place(level, level.world, transform(0, 0));
    joint.addComponent(new JointComponent({ ...JointComponent.schema.defaults(), ...values }));
    if (values.type === 'rope' || values.type === 'spring') {
        const ends = values.ends ?? { a: ORIGIN, b: ORIGIN };
        joint.addComponent(new PathComponent({ path: jointPathPoints(values.type, ends.a, ends.b) }));
    }

    return joint;
}

function pathPointsOf(simulation: Simulation, joint: Entity) {
    const playJoint = simulation.level.findEntity(joint.id);
    const path = playJoint?.requireComponent(PathComponent).get('path');

    return path?.points.map(({ x, y }) => ({ x, y }));
}

function levelPositionOf(simulation: Simulation, id: EntityId, point: Point = ORIGIN) {
    const entity = simulation.level.findEntity(id);
    if (entity === undefined) throw new Error(`Entity ${id} is not in the run.`);

    return simulation.caches.worldMatrices.matrixOf(entity).apply(point);
}

describe('joints in play', () => {
    test("a Rope's path follows a swinging weight, and the joint moves with its A", () => {
        const level = Level.createNew();
        const anchor = placeBody(level, level.world, transform(0, 0), 'static');
        const weight = placeBody(level, level.world, transform(0, 100));
        const ends = { a: { x: 0, y: 100 }, b: { x: 0, y: 0 } };
        const rope = placeJoint(level, { type: 'rope', a: weight.id, b: anchor.id, ends });
        const { simulation, world } = startScripted(level);
        world.falling = false;

        world.setNextPose(weight.id, { x: 50, y: 90, angle: 0 });
        runTicks(simulation, 1);

        // The joint moved by the weight's 50 across and 10 up, so the anchor's end is that much the other way.
        expect(levelPositionOf(simulation, rope.id)).toEqual({ x: 50, y: -10 });
        expect(pathPointsOf(simulation, rope)).toEqual([
            { x: 0, y: 100 },
            { x: -50, y: 10 },
        ]);
        expect(simulation.takeReport().paths.map((changed) => changed.entity)).toEqual([rope.id]);
    });

    test("a Hinge's icon position and its children follow its wheel as it turns", () => {
        const level = Level.createNew();
        const wheel = placeBody(level, level.world, transform(100, 0));
        const hinge = placeJoint(level, { a: wheel.id, ends: { a: { x: 110, y: 0 }, b: ORIGIN } });
        const label = place(level, hinge, transform(0, -5));
        const { simulation, world } = startScripted(level);
        world.falling = false;

        world.setNextPose(wheel.id, { x: 130, y: 20, angle: 90 });
        runTicks(simulation, 1);

        const hingePosition = levelPositionOf(simulation, hinge.id);
        expect(hingePosition.x).toBeCloseTo(130, 9);
        expect(hingePosition.y).toBeCloseTo(-80, 9);
        const labelPosition = levelPositionOf(simulation, label.id);
        expect(labelPosition.x).toBeCloseTo(135, 9);
        expect(labelPosition.y).toBeCloseTo(-80, 9);
        // The hinge point itself, 10 px right of the wheel's centre at the start, turned a quarter.
        const hingePoint = levelPositionOf(simulation, hinge.id, { x: 110, y: 0 });
        expect(hingePoint.x).toBeCloseTo(130, 9);
        expect(hingePoint.y).toBeCloseTo(30, 9);
        expect(simulation.takeReport().paths).toEqual([]);
    });

    test('a body leaving through an open edge takes its joints with it, listed in removed', () => {
        const level = Level.createNew();
        level.world.requireComponent(ShapeComponent).set('geometry', { kind: 'rectangle', width: 1000, height: 1000 });
        level.world.requireComponent(PhysicsWorldComponent).set('walls', false);
        const anchor = placeBody(level, level.world, transform(0, 0), 'static');
        const crate = placeBody(level, level.world, transform(0, 490));
        const rope = placeJoint(level, {
            type: 'rope',
            a: crate.id,
            b: anchor.id,
            ends: { a: { x: 0, y: 490 }, b: ORIGIN },
        });
        const pin = placeJoint(level, { a: crate.id, ends: { a: { x: 0, y: 490 }, b: ORIGIN } });
        const { simulation, world } = startScripted(level);

        runTicks(simulation, 3);
        const report = simulation.takeReport();

        expect(simulation.level.findEntity(crate.id)).toBeUndefined();
        expect(simulation.level.findEntity(rope.id)).toBeUndefined();
        expect(simulation.level.findEntity(pin.id)).toBeUndefined();
        expect(simulation.level.findEntity(anchor.id)).toBeDefined();
        expect(report.removed).toEqual([crate.id, rope.id, pin.id]);
        expect(report.removedPastHardLimit).toEqual([]);
        expect(report.paths).toEqual([]);
        expect(world.destroyedJoints).toEqual([0, 1]);

        runTicks(simulation, 1);
        expect(simulation.takeReport().removed).toEqual([]);
    });

    test('the report holds only the paths that changed', () => {
        const level = Level.createNew();
        const anchor = placeBody(level, level.world, transform(0, 0), 'static');
        const moving = placeBody(level, level.world, transform(100, 0));
        const resting = placeBody(level, level.world, transform(-100, 0));
        const movingSpring = placeJoint(level, {
            type: 'spring',
            a: moving.id,
            b: anchor.id,
            ends: { a: { x: 100, y: 0 }, b: ORIGIN },
        });
        placeJoint(level, { type: 'rope', a: resting.id, b: anchor.id, ends: { a: { x: -100, y: 0 }, b: ORIGIN } });
        const { simulation, world } = startScripted(level);
        world.falling = false;

        runTicks(simulation, 1);
        expect(simulation.takeReport().paths).toEqual([]);

        world.setNextPose(moving.id, { x: 120, y: 0, angle: 0 });
        runTicks(simulation, 1);
        world.setNextPose(moving.id, { x: 140, y: 0, angle: 0 });
        runTicks(simulation, 1);
        const report = simulation.takeReport();

        expect(report.paths.map((changed) => changed.entity)).toEqual([movingSpring.id]);
        const latest = report.paths[0]?.path.points;
        expect(latest?.at(0)).toMatchObject({ x: 100, y: 0 });
        expect(latest?.at(-1)).toMatchObject({ x: -40, y: 0 });
    });
});
