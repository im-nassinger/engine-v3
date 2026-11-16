import { beforeAll, describe, expect, test } from 'vitest';

import { BodyPoses } from '../../core/physics/index.ts';

import { Box2dPhysicsEngine } from './Box2dPhysicsEngine.ts';
import { EARTH_GRAVITY, NO_GRAVITY, bodyDefinition, stepTimes } from './testing/worldTesting.ts';

// Box2D puts a body to sleep after half a second at rest.
const STEPS_TO_FALL_ASLEEP = 60;

const engine = new Box2dPhysicsEngine();

beforeAll(async () => {
    await engine.load();
});

describe('Box2dPhysicsEngine', () => {
    test('loading twice loads Box2D once', async () => {
        const twiceLoaded = new Box2dPhysicsEngine();
        const firstLoad = twiceLoaded.load();
        const secondLoad = twiceLoaded.load();

        expect(secondLoad).toBe(firstLoad);
        await firstLoad;
    });

    test('a world before loading is refused', () => {
        const notLoaded = new Box2dPhysicsEngine();

        expect(() => notLoaded.createWorld({ gravity: EARTH_GRAVITY })).toThrow('not loaded');
    });
});

describe('Box2dPhysicsWorld', () => {
    test('a Dynamic body falls about 245 px in its first 60 steps at the default gravity', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY });
        const poses = new BodyPoses();
        world.createBody(bodyDefinition({ entity: 3, position: { x: 100, y: 50 } }));

        stepTimes(world, poses, 60);
        const pose = poses.poseOf(3);

        expect(pose?.x).toBe(100);
        // Half of 9.8 m/s² for one second is 4.9 m, 245 px; Box2D's stepping adds a few pixels.
        expect(pose?.y).toBeGreaterThan(50 + 240);
        expect(pose?.y).toBeLessThan(50 + 255);
        world.destroy();
    });

    test('a Static body never moves', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY });
        const poses = new BodyPoses();
        world.createBody(bodyDefinition({ entity: 3, type: 'static' }));

        stepTimes(world, poses, 60);

        expect(poses.poseOf(3)).toBeUndefined();
        world.destroy();
    });

    test('a Kinematic body ignores gravity', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY });
        const poses = new BodyPoses();
        world.createBody(bodyDefinition({ entity: 3, type: 'kinematic' }));

        stepTimes(world, poses, 60);
        const pose = poses.poseOf(3) ?? { x: 0, y: 0 };

        expect(pose.x).toBe(0);
        expect(pose.y).toBe(0);
        world.destroy();
    });

    test('gravity scale scales the fall, and 0 floats', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY });
        const poses = new BodyPoses();
        world.createBody(bodyDefinition({ entity: 3, gravityScale: 2 }));
        world.createBody(bodyDefinition({ entity: 4, gravityScale: 1 }));
        world.createBody(bodyDefinition({ entity: 5, gravityScale: 0 }));

        stepTimes(world, poses, 30);

        expect(poses.poseOf(3)?.y).toBeCloseTo(2 * (poses.poseOf(4)?.y ?? 0), 6);
        expect(poses.poseOf(5)?.y ?? 0).toBe(0);
        world.destroy();
    });

    test('linear damping slows the fall', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY });
        const poses = new BodyPoses();
        world.createBody(bodyDefinition({ entity: 3, linearDamping: 2 }));
        world.createBody(bodyDefinition({ entity: 4 }));

        stepTimes(world, poses, 60);

        expect(poses.poseOf(3)?.y).toBeLessThan(poses.poseOf(4)?.y ?? 0);
        world.destroy();
    });

    test('positions and angles come back in pixels and degrees', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY });
        const poses = new BodyPoses();
        world.createBody(bodyDefinition({ entity: 3, position: { x: 400, y: -250 }, angle: 30 }));
        world.setGravity(EARTH_GRAVITY);

        stepTimes(world, poses, 1);
        const pose = poses.poseOf(3);

        expect(pose?.x).toBeCloseTo(400, 3);
        // Box2D keeps 32-bit floats, so a pose comes back within their rounding.
        expect(pose?.angle).toBeCloseTo(30, 5);
        world.destroy();
    });

    test('a sleeping body wakes when gravity changes', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY });
        const poses = new BodyPoses();
        world.createBody(bodyDefinition({ entity: 3 }));

        const movesWhileAsleep = stepTimes(world, poses, STEPS_TO_FALL_ASLEEP);
        expect(movesWhileAsleep).toEqual([]);

        world.setGravity(EARTH_GRAVITY);
        const movesAfterGravity = stepTimes(world, poses, 1);

        expect(movesAfterGravity).toEqual([3]);
        expect(poses.poseOf(3)?.y).toBeGreaterThan(0);
        world.destroy();
    });

    test('only the bodies that moved are reported, by their entity', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY });
        const poses = new BodyPoses();
        world.createBody(bodyDefinition({ entity: 3, type: 'static' }));
        world.createBody(bodyDefinition({ entity: 8 }));

        const moved = stepTimes(world, poses, 1);

        expect(moved).toEqual([8]);
        world.destroy();
    });

    test('a destroyed body stops moving and its handle is refused after', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY });
        const poses = new BodyPoses();
        const handle = world.createBody(bodyDefinition({ entity: 3 }));

        world.destroyBody(handle);
        const moved = stepTimes(world, poses, 5);

        expect(moved).toEqual([]);
        expect(() => world.destroyBody(handle)).toThrow("doesn't exist");
        world.destroy();
    });

    test('a destroyed world refuses every call', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY });
        world.destroy();

        expect(() => world.step()).toThrow('destroyed');
    });

    test('two runs give the same numbers bit for bit', () => {
        function run() {
            const world = engine.createWorld({ gravity: { x: 1.3, y: 9.8 } });
            const poses = new BodyPoses();
            world.createBody(bodyDefinition({ entity: 3, position: { x: 12.345, y: -7.5 }, angle: 17 }));
            world.createBody(bodyDefinition({ entity: 4, gravityScale: 0.7, linearDamping: 0.3 }));
            stepTimes(world, poses, 120);
            world.destroy();

            return [poses.poseOf(3), poses.poseOf(4)];
        }

        const first = run();
        const second = run();

        expect(second).toStrictEqual(first);
        for (let i = 0; i < first.length; i++) {
            expect(Object.is(first[i]?.y, second[i]?.y)).toBe(true);
        }
    });
});
