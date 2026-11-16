import { beforeAll, describe, expect, test } from 'vitest';

import type { Point } from '../../core/geometry/index.ts';
import { BodyPoses } from '../../core/physics/index.ts';
import type { BodyHandle, PhysicsWorld, RopeDefinition, SpringDefinition } from '../../core/physics/index.ts';

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
const WEIGHT = 2;

const engine = new Box2dPhysicsEngine();

beforeAll(async () => {
    await engine.load();
});

type Ends = Pick<RopeDefinition, 'bodyA' | 'bodyB' | 'endA'>;

function rope(ends: Ends, length: number): RopeDefinition {
    return {
        type: 'rope',
        entity: 10,
        endB: { x: 0, y: 0 },
        letConnectedObjectsCollide: true,
        length,
        ...ends,
    };
}

function spring(ends: Ends, changes: Partial<SpringDefinition> = {}): SpringDefinition {
    return {
        type: 'spring',
        entity: 10,
        endB: { x: 0, y: 0 },
        letConnectedObjectsCollide: true,
        restLength: 100,
        stiffness: 2,
        damping: 0,
        ...ends,
        ...changes,
    };
}

function addWeight(world: PhysicsWorld, position: Point): BodyHandle {
    const body = world.createBody(bodyDefinition({ entity: WEIGHT, position }));
    world.addSurface(body, surfaceDefinition({ entity: WEIGHT, pieces: [boxPiece(20, 20)] }));

    return body;
}

// A weight whose centre is tied to a ground point at the origin.
function hangingWeight(gravity: Point, start: Point, join: (ends: Ends) => RopeDefinition | SpringDefinition) {
    const world = engine.createWorld({ gravity });
    const ground = world.createBody(bodyDefinition({ entity: GROUND, type: 'static' }));
    const weight = addWeight(world, start);
    world.createJoint(join({ bodyA: weight, bodyB: ground, endA: start }));

    return { world, weight };
}

// The weight's distance from the origin after each step.
function distances(world: PhysicsWorld, steps: number) {
    const poses = new BodyPoses();
    const trail: number[] = [];

    for (let i = 0; i < steps; i++) {
        stepTimes(world, poses, 1);
        const pose = poses.poseOf(WEIGHT);
        trail.push(pose === undefined ? (trail.at(-1) ?? 0) : Math.hypot(pose.x, pose.y));
    }

    return trail;
}

// How many times a trail crosses a value going up.
function upwardCrossings(trail: readonly number[], value: number) {
    let crossings = 0;
    for (let i = 1; i < trail.length; i++) {
        if ((trail[i - 1] ?? 0) < value && (trail[i] ?? 0) >= value) {
            crossings++;
        }
    }

    return crossings;
}

describe("Box2dPhysicsWorld's Rope", () => {
    test('a weight hanging on a Rope falls freely, then stops at its Length', () => {
        const { world } = hangingWeight(EARTH_GRAVITY, { x: 0, y: 40 }, (ends) => rope(ends, 100));

        const trail = distances(world, 2 * ONE_SECOND);

        expect(trail[5]).toBeGreaterThan(40);
        expect(Math.max(...trail)).toBeLessThan(102);
        expect(trail.at(-1)).toBeCloseTo(100, 0);
        world.destroy();
    });

    test('pushed up, the weight goes slack: the Rope holds no shortest distance', () => {
        const { world, weight } = hangingWeight(EARTH_GRAVITY, { x: 0, y: 100 }, (ends) => rope(ends, 100));
        world.setVelocity(weight, { linear: { x: 0, y: -300 }, spin: 0 });

        const trail = distances(world, ONE_SECOND / 4);

        expect(Math.min(...trail)).toBeLessThan(60);
        world.destroy();
    });

    test('a Rope longer than the gap starts slack', () => {
        const { world } = hangingWeight(NO_GRAVITY, { x: 0, y: 50 }, (ends) => rope(ends, 100));

        const trail = distances(world, ONE_SECOND);

        expect(trail.at(-1)).toBeCloseTo(50, 6);
        world.destroy();
    });
});

describe("Box2dPhysicsWorld's Spring", () => {
    test('a Spring stretched past its Rest length bounces at about its Stiffness, around the Rest length', () => {
        for (const stiffness of [1, 3]) {
            const { world } = hangingWeight(NO_GRAVITY, { x: 0, y: 150 }, (ends) => spring(ends, { stiffness }));

            const trail = distances(world, 4 * ONE_SECOND);
            const bouncesPerSecond = upwardCrossings(trail, 100) / 4;

            expect(Math.abs(bouncesPerSecond - stiffness)).toBeLessThanOrEqual(0.5);
            expect(Math.min(...trail)).toBeLessThan(70);
            world.destroy();
        }
    });

    test('more Damping settles it faster, and Damping 1 settles it without bouncing', () => {
        const swingAfterTwoSeconds = (damping: number) => {
            const { world } = hangingWeight(NO_GRAVITY, { x: 0, y: 150 }, (ends) => spring(ends, { damping }));
            const trail = distances(world, 3 * ONE_SECOND);
            world.destroy();

            return { lastSecond: trail.slice(2 * ONE_SECOND).map((d) => Math.abs(d - 100)), trail };
        };

        const light = swingAfterTwoSeconds(0.1);
        const heavy = swingAfterTwoSeconds(0.5);
        const critical = swingAfterTwoSeconds(1);

        expect(Math.max(...heavy.lastSecond)).toBeLessThan(Math.max(...light.lastSecond) / 2);
        expect(Math.min(...critical.trail)).toBeGreaterThan(99);
    });

    test('two runs match bit for bit', () => {
        const run = () => {
            const { world } = hangingWeight(EARTH_GRAVITY, { x: 30, y: 120 }, (ends) =>
                spring(ends, { stiffness: 4, damping: 0.2 }),
            );
            const trail = distances(world, 3 * ONE_SECOND);
            world.destroy();

            return trail;
        };

        expect(run()).toEqual(run());
    });
});
