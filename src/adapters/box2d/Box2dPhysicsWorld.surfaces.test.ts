import { beforeAll, describe, expect, test } from 'vitest';

import type { Point } from '../../core/geometry/index.ts';
import { BodyPoses } from '../../core/physics/index.ts';

import { Box2dPhysicsEngine } from './Box2dPhysicsEngine.ts';
import {
    EARTH_GRAVITY,
    NO_GRAVITY,
    bodyDefinition,
    boxPiece,
    stepTimes,
    surfaceDefinition,
} from './testing/worldTesting.ts';

// The ground's top edge is at y = 80 in every test that has one.
const GROUND_TOP = 80;
const ONE_SECOND = 60;

const engine = new Box2dPhysicsEngine();

beforeAll(async () => {
    await engine.load();
});

function createWorldWithGround() {
    const world = engine.createWorld({ gravity: EARTH_GRAVITY, pixelsPerMetre: 50 });
    const ground = world.createBody(bodyDefinition({ entity: 1, type: 'static', position: { x: 0, y: 100 } }));
    world.addSurface(ground, surfaceDefinition({ entity: 1, pieces: [boxPiece(2000, 40)] }));

    return world;
}

function circlePiece(radius: number, center: Point = { x: 0, y: 0 }) {
    return { kind: 'circle', center, radius } as const;
}

function linePiece(points: readonly Point[]) {
    return { kind: 'line', points } as const;
}

// A line from (-300, 0) down to (300, 100): on screen, y grows downwards.
const SLOPE_START = { x: -300, y: 0 };
const SLOPE_END = { x: 300, y: 100 };

function slopeHeightAt(x: number) {
    const along = (x - SLOPE_START.x) / (SLOPE_END.x - SLOPE_START.x);

    return SLOPE_START.y + along * (SLOPE_END.y - SLOPE_START.y);
}

