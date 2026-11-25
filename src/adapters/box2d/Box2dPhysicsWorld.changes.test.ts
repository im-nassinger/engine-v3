import { beforeAll, describe, expect, test } from 'vitest';

import type { Point } from '../../core/geometry/index.ts';
import { BodyPoses } from '../../core/physics/index.ts';
import type { HingeMotor, PhysicsWorld } from '../../core/physics/index.ts';

import { Box2dPhysicsEngine } from './Box2dPhysicsEngine.ts';
import {
    EARTH_GRAVITY,
    NO_GRAVITY,
    bodyDefinition,
    boxPiece,
    stepTimes,
    surfaceDefinition,
} from './testing/worldTesting.ts';

const ONE_SECOND = 60;
const GROUND = 1;
const BOX = 2;
const MOTOR_OFF: HingeMotor = { motor: false, motorSpeed: 0, motorStrength: 0, resistance: 0 };

const engine = new Box2dPhysicsEngine();

beforeAll(async () => {
    await engine.load();
});

function addBox(world: PhysicsWorld, entity: number, position: Point, density = 1) {
    const body = world.createBody(bodyDefinition({ entity, position }));
    world.addSurface(body, surfaceDefinition({ entity, pieces: [boxPiece(40, 40)], density }));

    return body;
}

// A 1,000 px wide floor whose top is at y = 0.
function addFloor(world: PhysicsWorld, changes = {}) {
    const body = world.createBody(bodyDefinition({ entity: GROUND, type: 'static', position: { x: 0, y: 20 } }));
    world.addSurface(body, surfaceDefinition({ entity: GROUND, pieces: [boxPiece(1000, 40)], ...changes }));

    return body;
}

describe('Box2dPhysicsWorld: setPose', () => {
    test('teleports a body and keeps its speed', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY, pixelsPerMetre: 50 });
        const poses = new BodyPoses();
        const box = addBox(world, BOX, { x: 0, y: 0 });
        world.addVelocity(box, { x: 60, y: 0 });

        world.setPose(box, { x: 300, y: -100, angle: 30 });
        stepTimes(world, poses, 1);
        const pose = poses.poseOf(BOX);

        expect(pose?.x).toBeCloseTo(301, 3);
        expect(pose?.y).toBeCloseTo(-100, 3);
        expect(pose?.angle).toBeCloseTo(30, 3);
        world.destroy();
    });

    test('wakes a sleeping body, which then falls', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY, pixelsPerMetre: 50 });
        const poses = new BodyPoses();
        addFloor(world);
        const box = addBox(world, BOX, { x: 0, y: -20 });
        stepTimes(world, poses, 2 * ONE_SECOND);
        expect(stepTimes(world, poses, 1)).toEqual([]);

        world.setPose(box, { x: 0, y: -300, angle: 0 });

        expect(stepTimes(world, poses, 1)).toEqual([BOX]);
        expect(poses.poseOf(BOX)?.y).toBeGreaterThan(-300);
        world.destroy();
    });

    test('moves a Static body, whose surface then holds things there', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY, pixelsPerMetre: 50 });
        const poses = new BodyPoses();
        const floor = addFloor(world);
        addBox(world, BOX, { x: 0, y: 180 });

        world.setPose(floor, { x: 0, y: 220, angle: 0 });
        stepTimes(world, poses, ONE_SECOND);

        expect(poses.poseOf(BOX)?.y).toBeCloseTo(180, 0);
        world.destroy();
    });
});

describe('Box2dPhysicsWorld: addVelocity', () => {
    test('adds the same speed whatever the mass, on top of the speed it had', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY, pixelsPerMetre: 50 });
        const light = addBox(world, 2, { x: 0, y: 0 }, 0.1);
        const heavy = addBox(world, 3, { x: 0, y: 200 }, 10);

        for (const body of [light, heavy]) {
            world.addVelocity(body, { x: 300, y: -60 });
            world.addVelocity(body, { x: 300, y: 0 });
        }

        for (const body of [light, heavy]) {
            const { linear } = world.velocity(body);
            expect(linear.x).toBeCloseTo(600, 3);
            expect(linear.y).toBeCloseTo(-60, 3);
        }
        world.destroy();
    });

    test('wakes a sleeping body', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY, pixelsPerMetre: 50 });
        const poses = new BodyPoses();
        addFloor(world);
        const box = addBox(world, BOX, { x: 0, y: -20 });
        stepTimes(world, poses, 2 * ONE_SECOND);

        world.addVelocity(box, { x: 0, y: -600 });

        expect(stepTimes(world, poses, 1)).toEqual([BOX]);
        expect(poses.poseOf(BOX)?.y).toBeLessThan(-25);
        world.destroy();
    });

    test('a Static body keeps still', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY, pixelsPerMetre: 50 });
        const floor = addFloor(world);

        world.addVelocity(floor, { x: 600, y: 0 });

        expect(world.velocity(floor).linear).toEqual({ x: 0, y: 0 });
        world.destroy();
    });
});

