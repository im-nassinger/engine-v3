import { beforeAll, describe, expect, test } from 'vitest';

import type { Point } from '../../core/geometry/index.ts';
import { BodyPoses } from '../../core/physics/index.ts';
import type { BodyHandle, HingeDefinition, PhysicsWorld } from '../../core/physics/index.ts';

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
const DOOR = 2;

const engine = new Box2dPhysicsEngine();

beforeAll(async () => {
    await engine.load();
});

function hinge(changes: Partial<HingeDefinition> & Pick<HingeDefinition, 'bodyA' | 'bodyB'>): HingeDefinition {
    return {
        type: 'hinge',
        entity: 10,
        endA: { x: 0, y: 0 },
        endB: { x: 0, y: 0 },
        letConnectedObjectsCollide: false,
        limitRotation: false,
        minAngle: -45,
        maxAngle: 45,
        motor: false,
        motorSpeed: 180,
        motorStrength: 50,
        resistance: 0,
        ...changes,
    };
}

function addBox(world: PhysicsWorld, entity: number, position: Point, angle = 0, size = 40): BodyHandle {
    const body = world.createBody(bodyDefinition({ entity, position, angle }));
    world.addSurface(body, surfaceDefinition({ entity, pieces: [boxPiece(size, size)] }));

    return body;
}

function addGround(world: PhysicsWorld, angle = 0) {
    return world.createBody(bodyDefinition({ entity: GROUND, type: 'static', angle }));
}

// A 40 px box whose centre is 40 px right of a pin at the origin, so gravity swings it clockwise.
function pinnedDoor(gravity: Point, changes: Partial<HingeDefinition> = {}, doorAngle = 0) {
    const world = engine.createWorld({ gravity, pixelsPerMetre: 50 });
    const ground = addGround(world);
    const door = addBox(world, DOOR, { x: 40, y: 0 }, doorAngle);
    world.createJoint(hinge({ bodyA: door, bodyB: ground, ...changes }));

    return { world, door };
}

// Every pose of the door, one per step.
function doorPoses(world: PhysicsWorld, steps: number) {
    const poses = new BodyPoses();
    const trail = [];

    for (let i = 0; i < steps; i++) {
        stepTimes(world, poses, 1);
        const pose = poses.poseOf(DOOR);
        if (pose !== undefined) {
            trail.push(pose);
        }
    }

    return trail;
}