describe("Box2dPhysicsWorld's surfaces", () => {
    test('a box rests on a Static box about 1 px apart', () => {
        const world = createWorldWithGround();
        const poses = new BodyPoses();
        const box = world.createBody(bodyDefinition({ entity: 2, position: { x: 0, y: 0 } }));
        world.addSurface(box, surfaceDefinition({ entity: 2, pieces: [boxPiece(40, 40)] }));

        stepTimes(world, poses, 2 * ONE_SECOND);
        const pose = poses.poseOf(2);

        expect(Math.abs((pose?.y ?? 0) + 20 - GROUND_TOP)).toBeLessThan(1);
        expect(pose?.angle).toBeCloseTo(0, 3);
        world.destroy();
    });

    test('a circle rests on its own centre, wherever it is on the body', () => {
        const world = createWorldWithGround();
        const poses = new BodyPoses();
        const ball = world.createBody(bodyDefinition({ entity: 2 }));
        world.addSurface(ball, surfaceDefinition({ entity: 2, pieces: [circlePiece(20, { x: 0, y: -30 })] }));

        stepTimes(world, poses, 2 * ONE_SECOND);
        const pose = poses.poseOf(2);

        // The circle's bottom is the body's position, -30 + 20 px.
        expect(Math.abs((pose?.y ?? 0) - 10 - GROUND_TOP)).toBeLessThan(1);
        world.destroy();
    });

    test.each([
        ['drawn downhill', [SLOPE_START, SLOPE_END]],
        ['drawn uphill', [SLOPE_END, SLOPE_START]],
    ])('a ball rolls along a line %s', (_direction, points) => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY, pixelsPerMetre: 50 });
        const poses = new BodyPoses();
        const slope = world.createBody(bodyDefinition({ entity: 1, type: 'static' }));
        world.addSurface(slope, surfaceDefinition({ entity: 1, pieces: [linePiece(points)] }));
        const ball = world.createBody(bodyDefinition({ entity: 2, position: { x: -200, y: -40 } }));
        world.addSurface(ball, surfaceDefinition({ entity: 2, pieces: [circlePiece(20)] }));

        stepTimes(world, poses, 2 * ONE_SECOND);
        const pose = poses.poseOf(2) ?? { x: 0, y: 0, angle: 0 };

        expect(pose.x).toBeGreaterThan(-150);
        expect(pose.y).toBeLessThan(slopeHeightAt(pose.x));
        // Rolling right along the slope turns it clockwise on screen.
        expect(world.velocity(ball).spin).toBeGreaterThan(0);
        world.destroy();
    });

    test.each([
        [
            'drawn left to right',
            [
                { x: -300, y: 0 },
                { x: 300, y: 0 },
            ],
        ],
        [
            'drawn right to left',
            [
                { x: 300, y: 0 },
                { x: -300, y: 0 },
            ],
        ],
    ])('a line %s stops a ball from below too', (_direction, points) => {
        const world = engine.createWorld({ gravity: NO_GRAVITY, pixelsPerMetre: 50 });
        const poses = new BodyPoses();
        const ceiling = world.createBody(bodyDefinition({ entity: 1, type: 'static' }));
        world.addSurface(ceiling, surfaceDefinition({ entity: 1, pieces: [linePiece(points)] }));
        const ball = world.createBody(bodyDefinition({ entity: 2, position: { x: 0, y: 100 } }));
        world.addSurface(ball, surfaceDefinition({ entity: 2, pieces: [circlePiece(20)] }));
        world.setVelocity(ball, { linear: { x: 0, y: -600 }, spin: 0 });

        stepTimes(world, poses, ONE_SECOND);

        expect(poses.poseOf(2)?.y).toBeGreaterThan(19);
        world.destroy();
    });

    test('a line never hits another line', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY, pixelsPerMetre: 50 });
        const poses = new BodyPoses();
        const floor = world.createBody(bodyDefinition({ entity: 1, type: 'static', position: { x: 0, y: 100 } }));
        const floorLine = [
            { x: -300, y: 0 },
            { x: 300, y: 0 },
        ];
        world.addSurface(floor, surfaceDefinition({ entity: 1, pieces: [linePiece(floorLine)] }));
        // A line on a Dynamic body only gets here from a level edited by hand, but it shows the rule.
        const falling = world.createBody(bodyDefinition({ entity: 2 }));
        const fallingLine = [
            { x: -50, y: 0 },
            { x: 50, y: 0 },
        ];
        world.addSurface(falling, surfaceDefinition({ entity: 2, pieces: [linePiece(fallingLine)] }));

        stepTimes(world, poses, ONE_SECOND);

        expect(poses.poseOf(2)?.y).toBeGreaterThan(200);
        world.destroy();
    });

    test('a sensor lets a body through', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY, pixelsPerMetre: 50 });
        const poses = new BodyPoses();
        const sensor = world.createBody(bodyDefinition({ entity: 1, type: 'static', position: { x: 0, y: 100 } }));
        world.addSurface(sensor, surfaceDefinition({ entity: 1, pieces: [boxPiece(400, 40)], sensor: true }));
        const ball = world.createBody(bodyDefinition({ entity: 2 }));
        world.addSurface(ball, surfaceDefinition({ entity: 2, pieces: [circlePiece(20)] }));

        stepTimes(world, poses, ONE_SECOND);

        expect(poses.poseOf(2)?.y).toBeGreaterThan(200);
        world.destroy();
    });

    test.each([
        ['only sensors', { sensor: true }],
        ['density 0', { density: 0 }],
    ])('a Dynamic body whose surfaces are %s still falls, as 1 kg', (_case, changes) => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY, pixelsPerMetre: 50 });
        const poses = new BodyPoses();
        const body = world.createBody(bodyDefinition({ entity: 2 }));
        world.addSurface(body, surfaceDefinition({ entity: 2, pieces: [boxPiece(40, 40)], ...changes }));

        stepTimes(world, poses, ONE_SECOND);

        expect(poses.poseOf(2)?.y).toBeGreaterThan(240);
        world.destroy();
    });

    test('density makes a body heavier, so it pushes a lighter one aside', () => {
        function pushedDistance(density: number) {
            const world = engine.createWorld({ gravity: NO_GRAVITY, pixelsPerMetre: 50 });
            const poses = new BodyPoses();
            const thrown = world.createBody(bodyDefinition({ entity: 2, position: { x: -100, y: 0 } }));
            world.addSurface(thrown, surfaceDefinition({ entity: 2, pieces: [boxPiece(40, 40)], density }));
            const hit = world.createBody(bodyDefinition({ entity: 3 }));
            world.addSurface(hit, surfaceDefinition({ entity: 3, pieces: [boxPiece(40, 40)] }));
            world.setVelocity(thrown, { linear: { x: 300, y: 0 }, spin: 0 });

            stepTimes(world, poses, ONE_SECOND);
            const distance = poses.poseOf(3)?.x ?? 0;
            world.destroy();

            return distance;
        }

        expect(pushedDistance(4)).toBeGreaterThan(pushedDistance(1));
    });

    test('a fast body is held to 6,000 px/s', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY, pixelsPerMetre: 50 });
        const body = world.createBody(bodyDefinition({ entity: 2 }));
        world.addSurface(body, surfaceDefinition({ entity: 2, pieces: [boxPiece(40, 40)] }));
        world.setVelocity(body, { linear: { x: 8000, y: 6000 }, spin: 0 });

        world.step();
        const { linear } = world.velocity(body);
        const speed = Math.hypot(linear.x, linear.y);

        expect(speed).toBeCloseTo(6000, 1);
        expect(linear.y / linear.x).toBeCloseTo(0.75, 5);
        world.destroy();
    });

    test('a spinning body is held to 7.5 turns per second, either way', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY, pixelsPerMetre: 50 });
        const clockwise = world.createBody(bodyDefinition({ entity: 2 }));
        const anticlockwise = world.createBody(bodyDefinition({ entity: 3, position: { x: 200, y: 0 } }));
        world.addSurface(clockwise, surfaceDefinition({ entity: 2, pieces: [boxPiece(40, 40)] }));
        world.addSurface(anticlockwise, surfaceDefinition({ entity: 3, pieces: [boxPiece(40, 40)] }));
        world.setVelocity(clockwise, { linear: { x: 0, y: 0 }, spin: 9000 });
        world.setVelocity(anticlockwise, { linear: { x: 0, y: 0 }, spin: -9000 });

        world.step();

        expect(world.velocity(clockwise).spin).toBeCloseTo(7.5 * 360, 3);
        expect(world.velocity(anticlockwise).spin).toBeCloseTo(-7.5 * 360, 3);
        world.destroy();
    });

    test('slower bodies keep their speed and spin', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY, pixelsPerMetre: 50 });
        const body = world.createBody(bodyDefinition({ entity: 2 }));
        world.addSurface(body, surfaceDefinition({ entity: 2, pieces: [boxPiece(40, 40)] }));
        world.setVelocity(body, { linear: { x: 500, y: 0 }, spin: 720 });

        world.step();
        const velocity = world.velocity(body);

        expect(velocity.linear.x).toBeCloseTo(500, 3);
        expect(velocity.spin).toBeCloseTo(720, 3);
        world.destroy();
    });

    test('a surface on a missing body is refused', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY, pixelsPerMetre: 50 });

        expect(() => world.addSurface(7, surfaceDefinition({ pieces: [boxPiece(40, 40)] }))).toThrow("doesn't exist");
        world.destroy();
    });

    test('removing a surface merged into the ground lets a box fall through where it was', () => {
        const world = engine.createWorld({ gravity: EARTH_GRAVITY, pixelsPerMetre: 50 });
        const poses = new BodyPoses();
        const ground = world.createBody(bodyDefinition({ entity: 1, type: 'static', position: { x: 0, y: 100 } }));
        world.addSurface(ground, surfaceDefinition({ entity: 3, pieces: [boxPiece(2000, 40)] }));
        const box = world.createBody(bodyDefinition({ entity: 2, position: { x: 0, y: 0 } }));
        world.addSurface(box, surfaceDefinition({ entity: 2, pieces: [boxPiece(40, 40)] }));

        stepTimes(world, poses, ONE_SECOND);
        world.removeSurfaces(3);
        // Asking again, or for an entity with no surfaces, does nothing.
        world.removeSurfaces(3);
        world.removeSurfaces(9);
        stepTimes(world, poses, ONE_SECOND);

        expect(poses.poseOf(2)?.y ?? 0).toBeGreaterThan(GROUND_TOP + 100);
        world.destroy();
    });

    test('a body that loses a merged surface keeps the mass of what is left', () => {
        const world = engine.createWorld({ gravity: NO_GRAVITY, pixelsPerMetre: 50 });
        const cart = world.createBody(bodyDefinition({ entity: 2 }));
        world.addSurface(cart, surfaceDefinition({ entity: 2, pieces: [boxPiece(40, 40)] }));
        world.addSurface(cart, surfaceDefinition({ entity: 3, pieces: [circlePiece(20, { x: 40, y: 0 })] }));

        world.removeSurfaces(3);
        world.addVelocity(cart, { x: 100, y: 0 });
        // Taking out the last surface too leaves a Dynamic body its 1 kg, and it keeps moving.
        world.removeSurfaces(2);
        const poses = new BodyPoses();
        stepTimes(world, poses, ONE_SECOND);

        expect(poses.poseOf(2)?.x ?? 0).toBeGreaterThan(90);
        world.destroy();
    });
});