describe('Box2dPhysicsWorld: setSurfaceSettings', () => {
    // How far a box pushed at 300 px/s slides along the floor in two seconds.
    function slide(friction: number, frictionAfterLanding: number) {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY, pixelsPerMetre: 50 });
        const poses = new BodyPoses();
        addFloor(world);
        const box = world.createBody(bodyDefinition({ entity: BOX, position: { x: 0, y: -20 }, fixedRotation: true }));
        const surface = { entity: BOX, pieces: [boxPiece(40, 40)], friction };
        world.addSurface(box, surfaceDefinition(surface));
        stepTimes(world, poses, 10);

        world.setSurfaceSettings(BOX, { friction: frictionAfterLanding, restitution: 0 });
        world.addVelocity(box, { x: 300, y: 0 });
        stepTimes(world, poses, 2 * ONE_SECOND);
        const x = poses.poseOf(BOX)?.x ?? 0;
        world.destroy();

        return x;
    }

    test('a new Friction acts on a surface already touching', () => {
        const unchanged = slide(1, 1);
        const madeIcy = slide(1, 0);

        expect(madeIcy).toBeGreaterThan(550);
        expect(unchanged).toBeLessThan(200);
    });

    // The highest point a box dropped from 200 px above the floor reaches after its first bounce.
    function bounceHeight(restitution: number) {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY, pixelsPerMetre: 50 });
        const poses = new BodyPoses();
        addFloor(world);
        addBox(world, BOX, { x: 0, y: -220 });
        world.setSurfaceSettings(BOX, { friction: 0.3, restitution });

        let landed = false;
        let highest = Infinity;
        for (let i = 0; i < 3 * ONE_SECOND; i++) {
            stepTimes(world, poses, 1);
            const y = poses.poseOf(BOX)?.y ?? 0;
            landed = landed || y > -25;
            highest = landed ? Math.min(highest, y) : highest;
        }
        world.destroy();

        return -20 - highest;
    }

    test('a new Restitution makes a surface bounce', () => {
        expect(bounceHeight(0)).toBeLessThan(5);
        expect(bounceHeight(0.8)).toBeGreaterThan(80);
    });

    test('an entity with no surface in the world changes nothing', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY, pixelsPerMetre: 50 });

        expect(() => world.setSurfaceSettings(99, { friction: 1, restitution: 1 })).not.toThrow();
        world.destroy();
    });
});

describe('Box2dPhysicsWorld: setMotor', () => {
    function pinnedWheel() {
        const world = engine.createWorld({ gravity: NO_GRAVITY, pixelsPerMetre: 50 });
        const ground = world.createBody(bodyDefinition({ entity: GROUND, type: 'static' }));
        const wheel = addBox(world, BOX, { x: 0, y: 0 });
        const joint = world.createJoint({
            type: 'hinge',
            entity: 10,
            bodyA: wheel,
            bodyB: ground,
            endA: { x: 0, y: 0 },
            endB: { x: 0, y: 0 },
            letConnectedObjectsCollide: false,
            limitRotation: false,
            minAngle: 0,
            maxAngle: 0,
            ...MOTOR_OFF,
        });

        return { world, wheel, joint };
    }

    test('switching the motor on turns a Hinge at its speed', () => {
        const { world, wheel, joint } = pinnedWheel();
        const poses = new BodyPoses();

        world.setMotor(joint, { motor: true, motorSpeed: 90, motorStrength: 1000, resistance: 0 });
        stepTimes(world, poses, ONE_SECOND);

        expect(world.velocity(wheel).spin).toBeCloseTo(90, 3);
        world.destroy();
    });

    test('switching it off with Resistance brakes the turning', () => {
        const { world, wheel, joint } = pinnedWheel();
        const poses = new BodyPoses();
        world.setMotor(joint, { motor: true, motorSpeed: 180, motorStrength: 1000, resistance: 0 });
        stepTimes(world, poses, ONE_SECOND);

        world.setMotor(joint, { ...MOTOR_OFF, resistance: 1000 });
        stepTimes(world, poses, ONE_SECOND);

        expect(world.velocity(wheel).spin).toBeCloseTo(0, 3);
        world.destroy();
    });

    test('a Hinge its body took does nothing, and a Rope has no motor', () => {
        const { world, wheel, joint } = pinnedWheel();
        const other = addBox(world, 3, { x: 100, y: 0 });
        const rope = world.createJoint({
            type: 'rope',
            entity: 11,
            bodyA: other,
            bodyB: wheel,
            endA: { x: 100, y: 0 },
            endB: { x: 0, y: 0 },
            letConnectedObjectsCollide: false,
            length: 100,
        });

        expect(() => world.setMotor(rope, MOTOR_OFF)).toThrow('no motor');
        world.destroyBody(wheel);
        expect(() => world.setMotor(joint, { ...MOTOR_OFF, motor: true })).not.toThrow();
        world.destroy();
    });
});