describe("Box2dPhysicsWorld's Hinge", () => {
    test('a box pinned off its centre swings past the bottom and comes back, keeping its distance', () => {
        const { world } = pinnedDoor(EARTH_GRAVITY);

        const trail = doorPoses(world, 4 * ONE_SECOND);
        const lowestX = Math.min(...trail.map((pose) => pose.x));
        const lastSwingBack = trail.findLastIndex((pose) => pose.x > 30);

        expect(lowestX).toBeLessThan(-30);
        expect(lastSwingBack).toBeGreaterThan(trail.findIndex((pose) => pose.x < -30));
        for (const pose of trail) {
            expect(Math.hypot(pose.x, pose.y)).toBeCloseTo(40, 0);
        }
        world.destroy();
    });

    test('with Limit rotation the door stops at Max angle turning clockwise and at Min angle the other way', () => {
        const clockwise = pinnedDoor(EARTH_GRAVITY, { limitRotation: true, minAngle: -10, maxAngle: 30 });
        const turnedRight = doorPoses(clockwise.world, ONE_SECOND).map((pose) => pose.angle);

        expect(Math.max(...turnedRight)).toBeCloseTo(30, 0);
        expect(turnedRight.at(-1)).toBeCloseTo(30, 0);
        clockwise.world.destroy();

        const world = engine.createWorld({ gravity: EARTH_GRAVITY, pixelsPerMetre: 50 });
        const ground = addGround(world);
        const door = addBox(world, DOOR, { x: -40, y: 0 });
        world.createJoint(hinge({ bodyA: door, bodyB: ground, limitRotation: true, minAngle: -30, maxAngle: 10 }));
        const turnedLeft = doorPoses(world, ONE_SECOND).map((pose) => pose.angle);

        expect(Math.min(...turnedLeft)).toBeCloseTo(-30, 0);
        expect(turnedLeft.at(-1)).toBeCloseTo(-30, 0);
        world.destroy();
    });

    test('limits count from how the joint was built, not from the level', () => {
        const { world } = pinnedDoor(EARTH_GRAVITY, { limitRotation: true, minAngle: -10, maxAngle: 10 }, 60);

        const angles = doorPoses(world, ONE_SECOND).map((pose) => pose.angle);

        expect(Math.max(...angles)).toBeCloseTo(70, 0);
        world.destroy();
    });

    test('limits count from the bodies placed, whatever the angle of B', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY, pixelsPerMetre: 50 });
        const ground = addGround(world, 90);
        const door = addBox(world, DOOR, { x: 40, y: 0 });
        world.createJoint(hinge({ bodyA: door, bodyB: ground, limitRotation: true, minAngle: -10, maxAngle: 10 }));

        const angles = doorPoses(world, ONE_SECOND).map((pose) => pose.angle);

        expect(Math.max(...angles)).toBeCloseTo(10, 0);
        world.destroy();
    });

    test('a motor turns a wheel at its speed, clockwise for a positive one', () => {
        for (const motorSpeed of [180, -90]) {
            const world = engine.createWorld({ gravity: NO_GRAVITY, pixelsPerMetre: 50 });
            const ground = addGround(world);
            const wheel = addBox(world, DOOR, { x: 0, y: 0 });
            world.createJoint(hinge({ bodyA: wheel, bodyB: ground, motor: true, motorSpeed }));

            const angles = doorPoses(world, ONE_SECOND).map((pose) => pose.angle);

            expect(world.velocity(wheel).spin).toBeCloseTo(motorSpeed, 3);
            expect(Math.sign(angles.at(-1) ?? 0)).toBe(Math.sign(motorSpeed));
            world.destroy();
        }
    });

    test('a motor too weak for its load never reaches its speed', () => {
        const { world, door } = pinnedDoor(EARTH_GRAVITY, { motor: true, motorSpeed: -180, motorStrength: 0.01 });

        doorPoses(world, ONE_SECOND / 2);

        expect(world.velocity(door).spin).toBeGreaterThan(0);
        world.destroy();
    });

    test('Resistance slows a spinning wheel, and does nothing while Motor is on', () => {
        const spinAfterHalfASecond = (changes: Partial<HingeDefinition>) => {
            const world = engine.createWorld({ gravity: NO_GRAVITY, pixelsPerMetre: 50 });
            const ground = addGround(world);
            const wheel = addBox(world, DOOR, { x: 0, y: 0 });
            world.createJoint(hinge({ bodyA: wheel, bodyB: ground, ...changes }));
            world.setVelocity(wheel, { linear: { x: 0, y: 0 }, spin: 360 });
            doorPoses(world, ONE_SECOND / 2);
            const spin = world.velocity(wheel).spin;
            world.destroy();

            return spin;
        };

        const free = spinAfterHalfASecond({});
        const resisted = spinAfterHalfASecond({ resistance: 0.5 });
        const motorOn = spinAfterHalfASecond({ resistance: 0.5, motor: true, motorSpeed: 360, motorStrength: 1000 });

        expect(free).toBeCloseTo(360, 3);
        expect(resisted).toBeLessThan(free / 2);
        expect(resisted).toBeGreaterThan(0);
        expect(motorOn).toBeCloseTo(360, 3);
    });

    test('Let connected objects collide pushes apart two overlapping hinged boxes, and only then', () => {
        const distanceAfterASecond = (letConnectedObjectsCollide: boolean) => {
            const world = engine.createWorld({ gravity: NO_GRAVITY, pixelsPerMetre: 50 });
            const poses = new BodyPoses();
            const car = addBox(world, 3, { x: 0, y: 0 }, 0, 60);
            const wheel = addBox(world, DOOR, { x: 10, y: 0 });
            world.createJoint(
                hinge({
                    bodyA: wheel,
                    bodyB: car,
                    endA: { x: 10, y: 0 },
                    endB: { x: 10, y: 0 },
                    letConnectedObjectsCollide,
                }),
            );
            stepTimes(world, poses, ONE_SECOND);
            const carPose = poses.poseOf(3) ?? { x: 0, y: 0 };
            world.destroy();

            return Math.abs(carPose.x);
        };

        expect(distanceAfterASecond(false)).toBe(0);
        expect(distanceAfterASecond(true)).toBeGreaterThan(1);
    });

    test('each body keeps its own end: a hinge between two separate points pulls them together', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY, pixelsPerMetre: 50 });
        const ground = addGround(world);
        const door = addBox(world, DOOR, { x: 40, y: 0 });
        world.createJoint(hinge({ bodyA: door, bodyB: ground, endA: { x: 40, y: 0 }, endB: { x: 0, y: 0 } }));

        const trail = doorPoses(world, ONE_SECOND);

        expect(Math.hypot(trail.at(-1)?.x ?? 0, trail.at(-1)?.y ?? 0)).toBeLessThan(1);
        world.destroy();
    });

    test('a destroyed joint lets go, and destroying one its body took does nothing', () => {
        const { world, door } = pinnedDoor(EARTH_GRAVITY);
        const ground = 0;
        const joint = world.createJoint(hinge({ bodyA: door, bodyB: ground }));
        world.destroyJoint(0);
        world.destroyJoint(joint);

        const trail = doorPoses(world, ONE_SECOND);

        expect(trail.at(-1)?.x).toBeCloseTo(40, 3);
        expect(trail.at(-1)?.y).toBeGreaterThan(200);

        const second = pinnedDoor(EARTH_GRAVITY);
        second.world.destroyBody(second.door);
        expect(() => {
            second.world.destroyJoint(0);
        }).not.toThrow();
        expect(() => {
            second.world.destroyJoint(0);
        }).toThrow("doesn't exist");
        world.destroy();
        second.world.destroy();
    });

    test('a joint with both ends on one body is refused', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY, pixelsPerMetre: 50 });
        const door = addBox(world, DOOR, { x: 0, y: 0 });

        expect(() => world.createJoint(hinge({ bodyA: door, bodyB: door }))).toThrow('two different bodies');
        world.destroy();
    });

    test('two runs match bit for bit', () => {
        const run = () => {
            const { world } = pinnedDoor(EARTH_GRAVITY, {
                limitRotation: true,
                minAngle: -20,
                maxAngle: 120,
                resistance: 0.02,
            });
            const trail = doorPoses(world, 3 * ONE_SECOND);
            world.destroy();

            return trail;
        };

        expect(run()).toEqual(run());
    });

    // Box2D 3.2 clamps both limits to ±180°, so the requirement's Min and Max angle stop there too.
    test('Box2D 3.2 holds a limit to 180°: a door with a Max angle of 270° stops just under 180°', () => {
        const turnedTo = (maxAngle: number) => {
            const changes = {
                limitRotation: true,
                minAngle: -10,
                maxAngle,
                motor: true,
                motorSpeed: 360,
                motorStrength: 10,
            };
            const { world } = pinnedDoor(NO_GRAVITY, changes);
            const angles = doorPoses(world, 2 * ONE_SECOND).map((pose) => pose.angle);
            world.destroy();

            return { highest: Math.max(...angles), last: angles.at(-1) ?? 0 };
        };

        const stopped = turnedTo(170);
        const clamped = turnedTo(270);

        // A limit is soft: a motor pressing on it pushes a little past.
        expect(stopped.highest).toBeLessThan(172);
        expect(stopped.last).toBeGreaterThan(168);
        expect(clamped.highest).toBeLessThan(180);
        expect(clamped.last).toBeGreaterThan(175);
    });
});
